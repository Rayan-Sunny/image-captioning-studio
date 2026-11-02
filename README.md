# Multimodal Image Captioning Studio

A full-stack, vision-language web application that generates natural language descriptions from images using Salesforce's **BLIP** (Bootstrapping Language-Image Pre-training) architecture.

---

## Architecture Overview

```
[User Browser]
       │
       ▼ (Image File + Optional Prompt)
[React Frontend] (Vercel)
       │
       ▼ (HTTPS REST Request: POST /caption)
[FastAPI Backend] (Hugging Face Spaces - Free Docker Tier)
       │
       ├── ViT-B/16 Encoder (Patch extraction & projection)
       ├── Multimodal Cross-Attention Bridge
       └── BERT Text Decoder (Autoregressive beam search, n=5)
       │
       ▼ (JSON Response: caption, model metadata, mode)
[React UI Display] (Typewriter render, Speech TTS, Copy button)
```

---

## Tech Stack

* **Frontend:** React 18, CSS Custom Properties (Dark Studio Theme), Web Speech API (TTS).
* **Backend:** FastAPI, Uvicorn, Python 3.10.
* **Deep Learning & NLP:** PyTorch, Hugging Face `transformers`, Salesforce `BLIP` (`blip-image-captioning-base`).
* **Deployment & Containerization:** Docker, Hugging Face Spaces (Free CPU 16GB RAM tier), Vercel.

---

## Key Features

1. **Unconditional & Conditional Captioning:** Generate open-ended image descriptions or guide the output using natural language prefixes (e.g., *"a photo of"*, *"there is"*).
2. **Instant Test Gallery:** Pre-loaded sample images for instant 1-click evaluation without requiring file uploads.
3. **Accessibility (Text-to-Speech):** Client-side speech synthesis using the browser's native Web Speech API.
4. **Interactive Telemetry:** Live typewriter rendering, model architecture breakdown, and recent history caching.
5. **Production Ready & Decoupled:** Containerized backend with CORS support and configurable environment variables.

---

## Local Development

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI server (runs on http://localhost:8000)
python app.py
```
> Interactive Swagger API documentation will be available at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Start React app (runs on http://localhost:3000)
npm start
```

---

## How to Deploy for Free (100% Free Tier)

### Step A: Deploy Backend to Hugging Face Spaces

1. Create a free account at [Hugging Face](https://huggingface.co/).
2. Click **New Space** → Name it (e.g., `image-captioning-api`).
3. Select **Docker** as the Space SDK and choose the **Blank** template.
4. Push or upload the contents of the `backend/` directory (`app.py`, `model.py`, `requirements.txt`, `Dockerfile`, `.dockerignore`) into the Space repository.
5. Hugging Face will automatically build and start the Docker container on port `7860`.
6. Your backend will be live at: `https://<your-username>-<space-name>.hf.space`

### Step B: Deploy Frontend to Vercel

1. Push your repository to your GitHub account.
2. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository and set the **Root Directory** to `frontend`.
4. In the **Environment Variables** section, add:
   * **Name:** `REACT_APP_API_URL`
   * **Value:** `https://<your-username>-<space-name>.hf.space`
5. Click **Deploy**. Vercel will build and provide a free HTTPS URL.

---

## Model Details & Technical Background

* **Image Encoder:** Vision Transformer (`ViT-B/16`), pre-trained on ImageNet. Divides the input image into $16 \times 16$ non-overlapping spatial patches, linearly projects them into visual tokens, and processes them with multi-head self-attention.
* **Text Decoder:** BERT-initialized language model with cross-attention layers inserted between self-attention and feed-forward networks, allowing textual generation tokens to query visual patch features.
* **Decoding Strategy:** Beam Search with beam width $k = 5$ and length normalization to prevent short-sequence bias.

---

## License
MIT License
