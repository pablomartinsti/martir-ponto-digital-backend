import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  cpf: string;
  password: string;
  isActive: boolean;
  role: 'admin' | 'sub_admin' | 'employee';
  companyId?: mongoose.Types.ObjectId;
  position: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const EmployeeSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    cpf: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },
    role: {
      type: String,
      enum: ['admin', 'sub_admin', 'employee'],
      default: 'employee',
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: function (this: IEmployee) {
        return this.role !== 'admin';
      },
    },
    position: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  }
);

EmployeeSchema.index({ companyId: 1, role: 1 });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
