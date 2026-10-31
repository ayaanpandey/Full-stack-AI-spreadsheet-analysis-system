import mongoose from "mongoose";

// Rows live in their own collection so a large sheet never hits
// MongoDB's 16 MB per-document limit.
const rowSchema = new mongoose.Schema(
  {
    datasetId: { type: mongoose.Schema.Types.ObjectId, ref: "Dataset", required: true },
    index: { type: Number, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { versionKey: false }
);

rowSchema.index({ datasetId: 1, index: 1 });

export const Row = mongoose.model("Row", rowSchema);
