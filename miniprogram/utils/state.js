const {
  formatDate,
  formatDateTime,
  formatRelativeHours,
  getBowelAmountLabel,
  getBowelTypeLabel,
  getRoleLabel
} = require("./format");

function decorateUserStatus(status) {
  if (!status) {
    return null;
  }
  return {
    ...status,
    roleLabel: getRoleLabel(status.role),
    latestBowelRecord: status.latestBowelRecord
      ? {
          ...status.latestBowelRecord,
          typeLabel: getBowelTypeLabel(status.latestBowelRecord.type),
          amountLabel: getBowelAmountLabel(status.latestBowelRecord.amount),
          occurredAtLabel: formatDateTime(status.latestBowelRecord.occurredAt)
        }
      : null,
    relativeLastRecord: formatRelativeHours(status.hoursSinceLastRecord),
    overdueHint: status.reminderState?.isOverdue
      ? `已经超过 ${Math.floor((status.reminderState.overdueHours || 0) / 24)} 天没有记录，记得吃水果、多喝水。`
      : "状态正常"
  };
}

function decorateDashboard(dashboard) {
  if (!dashboard) {
    return null;
  }
  return {
    ...dashboard,
    me: decorateUserStatus(dashboard.me),
    partner: decorateUserStatus(dashboard.partner),
    menstrual: dashboard.menstrual
      ? {
          ...dashboard.menstrual,
          activeCycle: dashboard.menstrual.activeCycle
            ? {
                ...dashboard.menstrual.activeCycle,
                startDateLabel: formatDate(dashboard.menstrual.activeCycle.startDate),
                endDateLabel: dashboard.menstrual.activeCycle.endDate
                  ? formatDate(dashboard.menstrual.activeCycle.endDate)
                  : "进行中"
              }
            : null,
          prediction: dashboard.menstrual.prediction
            ? {
                ...dashboard.menstrual.prediction,
                predictedStartDateLabel: dashboard.menstrual.prediction.predictedStartDate
                  ? formatDate(dashboard.menstrual.prediction.predictedStartDate)
                  : "暂无"
              }
            : null
        }
      : null
  };
}

function decorateHistory(history) {
  return {
    bowelRecords: (history.bowelRecords || []).map((record) => ({
      ...record,
      occurredAtLabel: formatDateTime(record.occurredAt),
      typeLabel: getBowelTypeLabel(record.type),
      amountLabel: getBowelAmountLabel(record.amount),
      ownerRoleLabel: getRoleLabel(record.ownerRole)
    })),
    menstrualCycles: (history.menstrualCycles || []).map((cycle) => ({
      ...cycle,
      startDateLabel: formatDate(cycle.startDate),
      endDateLabel: cycle.endDate ? formatDate(cycle.endDate) : "进行中"
    }))
  };
}

module.exports = {
  decorateDashboard,
  decorateHistory
};
