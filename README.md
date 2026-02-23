<div align="center">

<img src="deepguard_logo_1771843398894.png" alt="DeepGuard AI Logo" width="180"/>

# 🎙️ DeepGuard AI — Deepfake Audio Detection System

**Detect AI-generated and spoofed voices with state-of-the-art Hybrid CNN+GRU deep learning.**

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![Librosa](https://img.shields.io/badge/Librosa-0.10-green)](https://librosa.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

## 📌 Overview

**DeepGuard AI** is a full-stack web application that detects **AI-generated (deepfake) speech** using a **Hybrid CNN + GRU Fusion Model** trained on the **ASVspoof 2019 LA dataset**. Upload an audio or video file, and the system will tell you within seconds whether the voice is **REAL** or **AI-generated** — with a confidence score.

> **Model Accuracy: 91.52% | Precision: 99.87% | F1 Score: 93.99%**

---

## ✨ Features

- 🔊 **Audio & Video Support** — Upload `.wav`, `.flac`, `.mp3`, `.ogg`, `.m4a`, `.mp4`, `.mkv`, `.avi`, and more
- 🧠 **Hybrid Dual-Branch Model** — SpectralCNN (mel-spectrogram) + TemporalGRU (raw audio frames) fusion
- 📊 **Confidence Scores** — Real vs. Fake probability with confidence percentage
- 📈 **Model Performance Dashboard** — Live accuracy, precision, recall, F1 score, ROC curve, confusion matrix, and training loss charts
- 🔐 **User Authentication** — JWT-based login/registration system
- 📜 **Prediction History** — Browse all past detections with timestamps
- 🏗️ **How It Works** — Step-by-step explanation of the detection pipeline
- 🌑 **Premium Dark UI** — Glassmorphism design, smooth animations, responsive layout

---

## 🧠 Model Architecture

The detection model is a **Hybrid Fusion Model** that processes audio through two parallel branches and combines their outputs for a comprehensive deepfake decision.

```
Input Audio (16kHz, 4s)
        │
┌────────────────────────────────────┐
│         Preprocessing              │
│  • Pad/trim to 4 seconds           │
│  • Amplitude normalization         │
└──────────────┬─────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌────────────┐      ┌──────────────┐
│ Mel-       │      │ Raw Audio    │
│ Spectrogram│      │ Framing      │
│ (128×128)  │      │ (400-sample  │
│            │      │  windows)    │
└─────┬──────┘      └──────┬───────┘
      │                    │
      ▼                    ▼
┌────────────┐      ┌──────────────┐
│ SpectralCNN│      │ TemporalGRU  │
│ Conv2d     │      │ GRU(400→128) │
│ 1→16→32    │      │ + FC(128→64) │
│ + FC→64    │      │              │
└─────┬──────┘      └──────┬───────┘
      │                    │
      └──────────┬──────────┘
                 │ Concat (128-dim)
                 ▼
        ┌─────────────────┐
        │ Classifier      │
        │ Linear(128→64)  │
        │ ReLU            │
        │ Linear(64→1)    │
        │ Sigmoid         │
        └────────┬────────┘
                 │
         ┌───────┴───────┐
         │               │
       FAKE            REAL
   (prob > 0.5)    (prob ≤ 0.5)
```

### Model Performance (ASVspoof 2019 LA — Test Set)

| Metric    | Score     |
|-----------|-----------|
| Accuracy  | **91.52%** |
| Precision | **99.87%** |
| Recall    | **88.76%** |
| F1 Score  | **93.99%** |

**Confusion Matrix (10,180 samples):**
|                 | Predicted REAL | Predicted FAKE |
|-----------------|:--------------:|:--------------:|
| **Actual REAL** |   2571 ✅       |   9 ❌          |
| **Actual FAKE** |   854 ❌        |   6746 ✅       |

---

## 🛠️ Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Core language |
| Flask | 3.1 | REST API server |
| Flask-JWT-Extended | 4.7 | Authentication |
| PyTorch | 2.x | Deep learning framework |
| Librosa | 0.10.2 | Audio feature extraction |
| MoviePy | 2.1.2 | Video audio extraction |
| SQLite | Built-in | User & prediction database |
| NumPy | Latest | Numerical operations |
| scikit-learn | 1.6.1 | Metrics calculation |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| Vite | 5 | Build tool |
| Recharts | Latest | Performance charts |
| Axios | Latest | HTTP client |
| CSS3 Glassmorphism | — | Premium dark theme |

---

## 📁 Project Structure

```
AI audio detection/
│
├── 📓 detection.ipynb              # Hybrid model training notebook
├── 🤖 hybrid_spoof_model.pth       # Trained hybrid model weights
├── 📖 README.md                    # This file
├── 🖼️ deepguard_logo_1771843398894.png  # Project logo
│
├── backend/                        # Flask API server
│   ├── app.py                      # Main Flask app & API endpoints
│   ├── model.py                    # Hybrid FusionModel + feature extraction
│   ├── generate_metrics.py         # Metrics generation script
│   ├── metrics.json                # Cached model metrics
│   ├── requirements.txt            # Python dependencies
│   └── uploads/                    # Temporary upload storage
│
└── frontend/                       # React web application
    ├── src/
    │   ├── App.jsx                 # Main app with routing
    │   ├── services/api.js         # Axios API service layer
    │   ├── pages/
    │   │   ├── Dashboard.jsx       # Main dashboard page
    │   │   └── Login.jsx           # Auth page (login/register)
    │   └── components/
    │       ├── AudioUpload.jsx     # Drag & drop file uploader
    │       ├── DetectionResult.jsx # Prediction result display
    │       ├── History.jsx         # Prediction history table
    │       ├── HowItWorks.jsx      # Pipeline explanation
    │       └── ModelAccuracy.jsx   # Performance charts
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+ (with pip)
- Node.js 18+ (with npm)
- The trained model file: `hybrid_spoof_model.pth` (included in the root folder)

---

### Backend Setup

**1. Navigate to the backend directory:**
```bash
cd "AI audio detection/backend"
```

**2. Create and activate a virtual environment:**
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

**3. Install dependencies:**
```bash
pip install -r requirements.txt
```

**4. Start the Flask server:**
```bash
python app.py
```

The backend will start at **`http://localhost:5000`**.

> **First launch:** The server automatically initializes the SQLite database and generates `metrics.json`.

---

### Frontend Setup

**1. Navigate to the frontend directory:**
```bash
cd "AI audio detection/frontend"
```

**2. Install Node dependencies:**
```bash
npm install
```

**3. Start the development server:**
```bash
npm run dev
```

The frontend will be available at **`http://localhost:5173`**.

---

## 🔌 API Reference

All endpoints are prefixed with `/api/`.

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login and receive JWT token | ❌ |
| `GET` | `/api/auth/me` | Get current user info | ✅ |

**Register / Login Request Body:**
```json
{
  "username": "yourname",
  "email": "you@email.com",
  "password": "yourpassword"
}
```

---

### Prediction

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `POST` | `/api/predict` | Run deepfake detection on uploaded file | ✅ |

**Request:** `multipart/form-data` with field `file`

**Response:**
```json
{
  "filename": "audio_sample.wav",
  "label": "FAKE",
  "confidence": 94.88,
  "real_probability": 5.12,
  "fake_probability": 94.88,
  "raw_score": 0.948832
}
```

---

### History & Metrics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `GET` | `/api/history` | Get user's prediction history (last 50) | ✅ |
| `GET` | `/api/metrics` | Get model performance metrics | ❌ |
| `GET` | `/api/how-it-works` | Get pipeline explanation content | ❌ |
| `GET` | `/api/health` | Server health check | ❌ |

---

## 🎛️ How It Works

### Step 1 — Upload
Upload any supported audio or video file. For videos, the audio track is automatically extracted.

### Step 2 — Dual Feature Extraction
The audio is preprocessed to **4 seconds at 16 kHz** (padded/trimmed and normalized), then processed through **two parallel feature pipelines**:
- **Mel Spectrogram** (128×128) — captures frequency-domain patterns over time
- **Temporal Frames** — raw audio framed into 400-sample windows (hop=160) for sequence analysis

### Step 3 — Hybrid Neural Network
- **SpectralCNN** branch: Two Conv2D layers (1→16→32 channels) with MaxPooling extract spatial features from the mel spectrogram → 64-dim output
- **TemporalGRU** branch: A GRU with 128 hidden units processes the sequential audio frames → 64-dim output
- Both 64-dim vectors are **concatenated** → 128-dim fused feature
- A **classifier head** (`Linear(128→64) → ReLU → Linear(64→1)`) produces the final logit

### Step 4 — Prediction
Sigmoid activation converts the logit to a probability:
- **> 0.5** → 🔴 **FAKE** (AI-generated / spoofed)
- **≤ 0.5** → 🟢 **REAL** (bonafide)

---

## 🏋️ Training

The model was trained using the **ASVspoof 2019 Logical Access (LA)** dataset:

- **Training attacks:** A01, A02, A03 (+ all bonafide samples)
- **Test attacks:** A04, A05 (+ all bonafide samples)
- **Optimizer:** Adam (lr=1e-4)
- **Loss function:** BCEWithLogitsLoss
- **Epochs:** 5
- **Batch size:** 8

To retrain the model, open `detection.ipynb` and update `BASE_PATH` to your dataset location, then run all cells.

---

## 📊 Supported File Formats

| Type | Formats |
|------|---------|
| 🎵 Audio | `.wav` `.flac` `.mp3` `.ogg` `.m4a` `.aac` `.wma` |
| 🎬 Video | `.mp4` `.mkv` `.avi` `.mov` `.webm` `.wmv` `.flv` |

**Maximum file size:** 50 MB

---

## 🔒 Security

- JWT tokens expire after **24 hours**
- Passwords are hashed using **SHA-256**
- All uploaded files are **automatically deleted** after processing
- CORS is restricted to API routes only

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [ASVspoof 2019 Challenge](https://www.asvspoof.org/) — Training dataset
- [Librosa](https://librosa.org/) — Audio processing library
- [PyTorch](https://pytorch.org/) — Deep learning framework

---

<div align="center">
  <p>Built with ❤️ using PyTorch, Flask, and React</p>
  <img src="deepguard_logo_1771843398894.png" alt="DeepGuard AI" width="60"/>
</div>
#   F i n a l - y e a r - p r o j e c t  
 