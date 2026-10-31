export default function DatasetList({ items, activeId, onSelect, onDelete }) {
  if (!items.length) return <p className="muted small rail-empty">No datasets yet.</p>;
  return (
    <nav aria-label="Datasets">
      <ul className="dataset-list">
        {items.map((d) => (
          <li key={d._id} className={d._id === activeId ? "is-active" : ""}>
            <button className="dataset-pick" onClick={() => onSelect(d._id)}>
              <span className="dataset-name">{d.name}</span>
              <span className="muted small">{d.rowCount.toLocaleString()} rows, {d.columnCount} cols</span>
            </button>
            <button className="icon-btn" aria-label={`Delete ${d.name}`} onClick={() => onDelete(d._id)}>
              &times;
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
