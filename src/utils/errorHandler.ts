import { Response } from "express";

// Função para capturar mensagens de erro de forma genérica
export const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro ao processar a solicitação. Por favor, tente novamente.";
};

// Função para enviar respostas de erro HTTP uniformes
export const sendErrorResponse = (
  res: Response,
  status: number,
  message: string
): void => {
  res.status(status).json({ error: message });
};

// Função para validar campos de entrada
export const validateField = (
  field: any,
  type: string,
  errorMessage: string
): void => {
  if (typeof field !== type) {
    throw new Error(errorMessage);
  }
};
