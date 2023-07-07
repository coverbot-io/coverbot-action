import core, { AnnotationProperties } from "@actions/core"

import Decimal from "decimal.js-light"
import path from "path"
import { ChangedFiles } from "./changed-files"

const subdirectory = core.getInput("subdirectory") || ""

type SourceFile = {
  coverage: (number | null)[]
  name: string
  source: string
}

type Data = {
  source_files: SourceFile[]
}

type ParseResult = {
  covered: number
  coveredForPatch: number
  relevant: number
  relevantForPatch: number
  annotations: AnnotationProperties[]
}

type Result = ParseResult & {
  percentage: string
  patchPercentage: string
}

export const parse = (data: Data, changedFiles: ChangedFiles): Result => {
  const parseResult: ParseResult = data.source_files.reduce(
    (acc, file) => {
      const { covered, coveredForPatch, relevant, relevantForPatch, annotations } = parseSourceFile(file, changedFiles)

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

const parseSourceFile = (sourceFile: SourceFile, changedFiles: ChangedFiles): ParseResult => {
  const sourceLines = sourceFile.source.split("\n").map((code, i) => {
    return { code, coverage: sourceFile.coverage[i], lineNumber: i + 1 }
  })

  const relevant = sourceLines.filter(l => l.coverage !== null)
  const relevantForPatch = relevant.filter(line => {
    const fileName = path.join(subdirectory, sourceFile.name)
    const changedLines = changedFiles[fileName]
    return fileName in changedFiles && changedLines.includes(`+${line.code}`)
  })

  const covered = relevant.filter(l => l.coverage !== null && l.coverage > 0)
  const coveredForPatch = relevantForPatch.filter(l => l.coverage !== null && l.coverage > 0)

  const annotations = relevantForPatch
    .filter(l => l.coverage === 0)
    .map(line => {
      return {
        path: path.join(subdirectory, sourceFile.name),
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
