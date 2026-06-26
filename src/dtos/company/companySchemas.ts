import { z } from 'zod';

export const createSubAdminSchema = z.object({
  name: z.string().min(1, 'O nome e obrigatorio.'),
  cpf: z.string().length(11, 'O CPF deve ter 11 caracteres.'),
  password: z.string().min(8, 'A senha deve ter no minimo 8 caracteres.'),
  companyName: z.string().min(1, 'O nome da empresa e obrigatorio.'),
  cnpj: z.string().length(14, 'O CNPJ deve ter 14 caracteres.'),
  position: z.string().min(1, 'O cargo e obrigatorio.'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
