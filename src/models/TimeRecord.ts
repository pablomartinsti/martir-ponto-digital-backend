import mongoose, { Schema, Document } from 'mongoose';

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
}

const TimeRecordSchema: Schema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  clockIn: { type: Date, required: true },
  lunchStart: { type: Date },
  lunchEnd: { type: Date },
  clockOut: { type: Date }, // Alterado para não obrigatório
  location: {
    latitude: { type: Number, required: true }, // Corrigido para Number
    longitude: { type: Number, required: true }, // Corrigido para Number
  },
});

export const TimeRecord = mongoose.model<ITimesRecord>(
  'TimeRecord',
  TimeRecordSchema
);
