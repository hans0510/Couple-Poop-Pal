const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateCyclePrediction,
  calculateReminderState
} = require("../cloudfunctions/api/domain");

test("calculateCyclePrediction falls back to 28 days when history is sparse", () => {
  const prediction = calculateCyclePrediction([
    { startDate: "2026-01-01T00:00:00.000Z" },
    { startDate: "2026-01-29T00:00:00.000Z" }
  ]);

  assert.equal(prediction.source, "fallback");
  assert.equal(prediction.cycleLengthDays, 28);
  assert.equal(prediction.predictedStartDate, "2026-02-26T00:00:00.000Z");
});

test("calculateCyclePrediction uses recent intervals when enough history exists", () => {
  const prediction = calculateCyclePrediction([
    { startDate: "2026-01-01T00:00:00.000Z" },
    { startDate: "2026-01-30T00:00:00.000Z" },
    { startDate: "2026-02-28T00:00:00.000Z" },
    { startDate: "2026-03-29T00:00:00.000Z" }
  ]);

  assert.equal(prediction.source, "history");
  assert.equal(prediction.cycleLengthDays, 29);
  assert.equal(prediction.predictedStartDate, "2026-04-27T00:00:00.000Z");
});

test("calculateReminderState becomes overdue after 48 hours", () => {
  const reminderState = calculateReminderState({
    latestBowelAt: "2026-03-20T00:00:00.000Z",
    now: "2026-03-22T00:00:00.000Z"
  });

  assert.equal(reminderState.isOverdue, true);
  assert.equal(reminderState.overdueSince, "2026-03-22T00:00:00.000Z");
});

test("calculateReminderState uses active-pair join time when no bowel record exists", () => {
  const reminderState = calculateReminderState({
    latestBowelAt: null,
    joinedActivePairAt: "2026-03-20T00:00:00.000Z",
    now: "2026-03-21T00:00:00.000Z"
  });

  assert.equal(reminderState.isOverdue, false);
  assert.equal(reminderState.anchorAt, "2026-03-20T00:00:00.000Z");
});
