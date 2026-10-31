const fmt = (n) =>
  typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n;

function Spark({ column }) {
  if (column.type === "number" && column.histogram?.length) {
    const max = Math.max(...column.histogram.map((b) => b.count), 1);
    return (
      <div className="spark" role="img" aria-label={`Distribution of ${column.name}`}>
        {column.histogram.map((b, i) => (
          <span
            key={i}
            style={{ height: `${Math.max(6, (b.count / max) * 100)}%` }}
            title={`${fmt(b.from)} to ${fmt(b.to)}: ${b.count}`}
          />
        ))}
      </div>
    );
  }
  if (column.topValues?.length) {
    const max = column.topValues[0].count;
    return (
      <div className="tops">
        {column.topValues.slice(0, 3).map((t) => (
          <div key={t.value} className="top-row" title={`${t.value}: ${t.count}`}>
            <span className="top-bar" style={{ width: `${(t.count / max) * 100}%` }} />
            <span className="top-label">{t.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return <div className="spark-empty muted small">{column.earliest ? `${column.earliest} to ${column.latest}` : "No values"}</div>;
}

export default function ColumnProfiles({ columns }) {
  return (
    <section className="panel" aria-labelledby="cols-h">
      <h3 id="cols-h">Columns</h3>
      <ul className="profiles">
        {columns.map((c) => (
          <li key={c.name} className="profile">
            <div className="profile-id">
              <span className="col-name">{c.name}</span>
              <span className={`type type-${c.type}`}>{c.type}</span>
            </div>
            <Spark column={c} />
            <dl className="facts">
              {c.type === "number" ? (
                <>
                  <div><dt>Median</dt><dd>{fmt(c.median)}</dd></div>
                  <div><dt>Range</dt><dd>{fmt(c.min)} to {fmt(c.max)}</dd></div>
                  {c.outliers > 0 && <div className="warn"><dt>Outliers</dt><dd>{c.outliers}</dd></div>}
                </>
              ) : (
                <div><dt>Unique</dt><dd>{fmt(c.unique)}</dd></div>
              )}
              {c.missingPct > 0 && (
                <div className={c.missingPct >= 20 ? "warn" : ""}><dt>Empty</dt><dd>{c.missingPct}%</dd></div>
              )}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
