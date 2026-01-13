export const m365Copilot = {
  copilotUrl: "https://m365.cloud.microsoft/chat?fromcode=cmmvw3ycmhe&auth=2",

  async openCopilotSession() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "openCopilot", url: this.copilotUrl }, (response) => {
        resolve(response);
      });
    });
  },

  async sendMessage(text) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "sendMessageToCopilot", text }, (response) => {
        resolve(response);
      });
    });
  },

  async getCopilotResponse() {
    // Logic to scrape or receive response
    return "Response from M365 Copilot";
  },

  async monitorCopilotFiles() {
    // Logic to detect new files in the chat
    console.log("Monitoring M365 files...");
  },

  async syncToGoogleDrive(file, folderName = "M365 Copilot Files") {
    // Integration with existing drive-api.js
    console.log(`Syncing ${file.name} to Drive folder ${folderName}`);
  }
};
