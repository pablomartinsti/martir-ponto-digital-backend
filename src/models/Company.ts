// src/models/Company.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  cnpj: string;
  latitude: number;
  longitude: number;
}

const CompanySchema = new Schema<ICompany>({
  name: { type: String, required: true },
  cnpj: { type: String, required: true, unique: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
});

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
