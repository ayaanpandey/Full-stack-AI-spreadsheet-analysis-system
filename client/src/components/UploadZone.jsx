import { useRef, useState } from "react";

export default function UploadZone({ onFile, busy }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  function pick(files) {
    if (files?.[0]) onFile(files[0]);
  }

  return (
    <div
      className={`upload ${over ? "is-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
      />
      <button className="btn" onClick={() => inputRef.current.click()} disabled={busy}>
        {busy ? "Analyzing..." : "Upload spreadsheet"}
      </button>
      <p className="muted small">or drop a .csv, .xlsx or .xls file here</p>
    </div>
  );
}
