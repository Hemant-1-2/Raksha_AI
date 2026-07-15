# 🛡️ Raksha AI — Digital Public Safety Shield

**Raksha AI** is a software-only web platform that helps citizens detect and respond to digital fraud in real time — before money is lost, not after a complaint is filed. Built for the ET AI Hackathon 2026, it targets a problem India is living through at scale: digital-arrest scams, UPI payment fraud, fake investment schemes, and sextortion, all of which currently rely on victims recognizing manipulation tactics on their own, in the moment, with no help.

No hardware. No IoT. No physical device integration — every module runs entirely in the browser and server, powered by the Gemini API.

---

## 🚨 The Problem

India recorded over 1.1 million cybercrime complaints in a single year, with financial losses running into thousands of crores. Digital arrest scams, fake UPI collect requests, pump-and-dump investment schemes, and sextortion threats share a common failure point: **victims don't have a fast, trustworthy way to check "is this real?" in the moment they're being pressured.** By the time a complaint is filed, the money is usually already gone.

Raksha AI closes that gap with instant, explainable, AI-powered verdicts — accessible to anyone with a browser, no app install or technical knowledge required.

---

## ✨ Features

| Module | What it does |
|---|---|
| 🔎 **Scam & Digital Arrest Checker** | Paste a call transcript or message → get a risk score, detected manipulation tactics, plain-language explanation, and recommended next step |
| 💰 **Counterfeit Currency Checker** | Upload a photo of a currency note → get an AI-assisted plausibility verdict with explanation (prototype heuristic, clearly labeled as such) |
| 📱 **UPI/QR Payment Request Checker** | Upload a screenshot of a QR code or payment request → instantly know whether scanning it will **send** or **receive** money — the single most common point of confusion in UPI scams |
| 📈 **Investment Scheme Checker** | Paste a "guaranteed returns" investment pitch or group chat message → get flagged for classic pyramid/pump-and-dump red flags |
| 💔 **Threat Support (Sextortion/Deepfake Advisor)** | A shame-free, privacy-first space for anyone facing blackmail threats — no image upload required, no data stored, just calm and practical guidance |
| 🕸️ **Fraud Network Graph** | Interactive visualization showing how individually-reported scams connect into larger fraud rings (demo dataset) |
| 👮 **Officer Dashboard** | Authenticated, allowlisted view for law enforcement to review recent check activity, sorted by risk |
| 🔗 **Forward to Check** | Generate a shareable summary link so users can get a second opinion from family instantly — no walkthrough or install needed |

---

## 🎯 Why This Matters

- **Elderly relatives** are disproportionately targeted by digital arrest scams and are least equipped to recognize manipulation — Raksha AI is built to be something *anyone* can use in under 60 seconds, mid-call.
- **UPI fraud** persists largely because most users don't understand that scanning a QR code can *send* money, not just receive it — a single clear verdict solves this instantly.
- **Sextortion victims** are among the most underreported due to shame and fear — a judgment-free, no-storage tool lowers the barrier to getting help.
- Every module is designed to be **proactive**, catching fraud before a transfer happens, not investigating it afterward.

---

## 🏗️ Tech Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **AI/LLM:** Gemini API (server-side calls only — no client-exposed API keys)
- **Backend/Database:** Firebase (Firestore + Authentication)
- **Hosting:** Google Cloud Run
- **Built with:** Google AI Studio (Build mode)

---

## ⚠️ Prototype Disclaimers

- The **Counterfeit Currency Checker** uses a Gemini vision heuristic, not a certified/trained currency-authentication model. It is explicitly labeled as a prototype assessment tool, not a certified detector.
- The **Fraud Network Graph** uses a bundled mock dataset for demonstration purposes — no real financial or personal data is used.
- The **Threat Support** module does not store any user input, by design.
- This is a hackathon prototype, not a production security tool. Review all AI-generated Firebase security rules before any real-world deployment.

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/<your-username>/raksha-ai.git
cd raksha-ai

# Install dependencies
npm install

# Set your Gemini API key (server-side only)
echo "GEMINI_API_KEY=your_key_here" > .env.local

# Run locally
npm run dev
```

The app also supports one-click deployment to Google Cloud Run directly from Google AI Studio.

---

## 📸 Screenshots

*(Add screenshots or a demo GIF of each module here before submission)*

---

## 🗺️ Roadmap

- [ ] Train a real currency-authentication CNN classifier to replace the vision-heuristic prototype
- [ ] Add regional language support beyond English/Hindi
- [ ] Real-time complaint pattern clustering across users
- [ ] Time-based scam hotspot analytics for law enforcement

---

## 🤝 Contributing

This project was built for the ET AI Hackathon 2026. Issues and pull requests are welcome — please open an issue before submitting major changes.

## 📄 License

*(Add your chosen license here, e.g. MIT)*
