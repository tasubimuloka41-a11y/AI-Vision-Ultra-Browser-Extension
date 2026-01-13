(function() {
  "use strict";
  
  function $(id) { return document.getElementById(id); }
  
  var chatLog = $("chat-messages");
  var chatContainer = $("chat-container");
  var resizeHandle = $("chat-resize-handle");

  // Load saved height
  var savedHeight = localStorage.getItem('chatContainerHeight');
  if (savedHeight) {
    chatContainer.style.height = savedHeight + 'px';
  }

  // Resizing logic
  let isResizing = false;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    // Calculate new height (from bottom of screen)
    const newHeight = window.innerHeight - e.clientY;
    
    // Constraints
    if (newHeight > 150 && newHeight < window.innerHeight * 0.8) {
      chatContainer.style.height = newHeight + 'px';
      localStorage.setItem('chatContainerHeight', newHeight);
    }
  });

  window.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = 'default';
  });

  var loading = $("loading");
  var viewerWrap = $("viewerWrap");
  var pageIframe = $("page-iframe");
  var closePageBtn = $("close-page-btn");
  var reloadPageBtn = $("reload-page-btn");
  var openTabBtn = $("open-tab-btn");
  var visorWrap = $("visorWrap");
  var visorCanvas = $("visor-canvas");
  var visorHint = $("visorHint");
  var visorCtx = visorCanvas.getContext("2d");
  var btnRec = $("btn-rec");
  var btnRecStop = $("btn-rec-stop");
  var recTimer = $("rec-timer");
  var searchEngineSel = $("search-engine");
  var modeSel = $("mode");
  var visionSel = $("vision-model");
  var textSel = $("text-model");
  var refreshModelsBtn = $("refresh-models");
  var preview = $("preview");
  var previewImg = $("preview-img");
  var previewClear = $("preview-clear");
  var prompt = $("prompt");
  var fileInput = $("file-input");
  var btnUpload = $("btn-upload");
  var btnShot = $("btn-shot");
  var btnVisor = $("btn-visor");
  var btnSend = $("btn-send");
  var btnCancel = $("btn-cancel");
  
  var OLLAMA = "";
  var PORTS = [11434, 11435, 8080, 5050];
  var VISION_KEYWORDS = ["vision","llava","moondream","qwen","minicpm","gemma","vl","mm"];
  var abortController = null;
  var currentImageBase64 = null;
  var visorActive = false;
  var visorStream = null;
  var visorVideo = null;
  var visorRaf = null;
  var mediaRecorder = null;
  var recordedChunks = [];
  var recStartTime = 0;
  var recTimerInterval = null;
  var lastOpenedUrl = "";

  function detectOllamaPort() {
    var index = 0;
    function tryPort() {
      if (index >= PORTS.length) {
        addMsg("system", "Ollama not found");
        return;
      }
      var port = PORTS[index];
      fetch("http://127.0.0.1:" + port + "/api/tags", {signal: AbortSignal.timeout(2000)})
        .then(function(res) {
          if (res.ok) {
            OLLAMA = "http://127.0.0.1:" + port;
            addMsg("system", "Ollama: port " + port);
          } else {
            index++;
            tryPort();
          }
        })
        .catch(function() {
          index++;
          tryPort();
        });
    }
    tryPort();
  }

  function setBusy(b) {
    loading.style.display = b ? "flex" : "none";
    btnCancel.style.display = b ? "inline-block" : "none";
    btnSend.style.display = b ? "none" : "inline-block";
  }
  
  function openPageInPanel(url) {
    var finalUrl = String(url || "");
    
    if (finalUrl.indexOf("google.com/search") >= 0) {
      if (finalUrl.indexOf("igu=1") < 0) {
        finalUrl += finalUrl.indexOf("?") >= 0 ? "&igu=1" : "?igu=1";
      }
    }
    
    lastOpenedUrl = finalUrl;
    pageIframe.src = "about:blank";
    setTimeout(function() {
      pageIframe.src = lastOpenedUrl;
    }, 10);
    viewerWrap.classList.add("active");
    addMsg("system", "Opened: " + lastOpenedUrl);
  }
  
  function makeLinksClickable(text) {
    var urlRe = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
    return text.replace(urlRe, function(url) {
      return '<a href="#" data-url="' + url + '">' + url + '</a>';
    });
  }
  
  function addMsg(role, text, imageData) {
    var box = document.createElement("div");
    box.className = "msg";
    var r = document.createElement("div");
    r.className = "role";
    r.textContent = role;
    var t = document.createElement("div");
    t.className = "text";
    if (role === "assistant") {
      t.innerHTML = makeLinksClickable(text);
    } else {
      t.textContent = text;
    }
    box.appendChild(r);
    box.appendChild(t);
    if (imageData) {
      var img = document.createElement("img");
      img.src = "data:image/png;base64," + imageData;
      img.style.maxWidth = "100%";
      img.style.borderRadius = "8px";
      img.style.marginTop = "8px";
      box.appendChild(img);
    }
    if (chatLog) chatLog.appendChild(box);
    if (chatLog) chatLog.scrollTop = chatLog.scrollHeight;
  }
  
  if (chatLog) {
    chatLog.addEventListener("click", function(e) {
      if (e.target.tagName === "A" && e.target.dataset.url) {
        e.preventDefault();
        openPageInPanel(e.target.dataset.url);
      }
    });
  }
  
  closePageBtn.addEventListener("click", function() {
    pageIframe.src = "";
    viewerWrap.classList.remove("active");
  });
  
  reloadPageBtn.addEventListener("click", function() {
    if (lastOpenedUrl) openPageInPanel(lastOpenedUrl);
  });
  
  openTabBtn.addEventListener("click", function() {
    if (!lastOpenedUrl) return;
    chrome.runtime.sendMessage({ action: "openTab", url: lastOpenedUrl });
  });
  
  function updatePreview() {
    if (!currentImageBase64) {
      preview.style.display = "none";
      previewImg.src = "";
      return;
    }
    preview.style.display = "flex";
    previewImg.src = "data:image/png;base64," + currentImageBase64;
  }
  
  previewClear.addEventListener("click", function() {
    currentImageBase64 = null;
    updatePreview();
  });
  
  function loadModels() {
    if (!OLLAMA) {
      detectOllamaPort();
      setTimeout(loadModels, 2000);
      return;
    }
    fetch(OLLAMA + "/api/tags")
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var models = data.models ? data.models.map(function(m) { return m.name; }) : [];
        var vision = models.filter(function(n) {
          return VISION_KEYWORDS.some(function(k) { return n.toLowerCase().indexOf(k) >= 0; });
        });
        var text = models;
        
        visionSel.innerHTML = vision.length ? "" : '<option value="">No vision</option>';
        textSel.innerHTML = text.length ? "" : '<option value="">No text</option>';
        
        vision.forEach(function(m) {
          var o = document.createElement("option");
          o.value = m;
          o.textContent = m;
          visionSel.appendChild(o);
        });
        text.forEach(function(m) {
          var o = document.createElement("option");
          o.value = m;
          o.textContent = m;
          textSel.appendChild(o);
        });
      })
      .catch(function(e) {
        addMsg("system", "Error: " + e.message);
      });
  }
  
  refreshModelsBtn.addEventListener("click", loadModels);
  
  function loadImageFromFile(file) {
    if (!file || file.type.indexOf("image/") !== 0) return;
    var r = new FileReader();
    r.onload = function(ev) {
      var dataUrl = String(ev.target.result || "");
      var parts = dataUrl.split(",");
      currentImageBase64 = parts[1] || null;
      updatePreview();
    };
    r.readAsDataURL(file);
  }
  
  btnUpload.addEventListener("click", function() { fileInput.click(); });
  fileInput.addEventListener("change", function() {
    var f = fileInput.files ? fileInput.files[0] : null;
    if (!f) return;
    loadImageFromFile(f);
    fileInput.value = "";
  });
  
  function captureScreenOnce() {
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      .then(function(stream) {
        var track = stream.getVideoTracks()[0];
        var video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.style.position = "fixed";
        video.style.left = "-99999px";
        document.body.appendChild(video);
        return video.play().then(function() {
          return new Promise(function(resolve) {
            if ("requestVideoFrameCallback" in video) {
              video.requestVideoFrameCallback(resolve);
            } else {
              video.addEventListener("playing", resolve, { once: true });
            }
          });
        }).then(function() {
          var w = video.videoWidth || 1280;
          var h = video.videoHeight || 720;
          var c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          c.getContext("2d").drawImage(video, 0, 0, w, h);
          var dataUrl = c.toDataURL("image/png");
          track.stop();
          stream.getTracks().forEach(function(t) { t.stop(); });
          video.remove();
          return dataUrl;
        });
      });
  }
  
  btnShot.addEventListener("click", function() {
    captureScreenOnce()
      .then(function(dataUrl) {
        var parts = dataUrl.split(",");
        currentImageBase64 = parts[1] || null;
        updatePreview();
      })
      .catch(function(e) {
        addMsg("system", "Screenshot error: " + e.message);
      });
  });
  
  function stopVisor() {
    visorActive = false;
    visorWrap.classList.remove("active");
    visorHint.textContent = "Visor: off";
    if (visorRaf) cancelAnimationFrame(visorRaf);
    visorRaf = null;
    if (visorStream) visorStream.getTracks().forEach(function(t) { t.stop(); });
    visorStream = null;
    if (visorVideo) visorVideo.remove();
    visorVideo = null;
    if (mediaRecorder && mediaRecorder.state !== "inactive") stopRecording();
  }
  
  function startVisor() {
    navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: true })
      .then(function(stream) {
        var video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.style.position = "fixed";
        video.style.left = "-99999px";
        document.body.appendChild(video);
        return video.play().then(function() {
          return new Promise(function(resolve) {
            if ("requestVideoFrameCallback" in video) {
              video.requestVideoFrameCallback(resolve);
            } else {
              video.addEventListener("playing", resolve, { once: true });
            }
          });
        }).then(function() {
          visorCanvas.width = Math.min(video.videoWidth || 1280, 1024);
          visorCanvas.height = Math.min(video.videoHeight || 720, 768);
          visorActive = true;
          visorStream = stream;
          visorVideo = video;
          visorWrap.classList.add("active");
          visorHint.textContent = "Visor: ON (" + visorCanvas.width + "x" + visorCanvas.height + ")";
          
          function draw() {
            if (!visorActive) return;
            try {
              visorCtx.drawImage(video, 0, 0, visorCanvas.width, visorCanvas.height);
            } catch (e) {}
            visorRaf = requestAnimationFrame(draw);
          }
          draw();
          
          stream.getVideoTracks()[0].onended = function() { stopVisor(); };
        });
      })
      .catch(function(e) {
        stopVisor();
        addMsg("system", "Visor error: " + e.message);
      });
  }
  
  function captureVisorFrameBase64() {
    if (!visorActive) return null;
    try {
      var dataUrl = visorCanvas.toDataURL("image/jpeg", 0.6);
      var parts = dataUrl.split(",");
      return parts[1] || null;
    } catch (e) {
      return null;
    }
  }
  
  btnVisor.addEventListener("click", function() {
    if (!visorActive) startVisor();
    else stopVisor();
  });
  
  function startRecording() {
    if (!visorActive || !visorStream) {
      addMsg("system", "Visor not active");
      return;
    }
    recordedChunks = [];
    try {
      mediaRecorder = new MediaRecorder(visorStream, { mimeType: "video/webm;codecs=vp9" });
    } catch (e1) {
      try {
        mediaRecorder = new MediaRecorder(visorStream, { mimeType: "video/webm" });
      } catch (e2) {
        addMsg("system", "MediaRecorder error: " + e2.message);
        return;
      }
    }
    
    mediaRecorder.ondataavailable = function(e) {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    
    mediaRecorder.onstop = function() {
      var blob = new Blob(recordedChunks, { type: "video/webm" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "rec-" + Date.now() + ".webm";
      a.click();
      URL.revokeObjectURL(url);
      addMsg("system", "Video saved");
    };
    
    mediaRecorder.start(200);
    recStartTime = Date.now();
    recTimer.style.display = "block";
    btnRec.style.display = "none";
    btnRecStop.style.display = "inline-block";
    
    recTimerInterval = setInterval(function() {
      var elapsed = Math.floor((Date.now() - recStartTime) / 1000);
      var min = Math.floor(elapsed / 60).toString();
      var sec = (elapsed % 60).toString();
      if (min.length < 2) min = "0" + min;
      if (sec.length < 2) sec = "0" + sec;
      recTimer.textContent = min + ":" + sec;
    }, 1000);
    
    addMsg("system", "Recording");
  }
  
  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    mediaRecorder.stop();
    if (recTimerInterval) clearInterval(recTimerInterval);
    recTimerInterval = null;
    recTimer.style.display = "none";
    btnRec.style.display = "inline-block";
    btnRecStop.style.display = "none";
  }
  
  btnRec.addEventListener("click", startRecording);
  btnRecStop.addEventListener("click", stopRecording);
  
  function webSearch(query) {
    var engine = searchEngineSel.value;
    var promises = [];
    
    if (engine === "ddg" || engine === "both") {
      var ddgPromise = new Promise(function(resolve) {
        chrome.runtime.sendMessage({ action: "webSearchDDG", query: query }, function(resp) {
          if (chrome.runtime.lastError) return resolve("");
          resolve(resp && resp.success ? resp.data : "");
        });
      });
      promises.push(ddgPromise);
    }
    
    if (engine === "grok" || engine === "both") {
      var grokPromise = new Promise(function(resolve) {
        chrome.runtime.sendMessage({ action: "webSearchGrok", query: query }, function(resp) {
          if (chrome.runtime.lastError) return resolve("");
          resolve(resp && resp.success ? resp.data : "");
        });
      });
      promises.push(grokPromise);
    }
    
    return Promise.all(promises).then(function(results) {
      return results.filter(function(d) { return d; }).join("\n\n");
    });
  }
  
  function ollamaChat(model, messages, signal) {
    return fetch(OLLAMA + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        options: {
          num_ctx: 32768,
          keep_alive: 300
        }
      }),
      signal: signal
    }).then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function(data) {
      return data.message ? String(data.message.content || "") : "";
    });
  }
  
  function executeAICommands(text) {
    var openRe = /\[OPEN:([^\]]+)\]/gi;
    var m;
    var promises = [];
    
    while ((m = openRe.exec(text)) !== null) {
      (function(url) {
        promises.push(new Promise(function(resolve) {
          openPageInPanel(url);
          setTimeout(resolve, 250);
        }));
      })(m[1]);
    }
    
    var clickRe = /\[CLICK:(\d+),(\d+)\]/g;
    while ((m = clickRe.exec(text)) !== null) {
      (function(x, y) {
        promises.push(new Promise(function(resolve) {
          chrome.runtime.sendMessage({
            action: "executeCommand",
            command: { type: "CLICK", params: { x: x, y: y } }
          }, function() { resolve(); });
        }).then(function() {
          return new Promise(function(r) { setTimeout(r, 250); });
        }));
      })(m[1], m[2]);
    }
    
    var typeRe = /\[TYPE:([^\]]+)\]/g;
    while ((m = typeRe.exec(text)) !== null) {
      (function(txt) {
        promises.push(new Promise(function(resolve) {
          chrome.runtime.sendMessage({
            action: "executeCommand",
            command: { type: "TYPE", params: { text: txt } }
          }, function() { resolve(); });
        }).then(function() {
          return new Promise(function(r) { setTimeout(r, 250); });
        }));
      })(m[1]);
    }
    
    var pressRe = /\[PRESS:([^\]]+)\]/g;
    while ((m = pressRe.exec(text)) !== null) {
      (function(key) {
        promises.push(new Promise(function(resolve) {
          chrome.runtime.sendMessage({
            action: "executeCommand",
            command: { type: "PRESS", params: { key: key } }
          }, function() { resolve(); });
        }).then(function() {
          return new Promise(function(r) { setTimeout(r, 250); });
        }));
      })(m[1]);
    }
    
    var scrollRe = /\[SCROLL:([^\]]+)\]/g;
    while ((m = scrollRe.exec(text)) !== null) {
      (function(dir) {
        promises.push(new Promise(function(resolve) {
          chrome.runtime.sendMessage({
            action: "executeCommand",
            command: { type: "SCROLL", params: { direction: dir } }
          }, function() { resolve(); });
        }).then(function() {
          return new Promise(function(r) { setTimeout(r, 500); });
        }));
      })(m[1]);
    }
    
    return Promise.all(promises);
  }
  
  function send() {
    var userText = String(prompt.value || "").trim();
    var vModel = visionSel.value;
    var tModel = textSel.value;
    var mode = modeSel.value;
    
    if (!userText && !currentImageBase64 && !visorActive) return;
    
    var savedImg = currentImageBase64 || captureVisorFrameBase64();
    var finalModel = savedImg ? vModel : tModel;
    
    if (!finalModel) {
      addMsg("system", "Select model");
      return;
    }
    
    if (savedImg && !vModel) {
      addMsg("system", "No vision model");
      return;
    }
    
    addMsg("user", userText || "(analysis)", savedImg);
    prompt.value = "";
    
    var imgForSending = savedImg;
    currentImageBase64 = null;
    updatePreview();
    
    setBusy(true);
    abortController = new AbortController();
    var signal = abortController.signal;
    
    var searchPromise = userText ? webSearch(userText) : Promise.resolve("");
    
    searchPromise.then(function(searchData) {
      if (userText && searchData) {
        addMsg("system", "Search complete");
      }
      
      var system = "";
      if (mode === "auto") {
        system = "You are autonomous AI agent. Control browser with:\n" +
          "[CLICK:x,y] - click coordinates\n" +
          "[TYPE:text] - type text\n" +
          "[PRESS:Enter] - press key\n" +
          "[SCROLL:down/up/top/bottom] - scroll\n" +
          "[OPEN:url] - open in panel\n\n" +
          "ALWAYS provide commands with screenshot/context.";
      } else {
        system = "You are AI assistant with internet.\n" +
          "Use [OPEN:url] to open pages.\n" +
          "Be concise.";
      }
      
      var userContent = "";
      if (searchData) {
        userContent += "SEARCH RESULTS:\n" + searchData.slice(0, 18000) + "\n\n";
      }
      userContent += "QUESTION: " + (userText || "Describe image and provide commands");
      
      var userMsg = { role: "user", content: userContent };
      if (imgForSending) {
        userMsg.images = [imgForSending];
      }
      
      var messages = [
        { role: "system", content: system },
        userMsg
      ];
      
      return ollamaChat(finalModel, messages, signal);
    }).then(function(answer) {
      addMsg("assistant", answer || "(empty)");
      return executeAICommands(answer);
    }).catch(function(e) {
      if (e.name === "AbortError") {
        addMsg("system", "STOP");
      } else {
        addMsg("system", "Error: " + e.message);
      }
    }).finally(function() {
      abortController = null;
      setBusy(false);
    });
  }
  
  btnSend.addEventListener("click", send);
  prompt.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  btnCancel.addEventListener("click", function() {
    if (abortController) {
      abortController.abort();
      addMsg("system", "Stop");
    }
  });
  
  loadModels();
  addMsg("system", "AI Vision Ultra - Google Fixed\n\nGoogle + all sites in iframe\nDuckDuckGo Lite\nGrok deep search\nAGENT mode - autonomous control\nCommands: [CLICK], [TYPE], [PRESS], [SCROLL], [OPEN]\nVideo recording\n32768 token context\n\nGoogle hack: igu=1 parameter\nNo sandbox restrictions\nAll headers removed\n\nSelect search engine and mode!");
})();
