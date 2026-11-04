import { z } from "zod"

// Mirrors B7A6 auth.schemas.ts + password.service.ts policy.

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .max(254, "Use at most 254 characters")
    .pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password").max(256),
})
export type LoginValues = z.infer<typeof loginSchema>

export const SIGNUP_ROLES = ["TENANT", "OWNER"] as const

export const registerSchema = z
  .object({
    role: z.enum(SIGNUP_ROLES, "Choose how you'll use Teneo"),
    email: z
      .string()
      .trim()
      .min(1, "Enter your email")
      .max(254, "Use at most 254 characters")
      .pipe(z.email("Enter a valid email address")),
    password: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(256, "Use at most 256 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Repeat your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
export type RegisterValues = z.infer<typeof registerSchema>

export const DEMO_ROLES = ["tenant", "owner", "admin"] as const
export type DemoRole = (typeof DEMO_ROLES)[number]
