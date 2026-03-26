const api = require("../../utils/api");
const { REMINDER_TEMPLATE_ID } = require("../../config");
const { getRoleLabel } = require("../../utils/format");
const { requestSubscribeMessage } = require("../../utils/wx");

Page({
  data: {
    loading: true,
    stage: "",
    session: null,
    reminderTemplateReady: REMINDER_TEMPLATE_ID !== "replace-with-your-reminder-template-id"
  },

  onShow() {
    this.bootstrap();
  },

  async bootstrap() {
    this.setData({ loading: true });

    try {
      const data = await api.bootstrapSession();
      this.setData({
        loading: false,
        stage: data.stage,
        session: data.session || null,
        roleLabel: getRoleLabel(data.session?.user?.role)
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || "加载失败",
        icon: "none"
      });
    }
  },

  copyInviteCode() {
    const inviteCode = this.data.session?.pair?.inviteCode;
    if (!inviteCode) {
      return;
    }

    wx.setClipboardData({
      data: inviteCode
    });
  },

  async requestReminderPermission() {
    if (!this.data.reminderTemplateReady) {
      wx.showToast({
        title: "先把模板 ID 配进 config.js",
        icon: "none"
      });
      return;
    }

    try {
      const response = await requestSubscribeMessage([REMINDER_TEMPLATE_ID]);
      const accepted = response[REMINDER_TEMPLATE_ID] === "accept";

      await api.setReminderConsent(accepted);
      wx.showToast({
        title: accepted ? "提醒已开启" : "没有开启提醒",
        icon: "none"
      });
      this.bootstrap();
    } catch (error) {
      wx.showToast({
        title: error.message || "授权失败",
        icon: "none"
      });
    }
  },

  async disableReminder() {
    try {
      await api.setReminderConsent(false);
      wx.showToast({
        title: "提醒已关闭",
        icon: "success"
      });
      this.bootstrap();
    } catch (error) {
      wx.showToast({
        title: error.message || "操作失败",
        icon: "none"
      });
    }
  }
});
