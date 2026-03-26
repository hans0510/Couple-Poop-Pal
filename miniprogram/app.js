const { CLOUD_ENV_ID } = require("./config");

App({
  globalData: {
    session: null
  },

  onLaunch() {
    if (!wx.cloud) {
      // eslint-disable-next-line no-console
      console.error("wx.cloud is required to run this mini program.");
      return;
    }

    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    });
  }
});
