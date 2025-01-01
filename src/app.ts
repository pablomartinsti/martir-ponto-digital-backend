import express from "express";
import employeeRoutes from "./routes/employeeRoutes";
import timeRecordRoutes from "./routes/timeRecordRoutes";
import workScheduleRoutes from "./routes/workScheduleRoutes";

const app = express();
app.use(express.json());

// Registrar rotas
app.use("/", employeeRoutes);
app.use("/", timeRecordRoutes);
app.use("/", workScheduleRoutes);

export default app;
