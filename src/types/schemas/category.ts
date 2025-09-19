import { z } from 'zod';
import { ApiResponse } from '@/lib/axios';

// --- IMAGE SCHEMAS ---
// Schema for a single image object from the /image/batch endpoint
export const ImageInfoSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema for the 'data' part of the batch image API response
export const BatchImagesDataSchema = z.object({
  images: z.array(ImageInfoSchema),
});

// Full type for the batch image API response
export type BatchImagesApiResponse = ApiResponse<z.infer<typeof BatchImagesDataSchema>>;
export type ImageInfo = z.infer<typeof ImageInfoSchema>;

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  imageId: z.string().nullable(), // Added: can be a string or null
  description: z.string().nullable(), // Updated: can be a string or null
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

export type CategoriesApiResponse = ApiResponse<z.infer<typeof CategoriesDataSchema>>;
export type Category = z.infer<typeof CategorySchema>;