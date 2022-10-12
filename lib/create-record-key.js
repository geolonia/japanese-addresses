const createRecordKey = (prefectureName, cityName, townName, koazaName = '') => {
  // 重複チェックに使用するためのキーには、「大字」または「字」を含めない。
  return `${prefectureName}${cityName}${townName.replace(/^大?字/g, '')}${koazaName}`
}

module.exports = createRecordKey
