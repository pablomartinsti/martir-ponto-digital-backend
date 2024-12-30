import mongoose, { Schema, Document } from "mongoose";

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
  employeeId: { type: Schema.Types.ObjectId, ref: "Employee", require: true },
  clockIn: { type: Date, require: true },
  lunchStart: { type: Date },
  lunchEnd: { type: Date },
  clockOut: { type: Date, require: true },
  location: {
    latitude: { type: Date, require: true },
    longitude: { type: Date, require: true },
  },
});

export const TimeRecord = mongoose.model<ITimesRecord>(
  "TimeRecord",
  TimeRecordSchema
);
