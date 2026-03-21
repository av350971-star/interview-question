import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// ✅ static folder serve
app.use(express.static(path.join(__dirname, "public")));

// ✅ HOME ROUTE FIX
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "App.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});