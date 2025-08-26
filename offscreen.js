// Listen for messages from the background script
chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message) {
  if (message.target !== 'offscreen') return;

  if (message.data.type === 'parse-cambridge-url') {
    const { url, word } = message.data;
    try {
      const result = await parseCambridgePage(url);
      // Send the successful result back to the background script
      chrome.runtime.sendMessage({
        target: 'background',
        data: { ...result, word: word }
      });
    } catch (error) {
      // Send an error message back
      chrome.runtime.sendMessage({
        target: 'background',
        data: { error: error.message, word: word }
      });
    }
  }
}

// This function does the parsing, using the DOMParser available here
async function parseCambridgePage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not find the word (Status: ${response.status})`);
    }
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const ukTranscription = doc.querySelector('.uk .ipa')?.textContent;
    const usTranscription = doc.querySelector('.us .ipa')?.textContent;

    if (!ukTranscription && !usTranscription) {
      throw new Error("Pronunciation transcription not found.");
    }

    return { uk: ukTranscription, us: usTranscription };
  } catch (e) {
    console.error("Parsing failed:", e);
    throw e; // Re-throw the error to be caught in the message handler
  }
}

