// Arquivo responsável por inicializar o servidor da aplicação e conectar ao banco de dados

// Importa variáveis de ambiente definidas no .env (como MONGO_URI, PORT etc)
import 'dotenv/config';

// Importa o mongoose para conexão com o MongoDB
import mongoose from 'mongoose';

// Importa o app configurado com todas as rotas e middlewares
import app from './app';

// Lê a URI do MongoDB do arquivo .env
const MONGO_URI = process.env.MONGO_URI as string;

// Define a porta do servidor (padrão 3000 se não estiver definida no .env)
const PORT = process.env.PORT || 3000;

// Função assíncrona que conecta ao MongoDB
const connectToDataBase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDb');
  } catch (err) {
    console.error('❌ Erro ao conectar ao MongoDB', err);
    process.exit(1); // Encerra o processo caso a conexão falhe
  }
};

// Função que inicia o servidor na porta definida
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
};

// Primeiro conecta ao banco, e só depois inicia o servidor
connectToDataBase().then(startServer);
