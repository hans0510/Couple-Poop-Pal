const api = require("../../utils/api");
const { decorateHistory } = require("../../utils/state");
const { combineDateAndTime, splitIsoDateTime } = require("../../utils/format");
const { showConfirm } = require("../../utils/wx");

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

Page({
  data: {
    loading: true,
    viewerRole: "",
    history: {
      bowelRecords: [],
      menstrualCycles: []
    },
    bowelTypeOptions: BOWEL_TYPE_OPTIONS,
    bowelAmountOptions: BOWEL_AMOUNT_OPTIONS,
    editingBowelId: "",
    bowelForm: null,
    editingCycleId: "",
    cycleForm: null
  },

  onShow() {
    this.loadHistory();
  },

  async loadHistory() {
    this.setData({ loading: true });

    try {
      const [historyData, dashboardData] = await Promise.all([
        api.getHistory(),
        api.getDashboard()
      ]);

      this.setData({
        loading: false,
        viewerRole: dashboardData.session?.user?.role || "",
        history: decorateHistory(historyData),
        editingBowelId: "",
        editingCycleId: "",
        bowelForm: null,
        cycleForm: null
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.reLaunch({
        url: "/pages/onboarding/index"
      });
    }
  },

  startEditBowel(event) {
    const recordId = event.currentTarget.dataset.id;
    const record = (this.data.history.bowelRecords || []).find((item) => item._id === recordId);
    if (!record) {
      return;
    }

    const parts = splitIsoDateTime(record.occurredAt);
    this.setData({
      editingBowelId: recordId,
      bowelForm: {
        date: parts.date,
        time: parts.time,
        type: record.type,
        amount: record.amount
      }
    });
  },

  cancelEditBowel() {
    this.setData({
      editingBowelId: "",
      bowelForm: null
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

  async submitBowelEdit() {
    const form = this.data.bowelForm;

    try {
      await api.saveBowelRecord({
        recordId: this.data.editingBowelId,
        occurredAt: combineDateAndTime(form.date, form.time),
        type: form.type,
        amount: form.amount
      });
      wx.showToast({
        title: "已更新",
        icon: "success"
      });
      this.loadHistory();
    } catch (error) {
      wx.showToast({
        title: error.message || "更新失败",
        icon: "none"
      });
    }
  },

  async deleteBowelRecord(event) {
    const recordId = event.currentTarget.dataset.id;
    const result = await showConfirm({
      title: "删除这条记录？",
      content: "删除后会重新计算首页状态和提醒。"
    }).catch(() => ({ confirm: false }));

    if (!result.confirm) {
      return;
    }

    try {
      await api.deleteBowelRecord(recordId);
      wx.showToast({
        title: "已删除",
        icon: "success"
      });
      this.loadHistory();
    } catch (error) {
      wx.showToast({
        title: error.message || "删除失败",
        icon: "none"
      });
    }
  },

  startEditCycle(event) {
    const cycleId = event.currentTarget.dataset.id;
    const cycle = (this.data.history.menstrualCycles || []).find((item) => item._id === cycleId);
    if (!cycle) {
      return;
    }

    this.setData({
      editingCycleId: cycleId,
      cycleForm: {
        startDate: cycle.startDateLabel,
        endDate: cycle.endDate ? cycle.endDateLabel : cycle.startDateLabel,
        hasEndDate: Boolean(cycle.endDate)
      }
    });
  },

  cancelEditCycle() {
    this.setData({
      editingCycleId: "",
      cycleForm: null
    });
  },

  handleCycleStartChange(event) {
    this.setData({
      "cycleForm.startDate": event.detail.value
    });
  },

  handleCycleEndChange(event) {
    this.setData({
      "cycleForm.endDate": event.detail.value
    });
  },

  toggleCycleEnd() {
    this.setData({
      "cycleForm.hasEndDate": !this.data.cycleForm.hasEndDate
    });
  },

  async submitCycleEdit() {
    const form = this.data.cycleForm;

    try {
      await api.saveCycle({
        cycleId: this.data.editingCycleId,
        startDate: `${form.startDate}T00:00:00+08:00`,
        endDate: form.hasEndDate ? `${form.endDate}T00:00:00+08:00` : null
      });
      wx.showToast({
        title: "周期已更新",
        icon: "success"
      });
      this.loadHistory();
    } catch (error) {
      wx.showToast({
        title: error.message || "更新失败",
        icon: "none"
      });
    }
  },

  async deleteCycle(event) {
    const cycleId = event.currentTarget.dataset.id;
    const result = await showConfirm({
      title: "删除这个周期？",
      content: "删除后预测经期会重新计算。"
    }).catch(() => ({ confirm: false }));

    if (!result.confirm) {
      return;
    }

    try {
      await api.deleteCycle(cycleId);
      wx.showToast({
        title: "已删除",
        icon: "success"
      });
      this.loadHistory();
    } catch (error) {
      wx.showToast({
        title: error.message || "删除失败",
        icon: "none"
      });
    }
  }
});
