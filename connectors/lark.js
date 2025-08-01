import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

app.post("/lark-webhook", (req, res) => {
  if (req.body.challenge) return res.json({ challenge: req.body.challenge });
  console.log("Received Lark event:", req.body.header?.event_type || req.body.type);
  res.json({ code: 0 });
});

app.listen(3000, () => console.log("🚀 Dev server on http://localhost:3000"));
