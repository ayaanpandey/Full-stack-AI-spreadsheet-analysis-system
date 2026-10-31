# API reference

Base URL: `http://localhost:5000/api`

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Server status and whether AI is enabled |
| GET | `/datasets` | List datasets (name, row count, column count) |
| POST | `/datasets` | Upload a file (`multipart/form-data`, field `file`). Parses, profiles, stores rows, generates insights |
| GET | `/datasets/:id` | Full dataset: column profiles, correlations, insights |
| GET | `/datasets/:id/rows?page=1&limit=50` | Paginated rows (limit max 200) |
| POST | `/datasets/:id/insights` | Regenerate insights |
| POST | `/datasets/:id/ask` | Body `{ "question": "..." }`. Requires `ANTHROPIC_API_KEY` |
| DELETE | `/datasets/:id` | Delete the dataset and its rows |

Errors return `{ "error": "message" }` with an appropriate status (400 bad input, 404 not found, 413 file too large, 429 rate limited, 503 AI not configured).

## Example

```bash
curl -F "file=@sample-data/sales.csv" http://localhost:5000/api/datasets
curl http://localhost:5000/api/datasets/<id>/rows?page=2
curl -X POST -H "Content-Type: application/json" \
  -d '{"question":"Which product has the highest median revenue?"}' \
  http://localhost:5000/api/datasets/<id>/ask
```
