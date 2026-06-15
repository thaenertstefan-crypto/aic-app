import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Configured Anthropic client for server-side use only. The `server-only`
// import above makes the build fail if this module is ever pulled into a
// Client Component, keeping ANTHROPIC_API_KEY out of the browser bundle.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
