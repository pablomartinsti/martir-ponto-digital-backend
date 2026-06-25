import mongoose, { Document, Schema } from 'mongoose';

export type AbsenceType =
  | 'vacation'
  | 'sick_leave'
  | 'justified'
  | 'day_off'
  | 'holiday'
  | 'unjustified';

export interface IAbsence extends Document {
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  date: string;
  type: AbsenceType;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const AbsenceSchema = new Schema<IAbsence>(
  {
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
    date: { type: String, required: true },
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
    description: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AbsenceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AbsenceSchema.index({ companyId: 1, date: 1 });

export const Absence = mongoose.model<IAbsence>('Absence', AbsenceSchema);
