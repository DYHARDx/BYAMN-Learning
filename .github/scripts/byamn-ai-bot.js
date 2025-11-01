const { GITHUB_TOKEN, GEMINI_API_KEY, GITHUB_EVENT_PATH } = process.env;

if (!GITHUB_TOKEN || !GEMINI_API_KEY || !GITHUB_EVENT_PATH) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const event = require(GITHUB_EVENT_PATH);
const content =
  event.comment?.body ||
  event.issue?.body ||
  event.discussion?.body ||
  "";

if (!content.includes("@BYAMN-AI")) {
  console.log("No mention of @BYAMN-AI. Skipping reply.");
  process.exit(0);
}

async function run() {
  try {
    console.log("Generating AI response...");

    const prompt = `Answer briefly for BYAMN Learning project only:\n${content}`;

    const aiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const aiData = await aiRes.json();
    const message =
      aiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Couldn't generate a valid response.";

    // --- FIXED URL HANDLING ---
    let commentUrl = null;

    if (event.discussion && event.discussion.number) {
      commentUrl = `https://api.github.com/repos/${event.repository.full_name}/discussions/${event.discussion.number}/comments`;
    } else if (event.issue && event.issue.number) {
      commentUrl = `https://api.github.com/repos/${event.repository.full_name}/issues/${event.issue.number}/comments`;
    } else if (event.comment && event.comment.issue_url) {
      commentUrl = `${event.comment.issue_url}/comments`;
    }

    if (!commentUrl) {
      console.error(
        "No valid comment URL found. Event structure:",
        JSON.stringify(event, null, 2)
      );
      return;
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
