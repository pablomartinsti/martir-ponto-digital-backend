import mongoose from "mongoose";
import app from "./app";

const MONGO_URI = "mongodb://localhost:27017/registro_horarios";

const connectToDataBase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado ao MongoDb");
  } catch (err) {
    console.error("Erro ao conectar ao MongoDB", err);
    process.exit(1);
  }
};

const startServer = () => {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
};

connectToDataBase().then(startServer);
