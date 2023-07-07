import * as github from "@actions/github"
import { Octokit } from "@octokit/core"
import type { Api } from "@octokit/plugin-rest-endpoint-methods/dist-types/types"
import { PaginateInterface } from "@octokit/plugin-paginate-rest"

export type ChangedFiles = Record<string, string[]>

export const getChangedFiles = async (
  octokit: Octokit & Api & { paginate: PaginateInterface }
): Promise<ChangedFiles> => {
  const changedFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
    ...github.context.repo,
    pull_number: github.context.payload.number,
  })

  return changedFiles
    .filter(file => file.status !== "removed")
    .reduce(async (acc, file) => {
      let patch

      if ("patch" in file && file.patch) {
        patch = file.patch
      } else {
        const fileContentResponse = await octokit.request(file.contents_url)

        const encodedContent = fileContentResponse.data.content.split("\n").join("")

        patch = atob(encodedContent)
      }

      const changedLines = patch.split("\n").filter(line => line.startsWith("+"))

      return { ...acc, [file.filename]: changedLines } as ChangedFiles
    }, {})
}
