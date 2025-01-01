import mongoose, { Schema, Document } from "mongoose";

export interface IWorkSchedule extends Document {
  employeeId: mongoose.Types.ObjectId;
  dailyHours: number; // Horas de trabalho por dia
  weeklyDays: number; // Dias de trabalho na semana
  customDays?: string[]; // Dias específicos (ex: ["Monday", "Wednesday"])
}

const WorkScheduleSchema: Schema = new Schema({
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
  dailyHours: { type: Number, required: true },
  weeklyDays: { type: Number, required: true },
  customDays: { type: [String], default: [] }, // ["Monday", "Tuesday"]
});

export const WorkSchedule = mongoose.model<IWorkSchedule>(
  "WorkSchedule",
  WorkScheduleSchema
);
