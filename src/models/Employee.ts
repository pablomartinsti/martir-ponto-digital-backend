import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IEmployee extends Document {
  name: string;
  cpf: string;
  password: string;
  isActive: boolean;
  role: string;
}

const EmployeeSchema: Schema = new Schema({
  name: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
});

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
