import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET_KEY = "sua_chave_secreta";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ error: "Acesso não autorizado" });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as {
      id: string;
      role: string;
    };

    (req as any).user = decoded; // Agora TypeScript reconhece `user`
    console.log("Decoded User:", (req as any).user); // Verifique o campo `user`
    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!(req as any).user) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return;
    }

    if (!roles.includes((req as any).user.role)) {
      res.status(403).json({ error: "Permissão negada" });
      return;
    }

    next();
  };
};
