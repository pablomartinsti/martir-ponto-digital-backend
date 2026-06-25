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

export const toggleStatusSchema = z.object({
  isActive: z.boolean({ required_error: "O campo 'isActive' e obrigatorio." }),
});

export const deleteEmployeeSchema = z.object({
  id: z.string().min(1, 'O ID do funcionario e obrigatorio.'),
});

export const filterEmployeesSchema = z.object({
  filter: z.enum(['active', 'inactive']).optional(),
});
