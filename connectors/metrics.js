import express from "express";
import client from "prom-client";
const app = express();
app.get("/metrics", async (_,res)=>res.send(await client.register.metrics()));
app.listen(9464, ()=>console.log("metrics on :9464"));
