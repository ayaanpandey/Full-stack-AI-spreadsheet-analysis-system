export function notFound(_req, res) {
  res.status(404).json({ error: "Route not found." });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File is too large." });
  }
  const status = err.status || 500;
  if (status >= 500 && !err.expose) console.error(err);
  res.status(status).json({
    error: status >= 500 && !err.expose ? "Something went wrong on the server." : err.message,
  });
}
