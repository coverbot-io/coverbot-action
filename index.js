import core from "@actions/core"
import github from "@actions/github"
import { HttpClient } from "@actions/http-client"

import Decimal from "decimal.js-light"
import fs from "fs"

const parse = (data, changedFiles) => {
  const { covered, coveredForPatch, relevant, relevantForPatch, annotations } = data.source_files.reduce(
    (acc, file) => {
      const sourceLines = file.source.split("\n").map((code, i) => {
        return { code, coverage: file.coverage[i], lineNumber: i + 1 }
      })

      const relevant = sourceLines.filter(l => l.coverage !== null)
      const relevantForPatch = relevant.filter(
        line => file.name in changedFiles && changedFiles[file.name].includes(`+${line.code}`)
      )

      const covered = relevant.filter(l => l.coverage > 0)
      const coveredForPatch = relevantForPatch.filter(l => l.coverage > 0)

      const annotations = relevantForPatch
        .filter(l => l.coverage === 0)
        .map(line => {
          return {
            path: file.name,
            start_line: line.lineNumber,
            end_line: line.lineNumber,
            annotation_level: "warning",
            message: "Line is not covered by tests.",
          }
        })

      return {
        covered: covered.length + acc.covered,
        coveredForPatch: coveredForPatch.length + acc.coveredForPatch,
        relevant: relevant.length + acc.relevant,
        relevantForPatch: relevantForPatch.length + acc.relevantForPatch,
        annotations: annotations.concat(acc.annotations),
      }
    },
    {
      covered: 0,
      coveredForPatch: 0,
      relevant: 0,
      relevantForPatch: 0,
      annotations: [],
    }
  )

  const percentage = new Decimal(covered).dividedBy(new Decimal(relevant)).times(100).toFixed(2)
  const patchPercentage =
    relevantForPatch > 0
      ? new Decimal(coveredForPatch).dividedBy(new Decimal(relevantForPatch)).times(100).toFixed(2)
      : 0

  return {
    covered,
    coveredForPatch,
    relevant,
    relevantForPatch,
    percentage,
    patchPercentage,
    annotations,
  }
}

const getChangedFiles = async octokit => {
  const changedFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
    ...github.context.repo,
    pull_number: github.context.payload.number,
  })

  return changedFiles
    .filter(file => file.status != "removed")
    .reduce(async (acc, file) => {
      let patch

      if ("patch" in file) {
        patch = file.patch
      } else {
        const fileContentResponse = await octokit.request(file.contents_url)

        const encodedContent = fileContentResponse.data.content.split("\n").join("")

        patch = atob(encodedContent)
      }

      const changedLines = patch.split("\n").filter(line => line.startsWith("+"))

      return { ...(await acc), [file.filename]: changedLines }
    }, {})
}

try {
  const token = core.getInput("github_token")
  const octokit = github.getOctokit(token)

  const data = fs.readFileSync(core.getInput("file"), "utf8")
  const decodedData = JSON.parse(data)

  // changedFiles on currently supported for PRs
  const changedFiles = github.context.eventName == "pull_request" ? await getChangedFiles(octokit) : {}

  const { covered, coveredForPatch, relevant, relevantForPatch, percentage, patchPercentage, annotations } = parse(
    decodedData,
    changedFiles
  )

  const payload = {
    covered,
    relevant,
    percentage,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    default_branch: github.context.payload.repository.default_branch,
    context: github.context,
  }

  const http = new HttpClient("coverbot-io/coverage-action", [], {
    headers: {
      "content-type": "application/json",
      "x-api-key": core.getInput("coverbot_api_key"),
    },
  })

  const res = await http.postJson("https://api.coverbot.io/v1/coverage", payload)

  octokit.rest.repos.createCommitStatus({
    ...github.context.repo,
    sha: res.result.sha,
    state: res.result.state,
    context: "coverbot",
    description: res.result.message,
  })

  if (github.context.eventName == "pull_request" && relevantForPatch > 0) {
    const { data: checkRun } = await octokit.rest.checks.create({
      ...github.context.repo,
      status: "in_progress",
      name: "coverbot",
      head_sha: res.result.sha,
    })

    const chunkSize = 50

    Array.from(new Array(Math.ceil(annotations.length / chunkSize)), (_, i) =>
      annotations.slice(i * chunkSize, i * chunkSize + chunkSize)
    ).forEach(chunk => {
      octokit.rest.checks.update({
        ...github.context.repo,
        check_run_id: checkRun.id,
        output: {
          title: "coverbot coverage report",
          summary: `Overall: ${res.result.message}\nPatch: ${coveredForPatch} lines covered out of ${relevantForPatch} (${patchPercentage}%)`,
          annotations: chunk,
        },
      })
    })

    octokit.rest.checks.update({
      ...github.context.repo,
      check_run_id: checkRun.id,
      conclusion: res.result.state,
    })

    octokit.rest.repos.createCommitStatus({
      ...github.context.repo,
      sha: res.result.sha,
      state: coveredForPatch == relevantForPatch ? "success" : "failure",
      context: "coverbot (patch)",
      description: `${coveredForPatch} lines covered out of ${relevantForPatch} (${patchPercentage}%)`,
    })
  }
} catch (error) {
  core.setFailed(error.message)
}
