import fs from "fs"
import readline from "readline"

import Decimal from "decimal.js-light"
import { Annotation, Parse, ParseResult } from "../parse"
import path from "path"

export const parse: Parse = async (coverageFile, changedFiles, subdirectory) => {
  const fileStream = fs.createReadStream(coverageFile)

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  const lines = []

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

      const [sourceFile, lineRef] = line.line_ref.split(":")
      const [start, end] = lineRef.split(",")

      const fileName = path.join(subdirectory, sourceFile)

      const coveredForPatch = fileName in changedFiles ? covered : 0
      const relevantForPatch = fileName in changedFiles ? relevant : 0

      const annotations =
        fileName in changedFiles && line.covered === 0
          ? [
            {
              path: path.join(subdirectory, sourceFile),
              start_line: parseInt(start),
              end_line: parseInt(end),
              annotation_level: "warning",
              message: "Line is not covered by tests.",
            } as Annotation,
          ]
          : []

      return {
        covered: covered + acc.covered,
        relevant: relevant + acc.relevant,
        coveredForPatch: coveredForPatch + acc.coveredForPatch,
        relevantForPatch: relevantForPatch + acc.relevantForPatch,
        annotations: annotations.concat(acc.annotations),
      } as ParseResult
    },
    {
      covered: 0,
      relevant: 0,
      coveredForPatch: 0,
      relevantForPatch: 0,
      annotations: [],
    } as ParseResult
  )

  const { covered, relevant, coveredForPatch, relevantForPatch, annotations } = parseResult

  const percentage = new Decimal(covered).dividedBy(new Decimal(relevant)).times(100).toFixed(2)
  const patchPercentage =
    relevantForPatch > 0
      ? new Decimal(coveredForPatch).dividedBy(new Decimal(relevantForPatch)).times(100).toFixed(2)
      : "0.00"

  return {
    covered,
    relevant,
    percentage,
    coveredForPatch,
    relevantForPatch,
    patchPercentage,
    annotations,
  }
}
