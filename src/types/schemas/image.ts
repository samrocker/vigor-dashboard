import { z } from "zod";

export const imageSchema = z.object({
  id: z.string(),
  isHeroImage: z.boolean(),
  isLogo: z.boolean(),
  isIcon: z.boolean(),
  productId: z.string().nullable(),
  categoryId: z.string().nullable(),
  subCategoryId: z.string().nullable(),
  blogId: z.string().nullable(),
  url: z.string().url(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type imageSchema = z.infer<typeof imageSchema>;