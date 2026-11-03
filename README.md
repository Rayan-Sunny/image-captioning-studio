# Multimodal Image Captioning Studio

A full-stack, vision-language web application that generates natural language descriptions from images using Salesforce's BLIP (Bootstrapping Language-Image Pre-training) architecture.

---

## Overview

The studio translates visual content into natural language through two primary modes:

| Mode | Description | Example Input | Generated Output |
| :--- | :--- | :--- | :--- |
| **Unconditional Captioning** | The model freely describes the primary scene without any guidance or bias. | Image of a dog sitting outside | *"a dog sitting on top of a wooden bench"* |
| **Conditional (Guided) Captioning** | A user-provided text prefix steers the language model to focus on specific context or framing. | Prefix: `"a scene of"` + Landscape image | *"a scene of a cloudy sunset with telephone poles at dusk"* |
| **Foreground / Texture Framing** | Conditions the cross-attention layers toward fine details and close-up features. | Prefix: `"a close-up shot of"` + Object image | *"a close-up shot of a cup of coffee next to an open book"* |

---

## Architecture

```
[User Browser]
       │
       ▼ (Image File + Optional Prefix Prompt)
[React Frontend Client]
       │
       ▼ (HTTP Multipart POST /caption)
[FastAPI Backend Service]
       │
       ├── Vision Transformer (ViT-B/16 Encoder)
       ├── Multimodal Cross-Attention Fusion Bridge
       └── BERT-based Text Decoder (Autoregressive Beam Search)
       │
       ▼ (JSON Response: Caption, Model Metadata, Mode)
[React Studio UI Display]
```

---

## Tech Stack

* **Frontend:** React 18, CSS Custom Properties (Dark Studio Theme), Web Speech API.
* **Backend:** FastAPI, Uvicorn, Python 3.10+.
* **Deep Learning & NLP:** PyTorch, Hugging Face Transformers, Salesforce BLIP (`blip-image-captioning-base`).

---

## Key Features

* **Studio Interface:** Clean dark workspace with drag-and-drop image input, real-time image preview, and responsive controls.
* **Pre-loaded Test Gallery:** Built-in photographic sample images for immediate testing without requiring local uploads.
* **Speech Synthesis (TTS):** Browser-native audio narration for accessibility.
* **Inference Telemetry:** Live measurement of model inference latency in milliseconds.
* **Export Options:** One-click clipboard copy and structured JSON report downloads.

---

## Project Structure

```
image-captioning-studio/
├── backend/
│   ├── app.py              # FastAPI application and REST endpoints
│   ├── model.py            # BLIP PyTorch model initialization and inference
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML entrypoint
│   ├── src/
│   │   ├── App.css         # Dark theme styling and design tokens
│   │   ├── App.js          # Root component
│   │   ├── BLIPAnalyzer.jsx# Studio workspace UI, state, and API handling
│   │   └── index.js        # React DOM render entry
│   └── package.json        # Frontend dependencies and scripts
├── .gitignore              # Files excluded from version control
└── README.md               # Project documentation
```

---

## How the Model Works

### 1. Image Encoding (ViT-B/16)
The input image is resized and split into a grid of 16x16 pixel patches. Each patch is flattened and transformed into a vector embedding. A Vision Transformer then processes these visual tokens through multiple layers of self-attention to build a rich representation of spatial relationships across the image.

### 2. Cross-Attention Fusion
The text decoder uses cross-attention layers to bridge language and vision. While generating words, the decoder continuously queries the visual patch embeddings from the encoder, allowing the model to ground every generated word in specific regions of the image.

### 3. Autoregressive Beam Search Decoding
The text decoder generates captions word by word. Instead of greedily picking only the single most likely next word, it uses **Beam Search** (keeping track of the 5 most promising sentence candidates simultaneously) and applies length normalization to produce balanced, accurate descriptions.

---

## Local Development

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
> Interactive API Swagger documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start React app (runs on http://localhost:3000)
npm start
```

---

## Credits & Acknowledgments

* **Academic Origin:** Developed as part of our university **Artificial Neural Networks & Computer Vision (ANN/CV)** coursework.
* **Early Collaboration:** Special thanks to course teammates who contributed to the initial exploration and early versions of this project.
* **Foundation Research:** Salesforce Research for developing and open-sourcing the BLIP architecture (*Li et al., ICML 2022*).
* **Hugging Face:** For hosting and maintaining the pre-trained weights in the Transformers library.

---

## License

This project is open-source and licensed under the [MIT License](LICENSE).
