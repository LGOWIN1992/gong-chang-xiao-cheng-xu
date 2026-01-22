// index.js
Page({
  data: {
    searchQuery: '',
    searchResult: null,
    hasSearched: false
  },
  onSearchInput(e) {
    this.setData({
      searchQuery: e.detail.value
    })
  },
  onSearch() {
    if (!this.data.searchQuery) {
      wx.showToast({
        title: '请输入货物型号',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({ title: '查询中...' })
    
    const db = wx.cloud.database()
    db.collection('cargo_items').where({
      // 使用正则进行模糊匹配，不区分大小写
      model: db.RegExp({
        regexp: this.data.searchQuery,
        options: 'i',
      })
    }).get().then(res => {
      wx.hideLoading()
      if (res.data.length > 0) {
        // 如果有多个结果，这里简单起见只展示第一个，或者后续可以优化为展示列表
        // 按照最近更新排序，取第一个
        const sorted = res.data.sort((a, b) => new Date(b.update_time) - new Date(a.update_time))
        const result = sorted[0]
        
        // 转换时间格式，避免 WXS 解析失败
        if (result.update_time instanceof Date) {
          result.update_time = result.update_time.getTime()
        } else if (typeof result.update_time === 'string') {
          // 尝试解析字符串
          const ts = new Date(result.update_time).getTime()
          if (!isNaN(ts)) {
            result.update_time = ts
          }
        }
        
        this.setData({ searchResult: result, hasSearched: true })
      } else {
        this.setData({ searchResult: null, hasSearched: true })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('查询失败', err)
      wx.showToast({ title: '查询出错', icon: 'none' })
      this.setData({ searchResult: null, hasSearched: true })
    })
  },
})
