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
    {
      "terraform-provider-querydesk/internal/provider/provider.go": [],
    },
    ""
  )

  expect(covered).toBe(123)
  expect(coveredForPatch).toBe(29)
  expect(relevant).toBe(182)
  expect(relevantForPatch).toBe(37)
  expect(percentage).toBe("67.58")
  expect(patchPercentage).toBe("78.38")
})

test("lcov", async () => {
  const { covered, coveredForPatch, relevant, relevantForPatch, percentage, patchPercentage } = await parse(
    "lcov",
    "./example_coverage_files/lcov.info",
    {
      "src/events/windows_events_structs.rs": [],
    },
    ""
  )

  expect(covered).toBe(1787)
  expect(coveredForPatch).toBe(44)
  expect(relevant).toBe(2706)
  expect(relevantForPatch).toBe(44)
  expect(percentage).toBe("66.04")
  expect(patchPercentage).toBe("100.00")
})

test("ruby - simplecov", async () => {
  const { covered, coveredForPatch, relevant, relevantForPatch, percentage, patchPercentage } = await parse(
    "ruby",
    "./example_coverage_files/simplecov.json",
    {
      "app/builders/account_builder.rb": [],
    },
    ""
  )

  expect(covered).toBe(23700)
  expect(coveredForPatch).toBe(10)
  expect(relevant).toBe(30823)
  expect(relevantForPatch).toBe(10)
  expect(percentage).toBe("76.89")
  expect(patchPercentage).toBe("100.00")
})
