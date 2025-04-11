import mongoose, { Document, Schema } from 'mongoose';

// Tipos possíveis de ausência no sistema
export type AbsenceType =
  | 'vacation' // Férias
  | 'sick_leave' // Atestado médico
  | 'justified' // Falta justificada pela empresa
  | 'day_off' // Folga extra (ex: banco de horas, compensação)
  | 'holiday' // Feriado
  | 'unjustified'; // Falta não justificada

// Interface para o documento de ausência
export interface IAbsence extends Document {
  employeeId: mongoose.Types.ObjectId; // ID do funcionário ausente
  companyId: mongoose.Types.ObjectId; // ID da empresa do funcionário
  date: string; // Data da ausência no formato "YYYY-MM-DD"
  type: AbsenceType; // Tipo de ausência (ver enum acima)
  description?: string; // Descrição opcional da ausência
  createdBy: mongoose.Types.ObjectId; // ID do sub_admin que registrou a ausência
}

// Esquema de ausência
const AbsenceSchema = new Schema<IAbsence>({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  date: { type: String, required: true }, // Data no formato ISO (ex: "2025-04-09")
  type: {
    type: String,
    enum: [
      'vacation',
      'sick_leave',
      'justified',
      'day_off',
      'holiday',
      'unjustified',
    ],
    required: true,
  },
  description: { type: String }, // Campo opcional para observações
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // Referência ao sub_admin que registrou
    required: true,
  },
});

// Exporta o model para uso nos controllers
export const Absence = mongoose.model<IAbsence>('Absence', AbsenceSchema);
