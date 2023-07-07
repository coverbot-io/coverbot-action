import * as core from "@actions/core"
import github from "@actions/github"
import { HttpClient } from "@actions/http-client"
import fs from "fs"
import { getChangedFiles } from "./changed-files"
import { parse } from "./parse"
import { TypedResponse } from "@actions/http-client/lib/interfaces"

type CoverageResponse = {
  sha: string
  state: "pending" | "error" | "failure" | "success"
  message: string
}

async function run(): Promise<void> {
  try {
    const token = core.getInput("github_token")
    const subdirectory = core.getInput("subdirectory") || ""

    const octokit = github.getOctokit(token)

    const data = fs.readFileSync(core.getInput("file"), "utf8")
    const decodedData = JSON.parse(data)

    // changedFiles on currently supported for PRs
    const changedFiles = github.context.eventName === "pull_request" ? await getChangedFiles(octokit) : {}

    const { covered, coveredForPatch, relevant, relevantForPatch, percentage, patchPercentage, annotations } = parse(
      decodedData,
      changedFiles,
      subdirectory
    )

    const payload = {
      covered,
      relevant,
      percentage,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      default_branch: github.context.payload.repository?.default_branch,
      context: github.context,
    }

    const http = new HttpClient("coverbot-io/coverage-action", [], {
      headers: {
        "content-type": "application/json",
        "x-api-key": core.getInput("coverbot_api_key"),
      },
    })

    const res: TypedResponse<CoverageResponse> = await http.postJson("https://api.coverbot.io/v1/coverage", payload)

    if (!res.result) return core.setFailed("Failed to report coverage")

    octokit.rest.repos.createCommitStatus({
      ...github.context.repo,
      sha: res.result.sha,
      state: res.result.state,
      context: "coverbot",
      description: res.result.message,
    })

    if (github.context.eventName === "pull_request" && relevantForPatch > 0) {
      const { data: checkRun } = await octokit.rest.checks.create({
        ...github.context.repo,
        status: "in_progress",
        name: "coverbot",
        head_sha: res.result.sha,
      })

      const chunkSize = 50

      const annotationChunks = Array.from(new Array(Math.ceil(annotations.length / chunkSize)), (_, i) =>
        annotations.slice(i * chunkSize, i * chunkSize + chunkSize)
      )

      for (const chunk of annotationChunks) {
        octokit.rest.checks.update({
          ...github.context.repo,
          check_run_id: checkRun.id,
          output: {
            title: "coverbot coverage report",
            summary: `Overall: ${res.result.message}\nPatch: ${coveredForPatch} lines covered out of ${relevantForPatch} (${patchPercentage}%)`,
            annotations: chunk,
          },
        })
      }

      octokit.rest.checks.update({
        ...github.context.repo,
        check_run_id: checkRun.id,
        conclusion: res.result.state,
      })

      octokit.rest.repos.createCommitStatus({
        ...github.context.repo,
        sha: res.result.sha,
        state: coveredForPatch === relevantForPatch ? "success" : "failure",
        context: "coverbot (patch)",
        description: `${coveredForPatch} lines covered out of ${relevantForPatch} (${patchPercentage}%)`,
      })
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
