"use strict";

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.commands.onCommand.addListener(command => {
  if (command === "open-settings") chrome.runtime.openOptionsPage();
});

// A one-time injection also covers pages that were open before installation.
chrome.runtime.onInstalled.addListener(async details => {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  await Promise.allSettled(tabs.filter(tab => !tab.discarded).map(tab =>
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["rules.js", "content.js"] })
  ));
  if (details.reason === "install") await chrome.runtime.openOptionsPage();
});

// URL-only SPA navigation must also re-evaluate optional URL scopes.
function navigationChanged(details) {
  if (details.frameId !== 0) return;
  chrome.tabs.sendMessage(details.tabId, { type: "navigation" }).catch(() => {});
}
chrome.webNavigation.onHistoryStateUpdated.addListener(navigationChanged, {
  url: [{ schemes: ["http", "https"] }]
});
chrome.webNavigation.onReferenceFragmentUpdated.addListener(navigationChanged, {
  url: [{ schemes: ["http", "https"] }]
});
