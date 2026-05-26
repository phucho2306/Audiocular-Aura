# 🎧 AuraPEQ

> A premium browser-based controller to unlock and configure the hardware-level 8-band Parametric Equalizer (PEQ) on the **Audiocular Aura** DAC.

AuraPEQ communicates directly with the **Savitech CB5100** USB audio bridge chip inside the Audiocular Aura DAC (CS43131 + SGM8262 audio architecture) via the **WebHID API**. This allows you to configure a true hardware-level 8-band PEQ. All DSP math is calculated directly on the DAC hardware rather than running as a software overlay, saving system resources and preserving native audio fidelity.

Live Web App: **[https://mandy321.github.io/Audiocular-Aura/](https://mandy321.github.io/Audiocular-Aura/)**

---

## ✨ Features

* **Hardware-Level DSP Processing**: The audio filter logic is processed directly inside the DAC's integrated DSP chip.
* **Interactive Frequency Graph**: Drag and drop visual handles on a logarithmic grid to adjust Gain and Frequency, with real-time cumulative curve tracing.
* **8 Configurable Bands**: Individual frequency, gain, and Q (filter width) settings supporting Peak (`PK`), Low Shelf (`LSQ`), and High Shelf (`HSQ`) filter types.
* **Profile Import/Export**:
  * Save and load settings using standard `.json` configuration files.
  * Import standard **AutoEq text profiles** (compatible with presets exported from [AutoEq.app](https://autoeq.app) or [Squiglink](https://squig.link)).
* **Memory Persistence**:
  * **Sync to RAM**: Apply settings instantly in real-time to hear your changes.
  * **Save to Flash**: Write the settings permanently to the DAC's internal flash memory so they persist when you connect the DAC to other devices (like phones, tablets, or consoles).
* **Universal USB Override Connection**: If your specific DAC revision or batch reports different USB identification codes, you can input a custom hex Vendor ID (VID) and Product ID (PID) to bypass connections.

---

## 💻 Tech Stack

* **Core**: Pure semantic HTML5 and Vanilla TypeScript logic.
* **Styling**: Premium Glassmorphic Vanilla CSS (No heavy framework overlays).
* **Build Tool**: Vite v4 (configured with relative base paths for portable deployments).
* **Communication**: WebHID API.

---

## 🚀 Quick Start (Local Development)

### Prerequisites

You need [Node.js](https://nodejs.org/) installed (supports Node 16+).

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mandy321/Audiocular-Aura.git
   cd Audiocular-Aura
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:5173`** in a desktop Chromium-based browser (Chrome, Edge, Brave, or Opera).

4. **Compile production build**:
   ```bash
   npm run build
   ```

---

## 📖 How to Use

1. Connect your **Audiocular Aura** DAC to a USB port.
2. Open the [AuraPEQ Web App](https://mandy321.github.io/Audiocular-Aura/).
3. Click the **CONNECT DAC** button and select the device from the browser popup.
4. If the device does not show up:
   * Click **Show Custom USB Options**.
   * Inspect your system details to find the DAC's Vendor ID (VID) and Product ID (PID) in hex.
   * Input the values (e.g. `262a`) and click **CONNECT DAC** again.
5. Interact with the visualizer canvas by dragging the band handles, or configure parameters manually in the sidebar panel.
6. Click **SYNC TO RAM** to test the tuning.
7. Once satisfied with the sound, click **SAVE TO FLASH** to store your preset permanently on the DAC.

---

## ⚡ Deployment to GitHub Pages

This project is configured to easily deploy to GitHub Pages. To publish changes:

1. Build the production build locally:
   ```bash
   npm run build
   ```
2. Deploy the built `dist` folder to your `gh-pages` branch:
   ```bash
   npx gh-pages -d dist
   ```

---

## 🛡️ License

This project is open-source and licensed under the MIT License.
