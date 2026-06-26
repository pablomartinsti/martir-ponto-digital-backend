import { z } from 'zod';

export const absenceSchema = z.object({
  employeeId: z.string().min(1, 'O ID do funcionário é obrigatório.'),
  date: z.string().min(1, 'A data é obrigatória.'),
  type: z.enum([
    'vacation',
    'sick_leave',
    'justified',
    'unjustified',
    'holiday',
    'day_off',
  ]),
  description: z.string().optional(),
});
