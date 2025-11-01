const axios = require("axios");

const { GITHUB_TOKEN, GEMINI_API_KEY } = process.env;

if (!GITHUB_TOKEN || !GEMINI_API_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const event = require(process.env.GITHUB_EVENT_PATH);
const content =
  event.comment?.body || event.issue?.body || event.discussion?.body || "";
const url =
  event.comment?.html_url ||
  event.issue?.html_url ||
  event.discussion?.html_url ||
  "";

if (!content.includes("@BYAMN-AI")) {
  console.log("No mention of @BYAMN-AI. Skipping reply.");
  process.exit(0);
}

async function run() {
  try {
    console.log("Generating AI response...");
    const prompt = `Reply concisely to this GitHub message:\n${content}`;

    const aiResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        GEMINI_API_KEY,
      { contents: [{ parts: [{ text: prompt }] }] }
    );

    const message =
      aiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Couldn't generate a valid response.";

    const issueUrl =
      event.comment?.issue_url ||
      event.issue?.url ||
      event.discussion?.url ||
      null;

    if (!issueUrl) {
      console.error("No valid issue/discussion URL found.");
      return;
    }

    await axios.post(
      `${issueUrl}/comments`,
      { body: message },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Reply posted successfully.");
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

run();
