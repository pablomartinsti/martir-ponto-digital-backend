import express from "express";
import employeeRoutes from "./routes/employeeRoutes";
import timeRecordRoutes from "./routes/timeRecordRoutes";

const app = express();
app.use(express.json());

// Registrar rotas
app.use("/", employeeRoutes);
app.use("/", timeRecordRoutes);

export default app;
