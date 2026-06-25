import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Employee } from '../models/Employee';
import { env } from '../config/env';

const ADMIN_CPF = process.env.INITIAL_ADMIN_CPF || '10274398613';
const ADMIN_NAME = process.env.INITIAL_ADMIN_NAME || 'Admin Master';
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;

const createAdmin = async () => {
  if (!ADMIN_PASSWORD) {
    console.error('INITIAL_ADMIN_PASSWORD nao definida no .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Conectado ao MongoDB');

    const existing = await Employee.findOne({ cpf: ADMIN_CPF });
    if (existing) {
      console.log('Admin ja existe');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = new Employee({
      name: ADMIN_NAME,
      cpf: ADMIN_CPF,
      password: hashedPassword,
      role: 'admin',
      position: 'Administrador',
      isActive: true,
    });

    await admin.save();
    console.log('Admin criado com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar admin:', err);
    process.exit(1);
  }
};

createAdmin();
