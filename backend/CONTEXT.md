# 📄 Product Requirements Document (PRD)  
## Project: Hausa Live Speech-to-Text App  
**Version:** 1.1 (MVP with Google API + Whisper Hybrid)  
**Prepared by:** [Your Team]  
**Date:** 2025-09-12  

---

## 1. 🎯 Purpose  
The app helps **Hausa-speaking users** transcribe their voice into text in real-time. It supports live microphone transcription, audio file uploads, and premium AI features such as translation, summarization, qa and offline transcription.  

1 ---

## 2. 🧑‍🤝‍🧑 Target Audience  
- **Students**: transcribe lectures in Hausa.  
- **Journalists**: convert interviews into text.  
- **Professionals**: capture meeting minutes.  
- **General Users**: daily dictation and accessibility.  

---

## 3. 🛠️ Core MVP Features  
### **Voice-to-Text (Google STT API)**  
- Live transcription via microphone (max 5 minutes/session).  
- Upload `.mp3` or `.wav` files for transcription.  
- Hausa (`ha`, `ha-NG`) supported.  

### **Text Management**  
- Real-time transcript display.  
- Copy, save, and export text (PDF, Word, TXT).  
- Transcript history with search.  

### **Basic AI Enhancements**  
- Auto punctuation and capitalization.  
- Clean formatting of Hausa text.  

### **App Basics**  
- User authentication (Email, Google, Facebook, Apple).  
- Simple dashboard: Record, Upload File, History.  
- Dark/Light mode support.  

---

## 4. 🚀 Premium Features (Phase 2)  
1. **Multilingual Translation**  
   - Hausa ↔ English, French, Arabic.  

2. **Smart Summarization**  
   - Summarize long transcriptions into key points.  

3. **Offline Mode (Whisper AI)**  
   - On-device transcription without internet.  
   - Whisper small/medium model integration in React Native.  

4. **Speaker Detection (Diarization)**  
   - Separate voices in interviews or meetings.  

5. **Sentiment Analysis**  
   - Detect tone of conversations (happy, angry, neutral).  

6. **Cloud Sync & Backup**  
   - Sync transcripts across devices.  

7. **Premium Subscription Plans**  
   - Free Tier: 5 minutes/day transcription.  
   - Pro Tier: Unlimited minutes, translations, summaries, export formats, offline mode.  

---

## 5. ⚖️ API & Rate Limits Strategy  
### **Google Cloud Speech-to-Text**  
- **Streaming Limit**: 5 minutes per session.  
- **Daily Quota**: ~480 minutes free, billed afterward (~$1.44/hour).  
- **Scaling**: Request quota increase for production.  

### **Whisper AI (Fallback/Offline)**  
- No rate limits if self-hosted or on-device.  
- Slower on low-end devices but ensures accessibility.  
- Premium users can use Whisper for unlimited transcription.  

---

## 6. 🧩 Technical Requirements  
### **Frontend (React Native)**  
- Microphone access for live transcription.  
- File picker for uploads.  
- Display live transcription text.  
- Export & share transcripts.  
- Authentication (Firebase Auth or OAuth).  

### **Backend (Node.js + Python Hybrid)**  
- **Google STT Integration** for online transcription.  
- **Whisper AI Service** for offline / unlimited transcription.  
- **OpenAI GPT / LLM** for punctuation, summarization, translations.  
- **Database**: Firebase / MongoDB for transcripts + users.  
- **Authentication**: JWT-based or Firebase Auth.  

---

## 7. 🏗️ Architecture Overview  
1. **React Native App** → Capture audio → Send to backend (if online).  
2. **Backend Service** → Process with Google API or Whisper AI.  
3. **AI Layer** → Enhance text (punctuation, translation, summarization).  
4. **Database** → Store transcripts and user history.  
5. **App UI** → Display live transcription + export/share options.  

---

## 8. 🎨 User Stories (MVP)  
- As a **student**, I want to record lectures in Hausa and see the text live.  
- As a **journalist**, I want to upload interviews and get transcripts.  
- As a **professional**, I want to export transcripts to Word/PDF.  
- As a **user**, I want punctuation automatically added.  

---

## 9. 📊 Success Metrics  
- ≥ 85% transcription accuracy for Hausa.  
- < 2s average delay in live transcription.  
- 1,000 daily active users in first 3 months.  
- < 1% crash rate.  

---

## 10. 🗓️ Roadmap  
### **Phase 1 (MVP – 3 months)**  
- Google STT live + file upload transcription.  
- Export & history.  
- Basic punctuation.  
- Authentication.  

### **Phase 2 (Premium – 6 months)**  
- Summarization, translations.  
- Offline mode with Whisper AI.  
- Speaker diarization.  
- Cloud sync.  
- Premium subscription model.  

---
