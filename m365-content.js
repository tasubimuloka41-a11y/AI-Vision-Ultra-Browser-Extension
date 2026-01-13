chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendToCopilot") {
    const input = document.querySelector('textarea[placeholder*="Ask"], [role="textbox"]');
    if (input) {
      input.value = request.text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const sendBtn = document.querySelector('button[aria-label="Send"], button[title="Send"]');
      if (sendBtn) sendBtn.click();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Input not found" });
    }
  }

  if (request.action === "getCopilotResponse") {
    const messages = document.querySelectorAll('[role="log"] [role="presentation"]');
    const lastMsg = messages[messages.length - 1];
    sendResponse({ text: lastMsg ? lastMsg.innerText : "" });
  }
});
