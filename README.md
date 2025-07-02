# 🍅 DeepFlow – Pomodoro Timer for Obsidian

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-%23FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/alejandroponce)

A native-feeling Pomodoro timer plugin for Obsidian with session tracking, statistics, notifications, and a minimal, beautiful UI.

---

## ✨ Features

- **Pomodoro Timer:** Customizable work, short break, and long break durations
- **Status Bar Timer:** Live countdown with native Lucide icons in the status bar
- **Ribbon Icon:** Quick access timer icon in the left ribbon
- **Session Tracking:** Logs each session with type, timestamp, and duration
- **Statistics Dashboard:** View sessions by day, week, month, and year
- **Notifications:** Obsidian and system notifications on session transitions
- **Settings Tab:** Configure durations, notifications, and behavior
- **Local Storage:** All data is stored locally using Obsidian's API
- **Command Palette:** Start, pause, reset, and open DeepFlow from anywhere

---

## 🚀 Installation

### Manual

1. Download `main.js`, `manifest.json`, and `versions.json` from the `plugin/` folder.
2. Place them in a new folder in your vault:  
   `.obsidian/plugins/deepflow/`
3. Enable DeepFlow in Obsidian's Community Plugins settings.

### Development

1. Clone this repo and run:
   ```bash
   npm install
   npm run build
   ```
2. Copy the built files (`main.js`, `manifest.json`, `versions.json`) to your vault's plugins folder.

---

## 🎮 Usage

- **Ribbon Icon:** Click the ⏰ timer icon in the left ribbon to open DeepFlow.
- **Status Bar:** Click the timer in the status bar to open DeepFlow.
- **Command Palette:** Use commands like "DeepFlow: Start timer", "Pause timer", etc.

---

## ⚙️ Configuration

Go to Settings → Plugin Options → DeepFlow to customize:
- Work, short break, and long break durations
- Long break interval
- Auto-start next session
- Enable/disable notifications
- Export or clear session data

---

## 📊 Statistics

- **Today, Week, Month, Year:** See your productivity at a glance
- **Total Time:** Track your focused work time
- **Streak:** Consecutive days with at least one work session

---

## 🛠️ Development

- Built with TypeScript and Obsidian's plugin API
- Modular architecture: `main.ts`, `timer.ts`, `sessionManager.ts`, `ui.ts`, `settings.ts`
- Uses native Lucide icons for a professional, consistent look

---

## 📄 License

MIT License © 2025 Alejandro Ponce

---

**Get things done with DeepFlow — today!** 🍅