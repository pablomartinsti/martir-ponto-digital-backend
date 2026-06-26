import { z } from 'zod';

export const customDaySchema = z.object({
  day: z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]),
  start: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)'),
  end: z
    .string()
    .regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)'),
  hasLunch: z.boolean(),
  expectedLunchBreakMinutes: z.number().min(0).max(180),
  isDayOff: z.boolean(),
});

export const workScheduleSchema = z.object({
  employeeId: z.string().nonempty('O ID do funcionário é obrigatório.'),
  customDays: z.array(customDaySchema),
});
