const fs = require('fs')

const exportToCsv = (rows, outputPath) => {
  return new Promise( async (resolve, reject) => {
    try {
      let csvData = `"${Object.keys(rows[0]).join('","')}"\n`
      for (let i = 0; i < rows.length; i++) {
        const data = Object.values(rows[i]).map((value, index) => {
          return index > 11 || value === '' ? value : `"${value}"`
        })
        csvData += `${data.join(',')}\n`
      }

      fs.writeFile(outputPath, csvData, 'utf-8', err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    } catch (err) {
      throw err
    }
  })
}

module.exports = exportToCsv

