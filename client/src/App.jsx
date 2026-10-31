import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import UploadZone from "./components/UploadZone.jsx";
import DatasetList from "./components/DatasetList.jsx";
import ColumnProfiles from "./components/ColumnProfiles.jsx";
import InsightsPanel from "./components/InsightsPanel.jsx";
import DataTable from "./components/DataTable.jsx";

export default function App() {
  const [datasets, setDatasets] = useState([]);
  const [active, setActive] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const refreshList = useCallback(async () => {
    setDatasets(await api.listDatasets());
  }, []);

  useEffect(() => {
    Promise.all([api.listDatasets(), api.health()])
      .then(([list, health]) => {
        setDatasets(list);
        setAiEnabled(health.ai);
        if (list[0]) return api.getDataset(list[0]._id).then(setActive);
      })
      .catch(() => setError("Can't reach the server. Start the API and MongoDB, then reload."));
  }, []);

  async function handleUpload(file) {
    setError("");
    setUploading(true);
    try {
      const created = await api.upload(file);
      setActive(created);
      await refreshList();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSelect(id) {
    setError("");
    try {
      setActive(await api.getDataset(id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this dataset and all of its rows?")) return;
    try {
      await api.remove(id);
      const list = await api.listDatasets();
      setDatasets(list);
      setActive(list[0] ? await api.getDataset(list[0]._id) : null);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="shell">
      <aside className="rail">
        <h1 className="brand">SheetSense</h1>
        <UploadZone onFile={handleUpload} busy={uploading} />
        <DatasetList items={datasets} activeId={active?._id} onSelect={handleSelect} onDelete={handleDelete} />
      </aside>

      <main className="main">
        {error && (
          <div className="banner" role="alert">
            {error}
            <button className="link" onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        {!active ? (
          <section className="empty">
            <h2>Drop a spreadsheet to see what's in it</h2>
            <p>Upload a CSV or Excel file. SheetSense profiles every column, flags missing data and outliers, and writes up what stands out.</p>
          </section>
        ) : (
          <>
            <header className="dataset-head">
              <div>
                <h2>{active.name}</h2>
                <p className="muted">
                  {active.rowCount.toLocaleString()} rows, {active.columns.length} columns
                  {active.sheetName ? `, sheet "${active.sheetName}"` : ""}
                </p>
              </div>
            </header>

            <div className="workspace">
              <ColumnProfiles columns={active.columns} />
              <InsightsPanel
                dataset={active}
                aiEnabled={aiEnabled}
                onInsights={(insights) => setActive((d) => ({ ...d, insights }))}
              />
            </div>

            <DataTable datasetId={active._id} columns={active.columns.map((c) => c.name)} />
          </>
        )}
      </main>
    </div>
  );
}
