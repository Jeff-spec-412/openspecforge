import client from "prom-client";
import express from "express";

let started = false;
export function ensureMetricsServer() {
  if (started) return;
  started = true;
  const app = express();
  app.get("/metrics", async (_, res) => {
    res.type("text/plain").send(await client.register.metrics());
  });
  app.listen(9464, () => console.log("metrics on :9464 (inside CLI)"));
}
