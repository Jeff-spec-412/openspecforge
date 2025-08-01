import { ensureMetricsServer } from "./metricsServer.js";
ensureMetricsServer();
import { generateSpec } from "./pipeline.js";
const input = process.argv.slice(2).join(" ") || "Philippines telco score";
const { markdown, qaScore } = await generateSpec(input);
console.log("--- QA SCORE:", qaScore, "\n\n", markdown);
