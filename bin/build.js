#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const https = require('https')

const { promisify } = require('util')
const async = require('async')
const unzip = require('unzipper')
const Encoding = require('encoding-japanese')
const iconv = require('iconv-lite')
const csvParse = require('csv-parse/lib/sync')
const cliProgress = require('cli-progress')
const performance = require('perf_hooks').performance
const kanji2number = require('@geolonia/japanese-numeral').kanji2number
const turfCenter = require('@turf/center').default
const turfNearestPoint = require('@turf/nearest-point').default
const { featureCollection, point } = require('@turf/helpers');

const sleep = promisify(setTimeout)

const dataDir = path.join(path.dirname(path.dirname(__filename)), 'data')

const isjRenames = [
  { pref: '兵庫県', orig: '篠山市', renamed: '丹波篠山市' },
  { pref: '福岡県', orig: '筑紫郡那珂川町', renamed: '那珂川市' },
]

const isjPostalMappings = [
  { pref: '青森県', postal: '東津軽郡外ヶ浜町', isj: '東津軽郡外ケ浜町' },
  { pref: '茨城県', postal: '龍ケ崎市', isj: '龍ヶ崎市' },
  { pref: '千葉県', postal: '鎌ケ谷市', isj: '鎌ヶ谷市' },
  { pref: '千葉県', postal: '袖ケ浦市', isj: '袖ヶ浦市' },
  { pref: '東京都', postal: '三宅島三宅村', isj: '三宅村',
    kana: 'ミヤケムラ', rome: 'MIYAKE MURA' },
  { pref: '東京都', postal: '八丈島八丈町', isj: '八丈町',
    kana: 'ハチジョウマチ', rome: 'HACHIJO MACHI' },
  { pref: '滋賀県', postal: '犬上郡多賀町', isj: '犬上郡大字多賀町',
    kana: 'イヌカミグンオオアザタガチョウ', rome: 'INUKAMI GUN OAZA TAGA CHO' },
  { pref: '福岡県', postal: '糟屋郡須惠町', isj: '糟屋郡須恵町' },
]

const prefNames = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
]

const toPrefCode = prefNumber => {
  let prefCode = prefNumber.toString()
  if (prefNumber < 10) {
    prefCode = `0${prefCode}`
  }
  return prefCode
}

const han2zenMap = {
  ｶﾞ: 'ガ',
  ｷﾞ: 'ギ',
  ｸﾞ: 'グ',
  ｹﾞ: 'ゲ',
  ｺﾞ: 'ゴ',
  ｻﾞ: 'ザ',
  ｼﾞ: 'ジ',
  ｽﾞ: 'ズ',
  ｾﾞ: 'ゼ',
  ｿﾞ: 'ゾ',
  ﾀﾞ: 'ダ',
  ﾁﾞ: 'ヂ',
  ﾂﾞ: 'ヅ',
  ﾃﾞ: 'デ',
  ﾄﾞ: 'ド',
  ﾊﾞ: 'バ',
  ﾋﾞ: 'ビ',
  ﾌﾞ: 'ブ',
  ﾍﾞ: 'ベ',
  ﾎﾞ: 'ボ',
  ﾊﾟ: 'パ',
  ﾋﾟ: 'ピ',
  ﾌﾟ: 'プ',
  ﾍﾟ: 'ペ',
  ﾎﾟ: 'ポ',
  ｳﾞ: 'ヴ',
  ﾜﾞ: 'ヷ',
  ｦﾞ: 'ヺ',
  ｱ: 'ア',
  ｲ: 'イ',
  ｳ: 'ウ',
  ｴ: 'エ',
  ｵ: 'オ',
  ｶ: 'カ',
  ｷ: 'キ',
  ｸ: 'ク',
  ｹ: 'ケ',
  ｺ: 'コ',
  ｻ: 'サ',
  ｼ: 'シ',
  ｽ: 'ス',
  ｾ: 'セ',
  ｿ: 'ソ',
  ﾀ: 'タ',
  ﾁ: 'チ',
  ﾂ: 'ツ',
  ﾃ: 'テ',
  ﾄ: 'ト',
  ﾅ: 'ナ',
  ﾆ: 'ニ',
  ﾇ: 'ヌ',
  ﾈ: 'ネ',
  ﾉ: 'ノ',
  ﾊ: 'ハ',
  ﾋ: 'ヒ',
  ﾌ: 'フ',
  ﾍ: 'ヘ',
  ﾎ: 'ホ',
  ﾏ: 'マ',
  ﾐ: 'ミ',
  ﾑ: 'ム',
  ﾒ: 'メ',
  ﾓ: 'モ',
  ﾔ: 'ヤ',
  ﾕ: 'ユ',
  ﾖ: 'ヨ',
  ﾗ: 'ラ',
  ﾘ: 'リ',
  ﾙ: 'ル',
  ﾚ: 'レ',
  ﾛ: 'ロ',
  ﾜ: 'ワ',
  ｦ: 'ヲ',
  ﾝ: 'ン',
  ｧ: 'ァ',
  ｨ: 'ィ',
  ｩ: 'ゥ',
  ｪ: 'ェ',
  ｫ: 'ォ',
  ｯ: 'ッ',
  ｬ: 'ャ',
  ｭ: 'ュ',
  ｮ: 'ョ',
  '｡': '。',
  '､': '、',
  ｰ: 'ー',
  '｢': '「',
  '｣': '」',
  '･': '・',
}
const HAN2ZEN_REGEXP = new RegExp('(' + Object.keys(han2zenMap).join('|') + ')', 'g')
const han2zen = str => str.replace(HAN2ZEN_REGEXP, match => han2zenMap[match])

const normalizePostalValue = text => {
  // return text
  return text.replace('　', '').trim()
}

const REMOVE_CHOME_REGEX = /[二三四五六七八九]?十?[一二三四五六七八九]?丁目?$/
const removeChome = text => text.replace(REMOVE_CHOME_REGEX, '')

const GET_CHOME_NUMBER_REGEX = /([二三四五六七八九]?十?[一二三四五六七八九]?)丁目?$/
const getChomeNumber = (text, suffix = '') => {
  const match = text.match(GET_CHOME_NUMBER_REGEX)
  if (match && match[1]) {
    return kanji2number(match[1]) + suffix
  } else {
    return ''
  }
}

const REMOVE_STRING_IN_PARENS_REGEX = /\(.+\)$/
const removeStringEnclosedInParentheses = text => {
  return text.replace(REMOVE_STRING_IN_PARENS_REGEX, '')
}

const getPostalKanaOrRomeItems = (
  prefName,
  cityName,
  townName,
  postalCodeKanaOrRomeItems,
  postalKanaOrRomeCityFieldName,
  altKanaOrRomeCityFieldName,
) => {
  const postalAlt = isjPostalMappings.find(
    ({ pref, isj }) => (pref === prefName && isj === cityName),
  )

  const townNameChomeRemoved = removeChome(townName)

  if (postalAlt) {
    let postalRecord = postalCodeKanaOrRomeItems.find(
      item =>
        item['都道府県名'] === prefName &&
        item['市区町村名'] === postalAlt.postal &&
        item['町域名'].indexOf(townNameChomeRemoved) === 0
      ,
    )

    if (!postalRecord) {
      postalRecord = postalCodeKanaOrRomeItems.find(
        item =>
          item['都道府県名'] === prefName &&
          item['市区町村名'] === postalAlt.postal
        ,
      )
      if (postalRecord['町域名カナ']) {
        postalRecord['町域名カナ'] = ''
      }
      if (postalRecord['町域名ローマ字']) {
        postalRecord['町域名ローマ字'] = ''
      }
    }

    if (postalRecord && postalAlt[altKanaOrRomeCityFieldName]) {
      postalRecord[postalKanaOrRomeCityFieldName] = postalAlt[altKanaOrRomeCityFieldName]
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
    return postalRecord
  }
}

const _downloadZippedFile = (url, path) => new Promise( resolve => {
  https.get(url, res => {
    res
      .pipe(unzip.Parse())
      .on('entry', entry => {
        entry
          .pipe(fs.createWriteStream(path))
          .on('finish', () => {
            resolve(path)
          })
      })
  })
})

const downloadPostalCodeKana = async () => {
  const url = 'https://www.post.japanpost.jp/zipcode/dl/kogaki/zip/ken_all.zip'
  const csvPath = `${dataDir}/postalcode_kogaki.csv`
  if (!fs.existsSync(csvPath)) {
    await _downloadZippedFile(url, csvPath)
  }
  const buffer = await fs.promises.readFile(csvPath)
  const text = Encoding.convert(buffer, {
    from: 'SJIS',
    to: 'UNICODE',
    type: 'string',
  })
  const json = csvParse(text, {
    columns: [
      '全国地方公共団体コード',
      '（旧）郵便番号',
      '郵便番号',
      '都道府県名カナ',
      '市区町村名カナ',
      '町域名カナ',
      '都道府県名',
      '市区町村名',
      '町域名',
      'hasMulti',
      'hasBanchiOnAza',
      'hasChomome',
      'hasAlias',
      'update',
      'updateReason',
    ],
  }).map(item => ({
    ...item,
    市区町村名: normalizePostalValue(item['市区町村名']),
  }))
  return json
}

module.exports.downloadPostalCodeKana = downloadPostalCodeKana

const downloadPostalCodeRome = async () => {
  const url = 'https://www.post.japanpost.jp/zipcode/dl/roman/ken_all_rome.zip'
  const csvPath = `${dataDir}/postalcode_roman.csv`
  if (!fs.existsSync(csvPath)) {
    await _downloadZippedFile(url, csvPath)
  }
  const buffer = await fs.promises.readFile(csvPath)
  const text = Encoding.convert(buffer, {
    from: 'SJIS',
    to: 'UNICODE',
    type: 'string',
  })
  const json = csvParse(text, {
    columns: [
      '郵便番号',
      '都道府県名',
      '市区町村名',
      '町域名',
      '都道府県名ローマ字',
      '市区町村名ローマ字',
      '町域名ローマ字',
    ],
  }).map(item => ({
    ...item,
    市区町村名: normalizePostalValue(item['市区町村名']),
  }))
  return json
}

module.exports.downloadPostalCodeRome = downloadPostalCodeRome

const _downloadNlftpMlitFile = (prefCode, outPath, version) => new Promise((resolve, reject) => {
  const url = `https://nlftp.mlit.go.jp/isj/dls/data/${version}/${prefCode}000-${version}.zip`
  https.get(url, res => {
    let atLeastOneFile = false
    res.pipe(unzip.Parse()).on('entry', entry => {
      if (entry.type === 'Directory' || entry.path.slice(-4) !== '.csv') {
        return
      }
      atLeastOneFile = true
      const tmpOutPath = outPath + '.tmp'
      entry
        .pipe(iconv.decodeStream('Shift_JIS'))
        .pipe(fs.createWriteStream(tmpOutPath))
        .on('finish', () => {
          fs.renameSync(tmpOutPath, outPath)
          resolve(outPath)
        })
    }).on('end', () => {
      if (!atLeastOneFile) {
        reject(new Error('no CSV file detected in archive file'))
      }
    })
  })
})

// 位置参照情報(大字・町丁目レベル)から住所データを取得する
const getOazaAddressItems = async (prefCode, postalCodeKanaItems, postalCodeRomeItems) => {
  const records = {}
  const cityCodes = {}

  const outPath = path.join(dataDir, `nlftp_mlit_130b_${prefCode}.csv`)

  while (!fs.existsSync(outPath)) {
    console.log(`${prefCode}: waiting for nlftp_mlit_130b_${prefCode}.csv...`)
    await sleep(1000)
  }

  const text = await fs.promises.readFile(outPath)

  const data = csvParse(text, {
    columns: true,
    skip_empty_lines: true,
  })

  const bar = new cliProgress.SingleBar()
  bar.start(data.length, 0)

  const dataLength = data.length
  for (let index = 0; index < dataLength; index++) {
    const line = data[index]

    bar.update(index + 1)

    const renameEntry =
      isjRenames.find(
        ({ pref, orig }) =>
          (pref === line['都道府県名'] &&
            orig === line['市区町村名']))
    const cityName = renameEntry ? renameEntry.renamed : line['市区町村名']

    const postalCodeKanaItem = getPostalKanaOrRomeItems(
      line['都道府県名'], cityName, line['大字町丁目名'], postalCodeKanaItems, '市区町村名カナ', 'kana',
    )
    const postalCodeRomeItem = getPostalKanaOrRomeItems(
      line['都道府県名'], cityName, line['大字町丁目名'], postalCodeRomeItems, '市区町村名ローマ字', 'rome',
    )

    if (!cityCodes[cityName]) {
      cityCodes[cityName] = line['市区町村コード']
    }

    const recordKey = line['都道府県名'] + cityName + line['大字町丁目名']
    const record = [
      prefCode,
      line['都道府県名'],
      postalCodeKanaItem
        ? han2zen(postalCodeKanaItem['都道府県名カナ'])
        : '',
      postalCodeRomeItem
        ? postalCodeRomeItem['都道府県名ローマ字']
        : '',
      line['市区町村コード'],
      cityName,
      postalCodeKanaItem
        ? han2zen(postalCodeKanaItem['市区町村名カナ'])
        : '',
      postalCodeRomeItem
        ? postalCodeRomeItem['市区町村名ローマ字']
        : '',
      line['大字町丁目名'],
      postalCodeKanaItem
        ? han2zen(removeStringEnclosedInParentheses(postalCodeKanaItem['町域名カナ'])) + (getChomeNumber(line['大字町丁目名']) !== '' ? ` ${getChomeNumber(line['大字町丁目名'])}` : '')
        : '',
      postalCodeRomeItem
        ? removeStringEnclosedInParentheses(postalCodeRomeItem['町域名ローマ字']) + (getChomeNumber(line['大字町丁目名']) !== '' ? ` ${getChomeNumber(line['大字町丁目名'])}` : '')
        : '',
      '',
      line['緯度'],
      line['経度']
    ]
      .map(item =>
        item && typeof item === 'string' ? `"${item}"` : item,
      )
      .join(',') + '\n'

    records[recordKey] = record
  } // line iteration
  bar.stop()

  console.log(`${prefCode}: 大字・町丁目レベル ${Object.values(records).length}件`)

  return { records, cityCodes }
}

// 経度・緯度
let coords = {}
const addToCoords = (recordKey, lng, lat) => {
  if (coords[recordKey] === undefined) {
    coords[recordKey] = [[Number(lng), Number(lat)]]
  } else {
    coords[recordKey].push([Number(lng), Number(lat)])
  }
}

const getCenter = (recordKey) => {
  const arr = coords[recordKey]
  const features = featureCollection(
    arr.map(c => point(c))
  )

  // 各地点を囲む最小の長方形（bounding box）を作り、その中心に一番近い地点を返す。
  // Ref. https://turfjs.org/docs/#center, https://turfjs.org/docs/#nearestPoint
  return turfNearestPoint(turfCenter(features), features)
}

// 位置参照情報(街区レベル)から住所データを取得する
const getGaikuAddressItems = async (prefCode, postalCodeKanaItems, postalCodeRomeItems, records, cityCodes) => {
  const outPath = path.join(dataDir, `nlftp_mlit_180a_${prefCode}.csv`)

  while (!fs.existsSync(outPath)) {
    console.log(`${prefCode}: waiting for nlftp_mlit_180a_${prefCode}.csv...`)
    await sleep(1000)
  }

  const text = await fs.promises.readFile(outPath)

  const data = csvParse(text, {
    columns: true,
    skip_empty_lines: true,
  })

  const bar = new cliProgress.SingleBar()
  bar.start(data.length, 0)

  // 緯度・経度をいったん全部coordsに格納する
  for (let index = 0; index < data.length; index++) {
    const line = data[index]
    const renameEntry =
      isjRenames.find(
        ({ pref, orig }) =>
          (pref === line['都道府県名'] &&
            orig === line['市区町村名']))
    const cityName = renameEntry ? renameEntry.renamed : line['市区町村名']
    const recordKey = line['都道府県名'] + cityName + line['大字・丁目名'] + line['小字・通称名']
    addToCoords(recordKey, line['経度'], line['緯度'])
　}

  let count = 0

  const dataLength = data.length
  for (let index = 0; index < dataLength; index++) {
    const line = data[index]

    bar.update(index + 1)

    const renameEntry =
      isjRenames.find(
        ({ pref, orig }) =>
          (pref === line['都道府県名'] &&
            orig === line['市区町村名']))
    const cityName = renameEntry ? renameEntry.renamed : line['市区町村名']

    const recordKey = line['都道府県名'] + cityName + line['大字・丁目名'] + line['小字・通称名']

    // to avoid duplication
    if (records[recordKey]) {
      continue
    }

    const townName = line['大字・丁目名']
    const postalCodeKanaItem = getPostalKanaOrRomeItems(
      line['都道府県名'], cityName, townName, postalCodeKanaItems, '市区町村名カナ', 'kana',
    )
    const postalCodeRomeItem = getPostalKanaOrRomeItems(
      line['都道府県名'], cityName, townName, postalCodeRomeItems, '市区町村名ローマ字', 'rome',
    )

    const center = getCenter(recordKey)
    const record = [
      prefCode,
      line['都道府県名'],
      postalCodeKanaItem
        ? han2zen(postalCodeKanaItem['都道府県名カナ'])
        : '',
      postalCodeRomeItem
        ? postalCodeRomeItem['都道府県名ローマ字']
        : '',
      cityCodes[cityName],
      cityName,
      postalCodeKanaItem
        ? han2zen(postalCodeKanaItem['市区町村名カナ'])
        : '',
      postalCodeRomeItem
        ? postalCodeRomeItem['市区町村名ローマ字']
        : '',
      townName,
      postalCodeKanaItem
        ? han2zen(removeStringEnclosedInParentheses(postalCodeKanaItem['町域名カナ'])) + (getChomeNumber(townName) !== '' ? ` ${getChomeNumber(townName)}` : '')
        : '',
      postalCodeRomeItem
        ? removeStringEnclosedInParentheses(postalCodeRomeItem['町域名ローマ字']) + (getChomeNumber(townName) !== '' ? ` ${getChomeNumber(townName)}` : '')
        : '',
      line['小字・通称名'],
      String(center.geometry.coordinates[1]),
      String(center.geometry.coordinates[0])
    ]
      .map(item =>
        item && typeof item === 'string' ? `"${item}"` : item,
      )
      .join(',') + '\n'

    records[recordKey] = record
    count++
  } // line iteration
  bar.stop()

  console.log(`${prefCode}: 街区レベル ${count}件`)

  return { records }
}

const getAddressItems = async (
  prefCode,
  postalCodeKanaItems,
  postalCodeRomeItems,
) => {
  let records = {}

  const prefName = prefNames[parseInt(prefCode, 10) - 1]
  const filteredPostalCodeKanaItems = postalCodeKanaItems.filter(
    item => item['都道府県名'] === prefName,
  )
  const filteredPostalCodeRomeItems = postalCodeRomeItems.filter(
    item => item['都道府県名'] === prefName,
  )

  const oazaData = await getOazaAddressItems(
    prefCode,
    filteredPostalCodeKanaItems,
    filteredPostalCodeRomeItems,
  )

  const gaikuData = await getGaikuAddressItems(
    prefCode,
    filteredPostalCodeKanaItems,
    filteredPostalCodeRomeItems,
    oazaData.records,
    oazaData.cityCodes
  )

  records = gaikuData.records

  console.log(`${prefCode}: 街区レベル + 大字・町丁目レベル ${Object.values(records).length}件`)

  return { records }
}

const main = async () => {
  const t0 = performance.now()
  process.stderr.write('郵便番号辞書のダウンロード中...')
  const [
    postalCodeKanaItems,
    postalCodeRomeItems,
  ] = await Promise.all([
    downloadPostalCodeKana(),
    downloadPostalCodeRome(),
  ])
  process.stderr.write('done\n')

  const prefCodeArray = process.argv[2] ? [process.argv[2]] : Array.from(Array(47), (v, k) => k + 1)

  const download130bQueue = async.queue(async prefCode => {
    const outPath = path.join(dataDir, `nlftp_mlit_130b_${prefCode}.csv`)

    if (!fs.existsSync(outPath)) {
      await _downloadNlftpMlitFile(prefCode, outPath, '13.0b')
    }
  }, 1)

  const download180aQueue = async.queue(async prefCode => {
    const outPath = path.join(dataDir, `nlftp_mlit_180a_${prefCode}.csv`)

    if (!fs.existsSync(outPath)) {
      await _downloadNlftpMlitFile(prefCode, outPath, '18.0a')
    }
  }, 3)


  prefCodeArray.forEach(prefNumber => {
    const prefCode = toPrefCode(prefNumber)
    download130bQueue.push(prefCode)
    download180aQueue.push(prefCode)
  })

  const outfile = await fs.promises.open(path.join(dataDir, 'latest_v2.csv'), 'w')
  const outfileWriterQueue = async.queue(async str => {
    await outfile.write(str)
  }, 1)

  outfileWriterQueue.push([
    '"都道府県コード"',
    '"都道府県名"',
    '"都道府県名カナ"',
    '"都道府県名ローマ字"',
    '"市区町村コード"',
    '"市区町村名"',
    '"市区町村名カナ"',
    '"市区町村名ローマ字"',
    '"大字町丁目名"',
    '"大字町丁目名カナ"',
    '"大字町丁目名ローマ字"',
    '"小字・通称名"',
    '"緯度"',
    '"経度"'
  ].join(',') + '\n')

  for (let i = 0; i < prefCodeArray.length; i++) {
    const prefCode = toPrefCode(prefCodeArray[i])

    const tp0 = performance.now()
    const data = await getAddressItems(
      prefCode,
      postalCodeKanaItems,
      postalCodeRomeItems,
    )
    const tp1 = performance.now()
    console.log(`${prefCode}: build took ` + (tp1 - tp0) + ' milliseconds.')

    outfileWriterQueue.push(Object.values(data.records))
  } // pref loop

  await outfileWriterQueue.drain()
  await outfile.close()

  const t1 = performance.now()
  console.log('build.js took ' + (t1 - t0) + ' milliseconds.')
}

try {
  fs.mkdirSync(dataDir)
} catch (error) {
  // already exists
}

if (require.main === module) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
