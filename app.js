/* ============================================================
   AI チャット サンプルサイト - 動作スクリプト
   config.js に書いた設定を読み込み、Azure AI Foundry と通信します。
   ============================================================ */

"use strict";

const logEl = document.getElementById("log");
const inputEl = document.getElementById("input");
const sendEl = document.getElementById("send");
const noticeEl = document.getElementById("notice");

// 会話履歴（AI に毎回まとめて送るため保持する）
const conversation = [];
let waiting = false;

/* ---------- 起動処理 ---------- */

function init() {
  document.getElementById("site-title").textContent = CONFIG.TITLE;
  document.getElementById("site-subtitle").textContent = CONFIG.SUBTITLE;
  document.title = CONFIG.TITLE;

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
      { role: "system", content: CONFIG.SYSTEM_PROMPT },
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

init();
