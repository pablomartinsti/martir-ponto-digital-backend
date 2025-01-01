import express from "express";
import {
  clockIn,
  startLunch,
  endLunch,
  clockOut,
  getTimeRecords,
  calculateWorkHours,
} from "../controllers/timeRecordController";

const router = express.Router();

// Rota para registrar entrada
router.post("/clock-in", clockIn);

// Registrar saída para almoço
router.post("/lunch-start", startLunch);

// Registrar volta do almoço
router.post("/lunch-end", endLunch);

// Rota para registrar saída
router.post("/clock-out", clockOut);

// Rota para buscar registros de tempo
router.get("/time-records", getTimeRecords);

// Rota para calcular as horas trabalhadas
router.get("/work-hours", calculateWorkHours);

export default router;
