const cloud = require("wx-server-sdk");
const { createHandlers } = require("./handlers");
const { createCloudRepository } = require("./repository");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const handlers = createHandlers({
  repo: createCloudRepository({ cloud }),
  env: {
    reminderTemplateId: process.env.REMINDER_TEMPLATE_ID || ""
  }
});

exports.main = async (event = {}, context = {}) => {
  const action = event.action;
  const wxContext = cloud.getWXContext();
  const openId =
    event.openId ||
    event.userInfo?.openId ||
    event.userInfo?.openid ||
    wxContext.OPENID ||
    context.OPENID;

  try {
    if (!action || typeof handlers[action] !== "function") {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_ACTION",
          message: `Unknown action: ${action || "missing"}`
        }
      };
    }

    const data = await handlers[action]({
      ...event,
      openId
    });

    return {
      ok: true,
      data
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "Unexpected error"
      }
    };
  }
};
