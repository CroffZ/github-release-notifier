#!/usr/bin/env node

import { parseCliArguments } from "./arguments.js";

const help = `github-release-notifier

Usage:
  github-release-notifier --repository OWNER/REPO --release-tag TAG [options]

Options:
  -R, --repository OWNER/REPO
      --release-tag TAG
      --previous-release-tag TAG
      --previous-release-policy POLICY
      --dry-run
  -h, --help
  -v, --version
`;

try {
  const options = parseCliArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(help);
  } else if (options.version) {
    process.stdout.write("0.0.0\n");
  } else {
    process.stderr.write(
      "github-release-notifier is an unpublished scaffold; planning is not implemented yet\n",
    );
    process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 2;
}
