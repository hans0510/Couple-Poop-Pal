const ROLES = Object.freeze({
  MALE: "male",
  FEMALE: "female"
});

const PAIR_STATUS = Object.freeze({
  WAITING: "waiting",
  ACTIVE: "active"
});

const BOWEL_TYPES = Object.freeze(["normal", "dry", "loose"]);
const BOWEL_AMOUNTS = Object.freeze([
  "very_small",
  "small",
  "normal",
  "large",
  "very_large"
]);

const COLLECTIONS = Object.freeze({
  USERS: "users",
  PAIRS: "pairs",
  BOWEL_RECORDS: "bowel_records",
  MENSTRUAL_CYCLES: "menstrual_cycles",
  REMINDER_STATE: "reminder_state"
});

const REMINDER_THRESHOLD_HOURS = 48;
const DEFAULT_CYCLE_LENGTH_DAYS = 28;
const MAX_PREDICTION_INTERVALS = 3;

module.exports = {
  BOWEL_AMOUNTS,
  BOWEL_TYPES,
  COLLECTIONS,
  DEFAULT_CYCLE_LENGTH_DAYS,
  MAX_PREDICTION_INTERVALS,
  PAIR_STATUS,
  REMINDER_THRESHOLD_HOURS,
  ROLES
};
