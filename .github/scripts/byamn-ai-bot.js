const { GITHUB_TOKEN, GEMINI_API_KEY, GITHUB_EVENT_PATH } = process.env;
const fs = require("fs");

if (!GITHUB_TOKEN || !GEMINI_API_KEY || !GITHUB_EVENT_PATH) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, "utf8"));
const content =
  event.comment?.body ||
  event.issue?.body ||
  event.discussion?.body ||
  "";

if (!content.includes("@BYAMN-AI")) {
  console.log("No @BYAMN-AI mention. Skipping.");
  process.exit(0);
}

async function run() {
  try {
    console.log("Generating AI response...");
    const prompt = `Respond briefly for BYAMN Learning project only:\n${content}`;

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

    let commentUrl = null;

    // --- Handle all GitHub event types ---
    if (event.discussion && event.discussion.number) {
      commentUrl = `https://api.github.com/repos/${event.repository.full_name}/discussions/${event.discussion.number}/comments`;
    } else if (event.issue && event.issue.number) {
      commentUrl = `https://api.github.com/repos/${event.repository.full_name}/issues/${event.issue.number}/comments`;
    } else if (event.comment?.issue_url) {
      commentUrl = `${event.comment.issue_url}/comments`;
    } else if (event.comment?.discussion_url) {
      commentUrl = `${event.comment.discussion_url}/comments`;
    } else if (event.pull_request?.number) {
      commentUrl = `https://api.github.com/repos/${event.repository.full_name}/issues/${event.pull_request.number}/comments`;
    }

    if (!commentUrl) {
      console.error("No valid comment URL found.");
      console.log("Event:", JSON.stringify(event, null, 2));
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

    if (res.ok) console.log("Reply posted successfully.");
    else console.error("Failed to post reply:", await res.text());
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
