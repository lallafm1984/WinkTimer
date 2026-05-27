# Wink Timer Store Ads

Editable HTML/CSS source for five Wink Timer store advertising images.

## Edit

- Text and slide choices: `slides.js`
- Layout, colors, typography: `styles.css`
- Source app screenshots: `assets/screenshots/`

Open `index.html` in a browser to preview all boards.

To preview a single export board:

```text
index.html?slide=look
```

Available slide ids: `timer`, `look`, `wink`, `smile`, `settings`.

## Export PNG

Run from PowerShell:

```powershell
.\capture.ps1
```

The script uses installed Chrome or Edge in headless mode and writes `1080x1920` PNG files to `output/`.
