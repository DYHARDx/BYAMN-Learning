const fs = require("fs");
const fetch = require("node-fetch");

const { GEMINI_API_KEY, GITHUB_TOKEN, GITHUB_EVENT_PATH } = process.env;

if (!GEMINI_API_KEY || !GITHUB_TOKEN || !GITHUB_EVENT_PATH) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, "utf8"));
const content =
  event.comment?.body || event.issue?.body || event.discussion?.body || "";

if (!content.includes("@BYAMN-AI")) {
  console.log("No mention of @BYAMN-AI. Skipping reply.");
  process.exit(0);
}

async function run() {
  try {
    console.log("Generating AI response...");

    const prompt = `Reply briefly and helpfully as BYAMN AI Assistant:\n${content}`;

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const aiData = await aiRes.json();
    const message =
      aiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to generate response.";

    // Build comment URL based on event type
    const repo = event.repository?.full_name;
    let commentUrl = null;

    if (event.comment?.issue_url) {
      const issueUrlParts = event.comment.issue_url.split("/");
      const issueNumber = issueUrlParts.pop();
      commentUrl = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`;
    } else if (event.issue?.number) {
      commentUrl = `https://api.github.com/repos/${repo}/issues/${event.issue.number}/comments`;
    } else if (event.discussion?.number) {
      commentUrl = `https://api.github.com/repos/${repo}/discussions/${event.discussion.number}/comments`;
    }

    if (!commentUrl) {
      console.error("No valid comment URL found.");
      console.log("Event data:", JSON.stringify(event, null, 2));
      process.exit(1);
    }

    const res = await fetch(commentUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ body: message }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to post reply:", errText);
      process.exit(1);
    }

    console.log("Reply posted successfully.");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
