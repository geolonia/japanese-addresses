#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const https = require('https')

const unzip = require('unzipper')
const Encoding = require('encoding-japanese')
const csvParse = require('csv-parse/lib/sync')
const cliProgress = require('cli-progress')

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
const han2zen = str => {
  let reg = new RegExp('(' + Object.keys(han2zenMap).join('|') + ')', 'g')
  return str
    .replace(reg, match => han2zenMap[match])
}

const normalizePostalValue = text => {
  // return text
  return text.replace('　', '').trim()
}

const getPostalKanaOrRomeItems = (
  prefName,
  cityName,
  postalCodeKanaOrRomeItems,
  postalKanaOrRomeCityFieldName,
  altKanaOrRomeCityFieldName,
) => {
  const postalAlt = isjPostalMappings.find(
    ({ pref, isj }) => (pref === prefName && isj === cityName),
  )

  if (postalAlt) {
    const postalRecord = postalCodeKanaOrRomeItems.find(
      item =>
        item['都道府県名'] === prefName &&
        item['市区町村名'] === postalAlt.postal
      ,
    )

    if (postalRecord && postalAlt[altKanaOrRomeCityFieldName]) {
      postalRecord[postalKanaOrRomeCityFieldName] = postalAlt[altKanaOrRomeCityFieldName]
    }

    return postalRecord
  } else {
    const postalRecord = postalCodeKanaOrRomeItems.find(
      item =>
        item['都道府県名'] === prefName &&
        item['市区町村名'] === cityName
      ,
    )
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
      entry
        .pipe(fs.createWriteStream(outPath))
        .on('finish', () => {
          resolve(outPath)
        })
    }).on('end', () => {
      if (!atLeastOneFile) {
        reject(new Error('no CSV file detected in archive file'))
      }
    })
  })
})

const getAddressItems = async (
  prefCode,
  postalCodeKanaItems,
  postalCodeRomeItems,
) => {
  const recordKeys = []
  const records = []

  const cityCodes = {}

  let hit = 0
  let nohit = 0
  const nohitCases = {}

  // 位置参照情報(大字・町丁目レベル)
  const _outPath = path.join(dataDir, `nlftp_mlit_130b_${prefCode}.csv`)

  if (!fs.existsSync(_outPath)) {
    await _downloadNlftpMlitFile(prefCode, _outPath, '13.0b')
  }

  const _buffer = await fs.promises.readFile(_outPath)
  const _text = Encoding.convert(_buffer, {
    from: 'SJIS',
    to: 'UNICODE',
    type: 'string',
  })

  const _data = csvParse(_text, {
    columns: true,
    skip_empty_lines: true,
  })

  const _bar = new cliProgress.SingleBar()
  _bar.start(_data.length, 0)

  _data.forEach((line, index) => {
    _bar.update(index + 1)

    const renameEntry =
      isjRenames.find(
        ({ pref, orig }) =>
          (pref === line['都道府県名'] &&
            orig === line['市区町村名']))
    const cityName = renameEntry ? renameEntry.renamed : line['市区町村名']

    const postalCodeKanaItem = getPostalKanaOrRomeItems(
      line['都道府県名'], cityName, postalCodeKanaItems, '市区町村名カナ', 'kana',
    )
    const postalCodeRomeItem = getPostalKanaOrRomeItems(
      line['都道府県名'], cityName, postalCodeRomeItems, '市区町村名ローマ字', 'rome',
    )

    if (postalCodeKanaItem && postalCodeRomeItem) {
      hit++
    } else {
      nohit++
      nohitCases[line['都道府県名'] + cityName] = true
    }

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
      '',
      ''
    ]
      .map(item =>
        item && typeof item === 'string' ? `"${item}"` : item,
      )
      .join(',')

    recordKeys.push(recordKey)
    records.push(record)
  }) // line iteration
  _bar.stop()

  // 位置参照情報(街区レベル)
  const outPath = path.join(dataDir, `nlftp_mlit_180a_${prefCode}.csv`)

  if (!fs.existsSync(outPath)) {
    await _downloadNlftpMlitFile(prefCode, outPath, '18.0a')
  }

  const buffer = await fs.promises.readFile(outPath)
  const text = Encoding.convert(buffer, {
    from: 'SJIS',
    to: 'UNICODE',
    type: 'string',
  })

  const data = csvParse(text, {
    columns: true,
    skip_empty_lines: true,
  })

  const bar = new cliProgress.SingleBar()
  bar.start(data.length, 0)

  data.forEach((line, index) => {
    bar.update(index + 1)

    const renameEntry =
      isjRenames.find(
        ({ pref, orig }) =>
          (pref === line['都道府県名'] &&
            orig === line['市区町村名']))
    const cityName = renameEntry ? renameEntry.renamed : line['市区町村名']

    const postalCodeKanaItem = getPostalKanaOrRomeItems(
      line['都道府県名'], cityName, postalCodeKanaItems, '市区町村名カナ', 'kana',
    )
    const postalCodeRomeItem = getPostalKanaOrRomeItems(
      line['都道府県名'], cityName, postalCodeRomeItems, '市区町村名ローマ字', 'rome',
    )

    if (postalCodeKanaItem && postalCodeRomeItem) {
      hit++
    } else {
      nohit++
      nohitCases[line['都道府県名'] + cityName] = true
    }

    const recordKey = line['都道府県名'] + cityName + line['大字・丁目名']
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
      line['大字・丁目名'] + line['小字・通称名'],
      '',
      ''
    ]
      .map(item =>
        item && typeof item === 'string' ? `"${item}"` : item,
      )
      .join(',')

    // to avoid duplication
    if (!recordKeys.includes(recordKey)) {
      recordKeys.push(recordKey)
      records.push(record)
    }
  }) // line iteration
  bar.stop()
  const summary = { prefCode, hit, nohit, nohitCases: Object.keys(nohitCases) }

  return { records, summary }
}

const main = async () => {
  process.stderr.write('郵便番号辞書のダウンロード中...')
  const [
    postalCodeKanaItems,
    postalCodeRomeItems,
  ] = await Promise.all([
    downloadPostalCodeKana(),
    downloadPostalCodeRome(),
  ])
  process.stderr.write('done\n')

  const finalOutput = [
    [
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
      '"大字町丁目名ローマ字"'
    ].join(','),
  ]

  const promises = []
  for (let i = 1; i < 48; i++) {
    let prefCode = i.toString()
    if (i < 10) {
      prefCode = `0${prefCode}`
    }
    // process.stderr.write(`memoryUsed: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n`)

    const promise = getAddressItems(
      prefCode,
      postalCodeKanaItems,
      postalCodeRomeItems,
    ).then(data => {
      // console.log(data)
      finalOutput.push(...data.records)
      process.stderr.write(JSON.stringify({ summary: data.summary }) + '\n')
    })

    if (process.env.CONCURRENCY === 'true') {
      promises.push(promise)
    } else {
      await promise
    }
  } // pref loop

  if (process.env.CONCURRENCY === 'true') {
    await Promise.all(promises)
  }

  await fs.promises.writeFile(path.join(dataDir, 'latest.csv'), finalOutput.join('\n'))
}

try {
  fs.mkdirSync(dataDir)
} catch (error) {
  // already exists
}

if (require.main === module) {
  main()
}
