import mongoose, { Document, Schema } from "mongoose";

export interface ICustomDay {
  day: string;
  dailyHours: number;
}

export interface IWorkSchedule extends Document {
  employeeId: mongoose.Schema.Types.ObjectId;
  customDays: ICustomDay[];
}

const WorkScheduleSchema = new Schema<IWorkSchedule>({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  customDays: [
    {
      day: { type: String, required: true }, // Ex.: "Monday"
      dailyHours: { type: Number, required: true }, // Ex.: 8
    },
  ],
});

export const WorkSchedule = mongoose.model<IWorkSchedule>(
  "WorkSchedule",
  WorkScheduleSchema
);
