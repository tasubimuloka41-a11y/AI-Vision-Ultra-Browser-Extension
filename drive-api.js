export const driveApi = {
  async authenticateUser() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  },

  async uploadScreenshot(imageData, filename) {
    const token = await this.authenticateUser();
    const metadata = {
      name: filename,
      mimeType: 'image/png'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', imageData);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + token }),
      body: form
    });

    return await response.json();
  },

  async listFiles() {
    const token = await this.authenticateUser();
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      headers: new Headers({ 'Authorization': 'Bearer ' + token })
    });
    return await response.json();
  },

  async downloadFile(fileId) {
    const token = await this.authenticateUser();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: new Headers({ 'Authorization': 'Bearer ' + token })
    });
    return await response.blob();
  }
};
