const {
  BOWEL_AMOUNTS,
  BOWEL_TYPES,
  DEFAULT_CYCLE_LENGTH_DAYS,
  MAX_PREDICTION_INTERVALS,
  REMINDER_THRESHOLD_HOURS,
  ROLES
} = require("./constants");

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function assert(condition, message, code = "INVALID_REQUEST") {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
}

function toDate(value, fieldName = "date") {
  const date = value instanceof Date ? value : new Date(value);
  assert(!Number.isNaN(date.getTime()), `${fieldName} is invalid`);
  return date;
}

function toIsoString(value, fieldName = "date") {
  return toDate(value, fieldName).toISOString();
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProfile(profile = {}) {
  return {
    nickName: trimText(profile.nickName || profile.nickname),
    avatarUrl: trimText(profile.avatarUrl)
  };
}

function ensureNickName(nickName) {
  const normalized = trimText(nickName);
  assert(normalized.length >= 1, "Nickname is required");
  assert(normalized.length <= 20, "Nickname must be 20 characters or fewer");
  return normalized;
}

function ensureRole(role) {
  assert(Object.values(ROLES).includes(role), "Role is invalid");
  return role;
}

function ensureBowelPayload(payload = {}) {
  const occurredAt = toIsoString(payload.occurredAt, "occurredAt");
  assert(BOWEL_TYPES.includes(payload.type), "Bowel type is invalid");
  assert(BOWEL_AMOUNTS.includes(payload.amount), "Bowel amount is invalid");
  return {
    occurredAt,
    type: payload.type,
    amount: payload.amount
  };
}

function ensureCycleDate(dateValue, fieldName) {
  return toIsoString(dateValue, fieldName);
}

function buildInviteCode(random = Math.random) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(random() * alphabet.length)];
  }
  return code;
}

function dateKey(dateValue, timeZone = "Asia/Shanghai") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(toDate(dateValue));
  const year = parts.find((part) => part.type === "year").value;
  const month = parts.find((part) => part.type === "month").value;
  const day = parts.find((part) => part.type === "day").value;
  return `${year}-${month}-${day}`;
}

function sortByDateAscending(items, fieldName) {
  return [...items].sort((left, right) => {
    return toDate(left[fieldName]).getTime() - toDate(right[fieldName]).getTime();
  });
}

function sortByDateDescending(items, fieldName) {
  return [...items].sort((left, right) => {
    return toDate(right[fieldName]).getTime() - toDate(left[fieldName]).getTime();
  });
}

function calculateCyclePrediction(cycles = []) {
  if (!cycles.length) {
    return {
      cycleLengthDays: DEFAULT_CYCLE_LENGTH_DAYS,
      predictedStartDate: null,
      source: "none"
    };
  }

  const orderedCycles = sortByDateAscending(cycles, "startDate");
  const starts = orderedCycles.map((cycle) => toDate(cycle.startDate).getTime());
  const intervals = [];

  for (let index = 1; index < starts.length; index += 1) {
    intervals.push(Math.round((starts[index] - starts[index - 1]) / DAY_MS));
  }

  let cycleLengthDays = DEFAULT_CYCLE_LENGTH_DAYS;
  let source = "fallback";

  if (intervals.length >= 2) {
    const recentIntervals = intervals.slice(-MAX_PREDICTION_INTERVALS);
    const total = recentIntervals.reduce((sum, value) => sum + value, 0);
    cycleLengthDays = Math.round(total / recentIntervals.length);
    source = "history";
  }

  const lastStart = toDate(orderedCycles[orderedCycles.length - 1].startDate);
  const predictedStartDate = new Date(lastStart.getTime() + cycleLengthDays * DAY_MS).toISOString();

  return {
    cycleLengthDays,
    predictedStartDate,
    source
  };
}

function calculateReminderState({
  latestBowelAt,
  joinedActivePairAt,
  now = new Date(),
  thresholdHours = REMINDER_THRESHOLD_HOURS,
  previousState = {}
}) {
  const nowDate = toDate(now, "now");
  const anchor = latestBowelAt || joinedActivePairAt;

  if (!anchor) {
    return {
      isOverdue: false,
      overdueSince: null,
      lastBowelAt: latestBowelAt || null,
      anchorAt: null,
      overdueHours: 0,
      lastEvaluatedAt: nowDate.toISOString(),
      lastSentOnByRecipient: {}
    };
  }

  const anchorDate = toDate(anchor, "anchor");
  const overdueHours = Math.max(0, Math.floor((nowDate.getTime() - anchorDate.getTime()) / HOUR_MS));
  const isOverdue = overdueHours >= thresholdHours;

  return {
    isOverdue,
    overdueSince: isOverdue ? new Date(anchorDate.getTime() + thresholdHours * HOUR_MS).toISOString() : null,
    lastBowelAt: latestBowelAt || null,
    anchorAt: anchorDate.toISOString(),
    overdueHours,
    lastEvaluatedAt: nowDate.toISOString(),
    lastSentOnByRecipient: isOverdue ? previousState.lastSentOnByRecipient || {} : {}
  };
}

function getLatestRecord(records, fieldName) {
  if (!records.length) {
    return null;
  }
  return sortByDateDescending(records, fieldName)[0];
}

function buildUserStatus(user, records, reminderState, now = new Date()) {
  const latestRecord = getLatestRecord(records, "occurredAt");
  const latestDate = latestRecord ? toDate(latestRecord.occurredAt) : null;
  const hoursSinceLastRecord = latestDate
    ? Math.floor((toDate(now).getTime() - latestDate.getTime()) / HOUR_MS)
    : null;

  return {
    openId: user.openId,
    nickName: user.nickName,
    role: user.role,
    subscriptionEnabled: Boolean(user.subscriptionEnabled),
    latestBowelRecord: latestRecord,
    hoursSinceLastRecord,
    reminderState: reminderState || calculateReminderState({
      latestBowelAt: latestRecord ? latestRecord.occurredAt : null,
      joinedActivePairAt: user.joinedActivePairAt,
      now
    })
  };
}

function buildDashboard({
  viewer,
  users,
  pair,
  bowelRecords,
  cycles,
  reminderStates,
  now = new Date()
}) {
  const reminderStateByOpenId = new Map(
    reminderStates.map((state) => [state.userOpenId, state])
  );

  const recordsByOpenId = users.reduce((accumulator, user) => {
    accumulator[user.openId] = sortByDateDescending(
      bowelRecords.filter((record) => record.ownerOpenId === user.openId),
      "occurredAt"
    );
    return accumulator;
  }, {});

  const me = buildUserStatus(
    viewer,
    recordsByOpenId[viewer.openId] || [],
    reminderStateByOpenId.get(viewer.openId),
    now
  );

  const partner = users.find((user) => user.openId !== viewer.openId) || null;
  const partnerStatus = partner
    ? buildUserStatus(
        partner,
        recordsByOpenId[partner.openId] || [],
        reminderStateByOpenId.get(partner.openId),
        now
      )
    : null;

  const femaleUser = users.find((user) => user.role === ROLES.FEMALE) || null;
  const femaleCycles = femaleUser
    ? sortByDateDescending(
        cycles.filter((cycle) => cycle.ownerOpenId === femaleUser.openId),
        "startDate"
      )
    : [];
  const activeCycle = femaleCycles.find((cycle) => !cycle.endDate) || null;
  const prediction = femaleUser ? calculateCyclePrediction(femaleCycles) : null;

  return {
    pair: {
      id: pair._id,
      inviteCode: pair.inviteCode,
      status: pair.status
    },
    me,
    partner: partnerStatus,
    menstrual: femaleUser
      ? {
          ownerOpenId: femaleUser.openId,
          ownerNickName: femaleUser.nickName,
          isActive: Boolean(activeCycle),
          activeCycle,
          prediction
        }
      : null
  };
}

function buildHistory({ viewerOpenId, bowelRecords, cycles }) {
  return {
    bowelRecords: sortByDateDescending(bowelRecords, "occurredAt").map((record) => ({
      ...record,
      canEdit: record.ownerOpenId === viewerOpenId
    })),
    menstrualCycles: sortByDateDescending(cycles, "startDate").map((cycle) => ({
      ...cycle,
      canEdit: cycle.ownerOpenId === viewerOpenId
    }))
  };
}

module.exports = {
  assert,
  buildDashboard,
  buildHistory,
  buildInviteCode,
  calculateCyclePrediction,
  calculateReminderState,
  dateKey,
  ensureBowelPayload,
  ensureCycleDate,
  ensureNickName,
  ensureRole,
  getLatestRecord,
  normalizeProfile,
  toDate,
  toIsoString,
  trimText
};
