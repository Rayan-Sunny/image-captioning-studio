"""
app.py — FastAPI backend for BLIP Image Captioning
Run:      python app.py
API docs: http://localhost:8000/docs
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import shutil, os, uvicorn

from model import caption_image

app = FastAPI(
    title="BLIP Image Captioning API",
    description="Salesforce BLIP — ViT image encoder + BERT-based text decoder, automatic image captioning"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CaptionResponse(BaseModel):
    caption:  str
    prompt:   Optional[str]
    mode:     str
    model:    str
    encoder:  str
    decoder:  str


@app.get("/")
def root():
    return {
        "message": "BLIP Image Captioning API",
        "model":   "Salesforce/blip-image-captioning-base",
        "architecture": {
            "image_encoder": "ViT-B/16",
            "text_decoder":  "BERT-based language model"
        },
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/caption", response_model=CaptionResponse)
async def caption_endpoint(
    image:  UploadFile = File(...),
    prompt: Optional[str] = Form(default="")
):
    temp_path = f"temp_{image.filename}"
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(image.file, f)

        print(f"Captioning '{image.filename}' | prompt='{prompt}'")
        result = caption_image(temp_path, prompt or "")
        print(f"Caption: {result['caption']}")

        return CaptionResponse(**result)

    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting BLIP Captioning API on port {port}...")
    print(f"Docs: http://localhost:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
