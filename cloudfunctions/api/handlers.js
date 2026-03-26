const { PAIR_STATUS, ROLES } = require("./constants");
const {
  assert,
  buildDashboard,
  buildHistory,
  buildInviteCode,
  calculateReminderState,
  dateKey,
  ensureBowelPayload,
  ensureCycleDate,
  ensureNickName,
  ensureRole,
  getLatestRecord,
  normalizeProfile,
  toDate
} = require("./domain");

function createHandlers({
  repo,
  now = () => new Date(),
  random = Math.random,
  env = {}
}) {
  async function ensureUser(openId, profile = {}) {
    const current = await repo.getUserByOpenId(openId);
    const normalizedProfile = normalizeProfile(profile);

    if (current) {
      if (normalizedProfile.nickName || normalizedProfile.avatarUrl) {
        return repo.updateUser(openId, {
          nickName: normalizedProfile.nickName || current.nickName,
          avatarUrl: normalizedProfile.avatarUrl || current.avatarUrl,
          updatedAt: now().toISOString()
        });
      }
      return current;
    }

    return repo.createUser({
      openId,
      nickName: normalizedProfile.nickName || "",
      avatarUrl: normalizedProfile.avatarUrl || "",
      role: null,
      pairId: null,
      joinedActivePairAt: null,
      subscriptionEnabled: false,
      createdAt: now().toISOString(),
      updatedAt: now().toISOString()
    });
  }

  async function getPairContext(openId) {
    const viewer = await repo.getUserByOpenId(openId);
    assert(viewer, "User not found", "NOT_FOUND");
    assert(viewer.pairId, "Pair is not set up yet", "PAIR_REQUIRED");

    const pair = await repo.getPairById(viewer.pairId);
    assert(pair, "Pair not found", "NOT_FOUND");

    const users = await repo.listUsersByPairId(pair._id);

    return { viewer, pair, users };
  }

  async function requireActivePair(openId) {
    const context = await getPairContext(openId);
    assert(
      context.pair.status === PAIR_STATUS.ACTIVE,
      "Both partners must finish pairing first",
      "PAIR_NOT_ACTIVE"
    );
    return context;
  }

  async function generateUniqueInviteCode() {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = buildInviteCode(random);
      const existing = await repo.getPairByInviteCode(code);
      if (!existing) {
        return code;
      }
    }
    throw new Error("Failed to generate a unique invite code");
  }

  async function refreshReminderStateForUser(user, pairUsers, bowelRecords) {
    const latestBowelRecord = getLatestRecord(
      bowelRecords.filter((record) => record.ownerOpenId === user.openId),
      "occurredAt"
    );
    const previousState = await repo.getReminderStateByOpenId(user.openId);
    const nextState = calculateReminderState({
      latestBowelAt: latestBowelRecord ? latestBowelRecord.occurredAt : null,
      joinedActivePairAt: user.joinedActivePairAt,
      now: now(),
      previousState
    });

    return repo.upsertReminderState(user.openId, {
      ...previousState,
      ...nextState,
      pairId: user.pairId,
      userOpenId: user.openId,
      viewerOpenIds: pairUsers.map((pairUser) => pairUser.openId),
      updatedAt: now().toISOString()
    });
  }

  async function refreshPairReminderStates(pair, users, bowelRecords) {
    const refreshed = [];
    for (const user of users) {
      refreshed.push(await refreshReminderStateForUser(user, users, bowelRecords));
    }
    return refreshed;
  }

  async function maybeSendReminderMessages(overdueUser, users, reminderState) {
    if (!reminderState.isOverdue) {
      return {
        sentTo: []
      };
    }

    const templateId = env.reminderTemplateId || "";
    if (!templateId) {
      return {
        sentTo: []
      };
    }

    const today = dateKey(now());
    const sentTo = [];
    const nextLastSent = {
      ...(reminderState.lastSentOnByRecipient || {})
    };

    for (const recipient of users) {
      if (!recipient.subscriptionEnabled) {
        continue;
      }

      if (nextLastSent[recipient.openId] === today) {
        continue;
      }

      await repo.sendSubscriptionMessage({
        recipientOpenId: recipient.openId,
        templateId,
        page: "pages/home/index",
        data: {
          thing1: {
            value: `${overdueUser.nickName || "Ta"} needs a check-in`
          },
          thing2: {
            value: "Fruit, water, and a quick log might help"
          },
          time3: {
            value: reminderState.overdueSince || now().toISOString()
          }
        }
      });

      nextLastSent[recipient.openId] = today;
      sentTo.push(recipient.openId);
    }

    const persisted = await repo.upsertReminderState(overdueUser.openId, {
      ...reminderState,
      lastSentOnByRecipient: nextLastSent,
      updatedAt: now().toISOString()
    });

    return {
      reminderState: persisted,
      sentTo
    };
  }

  async function buildSession(openId) {
    const viewer = await repo.getUserByOpenId(openId);
    assert(viewer, "User not found", "NOT_FOUND");

    if (!viewer.pairId) {
      return {
        stage: "onboarding",
        session: {
          user: viewer,
          pair: null
        }
      };
    }

    const pair = await repo.getPairById(viewer.pairId);
    if (!pair) {
      return {
        stage: "onboarding",
        session: {
          user: viewer,
          pair: null
        }
      };
    }

    if (pair.status !== PAIR_STATUS.ACTIVE) {
      return {
        stage: "waiting",
        session: {
          user: viewer,
          pair
        }
      };
    }

    const users = await repo.listUsersByPairId(pair._id);
    const bowelRecords = await repo.listBowelRecordsByPairId(pair._id);
    const reminderStates = await refreshPairReminderStates(pair, users, bowelRecords);
    const cycles = await repo.listCyclesByPairId(pair._id);

    return {
      stage: "paired",
      session: {
        user: viewer,
        pair,
        dashboard: buildDashboard({
          viewer,
          users,
          pair,
          bowelRecords,
          cycles,
          reminderStates,
          now: now()
        })
      }
    };
  }

  return {
    async bootstrapSession({ openId, profile }) {
      await ensureUser(openId, profile);
      return buildSession(openId);
    },

    async createPair({ openId, profile, role }) {
      const user = await ensureUser(openId, profile);
      assert(!user.pairId, "You are already in a pair", "PAIR_EXISTS");

      const nextRole = ensureRole(role);
      const inviteCode = await generateUniqueInviteCode();
      const createdAt = now().toISOString();

      const pair = await repo.createPair({
        inviteCode,
        status: PAIR_STATUS.WAITING,
        memberOpenIds: [openId],
        memberRoles: {
          [nextRole]: openId
        },
        createdAt,
        updatedAt: createdAt
      });

      await repo.updateUser(openId, {
        nickName: ensureNickName(profile.nickName),
        avatarUrl: profile.avatarUrl || "",
        role: nextRole,
        pairId: pair._id,
        joinedActivePairAt: null,
        updatedAt: createdAt
      });

      return buildSession(openId);
    },

    async joinPair({ openId, profile, role, inviteCode }) {
      const user = await ensureUser(openId, profile);
      assert(!user.pairId, "You are already in a pair", "PAIR_EXISTS");

      const nextRole = ensureRole(role);
      const normalizedInviteCode = String(inviteCode || "").trim().toUpperCase();
      assert(normalizedInviteCode, "Invite code is required");

      const pair = await repo.getPairByInviteCode(normalizedInviteCode);
      assert(pair, "Invite code was not found", "NOT_FOUND");
      assert(pair.status !== PAIR_STATUS.ACTIVE, "This pair is already full", "PAIR_FULL");
      assert(
        !pair.memberRoles[nextRole],
        "That role has already been taken in this pair",
        "ROLE_TAKEN"
      );

      const activatedAt = now().toISOString();
      const memberRoles = {
        ...pair.memberRoles,
        [nextRole]: openId
      };

      await repo.updatePair(pair._id, {
        status: PAIR_STATUS.ACTIVE,
        memberOpenIds: [...pair.memberOpenIds, openId],
        memberRoles,
        updatedAt: activatedAt
      });

      await repo.updateUser(openId, {
        nickName: ensureNickName(profile.nickName),
        avatarUrl: profile.avatarUrl || "",
        role: nextRole,
        pairId: pair._id,
        joinedActivePairAt: activatedAt,
        updatedAt: activatedAt
      });

      for (const existingOpenId of pair.memberOpenIds) {
        await repo.updateUser(existingOpenId, {
          joinedActivePairAt: activatedAt,
          updatedAt: activatedAt
        });
      }

      return buildSession(openId);
    },

    async getDashboard({ openId }) {
      const { viewer, pair, users } = await requireActivePair(openId);
      const bowelRecords = await repo.listBowelRecordsByPairId(pair._id);
      const cycles = await repo.listCyclesByPairId(pair._id);
      const reminderStates = await refreshPairReminderStates(pair, users, bowelRecords);

      return {
        session: {
          user: viewer,
          pair
        },
        dashboard: buildDashboard({
          viewer,
          users,
          pair,
          bowelRecords,
          cycles,
          reminderStates,
          now: now()
        })
      };
    },

    async getHistory({ openId }) {
      const { viewer, pair } = await requireActivePair(openId);
      const bowelRecords = await repo.listBowelRecordsByPairId(pair._id);
      const cycles = await repo.listCyclesByPairId(pair._id);

      return buildHistory({
        viewerOpenId: viewer.openId,
        bowelRecords,
        cycles
      });
    },

    async saveBowelRecord({ openId, recordId, occurredAt, type, amount }) {
      const { viewer, pair, users } = await requireActivePair(openId);
      const payload = ensureBowelPayload({ occurredAt, type, amount });
      const timestamp = now().toISOString();

      if (recordId) {
        const existing = await repo.getBowelRecordById(recordId);
        assert(existing, "Bowel record not found", "NOT_FOUND");
        assert(existing.ownerOpenId === openId, "You can only edit your own records", "FORBIDDEN");
        await repo.updateBowelRecord(recordId, {
          ...payload,
          updatedAt: timestamp
        });
      } else {
        await repo.createBowelRecord({
          pairId: pair._id,
          ownerOpenId: viewer.openId,
          ownerRole: viewer.role,
          ...payload,
          createdAt: timestamp,
          updatedAt: timestamp
        });
      }

      const bowelRecords = await repo.listBowelRecordsByPairId(pair._id);
      await refreshPairReminderStates(pair, users, bowelRecords);
      return this.getDashboard({ openId });
    },

    async deleteBowelRecord({ openId, recordId }) {
      const { pair, users } = await requireActivePair(openId);
      const existing = await repo.getBowelRecordById(recordId);
      assert(existing, "Bowel record not found", "NOT_FOUND");
      assert(existing.ownerOpenId === openId, "You can only delete your own records", "FORBIDDEN");

      await repo.deleteBowelRecord(recordId);
      const bowelRecords = await repo.listBowelRecordsByPairId(pair._id);
      await refreshPairReminderStates(pair, users, bowelRecords);
      return this.getHistory({ openId });
    },

    async startMenstrualCycle({ openId, startDate }) {
      const { viewer } = await requireActivePair(openId);
      assert(viewer.role === ROLES.FEMALE, "Only the female user can log cycles", "FORBIDDEN");

      const activeCycle = await repo.getActiveCycleByOwner(openId);
      assert(!activeCycle, "There is already an active cycle", "CONFLICT");

      await repo.createCycle({
        pairId: viewer.pairId,
        ownerOpenId: openId,
        startDate: ensureCycleDate(startDate, "startDate"),
        endDate: null,
        createdAt: now().toISOString(),
        updatedAt: now().toISOString()
      });

      return this.getDashboard({ openId });
    },

    async endMenstrualCycle({ openId, cycleId, endDate }) {
      const { viewer } = await requireActivePair(openId);
      assert(viewer.role === ROLES.FEMALE, "Only the female user can log cycles", "FORBIDDEN");

      const targetCycle = cycleId
        ? await repo.getCycleById(cycleId)
        : await repo.getActiveCycleByOwner(openId);
      assert(targetCycle, "Cycle not found", "NOT_FOUND");
      assert(targetCycle.ownerOpenId === openId, "You can only edit your own cycle", "FORBIDDEN");

      const normalizedEndDate = ensureCycleDate(endDate, "endDate");
      assert(
        toDate(normalizedEndDate).getTime() >= toDate(targetCycle.startDate).getTime(),
        "Cycle end must be after the start",
        "INVALID_REQUEST"
      );

      await repo.updateCycle(targetCycle._id, {
        endDate: normalizedEndDate,
        updatedAt: now().toISOString()
      });

      return this.getDashboard({ openId });
    },

    async saveCycle({ openId, cycleId, startDate, endDate }) {
      const { viewer } = await requireActivePair(openId);
      assert(viewer.role === ROLES.FEMALE, "Only the female user can edit cycles", "FORBIDDEN");
      const existing = await repo.getCycleById(cycleId);
      assert(existing, "Cycle not found", "NOT_FOUND");
      assert(existing.ownerOpenId === openId, "You can only edit your own cycle", "FORBIDDEN");

      const patch = {
        updatedAt: now().toISOString()
      };

      if (startDate) {
        patch.startDate = ensureCycleDate(startDate, "startDate");
      }

      if (endDate) {
        patch.endDate = ensureCycleDate(endDate, "endDate");
      } else if (endDate === null) {
        patch.endDate = null;
      }

      const nextStartDate = patch.startDate || existing.startDate;
      const nextEndDate = Object.prototype.hasOwnProperty.call(patch, "endDate")
        ? patch.endDate
        : existing.endDate;

      if (nextEndDate) {
        assert(
          toDate(nextEndDate).getTime() >= toDate(nextStartDate).getTime(),
          "Cycle end must be after the start",
          "INVALID_REQUEST"
        );
      }

      await repo.updateCycle(cycleId, patch);
      return this.getHistory({ openId });
    },

    async deleteCycle({ openId, cycleId }) {
      const { viewer } = await requireActivePair(openId);
      assert(viewer.role === ROLES.FEMALE, "Only the female user can edit cycles", "FORBIDDEN");

      const existing = await repo.getCycleById(cycleId);
      assert(existing, "Cycle not found", "NOT_FOUND");
      assert(existing.ownerOpenId === openId, "You can only delete your own cycle", "FORBIDDEN");

      await repo.deleteCycle(cycleId);
      return this.getHistory({ openId });
    },

    async setReminderConsent({ openId, enabled }) {
      await ensureUser(openId);
      const updatedUser = await repo.updateUser(openId, {
        subscriptionEnabled: Boolean(enabled),
        updatedAt: now().toISOString()
      });
      return {
        user: updatedUser
      };
    },

    async runReminderSweep() {
      const pairs = await repo.listActivePairs();
      const results = [];

      for (const pair of pairs) {
        const users = await repo.listUsersByPairId(pair._id);
        const bowelRecords = await repo.listBowelRecordsByPairId(pair._id);

        for (const user of users) {
          const reminderState = await refreshReminderStateForUser(user, users, bowelRecords);
          const sent = await maybeSendReminderMessages(user, users, reminderState);
          results.push({
            overdueUserOpenId: user.openId,
            isOverdue: reminderState.isOverdue,
            sentTo: sent.sentTo
          });
        }
      }

      return {
        pairCount: pairs.length,
        results
      };
    }
  };
}

module.exports = {
  createHandlers
};
