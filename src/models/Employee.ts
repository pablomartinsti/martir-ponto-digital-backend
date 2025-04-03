import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  name: string;
  cpf: string;
  password: string;
  isActive: boolean;
  role: 'admin' | 'sub_admin' | 'employee';
  companyId?: mongoose.Types.ObjectId; // <- Novo campo
  position: string;
}

const EmployeeSchema: Schema = new Schema({
  name: { type: String, required: true },
  cpf: { type: String, required: true, unique: true },
  password: { type: String, required: true },
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
      return this.role !== 'admin'; // Admin geral não precisa de empresa
    },
  },
  position: { type: String, required: true }, // <- Campo já usado no schema de validação
});

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
