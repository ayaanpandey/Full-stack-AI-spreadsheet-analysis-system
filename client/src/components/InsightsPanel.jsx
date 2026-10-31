import { useState } from "react";
import { api } from "../api.js";

export default function InsightsPanel({ dataset, aiEnabled, onInsights }) {
  const { insights } = dataset;
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState([]);
  const [error, setError] = useState("");

  async function regenerate() {
    setBusy(true);
    setError("");
    try {
      onInsights(await api.regenerateInsights(dataset._id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function ask(q) {
    const text = (q ?? question).trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.ask(dataset._id, text);
      setThread((t) => [...t, res]);
      setQuestion("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel insights" aria-labelledby="ins-h">
      <div className="panel-head">
        <h3 id="ins-h">What stands out</h3>
        <button className="btn btn-quiet" onClick={regenerate} disabled={busy}>
          {busy ? "Working..." : "Refresh insights"}
        </button>
      </div>

      {insights?.summary && <p className="summary">{insights.summary}</p>}
      {insights?.source === "statistical" && (
        <p className="muted small">
          Based on statistics only. Add an ANTHROPIC_API_KEY to the server for written analysis and questions.
        </p>
      )}

      <ul className="findings">
        {(insights?.items || []).map((it, i) => (
          <li key={i} className={`finding sev-${it.severity}`}>
            <strong>{it.title}</strong>
            <span>{it.detail}</span>
          </li>
        ))}
      </ul>

      <div className="ask">
        <h4>Ask about this data</h4>
        {aiEnabled && insights?.questions?.length > 0 && (
          <div className="chips">
            {insights.questions.map((q) => (
              <button key={q} className="chip" onClick={() => ask(q)} disabled={busy}>{q}</button>
            ))}
          </div>
        )}
        <div className="ask-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder={aiEnabled ? "Which region has the highest revenue?" : "Needs an API key on the server"}
            disabled={!aiEnabled || busy}
            maxLength={500}
            aria-label="Question about this dataset"
          />
          <button className="btn" onClick={() => ask()} disabled={!aiEnabled || busy || !question.trim()}>Ask</button>
        </div>
        {error && <p className="error small" role="alert">{error}</p>}
        {thread.map((t, i) => (
          <div key={i} className="qa">
            <p className="q">{t.question}</p>
            <p className="a">{t.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
