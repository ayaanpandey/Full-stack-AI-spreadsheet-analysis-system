async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, options);
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

const json = (method, data) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export const api = {
  health: () => request("/health"),
  listDatasets: () => request("/datasets"),
  getDataset: (id) => request(`/datasets/${id}`),
  getRows: (id, page = 1, limit = 25) => request(`/datasets/${id}/rows?page=${page}&limit=${limit}`),
  upload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/datasets", { method: "POST", body: form });
  },
  regenerateInsights: (id) => request(`/datasets/${id}/insights`, { method: "POST" }),
  ask: (id, question) => request(`/datasets/${id}/ask`, json("POST", { question })),
  remove: (id) => request(`/datasets/${id}`, { method: "DELETE" }),
};
