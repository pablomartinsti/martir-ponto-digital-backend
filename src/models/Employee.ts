import mongoose, { Schema, Document } from 'mongoose';

// Interface que define a estrutura de um funcionário
export interface IEmployee extends Document {
  name: string; // Nome do funcionário
  cpf: string; // CPF do funcionário (único)
  password: string; // Senha criptografada
  isActive: boolean; // Indica se o funcionário está ativo ou não
  role: 'admin' | 'sub_admin' | 'employee'; // Papel do usuário no sistema
  companyId?: mongoose.Types.ObjectId; // Referência à empresa (opcional para admin geral)
  position: string; // Cargo ou função do funcionário
  createdAt?: Date; // campo adicionado
  updatedAt?: Date; // campo adicionado
}

// Esquema do funcionário
const EmployeeSchema: Schema = new Schema(
  {
    name: { type: String, required: true }, // Nome completo obrigatório
    cpf: { type: String, required: true, unique: true }, // CPF único e obrigatório
    password: { type: String, required: true }, // Senha armazenada com hash
    isActive: { type: Boolean, default: true }, // Ativo por padrão
    role: {
      type: String,
      enum: ['admin', 'sub_admin', 'employee'], // Tipos possíveis de papel no sistema
      default: 'employee',
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company', // Relacionamento com a empresa
      required: function (this: IEmployee) {
        return this.role !== 'admin'; // Apenas admin geral não precisa estar vinculado a empresa
      },
    },
    position: { type: String, required: true },
  },
  {
    timestamps: true, // <-- habilita createdAt e updatedAt
  }
);

// Exporta o modelo para ser usado nos controllers
export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
