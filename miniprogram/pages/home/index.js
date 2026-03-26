const api = require("../../utils/api");
const { decorateDashboard } = require("../../utils/state");
const { combineDateAndTime, splitIsoDateTime } = require("../../utils/format");

const BOWEL_TYPE_OPTIONS = [
  { value: "normal", label: "正常" },
  { value: "dry", label: "偏干" },
  { value: "loose", label: "腹泻" }
];

const BOWEL_AMOUNT_OPTIONS = [
  { value: "very_small", label: "很少" },
  { value: "small", label: "少" },
  { value: "normal", label: "正常" },
  { value: "large", label: "多" },
  { value: "very_large", label: "很多" }
];

function createBowelForm() {
  const current = splitIsoDateTime(new Date().toISOString());
  return {
    date: current.date,
    time: current.time,
    type: "normal",
    amount: "normal"
  };
}

Page({
  data: {
    loading: true,
    dashboard: null,
    bowelTypeOptions: BOWEL_TYPE_OPTIONS,
    bowelAmountOptions: BOWEL_AMOUNT_OPTIONS,
    showBowelForm: false,
    bowelForm: createBowelForm(),
    showCycleForm: false,
    cycleMode: "start",
    cycleDate: splitIsoDateTime(new Date().toISOString()).date
  },

  onShow() {
    this.loadDashboard();
  },

  async loadDashboard() {
    this.setData({ loading: true });

    try {
      const data = await api.getDashboard();
      getApp().globalData.session = data.session || null;
      this.setData({
        loading: false,
        dashboard: decorateDashboard(data.dashboard)
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.reLaunch({
        url: "/pages/onboarding/index"
      });
    }
  },

  openBowelForm() {
    this.setData({
      showBowelForm: true,
      bowelForm: createBowelForm()
    });
  },

  closeBowelForm() {
    this.setData({
      showBowelForm: false
    });
  },

  handleBowelDateChange(event) {
    this.setData({
      "bowelForm.date": event.detail.value
    });
  },

  handleBowelTimeChange(event) {
    this.setData({
      "bowelForm.time": event.detail.value
    });
  },

  handleBowelTypeChange(event) {
    this.setData({
      "bowelForm.type": event.currentTarget.dataset.value
    });
  },

  handleBowelAmountChange(event) {
    this.setData({
      "bowelForm.amount": event.currentTarget.dataset.value
    });
  },

  async submitBowelRecord() {
    const form = this.data.bowelForm;

    try {
      await api.saveBowelRecord({
        occurredAt: combineDateAndTime(form.date, form.time),
        type: form.type,
        amount: form.amount
      });
      this.setData({
        showBowelForm: false,
        bowelForm: createBowelForm()
      });
      wx.showToast({
        title: "记录好了",
        icon: "success"
      });
      this.loadDashboard();
    } catch (error) {
      wx.showToast({
        title: error.message || "保存失败",
        icon: "none"
      });
    }
  },

  openCycleForm(event) {
    this.setData({
      showCycleForm: true,
      cycleMode: event.currentTarget.dataset.mode,
      cycleDate: splitIsoDateTime(new Date().toISOString()).date
    });
  },

  closeCycleForm() {
    this.setData({
      showCycleForm: false
    });
  },

  handleCycleDateChange(event) {
    this.setData({
      cycleDate: event.detail.value
    });
  },

  async submitCycleAction() {
    try {
      if (this.data.cycleMode === "start") {
        await api.startMenstrualCycle(`${this.data.cycleDate}T00:00:00+08:00`);
      } else {
        await api.endMenstrualCycle(`${this.data.cycleDate}T00:00:00+08:00`);
      }

      this.setData({
        showCycleForm: false
      });
      wx.showToast({
        title: "经期状态已更新",
        icon: "success"
      });
      this.loadDashboard();
    } catch (error) {
      wx.showToast({
        title: error.message || "操作失败",
        icon: "none"
      });
    }
  }
});
