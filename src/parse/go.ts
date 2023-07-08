import { AnnotationProperties } from "@actions/core"
import fs from "fs"
import readline from "readline"

import Decimal from "decimal.js-light"
import path from "path"
import { ChangedFiles } from "../changed-files"
import { Parse, ParseResult } from "../parse"

export const parse: Parse = async (file, changedFiles, subdirectory) => {
  const fileStream = fs.createReadStream(file)

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let lines = []

  for await (const line of rl) {
    if (!line.startsWith("mode: ")) {
      const [line_ref, statements, covered] = line.split(" ")
      lines.push({
        line_ref,
        statements: parseInt(statements),
        covered: parseInt(covered),
      })
    }
  }

  const parseResult: ParseResult = lines.reduce(
    (acc, line) => {
      const covered = line.covered > 0 ? line.statements : 0
      const relevant = line.statements
      // TODO: figure out changed files
      const coveredForPatch = covered
      const relevantForPatch = relevant

      return {
        covered: covered + acc.covered,
        coveredForPatch: coveredForPatch + acc.coveredForPatch,
        relevant: relevant + acc.relevant,
        relevantForPatch: relevantForPatch + acc.relevantForPatch,
        annotations: [],
      } as ParseResult
    },
    {
      covered: 0,
      coveredForPatch: 0,
      relevant: 0,
      relevantForPatch: 0,
      annotations: [],
    } as ParseResult
  )

  const { covered, coveredForPatch, relevant, relevantForPatch, annotations } = parseResult

  const percentage = new Decimal(covered).dividedBy(new Decimal(relevant)).times(100).toFixed(2)
  const patchPercentage =
    relevantForPatch > 0
      ? new Decimal(coveredForPatch).dividedBy(new Decimal(relevantForPatch)).times(100).toFixed(2)
      : "0.00"

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
