import mongoose from 'mongoose';

const eventLogSchema = new mongoose.Schema(
  {
    userId: String,
    userName: String,
    companyId: String,
    companyName: String,
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

eventLogSchema.index({ createdAt: -1 });
eventLogSchema.index({ companyId: 1, createdAt: -1 });
eventLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('EventLog', eventLogSchema);
