import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/App.html"));
});


// ===============================
// AI EVALUATION API
// ===============================

app.post("/api/evaluate", async (req, res) => {
  try {
    const { questions, answers } = req.body;

    // Validate request
    if (!questions || !answers) {
      return res.status(400).json({
        error: "Questions and answers are required"
      });
    }

    if (!Array.isArray(questions) || !Array.isArray(answers)) {
      return res.status(400).json({
        error: "Questions and answers must be arrays"
      });
    }

    if (questions.length !== answers.length) {
      return res.status(400).json({
        error: "Questions and answers length do not match"
      });
    }


    // ===============================
    // CREATE PROMPT
    // ===============================

    let prompt = "Evaluate these answers strictly:\n\n";

    questions.forEach((q, i) => {
      prompt += `Q${i + 1}: ${q}\n`;
      prompt += `A${i + 1}: ${answers[i]}\n\n`;
    });

    prompt += `
Evaluate every answer from 0 to 10.

Consider:
- Correctness
- Relevance
- Technical understanding
- Completeness
- Clarity

Return ONLY valid JSON.

Do not add markdown.
Do not add explanations outside JSON.

Use exactly this format:

{
  "results": [
    {
      "score": 0,
      "analysis": "short explanation"
    }
  ],
  "totalScore": 0
}

The score for each answer must be between 0 and 10.

The totalScore must be the sum of all individual scores converted to a score out of 100.
`;



    // ===============================
    // CHECK API KEY
    // ===============================

    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is missing. Check your .env file."
      );
    }


    // ===============================
    // GEMINI API REQUEST
    // ===============================

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );


    // ===============================
    // READ GEMINI RESPONSE
    // ===============================

    const data = await response.json();

    console.log("\n==============================");
    console.log("Gemini Status:", response.status);
    console.log(
      "Gemini Response:",
      JSON.stringify(data, null, 2)
    );
    console.log("==============================\n");


    // ===============================
    // HANDLE GEMINI API ERROR
    // ===============================

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `Gemini API failed with status ${response.status}`
      );
    }


    // ===============================
    // GET AI TEXT
    // ===============================

    let text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;


    if (!text) {
      throw new Error("Empty response received from Gemini");
    }


    console.log("Raw AI Response:");
    console.log(text);


    // ===============================
    // CLEAN MARKDOWN
    // ===============================

    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();


    // ===============================
    // PARSE JSON
    // ===============================

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {

      console.error(
        "JSON Parse Error:",
        error.message
      );

      console.error(
        "AI returned:",
        text
      );

      throw new Error(
        "Gemini returned invalid JSON"
      );
    }


    // ===============================
    // RETURN RESULT
    // ===============================

    res.json(result);


  } catch (err) {

    console.error("\n==============================");
    console.error("ERROR:", err.message);
    console.error("==============================\n");

    res.status(500).json({
      error: "AI evaluation failed",
      details: err.message
    });
  }
});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );
});