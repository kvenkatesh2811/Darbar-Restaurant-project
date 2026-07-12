import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, specialsTable } from "@workspace/db";
import {
  CreateSpecialBody,
  UpdateSpecialParams,
  UpdateSpecialBody,
} from "@workspace/api-zod";
import { deleteStorageImage } from "./upload";

const router: IRouter = Router();

router.get("/specials", async (_req, res): Promise<void> => {
  const specials = await db
    .select()
    .from(specialsTable)
    .where(eq(specialsTable.isActive, true))
    .orderBy(specialsTable.createdAt);

  res.json(
    specials.map((s) => ({
      ...s,
      price: parseFloat(s.price),
      createdAt: s.createdAt.toISOString(),
    })),
  );
});

router.post("/specials", async (req, res): Promise<void> => {
  const parsed = CreateSpecialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [special] = await db
    .insert(specialsTable)
    .values({
      dishName: parsed.data.dishName,
      description: parsed.data.description,
      price: String(parsed.data.price),
      imageUrl: parsed.data.imageUrl,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();

  res.status(201).json({
    ...special,
    price: parseFloat(special.price),
    createdAt: special.createdAt.toISOString(),
  });
});

router.patch("/specials/:id", async (req, res): Promise<void> => {
  const params = UpdateSpecialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSpecialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Fetch the current record so we can clean up the old image if it changed.
  const [existing] = await db
    .select({ imageUrl: specialsTable.imageUrl })
    .from(specialsTable)
    .where(eq(specialsTable.id, params.data.id))
    .limit(1);

  const updateData: Partial<typeof specialsTable.$inferInsert> = {};
  if (parsed.data.dishName !== undefined) updateData.dishName = parsed.data.dishName;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  const [special] = await db
    .update(specialsTable)
    .set(updateData)
    .where(eq(specialsTable.id, params.data.id))
    .returning();

  if (!special) {
    res.status(404).json({ error: "Special not found" });
    return;
  }

  // Delete the old Supabase Storage image if the URL changed.
  const oldUrl = existing?.imageUrl;
  const newUrl = parsed.data.imageUrl;
  if (oldUrl && newUrl !== undefined && newUrl !== oldUrl) {
    await deleteStorageImage(oldUrl);
  }

  res.json({
    ...special,
    price: parseFloat(special.price),
    createdAt: special.createdAt.toISOString(),
  });
});

router.get("/admin/specials", async (_req, res): Promise<void> => {
  const specials = await db
    .select()
    .from(specialsTable)
    .orderBy(specialsTable.createdAt);

  res.json(
    specials.map((s) => ({
      ...s,
      price: parseFloat(s.price),
      createdAt: s.createdAt.toISOString(),
    })),
  );
});

router.delete("/specials/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(specialsTable)
    .where(eq(specialsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Special not found" });
    return;
  }

  // Clean up the associated Supabase Storage image (best-effort).
  await deleteStorageImage(deleted.imageUrl);

  res.status(204).end();
});

export default router;
