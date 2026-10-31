import { useEffect, useState } from "react";
import { api } from "../api.js";

const PAGE_SIZE = 25;

export default function DataTable({ datasetId, columns }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { setPage(1); }, [datasetId]);

  useEffect(() => {
    let cancelled = false;
    setError("");
    api.getRows(datasetId, page, PAGE_SIZE)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [datasetId, page]);

  return (
    <section className="panel" aria-labelledby="rows-h">
      <div className="panel-head">
        <h3 id="rows-h">Rows</h3>
        {data && (
          <div className="pager">
            <span className="muted small">
              {((page - 1) * PAGE_SIZE + 1).toLocaleString()}-{Math.min(page * PAGE_SIZE, data.total).toLocaleString()} of {data.total.toLocaleString()}
            </span>
            <button className="btn btn-quiet" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Previous</button>
            <button className="btn btn-quiet" onClick={() => setPage((p) => p + 1)} disabled={page >= data.pages}>Next</button>
          </div>
        )}
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead>
            <tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
          </thead>
          <tbody>
            {data?.rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => {
                  const v = row[c];
                  return (
                    <td key={c} className={typeof v === "number" ? "num" : v == null ? "null" : ""}>
                      {v == null ? "empty" : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
