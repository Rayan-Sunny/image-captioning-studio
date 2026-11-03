# 🖼️ Multimodal Image Captioning Studio

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![HuggingFace](https://img.shields.io/badge/Model-Salesforce_BLIP-FFD21E?logo=huggingface&logoColor=black)](https://huggingface.co/Salesforce/blip-image-captioning-base)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An end-to-end multimodal deep learning web application that automatically translates visual content into rich, context-aware natural language captions. 

Built using **Salesforce's BLIP** (Bootstrapping Language-Image Pre-training) architecture, the system combines a **Vision Transformer (ViT-B/16)** image encoder with a **BERT-based autoregressive text decoder** fused through cross-attention mechanisms.

---

## 📌 Project Overview & Modes

The studio supports two distinct generation modes:

| Generation Mode | Description | Example Input | Generated Output |
| :--- | :--- | :--- | :--- |
| **Unconditional Captioning** | The model generates an open-ended, free-form description of the primary visual scene without any textual bias. | *[Image of a dog on a bench]* | *"a dog sitting on top of a wooden bench"* |
| **Conditional (Guided) Captioning** | A user-provided prompt prefix guides the decoder's beam search to focus on specific stylistic or contextual details. | Prompt: `"a scene of"` + *[Cloudy sunset image]* | *"a scene of a cloudy sunset with telephone poles at dusk"* |
| **Close-Up / Detail Framing** | Focuses the cross-attention layers on foreground textures and fine-grained visual features. | Prompt: `"a close-up shot of"` + *[Coffee cup]* | *"a close-up shot of a steaming cup of coffee next to a book"* |

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Client Browser                       │
│  React 18 Studio · Web Speech TTS · Telemetry Metrics │
└──────────────────────────┬─────────────────────────────┘
                           │  Multipart / Form-Data (Image + Prefix)
                           ▼
┌────────────────────────────────────────────────────────┐
│                FastAPI Inference Server                │
│  Dockerized · Port 7860 · CORS · Async File Handling   │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────────┐
│  ViT-B/16 Image Encoder │ │ BERT Autoregressive Decoder │
│  · Resizes to 384×384   │ │ · Multimodal Cross-Attention│
│  · 16×16 Visual Patches │ │ · Beam Search (k = 5)       │
│  · Continuous Embeddings│ │ · Natural Language Tokens   │
└────────────┬────────────┘ └─────────────▲───────────────┘
             │                            │
             └────── Cross-Attention ─────┘
                           │
                           ▼
              Decoded JSON Payload & Audio
```

---

## ✨ Key Features

* **🎨 Modern Studio UI:** Sleek glassmorphic dark interface with drag-and-drop uploads, instant previews, and sample image carousels.
* **⚡ 1-Click Sample Gallery:** Pre-curated visual samples (*Wildlife, Cityscapes, Still Life, Nature*) for instant testing without uploading files.
* **🗣️ Native Web Speech (TTS):** Browser-native speech synthesis to read captions aloud for accessibility.
* **⏱️ Latency & Telemetry Tracker:** Real-time inference timer measuring token generation latency in milliseconds.
* **📋 Export & Share:** One-click clipboard copy and full inference JSON report downloads.
* **🐳 Fully Containerized:** 100% reproducible Docker setup optimized with multi-stage layer caching.

---

## 📂 Repository Structure

```tree
image-captioning-studio/
├── backend/
│   ├── app.py              # FastAPI application & REST endpoints
│   ├── model.py            # Salesforce BLIP PyTorch inference engine
│   ├── requirements.txt    # Python dependencies (Torch, Transformers, FastAPI)
│   ├── Dockerfile          # Container specification for cloud deployment
│   └── .dockerignore       # Docker build exclusion rules
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML entrypoint & metadata
│   ├── src/
│   │   ├── App.css         # Custom dark studio theme & design system
│   │   ├── App.js          # Root component
│   │   ├── BLIPAnalyzer.jsx# Studio workspace UI, state & telemetry
│   │   └── index.js        # React DOM render entry
│   └── package.json        # Frontend configuration & dependencies
├── .gitignore              # Git ignore rules (venv, node_modules)
└── README.md               # Project documentation
```

---

## 🔬 Theoretical Background (BLIP)

### 1. Vision Transformer Encoder (ViT-B/16)
Rather than standard convolutional feature maps, the model splits the input image $\mathbf{x} \in \mathbb{R}^{H \times W \times C}$ into non-overlapping patches $\mathbf{x}_p \in \mathbb{R}^{N \times (P^2 \cdot C)}$, where $P = 16$. These patches are linearly projected into embedding vectors, prepended with a learnable `[CLS]` token, and passed through 12 multi-head self-attention layers to produce contextual visual representations.

### 2. Multimodal Cross-Attention
The BERT-initialized text decoder inserts cross-attention layers between each self-attention and feed-forward block:
$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
Where:
* **Queries ($Q$):** Generated from the textual tokens (conditioned prefix or previous step tokens).
* **Keys ($K$) and Values ($V$):** Derived from the visual patch embeddings output by the ViT encoder.

### 3. Autoregressive Beam Search
During inference, the decoder searches for the most probable token sequence using **Beam Search ($k=5$)**, maintaining the top 5 highest-probability candidate sequences at each decoding step with length penalty normalization to avoid sequence length bias.

---

## 🚀 Running Locally

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server (runs on http://localhost:8000)
python app.py
```
> Interactive API Swagger Documentation is automatically served at: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend

# Install node packages
npm install

# Start React development server (runs on http://localhost:3000)
npm start
```

---

## 🌐 Production Cloud Deployment

* **Backend Inference API:** Containerized using Docker and deployed on **Hugging Face Spaces** (Free CPU Tier with 16 GB RAM).
* **Frontend Application:** Deployed globally on the **Vercel Edge Network** with continuous delivery linked to GitHub.

---

## 👥 Credits & Acknowledgments

* **Academic Origin:** This project originated as an academic project for our university **Artificial Neural Networks & Computer Vision (ANN/CV)** coursework.
* **Early Collaboration:** Special thanks to course teammates who collaborated on the early version and initial experiments of this project.
* **Foundation Research:** Salesforce Research for developing and open-sourcing the **BLIP** architecture:
  > *Li, J., Li, D., Xiong, C., & Hoi, S. (2022). BLIP: Bootstrapping Language-Image Pre-training for Unified Vision-Language Understanding and Generation. ICML 2022.*
* **Hugging Face:** For the pre-trained model weights (`Salesforce/blip-image-captioning-base`) in the Transformers library.

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
