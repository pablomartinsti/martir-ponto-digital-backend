// src/models/Company.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface que representa uma empresa no sistema
export interface ICompany extends Document {
  name: string; // Nome da empresa
  cnpj: string; // CNPJ único da empresa
  latitude: number; // Latitude da localização da empresa
  longitude: number; // Longitude da localização da empresa
}

// Esquema da empresa
const CompanySchema = new Schema<ICompany>({
  name: { type: String, required: true }, // Nome é obrigatório
  cnpj: { type: String, required: true, unique: true }, // CNPJ obrigatório e único
  latitude: { type: Number, required: true }, // Latitude da sede ou ponto de registro
  longitude: { type: Number, required: true }, // Longitude da sede ou ponto de registro
});

// Exporta o modelo para uso nos controllers
export const Company = mongoose.model<ICompany>('Company', CompanySchema);
