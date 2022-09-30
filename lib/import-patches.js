const fs = require('fs')
const path = require('path')
const PATCHES_PATH = `${__dirname}/../patches`

// patches以下の住所情報を追加
const importPatches = async () => {
  let patchData = {}
  let patches = []
  const patchFiles = fs.readdirSync(PATCHES_PATH).filter(file => {
    return path.extname(file).toLowerCase() === '.json'
  })
  for (let i = 0; i < patchFiles.length; i++) {
    patches = patches.concat(JSON.parse(fs.readFileSync(path.join(PATCHES_PATH, patchFiles[i]), 'utf8')))
  }
  patches.forEach(patch => {
    if (!patchData[patch.都道府県コード]) {
      patchData[patch.都道府県コード] = {}
    }

    const addressKey = `${patch.都道府県名}${patch.市区町村名}${patch.大字町丁目名}${patch['小字・通称名']}`
    if (!patchData[patch.都道府県コード][addressKey]) {
      patchData[patch.都道府県コード][addressKey] = [
        patch.都道府県コード,
        patch.都道府県名,
        patch.都道府県名カナ,
        patch.都道府県名ローマ字,
        patch.市区町村コード,
        patch.市区町村名,
        patch.市区町村名カナ,
        patch.市区町村名ローマ字,
        patch.大字町丁目名,
        patch.大字町丁目名カナ,
        patch.大字町丁目名ローマ字,
        patch['小字・通称名'],
        patch.緯度,
        patch.経度,
      ]
    }
  })

  return patchData
}

module.exports = importPatches
