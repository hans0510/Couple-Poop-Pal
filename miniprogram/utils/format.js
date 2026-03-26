const { BOWEL_AMOUNT_LABELS, BOWEL_TYPE_LABELS, ROLE_LABELS } = require("./labels");

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDate(value) {
  return value ? new Date(value) : null;
}

function formatDate(value) {
  const date = toDate(value);
  if (!date) {
    return "--";
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(value) {
  const date = toDate(value);
  if (!date) {
    return "--";
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }
  return `${formatDate(value)} ${formatTime(value)}`;
}

function formatRelativeHours(hours) {
  if (hours === null || hours === undefined) {
    return "还没有记录";
  }
  if (hours < 24) {
    return `${hours} 小时前`;
  }
  return `${Math.floor(hours / 24)} 天前`;
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || "--";
}

function getBowelTypeLabel(type) {
  return BOWEL_TYPE_LABELS[type] || type || "--";
}

function getBowelAmountLabel(amount) {
  return BOWEL_AMOUNT_LABELS[amount] || amount || "--";
}

function splitIsoDateTime(value) {
  const date = toDate(value || new Date());
  return {
    date: formatDate(date),
    time: formatTime(date)
  };
}

function combineDateAndTime(dateText, timeText) {
  return new Date(`${dateText}T${timeText}:00+08:00`).toISOString();
}

module.exports = {
  combineDateAndTime,
  formatDate,
  formatDateTime,
  formatRelativeHours,
  formatTime,
  getBowelAmountLabel,
  getBowelTypeLabel,
  getRoleLabel,
  splitIsoDateTime
};
