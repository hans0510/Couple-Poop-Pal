function showConfirm(options) {
  return new Promise((resolve, reject) => {
    wx.showModal({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

function requestSubscribeMessage(tmplIds) {
  return new Promise((resolve, reject) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success: resolve,
      fail: reject
    });
  });
}

module.exports = {
  requestSubscribeMessage,
  showConfirm
};
