// content.js
console.log("Content script injected and listening (v1.2).");

// Add a listener for messages from the background script.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received from background script:", message);

  if (message.error) {
    createPronunciationWindow({ error: message.error, word: message.word });
  } else if (message.htmlText) {
    parseHtmlAndCreateWindow(message.word, message.htmlText);
  }

  // IMPORTANT: Send a response back to the background script to confirm receipt.
  sendResponse({ status: "Message received by content script." });
  return true; // Keeps the message channel open for the asynchronous response.
});

/**
 * Parses the received HTML text to find transcription text and then creates the UI window.
 * @param {string} word - The word that was looked up.
 * @param {string} htmlText - The raw HTML of the dictionary page as a string.
 */
function parseHtmlAndCreateWindow(word, htmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // Look for the IPA transcription text using the 'ipa' class
    const ukTranscription = doc.querySelector('.uk .ipa')?.textContent;
    const usTranscription = doc.querySelector('.us .ipa')?.textContent;
    console.log("Parsed transcriptions:", { uk: ukTranscription, us: usTranscription });

    if (!ukTranscription && !usTranscription) {
      const errorMsg = `Pronunciation transcription not found for "${word}".`;
      createPronunciationWindow({ error: errorMsg, word: word });
      return;
    }

    const result = {
      word: word,
      uk: ukTranscription || 'N/A',
      us: usTranscription || 'N/A'
    };
    createPronunciationWindow(result);
  } catch (error) {
    console.error("Content script parsing error:", error);
    createPronunciationWindow({ error: "Failed to parse the dictionary page.", word: word });
  }
}

/**
 * Creates and injects the UI window into the current page.
 * @param {object} data
 */
function createPronunciationWindow(data) {
  // First, remove any old window that might still be open
  const existingWindow = document.getElementById('cambridge-pronunciation-window');
  if (existingWindow) {
    existingWindow.remove();
  }

  // Create the main container for our UI
  const container = document.createElement('div');
  container.id = 'cambridge-pronunciation-window';
  Object.assign(container.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
    backgroundColor: '#ffffff', border: '1px solid #dbdbdb', borderRadius: '12px',
    padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    fontFamily: `sans-serif`, fontSize: '14px', color: '#333',
    minWidth: '280px', maxWidth: '350px'
  });

  // Create the header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px'
  });

  const title = document.createElement('h2');
  title.textContent = `Pronunciation for `;
  Object.assign(title.style, { margin: '0', fontSize: '16px', fontWeight: '600' });
  const wordSpan = document.createElement('span');
  wordSpan.textContent = data.word || '';
  Object.assign(wordSpan.style, { fontStyle: 'italic', color: '#555' });
  title.appendChild(wordSpan);

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  Object.assign(closeButton.style, { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' });
  closeButton.onclick = () => container.remove();
  header.appendChild(title);
  header.appendChild(closeButton);
  container.appendChild(header);

  // Create the main content area
  const content = document.createElement('div');
  if (data.error) {
    content.textContent = data.error;
    content.style.color = '#d9534f';
  } else {
    Object.assign(content.style, {
      display: 'flex', gap: '20px', justifyContent: 'center',
      fontSize: '16px', fontFamily: 'monospace'
    });
    const ukDiv = document.createElement('div');
    ukDiv.innerHTML = `<strong style="font-family: sans-serif;">UK</strong> ${data.uk}`;
    content.appendChild(ukDiv);
    const usDiv = document.createElement('div');
    usDiv.innerHTML = `<strong style="font-family: sans-serif;">US</strong> ${data.us}`;
    content.appendChild(usDiv);
  }
  container.appendChild(content);

  document.body.appendChild(container);
  console.log("Pronunciation window added to the page.");
}