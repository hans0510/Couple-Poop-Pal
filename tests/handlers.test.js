const test = require("node:test");
const assert = require("node:assert/strict");

const { createHandlers } = require("../cloudfunctions/api/handlers");

function createMemoryRepo() {
  let counters = {
    user: 0,
    pair: 0,
    bowel: 0,
    cycle: 0,
    reminder: 0
  };

  const store = {
    users: [],
    pairs: [],
    bowelRecords: [],
    cycles: [],
    reminderState: [],
    sentMessages: []
  };

  function makeId(prefix) {
    counters[prefix] += 1;
    return `${prefix}-${counters[prefix]}`;
  }

  return {
    store,

    async getUserByOpenId(openId) {
      return store.users.find((item) => item.openId === openId) || null;
    },

    async createUser(payload) {
      const created = { _id: makeId("user"), ...payload };
      store.users.push(created);
      return created;
    },

    async updateUser(openId, patch) {
      const target = store.users.find((item) => item.openId === openId);
      if (!target) {
        return null;
      }
      Object.assign(target, patch);
      return target;
    },

    async createPair(payload) {
      const created = { _id: makeId("pair"), ...payload };
      store.pairs.push(created);
      return created;
    },

    async getPairById(pairId) {
      return store.pairs.find((item) => item._id === pairId) || null;
    },

    async getPairByInviteCode(inviteCode) {
      return store.pairs.find((item) => item.inviteCode === inviteCode) || null;
    },

    async updatePair(pairId, patch) {
      const target = store.pairs.find((item) => item._id === pairId);
      if (!target) {
        return null;
      }
      Object.assign(target, patch);
      return target;
    },

    async listUsersByPairId(pairId) {
      return store.users.filter((item) => item.pairId === pairId);
    },

    async listActivePairs() {
      return store.pairs.filter((item) => item.status === "active");
    },

    async getBowelRecordById(recordId) {
      return store.bowelRecords.find((item) => item._id === recordId) || null;
    },

    async listBowelRecordsByPairId(pairId) {
      return store.bowelRecords.filter((item) => item.pairId === pairId);
    },

    async createBowelRecord(payload) {
      const created = { _id: makeId("bowel"), ...payload };
      store.bowelRecords.push(created);
      return created;
    },

    async updateBowelRecord(recordId, patch) {
      const target = store.bowelRecords.find((item) => item._id === recordId);
      if (!target) {
        return null;
      }
      Object.assign(target, patch);
      return target;
    },

    async deleteBowelRecord(recordId) {
      const index = store.bowelRecords.findIndex((item) => item._id === recordId);
      if (index >= 0) {
        store.bowelRecords.splice(index, 1);
      }
    },

    async getCycleById(cycleId) {
      return store.cycles.find((item) => item._id === cycleId) || null;
    },

    async getActiveCycleByOwner(openId) {
      return store.cycles.find((item) => item.ownerOpenId === openId && !item.endDate) || null;
    },

    async listCyclesByPairId(pairId) {
      return store.cycles.filter((item) => item.pairId === pairId);
    },

    async createCycle(payload) {
      const created = { _id: makeId("cycle"), ...payload };
      store.cycles.push(created);
      return created;
    },

    async updateCycle(cycleId, patch) {
      const target = store.cycles.find((item) => item._id === cycleId);
      if (!target) {
        return null;
      }
      Object.assign(target, patch);
      return target;
    },

    async deleteCycle(cycleId) {
      const index = store.cycles.findIndex((item) => item._id === cycleId);
      if (index >= 0) {
        store.cycles.splice(index, 1);
      }
    },

    async getReminderStateByOpenId(openId) {
      return store.reminderState.find((item) => item.userOpenId === openId) || null;
    },

    async listReminderStatesByPairId(pairId) {
      return store.reminderState.filter((item) => item.pairId === pairId);
    },

    async upsertReminderState(openId, payload) {
      const existing = store.reminderState.find((item) => item.userOpenId === openId);
      if (existing) {
        Object.assign(existing, payload);
        return existing;
      }

      const created = { _id: makeId("reminder"), ...payload };
      store.reminderState.push(created);
      return created;
    },

    async sendSubscriptionMessage(payload) {
      store.sentMessages.push(payload);
      return payload;
    }
  };
}

function createTestContext() {
  const repo = createMemoryRepo();
  const nowValues = [
    new Date("2026-03-25T00:00:00.000Z"),
    new Date("2026-03-25T00:00:00.000Z"),
    new Date("2026-03-25T00:00:00.000Z")
  ];
  const handlers = createHandlers({
    repo,
    env: {
      reminderTemplateId: "tmpl-1"
    },
    now: () => nowValues[nowValues.length - 1]
  });

  return { repo, handlers, nowValues };
}

test("pairing enforces one male and one female", async () => {
  const { handlers } = createTestContext();

  const created = await handlers.createPair({
    openId: "user-a",
    profile: { nickName: "A" },
    role: "male"
  });

  assert.equal(created.stage, "waiting");

  const joined = await handlers.joinPair({
    openId: "user-b",
    profile: { nickName: "B" },
    role: "female",
    inviteCode: created.session.pair.inviteCode
  });

  assert.equal(joined.stage, "paired");

  await assert.rejects(
    () =>
      handlers.joinPair({
        openId: "user-c",
        profile: { nickName: "C" },
        role: "male",
        inviteCode: created.session.pair.inviteCode
      }),
    /already full/
  );
});

test("users can edit only their own bowel records", async () => {
  const { handlers, repo } = createTestContext();
  const created = await handlers.createPair({
    openId: "male",
    profile: { nickName: "He" },
    role: "male"
  });

  await handlers.joinPair({
    openId: "female",
    profile: { nickName: "She" },
    role: "female",
    inviteCode: created.session.pair.inviteCode
  });

  await handlers.saveBowelRecord({
    openId: "male",
    occurredAt: "2026-03-25T09:00:00.000Z",
    type: "normal",
    amount: "large"
  });

  const bowelRecordId = repo.store.bowelRecords[0]._id;

  await assert.rejects(
    () =>
      handlers.deleteBowelRecord({
        openId: "female",
        recordId: bowelRecordId
      }),
    /only delete your own/
  );
});

test("users can create, update, and delete their own bowel records", async () => {
  const { handlers, repo } = createTestContext();
  const created = await handlers.createPair({
    openId: "male",
    profile: { nickName: "He" },
    role: "male"
  });

  await handlers.joinPair({
    openId: "female",
    profile: { nickName: "She" },
    role: "female",
    inviteCode: created.session.pair.inviteCode
  });

  await handlers.saveBowelRecord({
    openId: "male",
    occurredAt: "2026-03-25T09:00:00.000Z",
    type: "normal",
    amount: "large"
  });

  const bowelRecordId = repo.store.bowelRecords[0]._id;

  await handlers.saveBowelRecord({
    openId: "male",
    recordId: bowelRecordId,
    occurredAt: "2026-03-24T09:00:00.000Z",
    type: "dry",
    amount: "small"
  });

  const historyAfterUpdate = await handlers.getHistory({ openId: "male" });
  assert.equal(historyAfterUpdate.bowelRecords[0].type, "dry");
  assert.equal(historyAfterUpdate.bowelRecords[0].amount, "small");

  await handlers.deleteBowelRecord({
    openId: "male",
    recordId: bowelRecordId
  });

  const historyAfterDelete = await handlers.getHistory({ openId: "male" });
  assert.equal(historyAfterDelete.bowelRecords.length, 0);
});

test("male user cannot create menstrual records", async () => {
  const { handlers } = createTestContext();
  const created = await handlers.createPair({
    openId: "male",
    profile: { nickName: "He" },
    role: "male"
  });

  await handlers.joinPair({
    openId: "female",
    profile: { nickName: "She" },
    role: "female",
    inviteCode: created.session.pair.inviteCode
  });

  await assert.rejects(
    () =>
      handlers.startMenstrualCycle({
        openId: "male",
        startDate: "2026-03-25T00:00:00.000Z"
      }),
    /Only the female user/
  );
});

test("reminder sweep throttles repeated sends and respects consent", async () => {
  const { handlers, repo, nowValues } = createTestContext();
  const created = await handlers.createPair({
    openId: "male",
    profile: { nickName: "He" },
    role: "male"
  });

  await handlers.joinPair({
    openId: "female",
    profile: { nickName: "She" },
    role: "female",
    inviteCode: created.session.pair.inviteCode
  });

  await handlers.setReminderConsent({ openId: "male", enabled: true });
  await handlers.setReminderConsent({ openId: "female", enabled: true });

  await repo.updateUser("male", {
    joinedActivePairAt: "2026-03-20T00:00:00.000Z"
  });
  await repo.updateUser("female", {
    joinedActivePairAt: "2026-03-20T00:00:00.000Z"
  });

  nowValues.push(new Date("2026-03-25T08:00:00.000Z"));
  const firstSweep = await handlers.runReminderSweep();
  assert.equal(firstSweep.results.filter((item) => item.sentTo.length).length, 2);
  assert.equal(repo.store.sentMessages.length, 4);

  const secondSweep = await handlers.runReminderSweep();
  assert.equal(secondSweep.results.filter((item) => item.sentTo.length).length, 0);
  assert.equal(repo.store.sentMessages.length, 4);
});

test("backdated bowel edits recalculate overdue state and skip recipients without consent", async () => {
  const { handlers, repo, nowValues } = createTestContext();
  const created = await handlers.createPair({
    openId: "male",
    profile: { nickName: "He" },
    role: "male"
  });

  await handlers.joinPair({
    openId: "female",
    profile: { nickName: "She" },
    role: "female",
    inviteCode: created.session.pair.inviteCode
  });

  await handlers.setReminderConsent({ openId: "male", enabled: true });
  await handlers.setReminderConsent({ openId: "female", enabled: false });

  nowValues.push(new Date("2026-03-25T10:00:00.000Z"));
  await handlers.saveBowelRecord({
    openId: "male",
    occurredAt: "2026-03-25T09:00:00.000Z",
    type: "normal",
    amount: "normal"
  });

  const bowelRecordId = repo.store.bowelRecords[0]._id;

  nowValues.push(new Date("2026-03-27T12:00:00.000Z"));
  await handlers.saveBowelRecord({
    openId: "male",
    recordId: bowelRecordId,
    occurredAt: "2026-03-23T09:00:00.000Z",
    type: "dry",
    amount: "small"
  });

  const dashboard = await handlers.getDashboard({ openId: "male" });
  assert.equal(dashboard.dashboard.me.reminderState.isOverdue, true);

  const sweep = await handlers.runReminderSweep();
  const maleResult = sweep.results.find((item) => item.overdueUserOpenId === "male");
  assert.deepEqual(maleResult.sentTo, ["male"]);
});
