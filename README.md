# CubeSync 3D - AI Camera Scanner & Interactive Rubik's Cube Solver PWA

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-black?style=flat&logo=three.js&logoColor=white)](https://threejs.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**CubeSync 3D** is an open-source, full-stack client-side Progressive Web Application (PWA) that solves any standard 3x3 Rubik's Cube. It features live device camera scanning, an interactive 3D WebGL visualizer with real-time rotation arrows, dual solving engines (Optimal Herbert Kociemba & Beginner CFOP), an intuitive multi-mode manual cube builder with physical validation rules, a WCA speedcubing timer, and an adjustable luxury monochrome theme.

---

## ✨ Features

- 📸 **Camera Scanner**: Real-time 3x3 HUD reticle with automatic color detection, edge/corner correction, and mobile browser camera support.
- 🧊 **Interactive 3D WebGL Visualizer**: Built with Three.js. Smooth 3D animations, single-finger orbit, occlusion-free rotation arrows, active-layer glowing wireframes, and "Focus Face" auto-camera alignment.
- 🧠 **Dual Solving Engine**:
  - **Optimal Method (Herbert Kociemba)**: Finds near-God's-number solutions (~20 moves) in milliseconds.
  - **Beginner CFOP Method**: Step-by-step 5-stage beginner solution (White Cross, First Layer Corners, F2L, Yellow Cross, Permutations).
- 🎮 **Smart Manual Cube Input**:
  - **3D Direct Painter**: Tap stickers directly on the 3D cube to paint or cycle colors.
  - **Step-by-Step Face Wizard**: Guided face-by-face setup with physical validation rules.
  - **Strict Physical Rule Enforcement**: Automatically prohibits duplicate colors on the same piece, opposite-color conflicts (e.g. White & Yellow, Green & Blue, Red & Orange), and exceeding the 9-sticker capacity.
  - **Start Empty Mode**: Start with a blank slate and fill in stickers piece-by-piece.
  - **WCA Scramble / Preset Input**: Direct paste or click famous benchmarks (Checkerboard, Superflip, T-Perm).
- ⏱️ **Speedcubing Timer**: Spacebar & touch-to-arm timer with live Ao5 and personal best tracking.
- 🖤 **Luxury Monochrome Black & White Theme**:
  - Dedicated **Theme & Black Depth Settings Modal**.
  - Continuous **Black Intensity Slider** (20% to 100%).
  - Presets: **OLED True Black (100%)**, **Obsidian (85%)**, **Charcoal (70%)**, **Graphite (50%)**.
- 📱 **PWA & Mobile Ready**:
  - Native-style mobile bottom navigation.
  - Installable to desktop or mobile home screens.
  - Full offline support with Service Worker caching.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm or yarn

### Installation
```bash
git clone https://github.com/gauravsharma1106/cube-solver.git
cd cube-solver
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **3D Graphics**: Three.js + OrbitControls
- **Solving Algorithms**: Two-Phase Kociemba Algorithm + CFOP Layer-by-Layer
- **Styling**: Tailwind CSS + CSS Custom Properties
- **Audio & Speech**: Web Audio API synthesizer + Web Speech API synthesis
- **PWA**: Web App Manifest + Service Worker

---

## 📄 License

MIT License. Free for personal and commercial use.
