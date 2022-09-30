const cityNamePostalMappings = [
  { pref: '青森県', postal: '東津軽郡外ヶ浜町', original: '東津軽郡外ケ浜町' },
  { pref: '茨城県', postal: '龍ケ崎市', original: '龍ヶ崎市' },
  { pref: '千葉県', postal: '鎌ケ谷市', original: '鎌ヶ谷市' },
  { pref: '千葉県', postal: '袖ケ浦市', original: '袖ヶ浦市' },
  { pref: '東京都', postal: '三宅島三宅村', original: '三宅村',
    kana: 'ミヤケムラ', rome: 'MIYAKE MURA' },
  { pref: '東京都', postal: '八丈島八丈町', original: '八丈町',
    kana: 'ハチジョウマチ', rome: 'HACHIJO MACHI' },
  { pref: '滋賀県', postal: '犬上郡多賀町', original: '犬上郡大字多賀町',
    kana: 'イヌカミグンオオアザタガチョウ', rome: 'INUKAMI GUN OAZA TAGA CHO' },
  { pref: '福岡県', postal: '糟屋郡須惠町', original: '糟屋郡須恵町' },
]

const townNamePostalMappings = [
  { pref: '東京都', postal: '富ヶ谷', original: '富ケ谷' },
  { pref: '東京都', postal: '幡ヶ谷', original: '幡ケ谷' },
  { pref: '東京都', postal: '千駄ヶ谷', original: '千駄ケ谷' },
]

const REMOVE_STRING_STARTING_WITH_OPENING_PARENS_REGEX = /\(.+$/
const removeStringStartingWithOpeningParentheses = text => {
  return text.replace(REMOVE_STRING_STARTING_WITH_OPENING_PARENS_REGEX, '')
}

const REMOVE_CHOME_REGEX = /[二三四五六七八九]?十?[一二三四五六七八九]?丁目?$/
const removeChome = text => text.replace(REMOVE_CHOME_REGEX, '')

const getPostalKanaOrRomeItems = (
  prefName,
  cityName,
  townName,
  postalCodeKanaOrRomeItems,
  postalKanaOrRomeCityFieldName,
  altKanaOrRomeCityFieldName,
) => {
  let townNameChomeRemoved = removeChome(townName)

  const townNamePostalAlt = townNamePostalMappings.find(
    ({ pref, original }) => (pref === prefName && original === townNameChomeRemoved),
  )

  if (townNamePostalAlt) {
    townNameChomeRemoved = townNamePostalAlt.postal
  }
  
  const cityNamePostalAlt = cityNamePostalMappings.find(
    ({ pref, original }) => (pref === prefName && original === cityName),
  )

  if (cityNamePostalAlt) {
    let postalRecord = postalCodeKanaOrRomeItems.find(
      item =>
        item['都道府県名'] === prefName &&
        item['市区町村名'] === cityNamePostalAlt.postal &&
        item['町域名'].indexOf(townNameChomeRemoved) === 0
      ,
    )

    if (!postalRecord) {
      postalRecord = postalCodeKanaOrRomeItems.find(
        item =>
          item['都道府県名'] === prefName &&
          item['市区町村名'] === cityNamePostalAlt.postal
        ,
      )
      if (postalRecord['町域名カナ']) {
        postalRecord['町域名カナ'] = ''
      }
      if (postalRecord['町域名ローマ字']) {
        postalRecord['町域名ローマ字'] = ''
      }
    }

    if (postalRecord && cityNamePostalAlt[altKanaOrRomeCityFieldName]) {
      postalRecord[postalKanaOrRomeCityFieldName] = cityNamePostalAlt[altKanaOrRomeCityFieldName]
    }

    return postalRecord
  } else {
    let postalRecord = postalCodeKanaOrRomeItems.find(
      item =>
        item['都道府県名'] === prefName &&
        item['市区町村名'] === cityName &&
        item['町域名'].indexOf(townNameChomeRemoved) === 0
      ,
    )

    if (!postalRecord) {
      postalRecord = postalCodeKanaOrRomeItems.find(
        item =>
          item['都道府県名'] === prefName &&
          item['市区町村名'] === cityName
        ,
      )
      if (postalRecord['町域名カナ']) {
        postalRecord['町域名カナ'] = ''
      }
      if (postalRecord['町域名ローマ字']) {
        postalRecord['町域名ローマ字'] = ''
      }
    }

    // 「ナカマチ(5115-5149、5171、5183、5186、」のような場合の「(」以降の不要な文字列を削除する。
    if (postalRecord['町域名カナ']) {
      postalRecord['町域名カナ'] = removeStringStartingWithOpeningParentheses(postalRecord['町域名カナ'])
    }

    if (postalRecord['町域名ローマ字']) {
      postalRecord['町域名ローマ字'] = removeStringStartingWithOpeningParentheses(postalRecord['町域名ローマ字'])
    }

    return postalRecord
  }
}

module.exports = getPostalKanaOrRomeItems
