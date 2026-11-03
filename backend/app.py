"""
app.py — BLIP Image Captioning Backend (FastAPI + Gradio)
Compatible with Hugging Face Spaces (Gradio SDK) and standalone FastAPI/Uvicorn.
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import shutil, os, uvicorn
import gradio as gr

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


# Gradio Web Interface (for direct testing on Hugging Face)
def gradio_predict(img_path, prompt_text):
    if not img_path:
        return "Please upload an image."
    res = caption_image(img_path, prompt_text or "")
    return res["caption"]

demo = gr.Interface(
    fn=gradio_predict,
    inputs=[
        gr.Image(type="filepath", label="Input Image"),
        gr.Textbox(label="Prompt Prefix (Optional)", placeholder="e.g. a photo of")
    ],
    outputs=gr.Textbox(label="Generated Caption"),
    title="BLIP Image Captioning API",
    description="Multimodal Vision-Language Studio powered by Salesforce BLIP (ViT-B/16 + BERT Text Decoder)."
)

# Mount Gradio UI on top of FastAPI
app = gr.mount_gradio_app(app, demo, path="/")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"Starting BLIP Captioning API on port {port}...")
    print(f"Docs: http://localhost:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
