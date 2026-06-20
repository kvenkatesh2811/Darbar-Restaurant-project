import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reviewsTable } from "@workspace/db";
import { CreateReviewBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reviews", async (_req, res): Promise<void> => {
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.isApproved, true))
    .orderBy(reviewsTable.createdAt);

  res.json(
    reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      customerName: parsed.data.customerName,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      isApproved: true,
    })
    .returning();

  res.status(201).json({
    ...review,
    createdAt: review.createdAt.toISOString(),
  });
});

export default router;
