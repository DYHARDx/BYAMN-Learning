const fs = require("fs");
const { GITHUB_TOKEN, GEMINI_API_KEY, GITHUB_EVENT_PATH } = process.env;

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
  console.log("No mention of @BYAMN-AI. Skipping reply.");
  process.exit(0);
}

async function run() {
  try {
    console.log("Generating AI response...");

    const prompt = `Reply briefly and helpfully as BYAMN AI Assistant:\n${content}`;

    // Gemini API call
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

    // Determine comment URL
    const repo = event.repository?.full_name;
    let commentUrl = null;

    // For issue comments, the event structure has a comment with an issue_url
    if (event.comment?.issue_url) {
      // Issue or PR comment event
      // Extract issue number from issue_url and construct proper comment URL
      const issueUrlParts = event.comment.issue_url.split('/');
      const issueNumber = issueUrlParts[issueUrlParts.length - 1];
      commentUrl = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`;
    } 
    // For discussion comments
    else if (event.comment?.discussion_id && event.discussion?.number) {
      // Discussion comment event
      commentUrl = `https://api.github.com/repos/${repo}/discussions/${event.discussion.number}/comments`;
    } else if (event.discussion?.number) {
      // Discussion created/edited
      commentUrl = `https://api.github.com/repos/${repo}/discussions/${event.discussion.number}/comments`;
    } 
    // For direct issue events (not comments)
    else if (event.issue?.number) {
      // Issue event
      commentUrl = `https://api.github.com/repos/${repo}/issues/${event.issue.number}/comments`;
    } 
    // For PR events
    else if (event.pull_request?.number) {
      // PR event - PRs are issues under the hood
      commentUrl = `https://api.github.com/repos/${repo}/issues/${event.pull_request.number}/comments`;
    }

    if (!commentUrl) {
      console.error("No valid comment URL found.");
      console.log("Event dump:", JSON.stringify(event, null, 2));
      process.exit(1);
    }

    // Post AI reply
    const postRes = await fetch(commentUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ body: message }),
    });

    if (!postRes.ok) {
      const errData = await postRes.text();
      console.error("Failed to post reply:", errData);
    } else {
      console.log("Reply posted successfully.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
