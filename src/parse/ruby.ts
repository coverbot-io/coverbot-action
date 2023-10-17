import { AnnotationProperties } from "@actions/core"
import fs from "fs"

import Decimal from "decimal.js-light"
import path from "path"
import { ChangedFiles } from "../changed-files"
import { Parse, ParseResult } from "../parse"

type SourceFile = [string, { lines: (number | null)[]; }]

type Data = {
  coverage: {
    [key: string]: {lines: (number | null)[] }
  }
}

export const parse: Parse = async (coverageFile, changedFiles, subdirectory) => {
  const data = fs.readFileSync(coverageFile, "utf8")

  const decodedData: Data = JSON.parse(data)

  const parseResult: ParseResult = Object.entries(decodedData.coverage).reduce(
    (acc, file) => {
      const { covered, coveredForPatch, relevant, relevantForPatch, annotations } = parseSourceFile(
        file,
        changedFiles,
        subdirectory
      )

      return {
        covered: covered + acc.covered,
        coveredForPatch: coveredForPatch + acc.coveredForPatch,
        relevant: relevant + acc.relevant,
        relevantForPatch: relevantForPatch + acc.relevantForPatch,
        annotations: annotations.concat(acc.annotations),
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

const parseSourceFile = ([sourceFile, value]: SourceFile, changedFiles: ChangedFiles, subdirectory: string): ParseResult => {
  const sourceLines = value.lines.map((coverage, i) => {
    return { coverage, lineNumber: i + 1 }
  })
  
  const fileName = path.join(subdirectory, sourceFile).substring(1)

  const relevant = sourceLines.filter(l => l.coverage !== null)
  const relevantForPatch = fileName in changedFiles ? relevant : []

  const covered = relevant.filter(l => l.coverage !== null && l.coverage > 0)
  const coveredForPatch = relevantForPatch.filter(l => l.coverage !== null && l.coverage > 0)

  const annotations = relevantForPatch
    .filter(l => l.coverage === 0)
    .map(line => {
      return {
        path: fileName,
        start_line: line.lineNumber,
        end_line: line.lineNumber,
        annotation_level: "warning",
        message: "Line is not covered by tests.",
      } as AnnotationProperties
    })

  return {
    covered: covered.length,
    coveredForPatch: coveredForPatch.length,
    relevant: relevant.length,
    relevantForPatch: relevantForPatch.length,
    annotations,
  }
}
