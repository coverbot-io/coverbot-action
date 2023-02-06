import core from "@actions/core";
import github from "@actions/github";
import { HttpClient } from "@actions/http-client";

import fs from "fs";
import Decimal from "decimal.js-light";

try {
  const token = core.getInput("github_token");
  const octokit = github.getOctokit(token);

  const data = fs.readFileSync(core.getInput("file"), "utf8");
  const obj = JSON.parse(data);

  const { covered, relevant } = obj.source_files.reduce(
    (acc, file) => {
      const relevantForFile = file.coverage.filter((l) => l !== null);
      const relevant = relevantForFile.length + acc.relevant;

      const coveredForFile = relevantForFile.filter((l) => l > 0);
      const covered = coveredForFile.length + acc.covered;

      return { covered: covered, relevant: relevant };
    },
    { covered: 0, relevant: 0 }
  );

  const percentage = new Decimal(covered)
    .dividedBy(new Decimal(relevant))
    .times(100)
    .toFixed(2);

  const payload = {
    covered,
    relevant,
    percentage,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    default_branch: github.context.payload.repository.default_branch,
    context: github.context
  };

  const http = new HttpClient("coverbot-io/coverage-action", [], {
    headers: {
      'content-type': 'application/json',
      "x-api-key": core.getInput("coverbot_api_key"),
    },
  });

  const res = await http.postJson(
    "https://api.coverbot.io/v1/coverage",
    payload
  );

  octokit.rest.repos.createCommitStatus({
    ...github.context.repo,
    sha: res.result.sha,
    state: res.result.state,
    context: "coverbot",
    description: res.result.message,
  });
} catch (error) {
  core.setFailed(error.message);
}
