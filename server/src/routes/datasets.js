import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { Dataset } from "../models/Dataset.js";
import { Row } from "../models/Row.js";
import { parseSpreadsheet } from "../services/parser.js";
import { analyze } from "../services/stats.js";
import { generateInsights, askQuestion } from "../services/ai.js";
import { env } from "../config/env.js";

const router = Router();

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : httpError(400, "Upload a .csv, .xlsx or .xls file."), ok);
  },
});

function validId(req, _res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return next(httpError(400, "Invalid dataset id."));
  next();
}

async function getDataset(id) {
  const dataset = await Dataset.findById(id).lean();
  if (!dataset) throw httpError(404, "Dataset not found.");
  return dataset;
}

const sample = async (id, n = 30) =>
  (await Row.find({ datasetId: id }).sort({ index: 1 }).limit(n).lean()).map((r) => r.data);

// List datasets (lightweight)
router.get("/", async (_req, res, next) => {
  try {
    const list = await Dataset.find({}, "name originalName rowCount createdAt columns.name").sort({ createdAt: -1 }).lean();
    res.json(list.map(({ columns, ...d }) => ({ ...d, columnCount: columns.length })));
  } catch (e) { next(e); }
});

// Upload, parse, profile, and generate first insights
router.post("/", upload.single("file"), async (req, res, next) => {
  let datasetId;
  try {
    if (!req.file) throw httpError(400, "Attach a file in the 'file' field.");

    let parsed;
    try {
      parsed = parseSpreadsheet(req.file.buffer, env.maxRows);
    } catch (e) {
      throw httpError(400, e.message);
    }

    const { columns, correlations } = analyze(parsed.headers, parsed.rows);
    const name = String(req.body.name || req.file.originalname).replace(/\.(csv|xlsx|xls)$/i, "");

    const dataset = await Dataset.create({
      name,
      originalName: req.file.originalname,
      sheetName: parsed.sheetName,
      rowCount: parsed.rows.length,
      columns,
      correlations,
    });
    datasetId = dataset._id;

    const BATCH = 1000;
    for (let i = 0; i < parsed.rows.length; i += BATCH) {
      await Row.insertMany(
        parsed.rows.slice(i, i + BATCH).map((data, j) => ({ datasetId, index: i + j, data })),
        { ordered: false }
      );
    }

    dataset.insights = await generateInsights(dataset.toObject(), parsed.rows);
    await dataset.save();

    res.status(201).json(dataset);
  } catch (e) {
    // Don't leave half-imported datasets behind.
    if (datasetId) {
      await Promise.allSettled([Dataset.deleteOne({ _id: datasetId }), Row.deleteMany({ datasetId })]);
    }
    next(e);
  }
});

router.get("/:id", validId, async (req, res, next) => {
  try { res.json(await getDataset(req.params.id)); } catch (e) { next(e); }
});

// Paginated rows
router.get("/:id/rows", validId, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const [rows, total] = await Promise.all([
      Row.find({ datasetId: req.params.id }).sort({ index: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Row.countDocuments({ datasetId: req.params.id }),
    ]);
    res.json({ page, limit, total, pages: Math.ceil(total / limit), rows: rows.map((r) => r.data) });
  } catch (e) { next(e); }
});

// Regenerate insights
router.post("/:id/insights", validId, async (req, res, next) => {
  try {
    const dataset = await getDataset(req.params.id);
    const insights = await generateInsights(dataset, await sample(dataset._id, 15));
    await Dataset.updateOne({ _id: dataset._id }, { insights });
    res.json(insights);
  } catch (e) { next(e); }
});

// Ask a question about the dataset
router.post("/:id/ask", validId, async (req, res, next) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) throw httpError(400, "Enter a question.");
    if (question.length > 500) throw httpError(400, "Keep the question under 500 characters.");
    const dataset = await getDataset(req.params.id);
    const answer = await askQuestion(dataset, await sample(dataset._id), question);
    res.json({ question, answer });
  } catch (e) { next(e); }
});

router.delete("/:id", validId, async (req, res, next) => {
  try {
    await getDataset(req.params.id);
    await Promise.all([Dataset.deleteOne({ _id: req.params.id }), Row.deleteMany({ datasetId: req.params.id })]);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
