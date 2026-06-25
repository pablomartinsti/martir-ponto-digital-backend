import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomDay {
  day: string;
  start: string;
  end: string;
  hasLunch: boolean;
  expectedLunchBreakMinutes: number;
  isDayOff: boolean;
}

export interface IWorkSchedule extends Document {
  employeeId: mongoose.Schema.Types.ObjectId;
  customDays: ICustomDay[];
  createdAt?: Date;
  updatedAt?: Date;
}

const WorkScheduleSchema = new Schema<IWorkSchedule>(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    customDays: [
      {
        day: {
          type: String,
          required: true,
          set: (value: string) => value.toLowerCase(),
        },
        start: { type: String, required: true },
        end: { type: String, required: true },
        hasLunch: { type: Boolean, default: true },
        expectedLunchBreakMinutes: { type: Number, default: 60 },
        isDayOff: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

WorkScheduleSchema.index({ employeeId: 1 }, { unique: true });

export const WorkSchedule = mongoose.model<IWorkSchedule>(
  'WorkSchedule',
  WorkScheduleSchema
);
