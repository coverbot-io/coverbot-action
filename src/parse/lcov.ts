import * as core from "@actions/core"
import { AnnotationProperties } from "@actions/core"
import fs from "fs"
import util from "util"
import Decimal from "decimal.js-light"
import { Parse, ParseResult } from "../parse"
import lcovParse, { LcovFile } from "lcov-parse"
import path from "path"

export const parse: Parse = async (coverageFile, changedFiles, subdirectory) => {
  const data = fs.readFileSync(coverageFile, "utf8")

  const lcovParsePromise = util.promisify(lcovParse)

  const decodedData: LcovFile[] | undefined = await lcovParsePromise(data)

  if (!decodedData) return core.setFailed("Failed to parse file")

  const parseResult: ParseResult = decodedData
    .filter(file => !file.file.includes(".cargo"))
    .reduce(
      (acc, file) => {
        const fileName = path.join(subdirectory, file.file)

        const coveredForPatch = fileName in changedFiles ? file.lines.hit : 0
        const relevantForPatch = fileName in changedFiles ? file.lines.found : 0

        const annotations =
          fileName in changedFiles
            ? file.lines.details
                .filter(l => l.hit === 0)
                .map(
                  l =>
                    ({
                      path: fileName,
                      start_line: l.line,
                      end_line: l.line,
                      annotation_level: "warning",
                      message: "Line is not covered by tests.",
                    } as AnnotationProperties)
                )
            : []

        return {
          covered: file.lines.hit + acc.covered,
          coveredForPatch: coveredForPatch,
          relevant: file.lines.found + acc.relevant,
          relevantForPatch: relevantForPatch,
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
