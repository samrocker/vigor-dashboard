import { z } from 'zod';
import { ApiResponse } from '@/lib/axios'; 

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CategoriesDataSchema = z.object({
  categories: z.array(CategorySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type CategoriesApiResponse = ApiResponse<z.infer<typeof CategoriesDataSchema>>

export type Category = z.infer<typeof CategorySchema>;