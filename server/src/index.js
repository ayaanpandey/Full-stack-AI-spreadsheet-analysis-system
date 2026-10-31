import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

try {
  await connectDB();
  createApp().listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
    console.log(env.anthropicKey ? "AI insights: on" : "AI insights: off (statistical mode)");
  });
} catch (err) {
  console.error("Failed to start:", err.message);
  process.exit(1);
}
