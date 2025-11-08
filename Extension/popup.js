// ==== CONFIG ====
const API_BASE = "https://prompt-pages-api.onrender.com"; //"http://localhost:8000";

const $ = (id) => document.getElementById(id);
const summaryBox = $("summary");
const answerBox = $("answer");
const urlInput = $("url");
const qInput = $("question");
const btnSummary = $("btn-summary");
const btnAsk = $("btn-ask");
const historyList = $("history-list");

// Prefill URL from active tab (best effort)
chrome.tabs &&
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      urlInput.value = tabs[0].url;
    }
  });

function setLoading(node, isLoading) {
  if (!node) return;
  node.classList.toggle("loading", !!isLoading);
}

async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// ===== SUMMARY BUTTON =====
btnSummary.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) return (summaryBox.textContent = "Please enter a URL.");
  setLoading(summaryBox, true);
  summaryBox.textContent = "Scraping and summarizing...";

  try {
    const data = await postJSON("/summary", { url });

    // Render Markdown properly here
    summaryBox.innerHTML = marked.parse(data.summary || "(No summary)");

    // Persist last URL
    chrome.storage && chrome.storage.local.set({ lastUrl: url });
  } catch (e) {
    summaryBox.textContent = `Error: ${e.message}`;
  } finally {
    setLoading(summaryBox, false);
  }
});

// ===== ASK BUTTON =====
btnAsk.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  const question = qInput.value.trim();
  if (!url) return (answerBox.textContent = "Please enter a URL.");
  if (!question) return (answerBox.textContent = "Please enter a question.");

  setLoading(answerBox, true);
  answerBox.textContent = "Thinking...";

  try {
    const data = await postJSON("/qa", { url, question });
    const answerHtml = marked.parse(data.answer || "(No answer)"); // 1. Show the current answer in the main box

    answerBox.innerHTML = answerHtml; // 2. Create new elements for the history

    const qDiv = document.createElement("div");
    qDiv.className = "history-question";
    qDiv.textContent = question;

    const aDiv = document.createElement("div");
    aDiv.className = "history-answer";
    aDiv.innerHTML = answerHtml; // Use the same parsed HTML // 3. Add them to the top of the history list

    historyList.prepend(aDiv);
    historyList.prepend(qDiv); // 4. Save and clear

    chrome.storage &&
      chrome.storage.local.set({ lastUrl: url, lastQ: question });
    qInput.value = "";
  } catch (e) {
    answerBox.textContent = `Error: ${e.message}`;
  } finally {
    setLoading(answerBox, false);
  }
});

// ===== RESTORE PREVIOUS =====
chrome.storage &&
  chrome.storage.local.get(["lastUrl", "lastQ"], (data) => {
    if (data.lastUrl && !urlInput.value) urlInput.value = data.lastUrl;
    //if (data.lastQ && !qInput.value) qInput.value = data.lastQ;
  });
