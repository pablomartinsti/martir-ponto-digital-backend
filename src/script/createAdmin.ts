import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { Employee } from '../../src/models/Employee';

const MONGO_URI = process.env.MONGO_URI as string;

const createAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    const existing = await Employee.findOne({ cpf: '00000000000' });
    if (existing) {
      console.log('⚠️ Admin já existe');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = new Employee({
      name: 'Admin Master',
      cpf: '00000000000',
      password: hashedPassword,
      role: 'admin',
      position: 'Administrador',
      isActive: true,
    });

    await admin.save();
    console.log('✅ Admin criado com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao criar admin:', err);
    process.exit(1);
  }
};

createAdmin();
