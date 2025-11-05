// // ==== CONFIG ====
// // Use localhost in dev, your HTTPS API host in prod
// const API_BASE = "http://localhost:8000"; // e.g. "https://prompt-pages-api.onrender.com"

// const $ = (id) => document.getElementById(id);
// const summaryBox = $("summary");
// const answerBox = $("answer");
// const urlInput = $("url");
// const qInput = $("question");
// const btnSummary = $("btn-summary");
// const btnAsk = $("btn-ask");

// // Prefill URL from active tab (best effort)
// chrome.tabs &&
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     if (tabs && tabs[0] && tabs[0].url) {
//       urlInput.value = tabs[0].url;
//     }
//   });

// function setLoading(node, isLoading) {
//   if (!node) return;
//   node.classList.toggle("loading", !!isLoading);
// }

// async function postJSON(path, body) {
//   const res = await fetch(`${API_BASE}${path}`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(body),
//   });
//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`HTTP ${res.status}: ${text}`);
//   }
//   return res.json();
// }

// btnSummary.addEventListener("click", async () => {
//   const url = urlInput.value.trim();
//   if (!url) return (summaryBox.textContent = "Please enter a URL.");
//   setLoading(summaryBox, true);
//   summaryBox.textContent = "Scraping and summarizing...";
//   try {
//     const data = await postJSON("/summary", { url });
//     summaryBox.textContent = data.summary || "(No summary)";
//     // Persist last URL
//     chrome.storage && chrome.storage.local.set({ lastUrl: url });
//   } catch (e) {
//     summaryBox.textContent = `Error: ${e.message}`;
//   } finally {
//     setLoading(summaryBox, false);
//   }
// });

// btnAsk.addEventListener("click", async () => {
//   const url = urlInput.value.trim();
//   const question = qInput.value.trim();
//   if (!url) return (answerBox.textContent = "Please enter a URL.");
//   if (!question) return (answerBox.textContent = "Please enter a question.");

//   setLoading(answerBox, true);
//   answerBox.textContent = "Thinking...";
//   try {
//     const data = await postJSON("/qa", { url, question });
//     answerBox.textContent = data.answer || "(No answer)";
//     // Optional: append sources for transparency
//     // if (data.sources?.length) answerBox.textContent += `\n\nSources:\n- ${data.sources.join("\n- ")}`;
//     chrome.storage &&
//       chrome.storage.local.set({ lastUrl: url, lastQ: question });
//     qInput.value = ""; // clear
//   } catch (e) {
//     answerBox.textContent = `Error: ${e.message}`;
//   } finally {
//     setLoading(answerBox, false);
//   }
// });

// // Restore last values (optional)
// chrome.storage &&
//   chrome.storage.local.get(["lastUrl", "lastQ"], (data) => {
//     if (data.lastUrl && !urlInput.value) urlInput.value = data.lastUrl;
//     if (data.lastQ && !qInput.value) qInput.value = data.lastQ;
//   });

// ==== CONFIG ====
// Use localhost in dev, your HTTPS API host in prod
const API_BASE = "http://localhost:8000"; // e.g. "https://prompt-pages-api.onrender.com"

const $ = (id) => document.getElementById(id);
const summaryBox = $("summary");
const answerBox = $("answer");
const urlInput = $("url");
const qInput = $("question");
const btnSummary = $("btn-summary");
const btnAsk = $("btn-ask");

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

    // 👇 Render Markdown properly here
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

    // 👇 Render Markdown properly here too
    answerBox.innerHTML = marked.parse(data.answer || "(No answer)");

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
    if (data.lastQ && !qInput.value) qInput.value = data.lastQ;
  });
