import { parse } from "../src/parse"
import fs from "fs"
import { expect, test } from "@jest/globals"

test("parse", async () => {
  const data = fs.readFileSync("./example_coverage_files/excoveralls.json", "utf8")
  const decodedData = JSON.parse(data)
  const { covered, coveredForPatch, relevant, relevantForPatch, percentage, patchPercentage } = parse(decodedData, {}, "")
  expect(covered).toBe(391)
  expect(coveredForPatch).toBe(0)
  expect(relevant).toBe(687)
  expect(relevantForPatch).toBe(0)
  expect(percentage).toBe("56.91")
  expect(patchPercentage).toBe("0.00")
})
