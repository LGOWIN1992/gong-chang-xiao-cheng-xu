// app.js
App({
  globalData: {},
  onLaunch() {
    // init cloud
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env Parameter, fill in your env ID
        env: 'cloudbase-2gduooi428e4331f',
        traceUser: true,
      })

      // 自动检测数据库集合是否存在，如果不存在则提示用户
      const db = wx.cloud.database()
      db.collection('cargo_items').count().then(() => {
        console.log('数据库集合 cargo_items 检测正常')
      }).catch(err => {
        // -502005 是集合不存在的错误码
        if (err.errCode === -502005 || (err.errMsg && err.errMsg.includes('not exist'))) {
          wx.showModal({
            title: '⚠️ 缺少数据库集合',
            content: '检测到云数据库缺少 [cargo_items] 集合。\n\n请点击开发者工具上方的“云开发” -> “数据库” -> “+”号 -> 创建名为 cargo_items 的集合。\n\n并请在“数据权限”中暂时设置为“所有用户可读写”。',
            showCancel: false,
            confirmText: '我知道了'
          })
        } else {
          console.error('数据库连接异常', err)
        }
      })
    }
  },
})
