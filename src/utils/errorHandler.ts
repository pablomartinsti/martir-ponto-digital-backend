export const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro ao processar a solicitação. Por favor, tente novamente.";
};
