/* ============================================================
   AI チャット サンプルサイト - 動作スクリプト
   config.js に書いた設定を読み込み、Azure AI Foundry と通信します。

   仕様：
   - 送信のたびに「システムプロンプト ＋ 直近の会話」を AI に送る
   - システムプロンプト ＝ config.js の SYSTEM_PROMPT ＋ オンにした素材（.txt）の全文
   - 素材の追加：[ファイルを追加] ボタン、またはパネルへのドラッグ＆ドロップ
     ・受け付けるのは .txt のみ。文字コードは UTF-8 を基本とし、読めない場合は Shift_JIS で読み直す
     ・同じファイル名を追加した場合は、新しい内容で置き換える
   - 素材の一覧：ファイル名、文字数、オン・オフ、中身の表示、削除
   - 素材はこのブラウザに保存する（localStorage）。再読み込みしても残る
     ・別の PC やブラウザには引き継がれない
   - [送る内容を確認]：実際に AI に送るシステムプロンプトを表示する
   - [会話をクリア]：会話の履歴と表示を消す（素材は残る）
   - 素材の合計が MATERIAL_WARN_CHARS 文字を超えたら注意を表示する
   ============================================================ */

"use strict";

const logEl = document.getElementById("log");
const inputEl = document.getElementById("input");
const sendEl = document.getElementById("send");
const noticeEl = document.getElementById("notice");

const matFileEl = document.getElementById("mat-file");
const matListEl = document.getElementById("mat-list");
const matCountEl = document.getElementById("mat-count");
const matMsgEl = document.getElementById("mat-msg");
const matDropEl = document.getElementById("mat-drop");
const matPromptEl = document.getElementById("mat-prompt");
const matPanelEl = document.getElementById("materials");

// config.js に項目がない場合の既定値（古い config.js でも動くようにする）
const MATERIAL_HEADING =
  CONFIG.MATERIAL_HEADING ||
  "# 参考資料\n次の資料に書かれている内容に基づいて答えてください。資料に書かれていないことは、推測で答えないでください。";
const MATERIAL_WARN_CHARS = CONFIG.MATERIAL_WARN_CHARS || 30000;
const STORAGE_KEY = "chatbot-materials-v1";

// 会話履歴（AI に毎回まとめて送るため保持する）
const conversation = [];
let waiting = false;

// 素材：{ name, text, on }
let materials = loadMaterials();

/* ---------- 起動処理 ---------- */

function init() {
  document.getElementById("site-title").textContent = CONFIG.TITLE;
  document.getElementById("site-subtitle").textContent = CONFIG.SUBTITLE;
  document.title = CONFIG.TITLE;

  renderMaterials();

  const missing = findUnsetKeys();
  if (missing.length > 0) {
    noticeEl.hidden = false;
    noticeEl.textContent =
      "config.js の設定が済んでいません。次の項目を書き換えてください：" +
      missing.join("、");
    setEnabled(false);
    return;
  }

  addMessage("ai", CONFIG.GREETING);
}

// 書き換えられていない設定項目を探す
function findUnsetKeys() {
  return ["ENDPOINT", "DEPLOYMENT", "API_KEY"].filter((key) => {
    const value = CONFIG[key];
    return !value || value.indexOf("<<") === 0;
  });
}

/* ---------- 画面の表示 ---------- */

function addMessage(kind, text) {
  const el = document.createElement("div");
  el.className = "msg msg--" + kind;
  el.textContent = text;
  logEl.appendChild(el);
  scrollToBottom();
  return el;
}

function addTyping() {
  const el = document.createElement("div");
  el.className = "typing";
  el.innerHTML = "<span></span><span></span><span></span>";
  logEl.appendChild(el);
  scrollToBottom();
  return el;
}

function scrollToBottom() {
  logEl.scrollTop = logEl.scrollHeight;
}

function setEnabled(enabled) {
  sendEl.disabled = !enabled;
  inputEl.disabled = !enabled;
}

function clearChat() {
  if (waiting) return;
  conversation.length = 0;
  logEl.innerHTML = "";
  if (findUnsetKeys().length === 0) addMessage("ai", CONFIG.GREETING);
  inputEl.focus();
}

/* ---------- 素材：保存と読み込み ---------- */

function loadMaterials() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveMaterials() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
    return true;
  } catch (e) {
    showMatMsg("ブラウザに保存できませんでした。再読み込みすると素材が消えます。", true);
    return false;
  }
}

/* ---------- 素材：追加 ---------- */

async function addFiles(fileList) {
  const added = [];
  const skipped = [];

  for (const file of Array.from(fileList)) {
    if (!/\.txt$/i.test(file.name)) {
      skipped.push(file.name);
      continue;
    }
    const text = (await readText(file)).replace(/\r\n?/g, "\n").trim();
    const index = materials.findIndex((m) => m.name === file.name);
    if (index >= 0) {
      materials[index].text = text;
    } else {
      materials.push({ name: file.name, text: text, on: true });
    }
    added.push(file.name);
  }

  materials.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  saveMaterials();
  renderMaterials();

  const parts = [];
  if (added.length) parts.push(added.length + " 件を追加しました。");
  if (skipped.length) parts.push(".txt 以外は追加できません：" + skipped.join("、"));
  if (parts.length) showMatMsg(parts.join(" "), skipped.length > 0);
}

// UTF-8 で読み、文字化けしていたら Shift_JIS で読み直す
async function readText(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (utf8.indexOf("�") < 0) return utf8;
  try {
    return new TextDecoder("shift_jis").decode(buffer);
  } catch (e) {
    return utf8;
  }
}

/* ---------- 素材：一覧の表示 ---------- */

function renderMaterials() {
  matListEl.innerHTML = "";

  materials.forEach((m, i) => {
    const li = document.createElement("li");
    li.className = "mat" + (m.on ? "" : " mat--off");

    const row = document.createElement("div");
    row.className = "mat__row";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = m.on;
    check.id = "mat-on-" + i;
    check.addEventListener("change", () => {
      materials[i].on = check.checked;
      saveMaterials();
      renderMaterials();
    });

    const label = document.createElement("label");
    label.className = "mat__name";
    label.htmlFor = check.id;
    label.textContent = m.name;

    const size = document.createElement("span");
    size.className = "mat__size";
    size.textContent = m.text.length.toLocaleString() + " 文字";

    const view = document.createElement("button");
    view.type = "button";
    view.className = "mat__btn";
    view.textContent = "中身";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "mat__btn mat__btn--del";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      materials.splice(i, 1);
      saveMaterials();
      renderMaterials();
      showMatMsg(m.name + " を削除しました。", false);
    });

    const body = document.createElement("pre");
    body.className = "mat__body";
    body.textContent = m.text;
    body.hidden = true;
    view.addEventListener("click", () => {
      body.hidden = !body.hidden;
      view.textContent = body.hidden ? "中身" : "閉じる";
    });

    row.append(check, label, size, view, del);
    li.append(row, body);
    matListEl.appendChild(li);
  });

  const onList = materials.filter((m) => m.on);
  const chars = onList.reduce((sum, m) => sum + m.text.length, 0);
  matCountEl.textContent = materials.length
    ? "使用中 " + onList.length + " / " + materials.length + " 件（" + chars.toLocaleString() + " 文字）"
    : "素材はまだありません";

  if (chars > MATERIAL_WARN_CHARS) {
    showMatMsg(
      "使用中の素材が " + MATERIAL_WARN_CHARS.toLocaleString() +
        " 文字を超えています。応答が遅くなる、または料金が増えることがあります。",
      true
    );
  }

  if (!matPromptEl.hidden) matPromptEl.textContent = buildSystemPrompt();
}

function showMatMsg(text, isWarn) {
  matMsgEl.hidden = false;
  matMsgEl.textContent = text;
  matMsgEl.classList.toggle("materials__msg--warn", isWarn);
}

/* ---------- システムプロンプトの組み立て ---------- */

function buildSystemPrompt() {
  const onList = materials.filter((m) => m.on);
  if (onList.length === 0) return CONFIG.SYSTEM_PROMPT;

  const blocks = onList.map((m) => "## " + m.name + "\n" + m.text);
  return CONFIG.SYSTEM_PROMPT + "\n\n" + MATERIAL_HEADING + "\n\n" + blocks.join("\n\n");
}

/* ---------- 送信 ---------- */

async function send() {
  const text = inputEl.value.trim();
  if (text === "" || waiting) return;

  inputEl.value = "";
  resizeInput();
  addMessage("user", text);
  conversation.push({ role: "user", content: text });

  waiting = true;
  setEnabled(false);
  const typing = addTyping();

  try {
    const answer = await askAi();
    typing.remove();
    addMessage("ai", answer);
    conversation.push({ role: "assistant", content: answer });
  } catch (error) {
    typing.remove();
    addMessage("error", error.message);
    conversation.pop(); // 失敗した質問は履歴に残さない
  } finally {
    waiting = false;
    setEnabled(true);
    inputEl.focus();
  }
}

/* ---------- API 呼び出し ---------- */

function buildUrl() {
  const base = CONFIG.ENDPOINT.replace(/\/+$/, "");
  return (
    base +
    "/openai/deployments/" +
    CONFIG.DEPLOYMENT +
    "/chat/completions?api-version=" +
    CONFIG.API_VERSION
  );
}

function buildBody() {
  const body = {
    messages: [
      { role: "system", content: buildSystemPrompt() },
      ...conversation.slice(-CONFIG.HISTORY_LIMIT),
    ],
  };

  if (CONFIG.IS_GPT5) {
    body.max_completion_tokens = CONFIG.MAX_TOKENS;
  } else {
    body.max_tokens = CONFIG.MAX_TOKENS;
    body.temperature = CONFIG.TEMPERATURE;
  }

  return body;
}

async function askAi() {
  let response;

  try {
    response = await fetch(buildUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": CONFIG.API_KEY,
      },
      body: JSON.stringify(buildBody()),
    });
  } catch (e) {
    throw new Error(
      "接続できませんでした。config.js の ENDPOINT が正しいか、" +
        "ブラウザの開発者ツール（F12）のコンソールにエラーが出ていないかを確認してください。"
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      explainStatus(response.status) +
        "（HTTP " + response.status + "）\n" +
        detail.slice(0, 300)
    );
  }

  const data = await response.json();
  const answer =
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  if (!answer) {
    throw new Error(
      "応答が空でした。MAX_TOKENS の値、または IS_GPT5 の設定を見直してください。"
    );
  }

  return answer;
}

function explainStatus(status) {
  switch (status) {
    case 401:
      return "API キーが正しくありません。config.js の API_KEY を確認してください。";
    case 403:
      return "アクセスが拒否されました。リソースの権限設定を確認してください。";
    case 404:
      return "接続先が見つかりません。config.js の ENDPOINT と DEPLOYMENT を確認してください。";
    case 429:
      return "リクエストが集中しています。少し待ってからもう一度送信してください。";
    default:
      return status >= 500
        ? "Azure 側で一時的なエラーが発生しました。時間をおいて再度お試しください。"
        : "リクエストが受け付けられませんでした。設定を確認してください。";
  }
}

/* ---------- 入力欄の操作 ---------- */

function resizeInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = inputEl.scrollHeight + "px";
}

inputEl.addEventListener("input", resizeInput);

inputEl.addEventListener("keydown", (event) => {
  // Enter で送信、Shift + Enter で改行
  // 日本語入力の変換確定（isComposing / keyCode 229）では送信しない
  if (event.isComposing || event.keyCode === 229) return;
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    send();
  }
});

sendEl.addEventListener("click", send);

/* ---------- 素材パネルの操作 ---------- */

matFileEl.addEventListener("change", () => {
  addFiles(matFileEl.files);
  matFileEl.value = ""; // 同じファイルを続けて選べるようにする
});

["dragenter", "dragover"].forEach((type) => {
  matPanelEl.addEventListener(type, (event) => {
    event.preventDefault();
    matPanelEl.open = true;
    matDropEl.classList.add("materials__drop--over");
  });
});

["dragleave", "drop"].forEach((type) => {
  matPanelEl.addEventListener(type, () => {
    matDropEl.classList.remove("materials__drop--over");
  });
});

matPanelEl.addEventListener("drop", (event) => {
  event.preventDefault();
  if (event.dataTransfer && event.dataTransfer.files.length) {
    addFiles(event.dataTransfer.files);
  }
});

document.getElementById("mat-preview").addEventListener("click", (event) => {
  matPromptEl.hidden = !matPromptEl.hidden;
  event.currentTarget.textContent = matPromptEl.hidden ? "送る内容を確認" : "確認を閉じる";
  if (!matPromptEl.hidden) matPromptEl.textContent = buildSystemPrompt();
});

document.getElementById("chat-clear").addEventListener("click", clearChat);

init();
