import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI nao definida no .env'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.errors
    .map((error) => `${error.path.join('.')}: ${error.message}`)
    .join('; ');

  throw new Error(`Configuracao de ambiente invalida: ${details}`);
}

export const env = parsedEnv.data;

export const corsOrigins = env.CORS_ORIGIN?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
