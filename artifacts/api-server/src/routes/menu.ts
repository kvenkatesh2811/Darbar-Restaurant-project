import { Router, type IRouter } from "express";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { db, menuItemsTable, categoriesTable } from "@workspace/db";
import {
  ListMenuItemsQueryParams,
  CreateMenuItemBody,
  UpdateMenuItemParams,
  UpdateMenuItemBody,
  DeleteMenuItemParams,
  ListCategoriesResponse,
} from "@workspace/api-zod";
import { deleteStorageImage } from "./upload";

const router: IRouter = Router();

router.get(["/menu/items", "/menu-items"], async (req, res): Promise<void> => {
  const parsed = ListMenuItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, search, isVeg } = parsed.data;
  const conditions: SQL[] = [];

  if (category) conditions.push(eq(menuItemsTable.categorySlug, category));
  if (search) conditions.push(ilike(menuItemsTable.name, `%${search}%`));
  if (isVeg !== undefined) conditions.push(eq(menuItemsTable.isVeg, isVeg));

  const items = await db
    .select({
      id: menuItemsTable.id,
      name: menuItemsTable.name,
      description: menuItemsTable.description,
      price: menuItemsTable.price,
      categorySlug: menuItemsTable.categorySlug,
      categoryName: categoriesTable.name,
      isVeg: menuItemsTable.isVeg,
      isAvailable: menuItemsTable.isAvailable,
      imageUrl: menuItemsTable.imageUrl,
      rating: menuItemsTable.rating,
      prepTimeMinutes: menuItemsTable.prepTimeMinutes,
      isBestseller: menuItemsTable.isBestseller,
      createdAt: menuItemsTable.createdAt,
    })
    .from(menuItemsTable)
    .leftJoin(categoriesTable, eq(menuItemsTable.categorySlug, categoriesTable.slug))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(menuItemsTable.id);

  res.json(
    items.map((item) => ({
      ...item,
      price: parseFloat(item.price),
      rating: parseFloat(item.rating),
      categoryName: item.categoryName ?? item.categorySlug,
      createdAt: item.createdAt.toISOString(),
    })),
  );
});

router.post("/menu/items", async (req, res): Promise<void> => {
  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(menuItemsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description,
      price: String(parsed.data.price),
      categorySlug: parsed.data.categorySlug,
      isVeg: parsed.data.isVeg,
      isAvailable: parsed.data.isAvailable ?? true,
      imageUrl: parsed.data.imageUrl,
      ...(parsed.data.rating !== undefined ? { rating: String(parsed.data.rating) } : {}),
      ...(parsed.data.prepTimeMinutes !== undefined ? { prepTimeMinutes: parsed.data.prepTimeMinutes } : {}),
      ...(parsed.data.isBestseller !== undefined ? { isBestseller: parsed.data.isBestseller } : {}),
    })
    .returning();

  const category = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, item.categorySlug))
    .limit(1);

  res.status(201).json({
    ...item,
    price: parseFloat(item.price),
    rating: parseFloat(item.rating),
    categoryName: category[0]?.name ?? item.categorySlug,
    createdAt: item.createdAt.toISOString(),
  });
});

router.patch("/menu/items/:id", async (req, res): Promise<void> => {
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Capture the old imageUrl so we can delete the storage object if it changes.
  const [existing] = await db
    .select({ imageUrl: menuItemsTable.imageUrl })
    .from(menuItemsTable)
    .where(eq(menuItemsTable.id, params.data.id))
    .limit(1);

  const updateData: Partial<typeof menuItemsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  if (parsed.data.categorySlug !== undefined) updateData.categorySlug = parsed.data.categorySlug;
  if (parsed.data.isVeg !== undefined) updateData.isVeg = parsed.data.isVeg;
  if (parsed.data.isAvailable !== undefined) updateData.isAvailable = parsed.data.isAvailable;
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
  if (parsed.data.rating !== undefined) updateData.rating = String(parsed.data.rating);
  if (parsed.data.prepTimeMinutes !== undefined) updateData.prepTimeMinutes = parsed.data.prepTimeMinutes;
  if (parsed.data.isBestseller !== undefined) updateData.isBestseller = parsed.data.isBestseller;

  const [item] = await db
    .update(menuItemsTable)
    .set(updateData)
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  // Delete the replaced Supabase image (best-effort, don't block the response).
  const oldUrl = existing?.imageUrl;
  const newUrl = parsed.data.imageUrl;
  if (oldUrl && newUrl !== undefined && newUrl !== oldUrl) {
    deleteStorageImage(oldUrl).catch(() => {});
  }

  const category = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, item.categorySlug))
    .limit(1);

  res.json({
    ...item,
    price: parseFloat(item.price),
    rating: parseFloat(item.rating),
    categoryName: category[0]?.name ?? item.categorySlug,
    createdAt: item.createdAt.toISOString(),
  });
});

router.delete("/menu/items/:id", async (req, res): Promise<void> => {
  const params = DeleteMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(menuItemsTable)
    .where(eq(menuItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  // Clean up the associated Supabase Storage image (best-effort).
  deleteStorageImage(item.imageUrl).catch(() => {});

  res.sendStatus(204);
});

router.get("/menu/categories", async (_req, res): Promise<void> => {
  const cats = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.displayOrder);

  res.json(ListCategoriesResponse.parse(cats));
});

export default router;
