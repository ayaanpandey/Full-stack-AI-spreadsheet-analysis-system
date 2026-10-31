import mongoose from "mongoose";

const datasetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    originalName: String,
    sheetName: String,
    rowCount: { type: Number, default: 0 },
    columns: { type: [mongoose.Schema.Types.Mixed], default: [] },
    correlations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    insights: {
      summary: String,
      items: [mongoose.Schema.Types.Mixed],
      questions: [String],
      source: { type: String, enum: ["ai", "statistical"] },
      generatedAt: Date,
    },
  },
  { timestamps: true }
);

export const Dataset = mongoose.model("Dataset", datasetSchema);
