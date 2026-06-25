import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';

const connectToDataBase = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Conectado ao MongoDB');
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB', err);
    process.exit(1);
  }
};

const startServer = () => {
  app.listen(env.PORT, () => {
    console.log(`Servidor rodando na porta ${env.PORT}`);
  });
};

connectToDataBase().then(startServer);
