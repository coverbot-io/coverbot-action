import { parse } from "../src/parse"
import fs from "fs"
import { expect, test } from "@jest/globals"

test("elixir", async () => {
  const { covered, coveredForPatch, relevant, relevantForPatch, percentage, patchPercentage } = await parse(
    "elixir",
    "./example_coverage_files/excoveralls.json",
    {},
    ""
  )

  expect(covered).toBe(391)
  expect(coveredForPatch).toBe(0)
  expect(relevant).toBe(687)
  expect(relevantForPatch).toBe(0)
  expect(percentage).toBe("56.91")
  expect(patchPercentage).toBe("0.00")
})

test("go", async () => {
  const { covered, coveredForPatch, relevant, relevantForPatch, percentage, patchPercentage } = await parse(
    "go",
    "./example_coverage_files/go.out",
    {},
    ""
  )

  expect(covered).toBe(123)
  expect(coveredForPatch).toBe(123)
  expect(relevant).toBe(182)
  expect(relevantForPatch).toBe(182)
  expect(percentage).toBe("67.58")
  expect(patchPercentage).toBe("67.58")
})
