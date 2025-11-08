chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "prompt-pages-ask",
    title: "Ask Prompt Pages about “%s”",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "prompt-pages-ask" && info.selectionText) {
    // Save selection so popup can pick it up
    chrome.storage.local.set({ lastQ: info.selectionText }, () => {
      chrome.action.openPopup(); // opens the popup
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }); // Opens the side panel immediately
});
