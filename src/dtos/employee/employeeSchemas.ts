import { z } from 'zod';

export const employeeSchema = z.object({
  name: z.string().min(1, 'O nome e obrigatorio.'),
  position: z.string().min(1, 'A posicao e obrigatoria.'),
  cpf: z.string().length(11, 'O CPF deve ter 11 caracteres.'),
  password: z.string().min(8, 'A senha deve ter no minimo 8 caracteres.'),
});

export const loginSchema = z.object({
  cpf: z.string().length(11, 'O CPF deve ter 11 caracteres.'),
  password: z.string().min(1, 'A senha e obrigatoria.'),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'A nova senha deve ter no minimo 8 caracteres.'),
});

export const toggleStatusSchema = z.object({
  isActive: z.boolean({ required_error: "O campo 'isActive' e obrigatorio." }),
});

export const filterEmployeesSchema = z.object({
  filter: z.enum(['active', 'inactive']).optional(),
  cnpj: z.string().optional(),
});

export const companyIdSchema = z.string().nonempty('companyId e obrigatorio.');

export const deleteSubAdminSchema = z.object({
  id: z.string().nonempty('ID e obrigatorio'),
});
