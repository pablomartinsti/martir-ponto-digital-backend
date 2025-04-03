import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app';

/*MONGO_URI="mongodb+srv://karinehelenacontadora:ZZI7ZqcuoQzsK6Jb@martirassessoriacontabi.0o8qilf.mongodb.net/registro_horarios?retryWrites=true&w=majority&appName=MartirAssessoriaContabil"*/
// Lê do arquivo .env
const MONGO_URI = process.env.MONGO_URI as string;
const PORT = process.env.PORT || 3000;

const connectToDataBase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado ao MongoDb');
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB', err);
    process.exit(1);
  }
};

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
};

connectToDataBase().then(startServer);
