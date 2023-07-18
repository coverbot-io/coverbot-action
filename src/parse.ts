import * as core from "@actions/core"
import { AnnotationProperties } from "@actions/core"
import { ChangedFiles } from "./changed-files"

export type ParseResult = {
  covered: number
  coveredForPatch: number
  relevant: number
  relevantForPatch: number
  annotations: AnnotationProperties[]
}

export type Result = ParseResult & {
  percentage: string
  patchPercentage: string
}

export type Parse = (file: string, changedFiles: ChangedFiles, subdirectory: string) => Promise<Result>

export const parse = (
  format: string,
  file: string,
  changedFiles: ChangedFiles,
  subdirectory: string
): Promise<Result> => {
  let parseFunction

  switch (format) {
    case "elixir":
      parseFunction = require("./parse/elixir").parse
      break
    case "go":
      parseFunction = require("./parse/go").parse
      break
    default:
      core.setFailed("Unsupported format: " + format)
      return Promise.reject()
  }

  return parseFunction(file, changedFiles, subdirectory)
}
