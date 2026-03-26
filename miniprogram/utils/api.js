const { CLOUD_FUNCTION_NAME } = require("../config");

function call(action, payload = {}) {
  return wx.cloud
    .callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: {
        action,
        ...payload
      }
    })
    .then((response) => {
      const result = response.result || {};
      if (!result.ok) {
        const error = new Error(result.error?.message || "Cloud call failed");
        error.code = result.error?.code || "CLOUD_CALL_FAILED";
        throw error;
      }
      return result.data;
    });
}

module.exports = {
  bootstrapSession(profile) {
    return call("bootstrapSession", { profile });
  },
  createPair(profile, role) {
    return call("createPair", { profile, role });
  },
  joinPair(profile, role, inviteCode) {
    return call("joinPair", { profile, role, inviteCode });
  },
  getDashboard() {
    return call("getDashboard");
  },
  getHistory() {
    return call("getHistory");
  },
  saveBowelRecord(payload) {
    return call("saveBowelRecord", payload);
  },
  deleteBowelRecord(recordId) {
    return call("deleteBowelRecord", { recordId });
  },
  startMenstrualCycle(startDate) {
    return call("startMenstrualCycle", { startDate });
  },
  endMenstrualCycle(endDate, cycleId) {
    return call("endMenstrualCycle", { endDate, cycleId });
  },
  saveCycle(payload) {
    return call("saveCycle", payload);
  },
  deleteCycle(cycleId) {
    return call("deleteCycle", { cycleId });
  },
  setReminderConsent(enabled) {
    return call("setReminderConsent", { enabled });
  },
  runReminderSweep() {
    return call("runReminderSweep");
  }
};
