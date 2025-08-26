let creating; // A flag to prevent multiple offscreen documents

// Create the context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "get-pronunciation",
    title: "Get Cambridge Pronunciation for '%s'",
    contexts: ["selection"]
  });
});

// Listen for the click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText.trim();
  if (!selectedText || selectedText.split(' ').length > 5) return;

  // For standard web pages
  if (tab && tab.url && tab.url.startsWith('http')) {
    console.log("Running on a standard webpage.");
    fetchAndSendMessageToContentScript(selectedText, tab.id);
  } 
  // For the PDF viewer or other special pages
  else {
    console.log("Running on a special page (like PDF viewer). Using offscreen document and notification.");
    fetchAndParseViaOffscreen(selectedText);
  }
});

// Logic for standard webpages (sends message to content.js)
async function fetchAndSendMessageToContentScript(word, tabId) {
  const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }
    const htmlText = await response.text();
    chrome.tabs.sendMessage(tabId, { word, htmlText });
  } catch (error) {
    console.error("Fetch Error:", error);
    chrome.tabs.sendMessage(tabId, { error: `Network or fetch error for "${word}".`, word });
  }
}

// 4. Logic for PDFs (uses offscreen.js to parse and shows a notification)
async function fetchAndParseViaOffscreen(word) {
  await setupOffscreenDocument('offscreen.html');
  const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`;
  // Send the URL to the offscreen document for parsing
  chrome.runtime.sendMessage({
    target: 'offscreen',
    data: { type: 'parse-cambridge-url', url: url, word: word }
  });
}

// Listen for the result back from the offscreen document
chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'background') return;

  const { word, uk, us, error } = message.data;
  let notifMessage = `UK: ${uk || 'N/A'}\nUS: ${us || 'N/A'}`;
  if (error) {
    notifMessage = error;
  }

  // Create the notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `Pronunciation for "${word}"`,
    message: notifMessage,
    priority: 2
  });
});


// --- Offscreen Document Helpers ---
async function setupOffscreenDocument(path) {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) {
    return;
  }
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['DOM_PARSER'],
      justification: 'To parse HTML from Cambridge Dictionary'
    });
    await creating;
    creating = null;
  }
}

