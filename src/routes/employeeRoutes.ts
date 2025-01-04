import express from 'express';
import {
  createEmployee,
  getEmployees,
  toggleEmployeeStatus,
  login,
  deleteEmployee,
} from '../controllers/employeeController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = express.Router();

// Apenas admin pode criar funcionários
router.post('/employees', authenticate, authorize(['admin']), createEmployee);

// Login não precisa de autenticação
router.post('/login', login);

// Listar funcionários (apenas admin)
router.get('/employees', authenticate, authorize(['admin']), getEmployees);

// Alterar status do funcionário (apenas admin)
router.patch(
  '/:id/status',
  authenticate,
  authorize(['admin']),
  toggleEmployeeStatus
);

// Excluir funcionário (apenas admin)
router.delete(
  '/employees/:id',
  authenticate,
  authorize(['admin']),
  deleteEmployee
);

export default router;
