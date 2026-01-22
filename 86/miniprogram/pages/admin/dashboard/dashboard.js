// pages/admin/dashboard/dashboard.js
Page({
  data: {
    cargoList: [],
    total: 0,
    page: 0,
    pageSize: 20,
    hasMore: true,
    isLoading: false,
    selectedIds: [],
    isSelectionMode: false
  },

  onShow() {
    this.initData()
  },

  initData() {
    this.setData({
      page: 0,
      cargoList: [],
      hasMore: true,
      isLoading: false,
      selectedIds: [],
      isSelectionMode: false
    }, () => {
      this.loadTotal()
      this.loadData()
    })
  },

  toggleSelectionMode() {
    this.setData({
      isSelectionMode: !this.data.isSelectionMode,
      selectedIds: []
    })
  },

  toggleSelect(e) {
    if (!this.data.isSelectionMode) return
    const id = e.currentTarget.dataset.id
    const selectedIds = this.data.selectedIds
    const index = selectedIds.indexOf(id)
    
    if (index > -1) {
      selectedIds.splice(index, 1)
    } else {
      selectedIds.push(id)
    }
    
    this.setData({ selectedIds })
  },

  selectAll() {
    if (!this.data.isSelectionMode) return
    
    // 如果当前选中的数量等于当前列表数量，则全不选，否则全选当前列表
    // 注意：这里只全选当前加载的数据
    const currentIds = this.data.cargoList.map(item => item._id)
    const allSelected = currentIds.every(id => this.data.selectedIds.includes(id))
    
    if (allSelected) {
      this.setData({ selectedIds: [] })
    } else {
      // 简单起见，这里只处理当前页面的全选。
      // 实际上应该把 cargoList 里的所有 ID 都加进去，去重
      const newSelected = [...new Set([...this.data.selectedIds, ...currentIds])]
      this.setData({ selectedIds: newSelected })
    }
  },

  batchDelete() {
    if (this.data.selectedIds.length === 0) return

    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${this.data.selectedIds.length} 条记录吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          wx.cloud.callFunction({
            name: 'excelOp',
            data: {
              type: 'batchDelete',
              ids: this.data.selectedIds
            },
            success: res => {
              wx.hideLoading()
              console.log('删除结果', res)
              if (res.result && res.result.success) {
                wx.showToast({ title: `成功删除 ${res.result.stats.removed} 条`, icon: 'success' })
                this.initData()
              } else {
                wx.showToast({ title: '删除失败', icon: 'none' })
              }
            },
            fail: err => {
              wx.hideLoading()
              console.error('调用失败', err)
              wx.showToast({ title: '调用出错', icon: 'none' })
            }
          })
        }
      }
    })
  },

  onClearAll() {
    wx.showModal({
      title: '⚠️ 危险操作',
      content: '确定要清空数据库中【所有】货物数据吗？此操作不可恢复！',
      confirmColor: '#fa5151',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在清空...' })
          wx.cloud.callFunction({
            name: 'excelOp',
            data: { type: 'clearAll' },
            success: res => {
              wx.hideLoading()
              console.log('清空结果', res)
              if (res.result && res.result.success) {
                wx.showToast({ title: `已清空 ${res.result.stats.removed} 条`, icon: 'success' })
                this.initData()
              } else {
                wx.showToast({ title: '清空失败', icon: 'none' })
              }
            },
            fail: err => {
              wx.hideLoading()
              console.error('调用失败', err)
              wx.showToast({ title: '调用出错', icon: 'none' })
            }
          })
        }
      }
    })
  },

  loadTotal() {
    const db = wx.cloud.database()
    db.collection('cargo_items').count().then(res => {
      this.setData({ total: res.total })
    })
  },

  loadData() {
    if (this.data.isLoading || !this.data.hasMore) return

    this.setData({ isLoading: true })
    const db = wx.cloud.database()
    
    db.collection('cargo_items')
      .orderBy('update_time', 'desc')
      .skip(this.data.page * this.data.pageSize)
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        const list = res.data
        this.setData({
          cargoList: this.data.cargoList.concat(list),
          page: this.data.page + 1,
          hasMore: list.length === this.data.pageSize,
          isLoading: false
        })
      })
      .catch(err => {
        console.error('加载失败', err)
        this.setData({ isLoading: false })
      })
  },

  onReachBottom() {
    this.loadData()
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/admin/entry/entry' })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/admin/entry/entry?id=${id}` })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          const db = wx.cloud.database()
          db.collection('cargo_items').doc(id).remove().then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.initData()
          }).catch(err => {
            console.error('删除失败', err)
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (res) => {
        const filePath = res.tempFiles[0].path
        const cloudPath = `imports/${Date.now()}_${res.tempFiles[0].name}`
        
        wx.showLoading({ title: '上传中...' })
        
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: res => {
            console.log('上传成功', res.fileID)
            this.callImportFunction(res.fileID)
          },
          fail: err => {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
            console.error(err)
          }
        })
      }
    })
  },

  callImportFunction(fileID) {
    wx.showLoading({ title: '正在导入...' })
    wx.cloud.callFunction({
      name: 'excelOp',
      data: {
        type: 'import',
        fileID: fileID
      },
      success: res => {
        wx.hideLoading()
        console.log('导入结果', res)
        if (res.result && res.result.success) {
          wx.showToast({ title: `成功导入 ${res.result.count} 条`, icon: 'success' })
          this.initData()
        } else {
          wx.showToast({ title: '导入失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('调用失败', err)
        wx.showToast({ title: '导入出错', icon: 'none' })
      }
    })
  },

  onExport() {
    wx.showLoading({ title: '正在导出...' })
    wx.cloud.callFunction({
      name: 'excelOp',
      data: {
        type: 'export'
      },
      success: res => {
        wx.hideLoading()
        console.log('导出结果', res)
        if (res.result && res.result.success) {
          const fileID = res.result.fileID
          // 下载文件
          wx.cloud.downloadFile({
            fileID: fileID,
            success: downloadRes => {
              // 打开文件
              wx.openDocument({
                filePath: downloadRes.tempFilePath,
                showMenu: true,
                success: function () {
                  console.log('打开文档成功')
                }
              })
            },
            fail: err => {
              console.error('下载失败', err)
              wx.showToast({ title: '下载失败', icon: 'none' })
            }
          })
        } else {
          wx.showToast({ title: '导出失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        console.error('调用失败', err)
        wx.showToast({ title: '导出出错', icon: 'none' })
      }
    })
  }
})
