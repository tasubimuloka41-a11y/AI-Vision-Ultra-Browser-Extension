(function() {
  if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) return;
  
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (!request || request.action !== "executeCommand") return;
    
    try {
      const cmd = request.command;
      const type = cmd ? cmd.type : null;
      const params = cmd ? cmd.params : {};
      
      if (type === "CLICK") {
        const x = parseInt(params.x, 10);
        const y = parseInt(params.y, 10);
        const el = document.elementFromPoint(x, y);
        if (el) { 
          el.click(); 
          el.focus(); 
        }
      } else if (type === "TYPE") {
        const el = document.activeElement;
        if (el) {
          const tag = el.tagName ? el.tagName.toUpperCase() : "";
          const text = params.text ? String(params.text) : "";
          if (tag === "INPUT" || tag === "TEXTAREA") {
            el.value = text;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } else if (el.isContentEditable) {
            el.textContent = text;
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      } else if (type === "PRESS") {
        const key = params.key ? String(params.key) : "Enter";
        const target = document.activeElement ? document.activeElement : document.body;
        target.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
        target.dispatchEvent(new KeyboardEvent("keyup", { key: key, bubbles: true }));
      } else if (type === "SCROLL") {
        const dir = params.direction ? String(params.direction) : "down";
        if (dir === "down") window.scrollBy(0, 400);
        if (dir === "up") window.scrollBy(0, -400);
        if (dir === "bottom") window.scrollTo(0, document.body.scrollHeight);
        if (dir === "top") window.scrollTo(0, 0);
      }
      
      sendResponse({ success: true });
    } catch (e) {
      sendResponse({ success: false, error: e.message ? String(e.message) : String(e) });
    }
    
    return true;
  });
})();
