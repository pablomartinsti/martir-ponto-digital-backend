import { z } from 'zod';

export const clockInSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const updateTimeRecordSchema = z.object({
  recordId: z.string().nonempty('O ID do registro de ponto e obrigatorio.'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const getTimeRecordsSchema = z.object({
  startDate: z.string().nonempty('startDate e obrigatorio.'),
  endDate: z.string().nonempty('endDate e obrigatorio.'),
  period: z.enum(['day', 'week', 'month'], {
    errorMap: () => ({ message: 'Periodo invalido. Use day, week ou month.' }),
  }),
  employeeId: z.string().optional(),
});

export type ClockInDTO = z.infer<typeof clockInSchema>;
export type UpdateTimeRecordDTO = z.infer<typeof updateTimeRecordSchema>;
export type GetTimeRecordsDTO = z.infer<typeof getTimeRecordsSchema>;
