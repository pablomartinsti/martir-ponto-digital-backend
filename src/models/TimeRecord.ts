import mongoose, { Schema, Document } from 'mongoose';

// Interface que representa um registro de ponto do funcionário
export interface ITimesRecord extends Document {
  employeeId: mongoose.Types.ObjectId; // Referência ao funcionário
  clockIn: Date; // Data/hora de entrada
  lunchStart?: Date; // Início do almoço (opcional)
  lunchEnd?: Date; // Retorno do almoço (opcional)
  clockOut?: Date; // Saída do expediente (opcional)
  location: {
    latitude: number; // Latitude da marcação de ponto
    longitude: number; // Longitude da marcação de ponto
  };
  date: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Esquema de registro de ponto
const TimeRecordSchema: Schema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true, // Relacionamento obrigatório com o funcionário
    },
    clockIn: { type: Date, required: true }, // Registro de entrada obrigatório
    lunchStart: { type: Date }, // Saída para almoço (opcional)
    lunchEnd: { type: Date }, // Retorno do almoço (opcional)
    clockOut: { type: Date }, // Saída do expediente (opcional)

    location: {
      latitude: { type: Number, required: true }, // Localização de onde foi feito o ponto
      longitude: { type: Number, required: true },
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // <- adiciona createdAt e updatedAt automaticamente
  }
);
// Exporta o modelo para uso em outras partes da aplicação
export const TimeRecord = mongoose.model<ITimesRecord>(
  'TimeRecord',
  TimeRecordSchema
);
