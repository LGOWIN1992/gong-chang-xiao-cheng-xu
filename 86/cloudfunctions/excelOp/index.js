// cloudfunctions/excelOp/index.js
const cloud = require('wx-server-sdk')
const xlsx = require('node-xlsx')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { type, fileID, ids } = event

  if (type === 'import') {
    return await importExcel(fileID)
  } else if (type === 'export') {
    return await exportExcel()
  } else if (type === 'batchDelete') {
    return await batchDelete(ids)
  } else if (type === 'clearAll') {
    return await clearAll()
  }

  return {
    success: false,
    msg: 'Unknown type'
  }
}

async function clearAll() {
  try {
    // 循环删除，直到删完为止，或者直接使用 where({}).remove() (云函数端限制单次删除量可能较大，但如果数据上万需循环)
    // 这里采用简单方式，云函数端 where({}).remove() 通常能删除大量数据，但受超时限制。
    // 为了稳妥，我们循环删除几次，或者依赖云开发能力。
    // 在云函数中，collection.remove() 可以删除多条。
    // 但为了防止超时，我们先尝试一次性删除。如果数据量特别大，建议使用云数据库的清空功能或多次调用。
    const res = await db.collection('cargo_items').where({
      _id: _.exists(true) // 匹配所有存在 _id 的记录
    }).remove()
    
    return {
      success: true,
      stats: res.stats
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      error: e
    }
  }
}

async function batchDelete(ids) {
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { success: false, msg: 'No ids provided' }
    }
    const res = await db.collection('cargo_items').where({
      _id: _.in(ids)
    }).remove()
    return {
      success: true,
      stats: res.stats
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      error: e
    }
  }
}

async function importExcel(fileID) {
  try {
    // 1. 下载 Excel 文件
    const res = await cloud.downloadFile({
      fileID: fileID,
    })
    const buffer = res.fileContent

    // 2. 解析 Excel
    const sheets = xlsx.parse(buffer)
    const sheet = sheets[0] // 默认读取第一个 sheet
    const data = sheet.data

    // 3. 提取数据 (假设第一行是表头: 型号, 位置)
    const tasks = []
    // 从第二行开始遍历
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (row && row.length >= 2) {
        const model = String(row[0]).trim()
        const location = String(row[1]).trim()
        
        if (model && location) {
          const promise = db.collection('cargo_items').add({
            data: {
              model: model,
              location: location,
              create_time: new Date(),
              update_time: new Date()
            }
          })
          tasks.push(promise)
        }
      }
    }

    // 4. 批量写入 (等待所有写入完成)
    // 注意：实际生产中大量数据建议分批处理或使用 db.collection.add 的批量插入(如果不校验重复)
    // 这里为了简单演示，并发执行。如果数据量过大(>100)，建议分批。
    await Promise.all(tasks)

    return {
      success: true,
      count: tasks.length
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      error: e
    }
  }
}

async function exportExcel() {
  try {
    // 1. 读取所有数据 (云函数限制单次 100 条，需循环读取)
    // 这里简化处理，假设数据量 < 1000 (云函数上限 1000)
    const res = await db.collection('cargo_items').limit(1000).get()
    const dataList = res.data

    // 2. 构建 Excel 数据
    const excelData = [
      ['型号', '位置', '更新时间'] // 表头
    ]

    dataList.forEach(item => {
      excelData.push([
        item.model,
        item.location,
        item.update_time ? new Date(item.update_time).toLocaleString() : ''
      ])
    })

    // 3. 生成 Buffer
    const buffer = xlsx.build([{ name: "cargo_data", data: excelData }])

    // 4. 上传到云存储
    const fileID = await cloud.uploadFile({
      cloudPath: `exports/export_${Date.now()}.xlsx`,
      fileContent: buffer,
    })

    return {
      success: true,
      fileID: fileID.fileID
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      error: e
    }
  }
}
