import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, specialsTable } from "@workspace/db";
import {
  CreateSpecialBody,
  UpdateSpecialParams,
  UpdateSpecialBody,
} from "@workspace/api-zod";

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

  res.json({
    ...special,
    price: parseFloat(special.price),
    createdAt: special.createdAt.toISOString(),
  });
});

export default router;
