import express from "express";
import {
  setWorkSchedule,
  getWorkSchedule,
  listWorkSchedules,
} from "../controllers/workScheduleController";

const router = express.Router();

// Criar ou atualizar escala
router.post("/work-schedules", setWorkSchedule);

// Obter escala de um funcionário
router.get("/work-schedules/:employeeId", getWorkSchedule);

// Listar escalas de todos os funcionários
router.get("/work-schedules", listWorkSchedules);

export default router;
