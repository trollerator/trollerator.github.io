import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trollerations = pgTable("trollerations", {
  id: serial("id").primaryKey(),
  imageData: text("image_data").notNull(),
  mimeType: text("mime_type").notNull().default("image/png"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTrolleration = createInsertSchema(trollerations).omit({
  id: true,
  createdAt: true,
});

export type Trolleration = typeof trollerations.$inferSelect;
export type InsertTrolleration = z.infer<typeof insertTrolleration>;
