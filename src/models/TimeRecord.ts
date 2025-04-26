import mongoose, { Schema, Document } from 'mongoose';

// Interface que representa um registro de ponto do funcionário
export interface ITimesRecord extends Document {
  employeeId: mongoose.Types.ObjectId;
  clockIn: Date;
  lunchStart?: Date;
  lunchEnd?: Date;
  clockOut?: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  date: string;
  workedSeconds?: number; // 🔥 Adicionado
  createdAt?: Date;
  updatedAt?: Date;
}

// Esquema de registro de ponto
const TimeRecordSchema: Schema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    clockIn: { type: Date, required: true },
    lunchStart: { type: Date },
    lunchEnd: { type: Date },
    clockOut: { type: Date },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    date: {
      type: String,
      required: true,
    },
    workedSeconds: {
      type: Number, // 🔥 Adicionado
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Exportação do modelo
export const TimeRecord = mongoose.model<ITimesRecord>(
  'TimeRecord',
  TimeRecordSchema
);
