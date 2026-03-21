import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

console.log("GEMINI KEY:", process.env.GEMINI_API_KEY);

// ✅ Home route → direct App.html open hoga
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/App.html"));
});

app.post("/api/evaluate", async (req, res) => {
  try {
    const { questions, answers } = req.body;

    // 🔥 Prompt build (ALL questions ek saath)
    let prompt = "Evaluate these answers strictly:\n\n";

    questions.forEach((q, i) => {
      prompt += `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i]}\n\n`;
    });

    prompt += `
Return ONLY valid JSON in this format:
{
  "results": [
    { "score": number (0-10), "analysis": "short explanation" }
  ],
  "totalScore": number (out of 100)
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    // 🔧 Clean JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let result;

    try {
      result = JSON.parse(text);
    } catch (err) {
      console.error("JSON Parse Error:", text);
      throw new Error("Invalid JSON from AI");
    }

    res.json(result);

  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({
      error: "AI failed",
      details: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});