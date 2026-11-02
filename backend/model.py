"""
model.py — BLIP Multimodal Image Captioning
Architecture: ViT (image encoder) + Text Decoder (language model)
Pretrained model: Salesforce/blip-image-captioning-base

How it works:
  1. ViT encodes the image into patch embeddings
  2. Text decoder (BERT-like) attends to image embeddings
     and auto-regressively generates a natural language caption
  3. Optional: conditional captioning — provide a prompt to guide output
"""

import torch
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image

print("Loading BLIP (ViT + Text Decoder)...")

MODEL_NAME = "Salesforce/blip-image-captioning-base"
processor  = BlipProcessor.from_pretrained(MODEL_NAME)
model      = BlipForConditionalGeneration.from_pretrained(MODEL_NAME)
model.eval()

for p in model.parameters():
    p.requires_grad = False

print("BLIP loaded successfully.")
print(f"  Image encoder : ViT-B/16")
print(f"  Text decoder  : BERT-based language model")
print(f"  Model         : {MODEL_NAME}")


def caption_image(image_path: str, prompt: str = "") -> dict:
    """
    Generate a caption for the given image.

    Args:
        image_path : path to image file
        prompt     : optional text prompt to condition the caption
                     e.g. "a photo of" -- leave empty for unconditional

    Returns:
        dict with caption, prompt used, and model info
    """
    image = Image.open(image_path).convert("RGB")

    if prompt.strip():
        # Conditional captioning -- caption guided by the prompt
        inputs = processor(image, text=prompt.strip(), return_tensors="pt")
        mode   = "conditional"
    else:
        # Unconditional captioning -- model describes freely
        inputs = processor(image, return_tensors="pt")
        mode   = "unconditional"

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=50,
            num_beams=5,
            early_stopping=True,
        )

    caption = processor.decode(output_ids[0], skip_special_tokens=True)

    return {
        "caption":  caption,
        "prompt":   prompt.strip() if prompt.strip() else None,
        "mode":     mode,
        "model":    MODEL_NAME,
        "encoder":  "ViT-B/16",
        "decoder":  "BERT-based text decoder",
    }
