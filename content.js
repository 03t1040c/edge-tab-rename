(function () {
  "use strict";
  // Reinjection after an extension update must retire the previous observer and
  // storage listeners. A boolean guard leaves a stale controller running forever.
  globalThis.__tabTrimController?.dispose();
  globalThis.__tabTrimInstalled = true;
  const api = globalThis.TabTrimRules;
  let config = api.normalize(null);
  let rawTitle = document.title;
  let renderedTitle = null;
  let pattern = null;
  let patternURL = null;
  let timer = null;
  let rootNode = null;
  let headNode = null;
  let titleNode = null;
  let watching = false;
  let disposed = false;
  let pendingTitleChange = false;
  let renderedNode = null;
  let settingsRevision = 0;
  const controller = { dispose };
  globalThis.__tabTrimController = controller;

  const titleObserver = new MutationObserver(() => {
    pendingTitleChange = true;
    schedule();
  });
  const headObserver = new MutationObserver(schedule);
  const rootObserver = new MutationObserver(schedule);
  const documentObserver = new MutationObserver(schedule);

  function schedule() {
    if (!disposed && timer === null) {
      // Coalesce bursts, including pages which immediately write their title back.
      timer = setTimeout(() => { timer = null; refresh(); }, 40);
    }
  }
  function disconnect() {
    titleObserver.disconnect();
    headObserver.disconnect();
    rootObserver.disconnect();
    documentObserver.disconnect();
    rootNode = headNode = titleNode = null;
    watching = false;
  }
  function connect() {
    if (!watching) {
      documentObserver.observe(document, { childList: true });
      watching = true;
    }
    if (rootNode !== document.documentElement) {
      rootObserver.disconnect();
      rootNode = document.documentElement;
      if (rootNode) rootObserver.observe(rootNode, { childList: true });
    }
    if (headNode !== document.head) {
      headObserver.disconnect();
      headNode = document.head;
      if (headNode) headObserver.observe(headNode, { childList: true });
    }
    const currentTitle = document.head?.querySelector("title") ?? null;
    if (titleNode !== currentTitle) {
      titleObserver.disconnect();
      titleNode = currentTitle;
      if (titleNode) titleObserver.observe(titleNode, {
        childList: true, characterData: true, subtree: true
      });
    }
  }
  function refresh() {
    if (disposed) return;
    try {
      if (!chrome.runtime?.id) { dispose(); return; }
    } catch { dispose(); return; }
    const current = document.title;
    const currentNode = document.head?.querySelector("title") ?? null;
    if (renderedTitle === null || current !== renderedTitle || pendingTitleChange ||
        (watching && currentNode !== renderedNode)) rawTitle = current;
    pendingTitleChange = false;
    if (patternURL !== location.href) {
      patternURL = location.href;
      pattern = api.compile(api.activeRules(config, patternURL));
    }
    const result = api.transform(rawTitle, pattern);
    if (current !== result.title) {
      // Do not observe our own write: repeated deletion can otherwise eat new matches.
      titleObserver.disconnect();
      titleNode = null;
      document.title = result.title;
    }
    renderedTitle = document.title;
    renderedNode = document.head?.querySelector("title") ?? null;
    // No polling and no document/body subtree observation. Empty/disabled settings
    // keep only the storage/message listeners needed to turn the feature on again.
    if (config.enabled && config.rules.some(rule => rule.enabled && rule.word)) connect();
    else disconnect();
  }
  function configure(value) {
    config = api.normalize(value);
    patternURL = null;
    refresh();
  }
  function storageChanged(changes, area) {
    if (area === "local" && changes.settings) {
      settingsRevision++;
      configure(changes.settings.newValue);
    }
  }
  function messageReceived(message, sender, reply) {
    if (message.type === "navigation") { refresh(); return; }
    if (message.type === "snapshot") {
      refresh();
      reply({ original: rawTitle, current: document.title, url: location.href });
    }
  }
  function visibilityChanged() {
    if (document.visibilityState === "visible") refresh();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (timer !== null) clearTimeout(timer);
    const pageChangedTitle = pendingTitleChange || titleObserver.takeRecords().length > 0 ||
      (document.head?.querySelector("title") ?? null) !== renderedNode;
    disconnect();
    // Leave the newest page-supplied title in place; restore only our own output.
    if (!pageChangedTitle && renderedTitle !== null && document.title === renderedTitle) document.title = rawTitle;
    // The old extension context can already be invalid during reload/disable.
    try { chrome.storage.onChanged.removeListener(storageChanged); } catch { /* Invalidated context. */ }
    try { chrome.runtime.onMessage.removeListener(messageReceived); } catch { /* Invalidated context. */ }
    window.removeEventListener("popstate", refresh);
    window.removeEventListener("hashchange", refresh);
    window.removeEventListener("pageshow", refresh);
    document.removeEventListener("visibilitychange", visibilityChanged);
    if (globalThis.__tabTrimController === controller) {
      delete globalThis.__tabTrimController;
      delete globalThis.__tabTrimInstalled;
    }
  }
  chrome.storage.onChanged.addListener(storageChanged);
  chrome.runtime.onMessage.addListener(messageReceived);
  window.addEventListener("popstate", refresh);
  window.addEventListener("hashchange", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", visibilityChanged);
  chrome.storage.local.get("settings").then(({ settings }) => {
    if (!disposed && settingsRevision === 0) configure(settings);
  }).catch(dispose);
})();
