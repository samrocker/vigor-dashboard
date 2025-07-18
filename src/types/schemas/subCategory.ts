import { ApiResponse } from '@/lib/axios';
import { z } from 'zod';

export const SubCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  categoryId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SubCategoriesDataSchema = z.object({
    subCategories: z.array(SubCategorySchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
});

export type SubCategory = z.infer<typeof SubCategorySchema>;
export type SubCategoriesApiResponse = ApiResponse<z.infer<typeof SubCategoriesDataSchema>>
