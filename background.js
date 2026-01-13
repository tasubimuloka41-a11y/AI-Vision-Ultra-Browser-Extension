async function waitForLoad(tabId, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timeout"));
    }, timeout);
    
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function searchDuckDuckGo(query) {
  try {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const resp = await fetch(url);
    const html = await resp.text();
    
    const results = [];
    const parts = html.split('class="result-link"');
    
    for (let i = 1; i < Math.min(parts.length, 6); i++) {
      const block = parts[i];
      const urlMatch = block.match(/href="([^"]+)"/);
      const titleMatch = block.match(/>([^<]+)<\/a>/);
      const snippetParts = html.split('class="result-snippet"');
      const snippetMatch = snippetParts[i] ? snippetParts[i].match(/>([^<]+)</) : null;
      
      if (urlMatch && titleMatch) {
        results.push({
          title: titleMatch[1].trim(),
          url: urlMatch[1],
          snippet: snippetMatch ? snippetMatch[1].trim() : ""
        });
      }
    }
    
    if (results.length === 0) return "DuckDuckGo: ничего не найдено";
    
    return `DUCKDUCKGO (${results.length} результатов):\n\n` +
      results.map((r, i) => `[${i+1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n");
  } catch (e) {
    return `DuckDuckGo ошибка: ${e.message}`;
  }
}

async function searchWithGrok(query) {
  let tab = null;
  try {
    tab = await chrome.tabs.create({ 
      url: `https://grok.com/search?q=${encodeURIComponent(query)}`, 
      active: false 
    });
    
    await waitForLoad(tab.id, 15000);
    await new Promise(r => setTimeout(r, 3000));
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        document.querySelectorAll('script,style,nav,header,footer,aside').forEach(e => e.remove());
        const text = document.body ? document.body.innerText : "";
        return text.replace(/\s+/g, ' ').trim().slice(0, 20000);
      }
    });
    
    const content = results[0] ? results[0].result : "";
    
    if (content.length < 100) {
      return "Grok вернул мало данных";
    }
    
    return `GROK (${content.length} симв.):\n\n${content}`;
    
  } catch (e) {
    return `Grok ошибка: ${e.message}`;
  } finally {
    if (tab && tab.id) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch {}
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === "executeCommand") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs ? tabs[0] : null;
      if (!tab || !tab.id) return sendResponse({ success: false, error: "No active tab" });
      chrome.tabs.sendMessage(tab.id, {action: "executeCommand", command: request.command}, (resp) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(resp ? resp : { success: true });
        }
      });
    });
    return true;
  }
  
  if (request && request.action === "webSearchDDG") {
    searchDuckDuckGo(request.query).then(data => {
      sendResponse({ success: true, data: data });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }
  
  if (request && request.action === "webSearchGrok") {
    searchWithGrok(request.query).then(data => {
      sendResponse({ success: true, data: data });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }
  
  if (request && request.action === "openTab") {
    const url = request.url ? String(request.url) : "";
    chrome.tabs.create({ url: url, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, tabId: tab ? tab.id : null });
      }
    });
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.windowId) chrome.sidePanel.open({ windowId: tab.windowId });
});
