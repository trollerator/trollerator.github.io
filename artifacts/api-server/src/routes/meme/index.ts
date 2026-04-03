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

const MEME_PROMPT = `Redraw the ENTIRE scene from this photo as a single cohesive hand-drawn cartoon sketch illustration. Every element — the background, body, clothing, accessories, and face — must be redrawn in cartoon style. The output must look like a cartoon comic panel, NOT a photo with anything pasted on top.

FACE — REDRAW IN TROLL FACE STYLE (do NOT paste a troll face image, DRAW the face from scratch):
Illustrate the person's face using the "Troll Face" / Coolface meme aesthetic. This means DRAWING the face with these exaggerated cartoon features:
- Face outline: bumpy, lumpy, wildly asymmetric hand-drawn shape — irregular edges, not a smooth oval
- Mouth: enormous wide grin spanning the entire lower half of the face, teeth large and uneven, drawn with thick black lines
- Chin/jaw: exaggerated, jutting forward, very wide at the bottom — wider than the top of the head
- Eyes: sunken into deep dark scribbled eye sockets; the eyes themselves are small and smug
- Expression: devious, smug, "problem?" energy — the classic troll smirk
- The face is DRAWN, not composited — it is part of the same sketch as the rest of the image
- Use crosshatch shading and thick black outlines consistent with the rest of the cartoon

ACCESSORIES — redraw all in cartoon style:
- Headphones/earphones: draw as cartoon headphones sitting on the troll-face head
- Glasses: draw as cartoon glasses on the face
- Hats/caps: draw in cartoon style on top of the head
- Microphones, props: draw as cartoon objects
- Text/logos on clothing (e.g. brand names, letters): keep them legible, drawn in the cartoon

CLOTHING: same colors as original (black shirt stays black, etc.), drawn with thick cartoon outlines and flat colors

BODY & POSE: same pose and composition as the photo, drawn as a cartoon character

BACKGROUND: simplified cartoon version of the original background — same general scene, sketched style

OUTPUT: One unified cartoon illustration. Thick black outlines throughout. Flat or lightly cross-hatched fills. No photorealistic parts whatsoever. The face is drawn, not pasted.`;

router.post("/transform", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file uploaded" });
    return;
  }

  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `upload-${Date.now()}.png`);

  try {
    const resizedBuffer = await sharp(req.file.buffer)
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .png({ quality: 80 })
      .toBuffer();

    fs.writeFileSync(tmpFile, resizedBuffer);

    const imageBuffer = await editImages([tmpFile], MEME_PROMPT, undefined, "auto");
    const b64 = imageBuffer.toString("base64");

    // Persist to DB
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
