export const imageProcessor = {
  async loadImage(imageData) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
    });
  },

  async processScreenshot(imageData) {
    const img = await this.loadImage(imageData);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  },

  async addTextToImage(imageData, text, options = {}) {
    const img = await this.loadImage(imageData);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    
    const {
      fontSize = 30,
      color = 'white',
      fontFamily = 'Arial',
      x = 50,
      y = 50,
      strokeColor = 'black',
      strokeWidth = 2
    } = options;

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    
    return canvas.toDataURL('image/png');
  },

  async applyFilters(imageData, filterName) {
    const img = await this.loadImage(imageData);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    const filters = {
      grayscale: 'grayscale(100%)',
      sepia: 'sepia(100%)',
      blur: 'blur(5px)',
      invert: 'invert(100%)'
    };

    ctx.filter = filters[filterName] || 'none';
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  },

  async mergeImages(images, layout = 'vertical') {
    const loadedImages = await Promise.all(images.map(img => this.loadImage(img)));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (layout === 'vertical') {
      canvas.width = Math.max(...loadedImages.map(img => img.width));
      canvas.height = loadedImages.reduce((sum, img) => sum + img.height, 0);
      let currentY = 0;
      loadedImages.forEach(img => {
        ctx.drawImage(img, 0, currentY);
        currentY += img.height;
      });
    } else {
      canvas.height = Math.max(...loadedImages.map(img => img.width));
      canvas.width = loadedImages.reduce((sum, img) => sum + img.width, 0);
      let currentX = 0;
      loadedImages.forEach(img => {
        ctx.drawImage(img, currentX, 0);
        currentX += img.width;
      });
    }

    return canvas.toDataURL('image/png');
  }
};
