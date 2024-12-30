import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  name: string;
  position: string;
  cpf: string;
  password: string;
  isActive: boolean;
}

const EmployeeSchema: Schema = new Schema({
  name: { type: String, require: true },
  position: { type: String, require: true },
  cpf: { type: String, require: true, unique: true },
  password: { type: String, require: true },
  isActive: { type: Boolean, default: true },
});

export const Employee = mongoose.model<IEmployee>("Employee", EmployeeSchema);
