import { Router, type IRouter } from "express";
import { db, feedbackTable } from "@workspace/db";
import { SubmitFeedbackBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/feedback", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(feedbackTable)
    .orderBy(feedbackTable.createdAt);

  res.json(
    items.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    })),
  );
});

router.post("/feedback", async (req, res): Promise<void> => {
  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(feedbackTable)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    })
    .returning();

  res.status(201).json({
    ...item,
    createdAt: item.createdAt.toISOString(),
  });
});

export default router;
