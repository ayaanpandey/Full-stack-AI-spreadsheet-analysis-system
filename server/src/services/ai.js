import { env } from "../config/env.js";

const API_URL = "https://api.anthropic.com/v1/messages";

/** Compact, token-friendly description of a dataset (never the full data). */
export function buildContext(dataset, sampleRows) {
  const cols = dataset.columns.map((c) => {
    const parts = [`${c.name} (${c.type}, ${c.missingPct}% missing, ${c.unique} unique)`];
    if (c.type === "number") {
      parts.push(`min ${c.min}, median ${c.median}, mean ${c.mean}, max ${c.max}, std ${c.std}, outliers ${c.outliers}`);
    } else if (c.topValues?.length) {
      parts.push("top: " + c.topValues.map((t) => `${t.value} (${t.count})`).join(", "));
    } else if (c.earliest) {
      parts.push(`${c.earliest} to ${c.latest}`);
    }
    return "- " + parts.join(": ");
  });
  const corr = dataset.correlations.map((c) => `${c.a} vs ${c.b}: r=${c.r}`).join("\n");
  return [
    `Dataset: ${dataset.name} (${dataset.rowCount} rows)`,
    "Columns:",
    ...cols,
    corr ? `Correlations:\n${corr}` : "",
    "Sample rows:",
    JSON.stringify(sampleRows),
  ].filter(Boolean).join("\n");
}

async function callClaude(system, user, maxTokens = 1200) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

const INSIGHT_SYSTEM = `You are a careful data analyst. You receive a statistical profile of a spreadsheet.
Reply with ONLY a JSON object, no markdown, in this shape:
{"summary": string (2-3 sentences),
 "items": [{"severity": "info"|"warning"|"finding", "title": string, "detail": string}],
 "questions": [string]}
Give 4-7 items and 3 follow-up questions. Base every claim on the numbers provided. Do not invent values.`;

export function parseJsonLoose(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI response was not JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Rule-based insights, used when no API key is set or the AI call fails. */
export function statisticalInsights(dataset) {
  const items = [];
  const { columns, rowCount, correlations } = dataset;

  for (const c of columns) {
    if (c.missingPct >= 20) {
      items.push({
        severity: "warning",
        title: `${c.name} is ${c.missingPct}% empty`,
        detail: `${c.missing} of ${rowCount} rows have no value. Consider filling or excluding this column before analysis.`,
      });
    }
    if (c.type === "number" && c.outliers > 0) {
      items.push({
        severity: "finding",
        title: `${c.outliers} outlier${c.outliers > 1 ? "s" : ""} in ${c.name}`,
        detail: `Values fall outside ${c.q1} - ${c.q3} by more than 1.5x the interquartile range. Range is ${c.min} to ${c.max}.`,
      });
    }
    if (c.type === "number" && c.std > 0 && Math.abs(c.mean - c.median) > c.std * 0.5) {
      items.push({
        severity: "info",
        title: `${c.name} is skewed`,
        detail: `Mean (${c.mean}) and median (${c.median}) differ noticeably, so a few extreme values are pulling the average.`,
      });
    }
    if (c.type === "text" && c.unique === rowCount - c.missing && rowCount > 1) {
      items.push({
        severity: "info",
        title: `${c.name} looks like an identifier`,
        detail: "Every value is unique, so it is probably a key rather than something to group by.",
      });
    }
  }

  for (const c of correlations) {
    items.push({
      severity: "finding",
      title: `${c.a} and ${c.b} move ${c.r > 0 ? "together" : "in opposite directions"}`,
      detail: `Correlation r = ${c.r}. Correlation alone does not show that one causes the other.`,
    });
  }

  if (!items.length) {
    items.push({ severity: "info", title: "No obvious issues", detail: "No large gaps, outliers or strong correlations were detected." });
  }

  const numeric = columns.filter((c) => c.type === "number").length;
  return {
    summary: `${dataset.name} has ${rowCount} rows and ${columns.length} columns (${numeric} numeric). ${items.length} point${items.length > 1 ? "s" : ""} worth a look are listed below.`,
    items: items.slice(0, 8),
    questions: [
      "Which columns have the most missing data?",
      "What are the main outliers and where do they occur?",
      "Which variables are most strongly related?",
    ],
    source: "statistical",
  };
}

export async function generateInsights(dataset, sampleRows) {
  if (!env.anthropicKey) return { ...statisticalInsights(dataset), generatedAt: new Date() };
  try {
    const text = await callClaude(INSIGHT_SYSTEM, buildContext(dataset, sampleRows.slice(0, 15)));
    const parsed = parseJsonLoose(text);
    return {
      summary: String(parsed.summary || ""),
      items: Array.isArray(parsed.items) ? parsed.items.slice(0, 8) : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 4) : [],
      source: "ai",
      generatedAt: new Date(),
    };
  } catch (err) {
    console.warn("AI insights failed, using statistical fallback:", err.message);
    return { ...statisticalInsights(dataset), generatedAt: new Date() };
  }
}

const ASK_SYSTEM = `You answer questions about a spreadsheet using only the statistical profile and sample rows provided.
If the profile cannot answer the question, say what is missing. Be concise (under 150 words) and cite column names.`;

export async function askQuestion(dataset, sampleRows, question) {
  if (!env.anthropicKey) {
    throw Object.assign(new Error("Questions need an ANTHROPIC_API_KEY in server/.env."), { status: 503, expose: true });
  }
  const context = buildContext(dataset, sampleRows.slice(0, 30));
  return callClaude(ASK_SYSTEM, `${context}\n\nQuestion: ${question}`, 600);
}
