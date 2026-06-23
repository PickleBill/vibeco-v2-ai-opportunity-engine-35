import { callLLM } from "../llm-client.ts";
import { selectModel } from "../model-router.ts";
import type { ImageInput, ImageResult, ImageType } from "../types.ts";

// ─── Prompt Templates ───

function buildImagePrompt(idea: string, type: ImageType): string {
  if (type === "concept") {
    return `Create a sleek, modern product concept visualization for this startup idea: "${idea}".
Style: Dark theme, minimal, futuristic UI mockup or abstract product visualization.
Use a dark navy/charcoal background with glowing accent highlights in cyan/teal.
Make it look like a premium tech product hero image. No text or words in the image.
Professional, clean, and visually striking.`;
  }

  return `Create a minimal, modern logo mark or product icon for this startup idea: "${idea}".
Style: Simple geometric mark on a solid white background.
Modern, tech-forward, clean lines, single accent color (teal/cyan).
No text, just an abstract icon that represents the core concept.
Think Apple-level simplicity and memorability.`;
}

// ─── Core Logic ───

export async function generateImage(input: ImageInput): Promise<ImageResult> {
  const model = selectModel("image-generation");
  const prompt = buildImagePrompt(input.idea, input.type);

  const response = await callLLM({
    model,
    messages: [{ role: "user", content: prompt }],
    modalities: ["image", "text"],
  });

  const imageUrl = response.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error("No image generated");
  }

  return { image_url: imageUrl };
}
