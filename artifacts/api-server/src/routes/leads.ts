import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { CreateLeadBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leads", async (_req, res): Promise<void> => {
  const leads = await db
    .select()
    .from(leadsTable)
    .orderBy(leadsTable.createdAt);

  res.json(
    leads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  );
});

router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .insert(leadsTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      dateOfBirth: parsed.data.dateOfBirth,
    })
    .returning();

  res.status(201).json({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
  });
});

export default router;
