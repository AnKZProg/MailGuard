import { z } from "zod";

const base64Key32Bytes = z
  .string()
  .min(1, "MAILGUARD_ENCRYPTION_KEY est requis")
  .refine((value) => {
    try {
      return Buffer.from(value, "base64").length === 32;
    } catch {
      return false;
    }
  }, "MAILGUARD_ENCRYPTION_KEY doit être 32 octets encodés en base64 (ex: openssl rand -base64 32)");

const envSchema = z.object({
  MAILGUARD_ENCRYPTION_KEY: base64Key32Bytes,
  APP_URL: z.string().url().default("http://127.0.0.1:3000"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID est requis pour connecter un compte Gmail"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET est requis pour connecter un compte Gmail"),
  MICROSOFT_CLIENT_ID: z.string().min(1, "MICROSOFT_CLIENT_ID est requis pour connecter un compte Outlook"),
  MICROSOFT_CLIENT_SECRET: z.string().min(1, "MICROSOFT_CLIENT_SECRET est requis pour connecter un compte Outlook"),
  DATABASE_URL: z.string().min(1).default("file:./data/mailguard.db"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(
      `Configuration MailGuard invalide — le serveur refuse de démarrer.\n${issues}\n\nVoir .env.example pour la liste complète des variables requises.`,
    );
  }
  return parsed.data;
}

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
