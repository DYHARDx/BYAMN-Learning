const axios = require("axios");

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

    const prompt = `Reply concisely and contextually to this GitHub message based on the BYAMN Learning project only:\n${content}`;

    const aiResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        GEMINI_API_KEY,
      {
        contents: [{ parts: [{ text: prompt }] }],
      }
    );

    const message =
      aiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Couldn't generate a valid response.";

    // Determine correct URL to post comment
    let commentUrl = null;

    if (event.discussion) {
      commentUrl = `${event.discussion.url}/comments`;
    } else if (event.issue) {
      commentUrl = `${event.issue.url}/comments`;
    } else if (event.comment && event.comment.issue_url) {
      commentUrl = `${event.comment.issue_url}/comments`;
    }

    if (!commentUrl) {
      console.error("No valid comment URL found.");
      return;
    }

    await axios.post(
      commentUrl,
      { body: message },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
        },
      }
    );

    console.log("Reply posted successfully.");
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

run();
