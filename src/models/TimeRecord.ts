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
  date: string;
  workedSeconds?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

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
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

TimeRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const TimeRecord = mongoose.model<ITimesRecord>(
  'TimeRecord',
  TimeRecordSchema
);
