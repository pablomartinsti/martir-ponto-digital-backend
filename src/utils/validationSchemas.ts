import { z } from 'zod';

export const employeeSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  position: z.string().min(1, 'A posição é obrigatória.'),
  cpf: z.string().length(11, 'O CPF deve ter 11 caracteres.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
});

export const loginSchema = z.object({
  cpf: z.string().length(11, 'O CPF deve ter 11 caracteres.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
});

export const toggleStatusSchema = z.object({
  isActive: z.boolean({ required_error: "O campo 'isActive' é obrigatório." }),
});

export const deleteEmployeeSchema = z.object({
  id: z.string().min(1, 'O ID do funcionário é obrigatório.'),
});

export const filterEmployeesSchema = z.object({
  filter: z.enum(['active', 'inactive']).optional(),
});
