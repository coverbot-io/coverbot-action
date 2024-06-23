import * as core from "@actions/core"
import { ChangedFiles } from "./changed-files"

export type ParseResult = {
  covered: number
  coveredForPatch: number
  relevant: number
  relevantForPatch: number
  annotations: Annotation[]
}

export type Annotation = {
  path: string;
  start_line: number;
  end_line: number;
  start_column?: number;
  end_column?: number;
  annotation_level: "notice" | "warning" | "failure";
  message: string;
  title?: string;
  raw_details?: string;
}

export type Result = ParseResult & {
  percentage: string
  patchPercentage: string
}

export type Parse = (file: string, changedFiles: ChangedFiles, subdirectory: string) => Promise<Result | void>

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
    case "ruby":
      parseFunction = require("./parse/ruby").parse
      break
    case "go":
      parseFunction = require("./parse/go").parse
      break
    case "lcov":
      parseFunction = require("./parse/lcov").parse
      break
    default:
      core.setFailed("Unsupported format: " + format)
      return Promise.reject()
  }

  return parseFunction(file, changedFiles, subdirectory)
}
