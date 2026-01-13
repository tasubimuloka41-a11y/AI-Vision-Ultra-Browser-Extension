export const chatMemory = {
  async saveChatHistory(conversationId, messages, title = "New Conversation") {
    const data = await chrome.storage.local.get("conversations") || { conversations: [] };
    const conversations = data.conversations || [];
    const index = conversations.findIndex(c => c.id === conversationId);
    
    const now = Date.now();
    const chatData = {
      id: conversationId,
      title: title,
      created: index >= 0 ? conversations[index].created : now,
      updated: now,
      messages: messages,
      metadata: { model: "current", tokens: 0 }
    };

    if (index >= 0) {
      conversations[index] = chatData;
    } else {
      conversations.push(chatData);
    }

    await chrome.storage.local.set({ conversations });
    return chatData;
  },

  async loadChatHistory(conversationId) {
    const data = await chrome.storage.local.get("conversations");
    return (data.conversations || []).find(c => c.id === conversationId);
  },

  async listAllConversations() {
    const data = await chrome.storage.local.get("conversations");
    return data.conversations || [];
  },

  async deleteConversation(conversationId) {
    const data = await chrome.storage.local.get("conversations");
    const conversations = (data.conversations || []).filter(c => c.id !== conversationId);
    await chrome.storage.local.set({ conversations });
  },

  exportToJSON(conversations) {
    const blob = new Blob([JSON.stringify({ conversations }, null, 2)], { type: "application/json" });
    return URL.createObjectURL(blob);
  }
};
