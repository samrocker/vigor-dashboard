import { z } from "zod";

export const SettingSchema = z.object({
  websiteName: z.string().min(1, "Website Name is required"),
  tagline: z.string().min(1, "Tagline is required"),
  primaryPhone: z.string().min(1, "Primary Phone is required"),
  secondaryPhone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address"),
  address: z.object({
    street: z.string().min(1, "Street is required"),
    "house number": z.number().min(1, "House number is required"),
    landmark: z.string().optional().nullable(),
  }),
  value: z.object({
    gstin: z.string().min(1, "GSTIN is required"),
    taxRate: z.number().min(0, "Tax Rate must be a positive number"),
  }),
});

export type SettingFormValues = z.infer<typeof SettingSchema>; 