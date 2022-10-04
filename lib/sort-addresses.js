const sortAddresses = db => {
  return new Promise((resolve, reject) => {
    db.all('select * from addresses order by 都道府県コード asc, 市区町村コード asc, 大字町丁目名カナ asc, 大字町丁目名 asc, 小字・通称名 asc', [], async (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

module.exports = sortAddresses
