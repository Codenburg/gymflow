import { z } from "zod";

export const createTrainerSchema = z.object({
  username: z
    .string()
    .min(7, { message: "El DNI debe tener 7-8 dígitos" })
    .regex(/^\d{7,8}$/, { message: "El DNI debe tener solo números" }),
  name: z.string().min(2, { message: "El nombre es requerido (mínimo 2 caracteres)" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

export const updateTrainerSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }).optional(),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
    .optional()
    .or(z.literal("")),
});

export type CreateTrainerInput = z.infer<typeof createTrainerSchema>;
export type UpdateTrainerInput = z.infer<typeof updateTrainerSchema>;