# AI Vision Ultra - Chrome Extension

## Overview
This is a Chrome browser extension (Manifest V3) that provides AI vision capabilities with Google integration, iframe support for all websites, DDG, Grok, and Agent features.

## Project Structure
- `manifest.json` - Extension manifest (Manifest V3)
- `background.js` - Service worker for background tasks
- `content.js` - Content script injected into web pages
- `sidepanel.html` - Side panel UI
- `sidepanel.js` - Side panel logic
- `rules.json` - Declarative net request rules
- `server.js` - Preview server for viewing extension files in Replit

## How to Use

### In Replit
The preview server displays the extension files and installation instructions. You can view and download individual files.

### Installing the Extension
1. Download all extension files to a folder on your computer
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the folder containing the extension files

## Extension Permissions
- sidePanel, storage, unlimitedStorage
- tabs, activeTab, scripting
- downloads, declarativeNetRequest, tabCapture
- Host permissions: all URLs

## Development
The extension uses standard web technologies (HTML, CSS, JavaScript) with Chrome Extension APIs. No build step required.
