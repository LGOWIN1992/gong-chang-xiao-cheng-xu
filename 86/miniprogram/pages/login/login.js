// pages/login/login.js
Page({
  data: {
    password: ''
  },
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },
  onLogin() {
    if (!this.data.password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    // TODO: 校验密码 (暂时硬编码)
    if (this.data.password === '123456') {
      wx.setStorageSync('isAdmin', true)
      wx.redirectTo({
        url: '/pages/admin/dashboard/dashboard'
      })
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' })
    }
  }
})
