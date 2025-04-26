import mongoose from 'mongoose';

const eventLogSchema = new mongoose.Schema(
  {
    userId: String,
    userName: String, // 👈 Adicionado
    companyId: String,
    companyName: String, // 👈 Adicionado
    route: String,
    method: String,
    action: String,
    status: String,
    message: String,
    data: Object,
    device: Object,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('EventLog', eventLogSchema);
