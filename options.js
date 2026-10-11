"use strict";
const api = globalThis.TabTrimRules;
const $ = id => document.getElementById(id);
let settings = api.normalize(null);
let editId = null;
let saving = false;
let tabs = [];
let previewRequest = 0;

function status(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
function textWithSpaces(parent, text) {
  if (!$("show-spaces").checked) { parent.append(document.createTextNode(text)); return; }
  for (const part of text.split(/([ \u3000\t])/u)) {
    if (!part) continue;
    if ([" ", "\u3000", "\t"].includes(part)) {
      const chip = document.createElement("span");
      chip.className = "space";
      chip.textContent = part === " " ? "半角SP" : part === "\u3000" ? "全角SP" : "TAB";
      parent.append(chip);
    } else parent.append(document.createTextNode(part));
  }
}
function effectiveSettings() {
  const rules = settings.rules.filter(rule => rule.id !== editId);
  if ($("word").value.length > 0) {
    const enabled = editId ? settings.rules.find(rule => rule.id === editId)?.enabled !== false : true;
    rules.push({ word: $("word").value, url: $("scope").value.trim(), enabled });
  } else if (editId) {
    const editing = settings.rules.find(rule => rule.id === editId);
    if (editing) rules.push(editing);
  }
  return { enabled: settings.enabled, rules };
}
function renderPreview() {
  const original = $("sample-title").value;
  const config = effectiveSettings();
  const result = api.transform(original, api.compile(api.activeRules(config, $("sample-url").value)));
  $("before").replaceChildren();
  let position = 0;
  for (const match of result.matches) {
    textWithSpaces($("before"), original.slice(position, match.index));
    const mark = document.createElement("mark");
    textWithSpaces(mark, match.word);
    $("before").append(mark);
    position = match.index + match.word.length;
  }
  textWithSpaces($("before"), original.slice(position));
  $("after").replaceChildren();
  textWithSpaces($("after"), result.title);
  $("match-status").textContent = !config.enabled ? "現在は一時停止中です。" :
    result.emptyPrevented ? "タイトルが空になるため、元のタイトルを残します。" :
    result.matches.length ? `${result.matches.length} か所が一致しました。` : "一致するワードはありません。";
}
function renderRules() {
  $("rules-list").replaceChildren();
  $("empty").hidden = settings.rules.length > 0;
  $("rule-count").textContent = `${settings.rules.length} 件`;
  $("enabled").checked = settings.enabled;
  for (const rule of settings.rules) {
    const row = document.createElement("div");
    row.className = `rule${rule.enabled ? "" : " disabled"}`;
    const label = document.createElement("label");
    label.className = "rule-enabled";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = rule.enabled;
    checkbox.disabled = saving;
    checkbox.setAttribute("aria-label", `${rule.word} のルールを有効にする`);
    checkbox.addEventListener("change", () => save({ ...settings, rules: settings.rules.map(item =>
      item.id === rule.id ? { ...item, enabled: checkbox.checked } : item
    ) }));
    label.append(checkbox);
    const body = document.createElement("div");
    body.className = "rule-body";
    const word = document.createElement("div");
    word.className = "rule-word";
    textWithSpaces(word, rule.word);
    const scope = document.createElement("div");
    scope.className = "rule-scope";
    scope.textContent = rule.url || "すべてのサイト";
    body.append(word, scope);
    const actions = document.createElement("div");
    actions.className = "rule-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.disabled = saving;
    edit.textContent = "編集";
    edit.setAttribute("aria-label", `${rule.word} を編集`);
    edit.addEventListener("click", () => {
      editId = rule.id;
      $("word").value = rule.word;
      $("scope").value = rule.url;
      $("scope-details").open = Boolean(rule.url);
      $("add-rule").textContent = "変更を保存";
      $("cancel-edit").hidden = false;
      $("word").focus();
      status("編集内容は「変更を保存」で反映します。");
      renderPreview();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.disabled = saving;
    remove.textContent = "削除";
    remove.setAttribute("aria-label", `${rule.word} を削除`);
    remove.addEventListener("click", async () => {
      if (await save({ ...settings, rules: settings.rules.filter(item => item.id !== rule.id) })) {
        if (editId === rule.id) resetForm();
      }
    });
    actions.append(edit, remove);
    row.append(label, body, actions);
    $("rules-list").append(row);
  }
}
function resetForm() {
  editId = null;
  $("rule-form").reset();
  $("scope-details").open = false;
  $("add-rule").textContent = "追加する";
  $("cancel-edit").hidden = true;
  renderPreview();
}
async function save(next) {
  if (saving) { status("保存中です。少しお待ちください。"); return false; }
  saving = true;
  document.querySelectorAll('#rule-form input, #rule-form button, #enabled, #rules-list input, #rules-list button')
    .forEach(control => { control.disabled = true; });
  try {
    await chrome.storage.local.set({ settings: next });
    settings = api.normalize(next);
    renderRules();
    renderPreview();
    status("保存しました。開いているタブにも反映されます。");
    return true;
  } catch {
    status("保存できませんでした。設定タブを開き直して、もう一度お試しください。", true);
    renderRules();
    return false;
  } finally {
    saving = false;
    document.querySelectorAll('#rule-form input, #rule-form button, #enabled, #rules-list input, #rules-list button')
      .forEach(control => { control.disabled = false; });
  }
}
$("rule-form").addEventListener("submit", async event => {
  event.preventDefault();
  const word = $("word").value;
  const url = $("scope").value.trim();
  if (!word.length) { status("消したいワードを入力してください。", true); return; }
  if (!api.validScope(url)) { status("URLは https:// または http:// から入力してください。", true); return; }
  if (settings.rules.some(rule => rule.id !== editId && rule.word === word && rule.url === url)) {
    status("同じワードとURLのルールが登録されています。", true); return;
  }
  if (!editId && settings.rules.length >= 500) { status("登録できるルールは500件までです。", true); return; }
  const enabled = editId ? settings.rules.find(rule => rule.id === editId)?.enabled !== false : true;
  const rule = { id: editId || crypto.randomUUID(), word, url, enabled };
  const rules = editId ? settings.rules.map(item => item.id === editId ? rule : item) : [...settings.rules, rule];
  if (await save({ ...settings, rules })) { resetForm(); $("word").focus(); }
});
$("cancel-edit").addEventListener("click", () => { resetForm(); status(""); });
$("enabled").addEventListener("change", () => save({ ...settings, enabled: $("enabled").checked }));
for (const id of ["word", "scope", "sample-title", "sample-url"]) {
  $(id).addEventListener("input", renderPreview);
}
$("show-spaces").addEventListener("change", () => { renderRules(); renderPreview(); });
function selectionChanged() {
  $("selection-word").disabled = $("sample-title").selectionStart === $("sample-title").selectionEnd;
}
for (const event of ["select", "keyup", "mouseup", "input"]) {
  $("sample-title").addEventListener(event, selectionChanged);
}
$("selection-word").addEventListener("click", () => {
  const sample = $("sample-title");
  const selected = sample.value.slice(sample.selectionStart, sample.selectionEnd);
  if (selected) { $("word").value = selected; $("word").focus(); renderPreview(); }
});

async function loadSelectedTab() {
  const request = ++previewRequest;
  const tab = tabs.find(item => String(item.id) === $("tab-select").value);
  if (!tab) return;
  let snapshot;
  try { snapshot = await chrome.tabs.sendMessage(tab.id, { type: "snapshot" }); } catch { /* Restricted page or not loaded yet. */ }
  if (request !== previewRequest) return;
  $("sample-title").value = snapshot?.original ?? tab.title ?? "";
  $("sample-url").value = snapshot?.url ?? tab.url ?? "";
  $("tab-status").textContent = snapshot ? "短縮前のタイトルを読み込みました。" :
    "タブの表示タイトルを読み込みました。元タイトルを取得するには対象ページを再読み込みしてください。";
  renderPreview();
}
async function loadTabs() {
  const previous = $("tab-select").value;
  try {
    tabs = (await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }))
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    $("tab-select").replaceChildren(new Option("タイトルを手入力して試す", ""));
    for (const tab of tabs) $("tab-select").append(new Option(tab.title || tab.url, String(tab.id)));
    if (tabs.some(tab => String(tab.id) === previous)) {
      $("tab-select").value = previous;
      await loadSelectedTab();
      return;
    }
    $("tab-status").textContent = tabs.length ? "タブを選ぶと、元タイトルとURLを読み込めます。" :
      "読み込めるタブがありません。タイトルを手入力して試せます。";
  } catch { $("tab-status").textContent = "タブ一覧を読み込めませんでした。タイトルを手入力して試せます。"; }
}
$("tab-select").addEventListener("change", () => {
  if (!$("tab-select").value) { ++previewRequest; $("tab-status").textContent = "タイトルを自由に入力して試せます。"; }
  else loadSelectedTab();
});
$("refresh-tabs").addEventListener("click", loadTabs);
async function initialize() {
  try {
    const stored = await chrome.storage.local.get("settings");
    settings = api.normalize(stored.settings);
    renderRules();
    renderPreview();
    await loadTabs();
  } catch { status("設定を読み込めませんでした。設定タブを開き直してください。", true); }
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings && !saving) {
    settings = api.normalize(changes.settings.newValue);
    renderRules();
    renderPreview();
  }
});
initialize();
