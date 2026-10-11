(function (root) {
  "use strict";
  const DEFAULTS = { enabled: true, rules: [] };
  function normalize(value) {
    return {
      enabled: value?.enabled !== false,
      rules: Array.isArray(value?.rules) ? value.rules.filter(rule =>
        rule && typeof rule.word === "string" && rule.word.length > 0 &&
        typeof rule.url === "string"
      ).map(rule => ({
        id: typeof rule.id === "string" ? rule.id : "",
        word: rule.word,
        url: rule.url,
        enabled: rule.enabled !== false
      })) : []
    };
  }
  function validScope(scope) {
    if (!scope) return true;
    try { return ["http:", "https:"].includes(new URL(scope).protocol); }
    catch { return false; }
  }
  function matchesScope(scope, address) {
    if (!scope) return true;
    try {
      const expected = new URL(scope);
      const actual = new URL(address);
      if (!validScope(scope) || expected.origin !== actual.origin) return false;
      const prefix = expected.pathname;
      if (actual.pathname !== prefix &&
          !actual.pathname.startsWith(prefix.endsWith("/") ? prefix : prefix + "/")) return false;
      if (expected.search && expected.search !== actual.search) return false;
      if (expected.hash && expected.hash !== actual.hash) return false;
      return true;
    } catch { return false; }
  }
  function activeRules(config, address) {
    if (!config.enabled) return [];
    return config.rules.filter(rule => rule.enabled && rule.word && matchesScope(rule.url, address));
  }
  function compile(rules) {
    const words = [...new Set(rules.map(rule => rule.word))].sort((a, b) => b.length - a.length);
    if (!words.length) return null;
    return new RegExp(words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gu");
  }
  function transform(title, pattern) {
    if (!pattern) return { title, matches: [], emptyPrevented: false };
    pattern.lastIndex = 0;
    const matches = [];
    const changed = title.replace(pattern, (word, index) => {
      matches.push({ index, word });
      return "";
    });
    const emptyPrevented = matches.length > 0 && changed.trim().length === 0;
    return { title: emptyPrevented ? title : changed, matches, emptyPrevented };
  }
  const api = { DEFAULTS, normalize, validScope, matchesScope, activeRules, compile, transform };
  root.TabTrimRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
