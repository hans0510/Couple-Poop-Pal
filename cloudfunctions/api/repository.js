const { COLLECTIONS, PAIR_STATUS } = require("./constants");

function firstItem(items) {
  return items && items.length ? items[0] : null;
}

function addId(result, payload) {
  return {
    _id: result._id || payload._id,
    ...payload
  };
}

function createCloudRepository({ cloud }) {
  const db = cloud.database();
  const users = db.collection(COLLECTIONS.USERS);
  const pairs = db.collection(COLLECTIONS.PAIRS);
  const bowelRecords = db.collection(COLLECTIONS.BOWEL_RECORDS);
  const cycles = db.collection(COLLECTIONS.MENSTRUAL_CYCLES);
  const reminderState = db.collection(COLLECTIONS.REMINDER_STATE);

  return {
    async getUserByOpenId(openId) {
      const result = await users.where({ openId }).limit(1).get();
      return firstItem(result.data);
    },

    async createUser(payload) {
      const result = await users.add({ data: payload });
      return addId(result, payload);
    },

    async updateUser(openId, patch) {
      const current = await this.getUserByOpenId(openId);
      if (!current) {
        return null;
      }
      await users.doc(current._id).update({ data: patch });
      return {
        ...current,
        ...patch
      };
    },

    async createPair(payload) {
      const result = await pairs.add({ data: payload });
      return addId(result, payload);
    },

    async getPairById(pairId) {
      const result = await pairs.doc(pairId).get();
      return result.data || null;
    },

    async getPairByInviteCode(inviteCode) {
      const result = await pairs.where({ inviteCode }).limit(1).get();
      return firstItem(result.data);
    },

    async updatePair(pairId, patch) {
      const current = await this.getPairById(pairId);
      if (!current) {
        return null;
      }
      await pairs.doc(pairId).update({ data: patch });
      return {
        ...current,
        ...patch
      };
    },

    async listUsersByPairId(pairId) {
      const result = await users.where({ pairId }).get();
      return result.data || [];
    },

    async listActivePairs() {
      const result = await pairs.where({ status: PAIR_STATUS.ACTIVE }).get();
      return result.data || [];
    },

    async getBowelRecordById(recordId) {
      const result = await bowelRecords.doc(recordId).get();
      return result.data || null;
    },

    async listBowelRecordsByPairId(pairId) {
      const result = await bowelRecords.where({ pairId }).get();
      return result.data || [];
    },

    async createBowelRecord(payload) {
      const result = await bowelRecords.add({ data: payload });
      return addId(result, payload);
    },

    async updateBowelRecord(recordId, patch) {
      const current = await this.getBowelRecordById(recordId);
      if (!current) {
        return null;
      }
      await bowelRecords.doc(recordId).update({ data: patch });
      return {
        ...current,
        ...patch
      };
    },

    async deleteBowelRecord(recordId) {
      await bowelRecords.doc(recordId).remove();
    },

    async getCycleById(cycleId) {
      const result = await cycles.doc(cycleId).get();
      return result.data || null;
    },

    async getActiveCycleByOwner(openId) {
      const result = await cycles.where({ ownerOpenId: openId, endDate: null }).limit(1).get();
      return firstItem(result.data);
    },

    async listCyclesByPairId(pairId) {
      const result = await cycles.where({ pairId }).get();
      return result.data || [];
    },

    async createCycle(payload) {
      const result = await cycles.add({ data: payload });
      return addId(result, payload);
    },

    async updateCycle(cycleId, patch) {
      const current = await this.getCycleById(cycleId);
      if (!current) {
        return null;
      }
      await cycles.doc(cycleId).update({ data: patch });
      return {
        ...current,
        ...patch
      };
    },

    async deleteCycle(cycleId) {
      await cycles.doc(cycleId).remove();
    },

    async getReminderStateByOpenId(openId) {
      const result = await reminderState.where({ userOpenId: openId }).limit(1).get();
      return firstItem(result.data);
    },

    async listReminderStatesByPairId(pairId) {
      const result = await reminderState.where({ pairId }).get();
      return result.data || [];
    },

    async upsertReminderState(openId, payload) {
      const current = await this.getReminderStateByOpenId(openId);
      if (!current) {
        const result = await reminderState.add({
          data: payload
        });
        return addId(result, payload);
      }
      await reminderState.doc(current._id).update({
        data: payload
      });
      return {
        ...current,
        ...payload
      };
    },

    async sendSubscriptionMessage(payload) {
      return cloud.openapi.subscribeMessage.send({
        touser: payload.recipientOpenId,
        page: payload.page,
        lang: "zh_CN",
        data: payload.data,
        templateId: payload.templateId,
        miniprogramState: "formal"
      });
    }
  };
}

module.exports = {
  createCloudRepository
};
