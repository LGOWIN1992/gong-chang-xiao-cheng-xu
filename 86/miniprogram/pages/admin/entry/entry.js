// pages/admin/entry/entry.js
Page({
  data: {
    id: '',
    model: '',
    location: '',
    loc_zone: '',
    loc_shelf: '',
    loc_layer: '',
    loc_pos: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      wx.setNavigationBarTitle({ title: '编辑货物' })
      this.loadDetail(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '录入货物' })
    }
  },

  loadDetail(id) {
    const db = wx.cloud.database()
    db.collection('cargo_items').doc(id).get().then(res => {
      const location = res.data.location || ''
      // 尝试解析格式：X区-X号架-X层-X
      const match = location.match(/^(.+)区-(.+)号架-(.+)层-(.+)$/)
      let updates = {
        model: res.data.model,
        location: location
      }
      
      if (match) {
        updates.loc_zone = match[1]
        updates.loc_shelf = match[2]
        updates.loc_layer = match[3]
        updates.loc_pos = match[4]
      } else {
        // 如果不匹配，暂时把整个字符串放在第一个格子里，或者不处理让用户重填
        // 这里选择不处理，用户需要重新按格式填
        updates.loc_zone = location // 备选：直接放入第一个框
      }

      this.setData(updates)
    }).catch(err => {
      console.error('加载详情失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  onModelInput(e) {
    this.setData({ model: e.detail.value })
  },

  onZoneInput(e) { this.setData({ loc_zone: e.detail.value }) },
  onShelfInput(e) { this.setData({ loc_shelf: e.detail.value }) },
  onLayerInput(e) { this.setData({ loc_layer: e.detail.value }) },
  onPosInput(e) { this.setData({ loc_pos: e.detail.value }) },

  onSave() {
    if (!this.data.model) {
      wx.showToast({ title: '请填写型号', icon: 'none' })
      return
    }
    
    // 校验位置完整性 (改为非必填)
    // if (!this.data.loc_zone || !this.data.loc_shelf || !this.data.loc_layer || !this.data.loc_pos) {
    //   wx.showToast({ title: '请补全位置信息', icon: 'none' })
    //   return
    // }

    let fullLocation = ''
    if (this.data.loc_zone || this.data.loc_shelf || this.data.loc_layer || this.data.loc_pos) {
       // 如果填了任意一项，建议填完整，或者就只存填了的部分。
       // 这里为了保持格式统一，尽量组合，缺少的显示为空? 或者如果用户只想填一部分？
       // 根据需求“非必填”，可能是完全不填。
       // 如果填了一部分，我们还是按照格式拼，空的就留空或者不拼？
       // 简单起见，如果都有值才拼成标准格式，否则直接拼（可能会有 "区-号架-层-" 这种丑陋的数据）。
       // 更好的做法：如果全空，则location为空字符串。如果部分空，还是拼起来，方便后续修改。
       // 这里的逻辑是：允许不填。如果不填，fullLocation为空。
       if (!this.data.loc_zone && !this.data.loc_shelf && !this.data.loc_layer && !this.data.loc_pos) {
         fullLocation = ''
       } else {
         // 只要填了一个，就默认按照格式拼，没填的就空着
         fullLocation = `${this.data.loc_zone || ''}区-${this.data.loc_shelf || ''}号架-${this.data.loc_layer || ''}层-${this.data.loc_pos || ''}`
       }
    }

    const db = wx.cloud.database()
    
    const saveData = {
      model: this.data.model,
      location: fullLocation,
      update_time: new Date()
    }

    if (this.data.id) {
      // Update
      db.collection('cargo_items').doc(this.data.id).update({
        data: saveData
      }).then(() => {
        wx.showToast({ title: '更新成功' })
        setTimeout(() => wx.navigateBack(), 1500)
      }).catch(err => {
        console.error('更新失败', err)
        wx.showToast({ title: '更新失败', icon: 'none' })
      })
    } else {
      // Create
      saveData.create_time = new Date()
      db.collection('cargo_items').add({
        data: saveData
      }).then(() => {
        wx.showToast({ title: '保存成功' })
        setTimeout(() => wx.navigateBack(), 1500)
      }).catch(err => {
        console.error('保存失败', err)
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
    }
  }
})
