// Script utilitário para criar o usuário "admin" master no banco de dados.
// Esse script é executado manualmente apenas uma vez, geralmente após o deploy inicial.

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import 'dotenv/config'; // Carrega as variáveis de ambiente do .env
import { Employee } from '../../src/models/Employee';

// Obtém a URI de conexão com o MongoDB do arquivo .env
const MONGO_URI = process.env.MONGO_URI as string;

const createAdmin = async () => {
  try {
    // Conecta ao banco de dados MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    // Verifica se já existe um admin com CPF padrão
    const existing = await Employee.findOne({ cpf: '00000000000' });
    if (existing) {
      console.log('⚠️ Admin já existe');
      process.exit(0); // Encerra o script sem erro
    }

    // Criptografa a senha padrão
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Cria o documento do admin no banco
    const admin = new Employee({
      name: 'Admin Master',
      cpf: '00000000000',
      password: hashedPassword,
      role: 'admin', // Define o papel como admin geral
      position: 'Administrador', // Cargo
      isActive: true,
    });

    // Salva o admin no banco
    await admin.save();
    console.log('✅ Admin criado com sucesso!');
    process.exit(0); // Encerra o script com sucesso
  } catch (err) {
    console.error('❌ Erro ao criar admin:', err);
    process.exit(1); // Encerra o script com erro
  }
};

// Executa a função
createAdmin();
