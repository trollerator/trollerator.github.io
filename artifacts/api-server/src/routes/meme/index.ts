import { Router } from "express";
import { memoryStorage } from "multer";
import multerFactory from "multer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { editImages } from "@workspace/integrations-openai-ai-server/image";
import { db, trollerations } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();
const upload = multerFactory({ storage: memoryStorage() });

const MEME_PROMPT = `Redraw EVERYTHING in this image as a single cohesive hand-drawn cartoon sketch illustration with a THICK BLACK OUTLINE style, similar to classic internet meme cartoon art. The ENTIRE image — subject, background, surroundings — must be redrawn from scratch as a cartoon. Do NOT use the original photo as a base.

CORE RULE — APPLY TROLL FACE TO THE MAIN SUBJECT:
Whatever the subject is — a person, animal, plant, tree, bottle, pen, pencil, or any other object — give it a TROLL FACE (Coolface meme). The Troll Face must be DRAWN onto the subject, not pasted:
- Face outline: bumpy, lumpy, wildly asymmetric hand-drawn shape — irregular edges, not a smooth oval
- Mouth: enormous wide grin spanning the entire lower half of the face, teeth large and uneven, drawn with thick black lines
- Chin/jaw: exaggerated, jutting forward, very wide at the bottom — wider than the top of the head
- Eyes: sunken into deep dark scribbled eye sockets; small and smug
- Expression: devious, smug, "problem?" energy — the classic troll smirk
- The face is drawn as part of the subject itself (e.g., on the face of a dog, on the trunk of a tree, on the body of a bottle)
- Use crosshatch shading and thick black outlines consistent with the rest of the cartoon

SUBJECT TYPE RULES:
- PERSON: redraw the full person as a cartoon character, face replaced with Troll Face drawn in the same art style
- ANIMAL (dog, cat, bird, etc.): redraw the animal as an anime/cartoon character, apply Troll Face to where its face is, keep animal body features (ears, fur, tail) in cartoon style
- PLANT / TREE / FLOWER: redraw as a cartoon plant with a Troll Face drawn on the trunk or main body, anime style with big expressive presence
- OBJECT (bottle, pen, pencil, phone, cup, etc.): redraw as a cartoon character version of that object, give it a Troll Face drawn on its front surface, add cartoon arms/legs if it helps sell the personality
- ANY OTHER SUBJECT: identify the main subject and apply the same Troll Face treatment — redraw from scratch, give it the troll face

STYLE:
- Overall look: hand-drawn cartoon comic panel, anime influence, black-and-white with possible light fills
- Thick black outlines throughout
- Crosshatch or flat shading — no photorealistic gradients
- The Troll Face style is consistent with the rest of the image (same line weight, same texture)

ACCESSORIES & CLOTHING (if present):
- Headphones, glasses, hats: draw as cartoon accessories on/around the troll face
- Clothing: same colors as original, drawn with cartoon outlines
- Text/logos on clothing: keep legible, hand-drawn style

BACKGROUND: simplified cartoon version of the original scene — same general environment, sketched style, no photorealistic elements

OUTPUT: One unified cartoon illustration. Everything drawn, nothing composited. The Troll Face is always present on the main subject.`;

router.post("/transform", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file uploaded" });
    return;
  }

  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `upload-${Date.now()}.png`);

  try {
    const resizedBuffer = await sharp(req.file.buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 6 })
      .toBuffer();

    fs.writeFileSync(tmpFile, resizedBuffer);

    const imageBuffer = await editImages([tmpFile], MEME_PROMPT, undefined, "auto");
    const b64 = imageBuffer.toString("base64");

    const [saved] = await db.insert(trollerations).values({
      imageData: b64,
      mimeType: "image/png",
    }).returning();

    res.json({
      id: saved.id,
      b64_json: b64,
      mimeType: "image/png",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to transform image");
    res.status(500).json({ error: "Failed to transform image" });
  } finally {
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch {}
  }
});

router.get("/gallery", async (req, res) => {
  try {
    const results = await db
      .select()
      .from(trollerations)
      .orderBy(desc(trollerations.createdAt));

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch gallery");
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

export default router;
