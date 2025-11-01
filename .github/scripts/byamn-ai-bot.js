import fs from "fs";
import axios from "axios";

const eventPath = process.env.GITHUB_EVENT_PATH;
const eventData = JSON.parse(await fs.promises.readFile(eventPath, "utf8"));

const discussion = eventData.discussion;
const issue = eventData.issue;
const comment = eventData.comment;

const text = discussion?.body || issue?.body || comment?.body;
if (!text) process.exit(0);

const basePrompt = `
You are the official AI assistant for the BYAMN open-source project.
Answer ONLY questions related to BYAMN (features, setup, contribution, dashboard, certificates, bugs, etc.).
If the question is not related to BYAMN, respond exactly:
"I can only answer questions about the BYAMN project."

Detect the user's language and reply in the same language.
User message: "${text}"
`;

const geminiResp = await axios.post(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + process.env.GEMINI_API_KEY,
  { contents: [{ parts: [{ text: basePrompt }] }] }
);

let reply = geminiResp.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

if (!reply.toLowerCase().includes("byamn") && !text.toLowerCase().includes("byamn")) {
  reply = "I can only answer questions about the BYAMN project.";
}

// Identify discussion vs issue for posting reply
let apiUrl = "";
if (discussion) {
  apiUrl = `${discussion.html_url.replace(
    "https://github.com/",
    "https://api.github.com/repos/"
  )}/comments`;
} else if (issue) {
  apiUrl = `${issue.url}/comments`;
} else {
  process.exit(0);
}

// Post reply to GitHub
await axios.post(
  apiUrl,
  { body: reply },
  { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
);

console.log("✅ BYAMN AI reply sent successfully.");
