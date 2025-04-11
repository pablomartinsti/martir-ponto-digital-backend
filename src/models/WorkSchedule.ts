import mongoose, { Document, Schema } from 'mongoose';

// Interface representando um dia personalizado da semana na escala
export interface ICustomDay {
  day: string; // Dia da semana (ex: monday, tuesday)
  start: string; // Hora de início (formato HH:mm)
  end: string; // Hora de término (formato HH:mm)
  hasLunch: boolean; // Indica se há pausa para almoço
  expectedLunchBreakMinutes: number; // Duração esperada da pausa
  isDayOff: boolean; // Indica se o dia é uma folga
}

// Interface da escala completa de um funcionário
export interface IWorkSchedule extends Document {
  employeeId: mongoose.Schema.Types.ObjectId; // Referência ao funcionário
  customDays: ICustomDay[]; // Lista de configurações por dia da semana
}

// Esquema Mongoose da escala de trabalho
const WorkScheduleSchema = new Schema<IWorkSchedule>({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true, // Campo obrigatório
  },
  customDays: [
    {
      day: {
        type: String,
        required: true,
        set: (value: string) => value.toLowerCase(), // Garante consistência no formato
      },
      start: { type: String, required: true }, // Hora inicial da jornada
      end: { type: String, required: true }, // Hora final da jornada
      hasLunch: { type: Boolean, default: true }, // Se há pausa para almoço
      expectedLunchBreakMinutes: { type: Number, default: 60 }, // Duração padrão do almoço
      isDayOff: { type: Boolean, default: false }, // Define o dia como folga
    },
  ],
});

// Exporta o modelo para uso no sistema
export const WorkSchedule = mongoose.model<IWorkSchedule>(
  'WorkSchedule',
  WorkScheduleSchema
);
