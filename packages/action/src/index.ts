import * as core from "@actions/core";

import { readActionConfiguration } from "./config.js";

try {
  readActionConfiguration(
    { get: (name) => core.getInput(name) },
    process.env.GITHUB_REPOSITORY,
  );
  core.setFailed(
    "github-release-notifier is an unpublished scaffold and cannot send notifications yet",
  );
} catch (error) {
  core.setFailed(error instanceof Error ? error.message : String(error));
}
