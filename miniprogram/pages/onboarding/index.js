const api = require("../../utils/api");

Page({
  data: {
    loading: true,
    stage: "onboarding",
    mode: "create",
    role: "male",
    nickName: "",
    inviteCode: "",
    waitingPair: null
  },

  onShow() {
    this.bootstrap();
  },

  async bootstrap() {
    this.setData({ loading: true });

    try {
      const data = await api.bootstrapSession();
      const session = data.session || {};

      if (data.stage === "paired") {
        getApp().globalData.session = session;
        wx.switchTab({
          url: "/pages/home/index"
        });
        return;
      }

      this.setData({
        loading: false,
        stage: data.stage,
        nickName: session.user?.nickName || "",
        role: session.user?.role || this.data.role,
        waitingPair: session.pair || null
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || "加载失败",
        icon: "none"
      });
    }
  },

  handleModeChange(event) {
    this.setData({
      mode: event.currentTarget.dataset.mode
    });
  },

  handleRoleChange(event) {
    this.setData({
      role: event.currentTarget.dataset.role
    });
  },

  handleNickNameInput(event) {
    this.setData({
      nickName: event.detail.value
    });
  },

  handleInviteCodeInput(event) {
    this.setData({
      inviteCode: (event.detail.value || "").toUpperCase()
    });
  },

  async submitPairAction() {
    if (!this.data.nickName.trim()) {
      wx.showToast({
        title: "先写个昵称吧",
        icon: "none"
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const profile = {
        nickName: this.data.nickName.trim()
      };
      const data =
        this.data.mode === "create"
          ? await api.createPair(profile, this.data.role)
          : await api.joinPair(profile, this.data.role, this.data.inviteCode.trim());

      getApp().globalData.session = data.session || null;

      if (data.stage === "paired") {
        wx.switchTab({
          url: "/pages/home/index"
        });
        return;
      }

      this.setData({
        loading: false,
        stage: data.stage,
        waitingPair: data.session?.pair || null
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || "提交失败",
        icon: "none"
      });
    }
  },

  copyInviteCode() {
    const inviteCode = this.data.waitingPair?.inviteCode;
    if (!inviteCode) {
      return;
    }

    wx.setClipboardData({
      data: inviteCode
    });
  }
});
