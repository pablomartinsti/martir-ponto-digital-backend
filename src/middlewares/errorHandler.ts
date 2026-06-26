import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ errors: error.errors });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('Erro interno não tratado:', error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
};
