# Done 📚

> **🤖 Built with AI** — This app was designed and developed with the help of multiple AI tools:
> - 🟣 **Claude** (Anthropic) — architecture, logic, and problem solving
> - 🔵 **Google Gemini** — research and ideation
> - ⚫ **GitHub Copilot** — in-editor code suggestions and autocomplete
>
> From architecture decisions to UI components, AI was a core part of the process. This is what human creativity + AI collaboration can build.

Done is an Expo-based productivity app for tracking tasks, work sessions, and daily progress. It combines a timer, folder-based organization, calendar planning, and analytics so you can manage long-running work without losing sight of what needs to happen today.

---

## ✨ Features

- ⏱️ Time tracking with start, pause, stop, and live session progress.
- 📅 Daily workload planning with scheduled dates and deadlines.
- 🗂️ Folder hierarchy for organizing tasks into nested workspaces.
- 📈 Analytics for today, this week, recent days, and task-level breakdowns.
- 🔁 Carry-over logic that moves unfinished daily work forward automatically.
- ✅ Completion tracking by hours, chapters, days, or one-time goals.
- 📝 Chapter tracking for tasks that need step-by-step progress.
- 🎨 Light, dark, and system theme modes.
- 💾 Local persistence with export and clear-data controls.
- 🔔 Haptic-friendly interactions and native date/time pickers.

---

## 🗺️ Roadmap — What's Coming

There's a lot still to build. Here are features planned or in progress:

- [ ] Cloud sync & multi-device support
- [ ] Notifications and reminders for scheduled tasks
- [ ] Widgets (home screen timer/progress)
- [ ] Tags and priority levels for tasks
- [ ] Recurring task support
- [ ] Pomodoro / focus mode
- [ ] Google Calendar / Apple Calendar integration
- [ ] Better analytics — streaks, productivity score, trends
- [ ] Collaborative workspaces (shared folders/tasks)
- [ ] Play Store release 🚀

Have an idea? Open an issue or start a discussion!

---

## 🤝 Contributing

Contributions are welcome! Whether it's fixing a bug, improving UX, adding a feature from the roadmap, or just cleaning up code — feel free to get involved.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add: your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please open an issue first for major changes so we can discuss before you build.

---

## 🧭 How It Works

1. Add a task with a daily target.
2. Organize it inside folders if needed.
3. Start the timer when you begin working.
4. Pause or switch tasks anytime; progress is preserved.
5. Review daily totals, calendar schedules, and analytics from the bottom tabs.
6. Export your data anytime from Settings for backup.

---

## 🚀 Getting Started

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run start:offline
```

If your network is working normally, you can also run:

```bash
npx expo start
```

If `npx expo start` fails with `TypeError: fetch failed`, use `npm run start:offline` instead. That skips the network check and is usually the quickest way to launch the app locally.

---

## 📱 Available Screens

- **Home** — today's tasks, progress summary, and active timer state.
- **Folders** — nested workspace management and bulk completed-task cleanup.
- **Calendar** — scheduled tasks, deadlines, and day-based planning.
- **Analytics** — weekly charts and task-by-task time breakdowns.
- **Settings** — theme selection, data export, data reset, and update checks.

---

## 🛠️ Scripts

```bash
npm run start
npm run start:offline
npm run android
npm run ios
npm run web
npm run lint
npm run build:apk
npm run build:apk:local
```

---

## 🧱 Tech Stack

- Expo Router for file-based navigation
- React Native + TypeScript
- AsyncStorage for local persistence
- Day.js for date and deadline logic
- Expo Updates for app update checks

---

## 📦 Notes

- The app stores data locally on the device.
- This project is source-available. You are welcome to learn from it, contribute to it, and suggest improvements. Please do not republish or redistribute it as your own app.

---

## 📄 License

This project is **not open source** in the traditional sense. All rights reserved by the author. You may read and contribute to the code, but you may not copy, redistribute, or publish it (or derivatives of it) without explicit permission.

---

*Made with curiosity, caffeine, and a lot of AI prompts. ☕🤖*