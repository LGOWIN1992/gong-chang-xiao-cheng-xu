Page({
  data: {
    loading: false,
    logs: []
  },

  addLog(msg) {
    const time = new Date().toTimeString().substring(0, 8);
    this.setData({
      logs: [`[${time}] ${msg}`, ...this.data.logs]
    })
  },

  async onBatchAdd() {
    this.setData({ loading: true })
    this.addLog('开始批量生成数据...')
    const db = wx.cloud.database()
    
    let successCount = 0;
    let failCount = 0;

    // 批量插入50条，分批执行
    const total = 50;
    const batchSize = 5; 

    for (let i = 0; i < total; i += batchSize) {
      const promises = [];
      for (let j = 0; j < batchSize && (i + j) < total; j++) {
        const index = i + j + 1;
        const p = db.collection('cargo_items').add({
          data: {
            model: `TEST-MODEL-${Date.now()}-${index}`,
            location: `TEST-LOC-${Math.floor(Math.random() * 100)}`,
            create_time: new Date(),
            update_time: new Date(),
            is_test_data: true
          }
        }).then(() => {
          successCount++;
        }).catch(err => {
          // console.error(err);
          failCount++;
        });
        promises.push(p);
      }
      
      await Promise.all(promises);
      this.addLog(`进度: ${Math.min(i + batchSize, total)}/${total} (成功:${successCount} 失败:${failCount})`)
    }

    this.addLog(`完成! 成功: ${successCount}, 失败: ${failCount}`)
    this.setData({ loading: false })
  },

  async onBatchQuery() {
    this.setData({ loading: true })
    this.addLog('开始查询测试...')
    const db = wx.cloud.database()
    
    try {
      const countRes = await db.collection('cargo_items').count()
      this.addLog(`当前数据库总条数: ${countRes.total}`)
      
      const startTime = Date.now()
      const res = await db.collection('cargo_items')
        .where({
           is_test_data: true
        })
        .limit(20)
        .get()
      
      const endTime = Date.now()
      this.addLog(`查询耗时: ${endTime - startTime}ms, 返回条数: ${res.data.length}`)
      
    } catch (err) {
      this.addLog(`查询出错: ${err.message}`)
    }
    
    this.setData({ loading: false })
  },

  async onBatchDelete() {
    this.setData({ loading: true })
    this.addLog('开始清理测试数据...')
    const db = wx.cloud.database()
    
    try {
      const countRes = await db.collection('cargo_items').where({ is_test_data: true }).count()
      const total = countRes.total
      this.addLog(`发现 ${total} 条测试数据待清理`)
      
      if (total === 0) {
        this.addLog('无测试数据')
        this.setData({ loading: false })
        return
      }

      let deleted = 0;
      while (true) {
        const res = await db.collection('cargo_items').where({ is_test_data: true }).limit(20).get()
        if (res.data.length === 0) break;
        
        const promises = res.data.map(item => {
           return db.collection('cargo_items').doc(item._id).remove()
             .then(() => deleted++)
             .catch(err => console.error('删除失败', err))
        })
        
        await Promise.all(promises)
        this.addLog(`已清理: ${deleted}/${total}`)
      }
      
      this.addLog('清理完成!')
      
    } catch (err) {
      this.addLog(`清理出错: ${err.message}`)
    }
    
    this.setData({ loading: false })
  }
})