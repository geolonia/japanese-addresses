#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const https = require('https')

const unzip = require('unzipper')
const Encoding = require('encoding-japanese')
const csvParse = require('csv-parse/lib/sync')
const cliProgress = require('cli-progress')

const dataDir = path.join(path.dirname(path.dirname(__filename)), 'data')

const isj2Postal = {
  東津軽郡外ケ浜町: '東津軽郡外ヶ浜町',
  龍ヶ崎市: '龍ケ崎市',
  鎌ヶ谷市: '鎌ケ谷市',
  袖ヶ浦市: '袖ケ浦市',
  三宅村: '三宅島三宅村',
  八丈町: '八丈島八丈町',
  犬上郡大字多賀町: '犬上郡多賀町',
  篠山市: '丹波篠山市',
  筑紫郡那珂川町: '那珂川市',
  糟屋郡須恵町: '糟屋郡須惠町',
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
const han2zen = str => {
  let reg = new RegExp('(' + Object.keys(han2zenMap).join('|') + ')', 'g')
  return str
    .replace(reg, match => han2zenMap[match])
}

const normalizePostalValue = text => {
  // return text
  return text.replace('　', '').trim()
}

const downloadPostalCodeKana = () => {
  return new Promise((resolve, reject) => {
    const url =
      'https://www.post.japanpost.jp/zipcode/dl/kogaki/zip/ken_all.zip'
    const csvPath = `${dataDir}/postalcode.csv`
    https.get(url, res => {
      res
        .pipe(unzip.Parse())
        .on('entry', entry => {
          entry
            .pipe(fs.createWriteStream(csvPath))
            .on('finish', () => {
              fs.readFile(csvPath, (error, buffer) => {
                if (error) {
                  reject(error)
                } else {
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
                  resolve(json)
                }
              })
            })
            .on('error', error => reject(error))
        })
        .on('error', error => reject(error))
    })
  })
}

const downloadPostalCodeRome = () => {
  return new Promise((resolve, reject) => {
    const url =
      'https://www.post.japanpost.jp/zipcode/dl/roman/ken_all_rome.zip'
    const csvPath = `${dataDir}/postalcode.csv`
    https.get(url, res => {
      res
        .pipe(unzip.Parse())
        .on('entry', entry => {
          entry
            .pipe(fs.createWriteStream(csvPath))
            .on('finish', () => {
              fs.readFile(csvPath, (error, buffer) => {
                if (error) {
                  reject(error)
                } else {
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
                  resolve(json)
                }
              })
            })
            .on('error', error => reject(error))
        })
        .on('error', error => reject(error))
    })
  })
}

const getAddressItems = (
  prefCode,
  postalCodeKanaItems,
  postalCodeRomeItems,
) => {
  return new Promise(resolve => {
    const records = []
    const url = `https://nlftp.mlit.go.jp/isj/dls/data/11.0b/${prefCode}000-11.0b.zip`

    https.get(url, res => {
      res.pipe(unzip.Parse()).on('entry', entry => {
        const entryPath = path.join(dataDir, entry.path)
        if (entry.type === 'Directory') {
          try {
            fs.mkdirSync(entryPath)
          } catch (error) {
            // already exists
          }
        } else if (entry.path.slice(-4) === '.csv') {
          entry.pipe(
            fs.createWriteStream(entryPath).on('finish', () => {
              const buffer = fs.readFileSync(entryPath)
              const text = Encoding.convert(buffer, {
                from: 'SJIS',
                to: 'UNICODE',
                type: 'string',
              })

              const data = csvParse(text, {
                columns: true,
                skip_empty_lines: true,
              })

              let hit = 0
              let nohit = 0
              const nohitCases = {}

              const bar = new cliProgress.SingleBar()
              bar.start(data.length, 0)

              data.forEach((line, index) => {
                bar.update(index + 1)

                const postalCodeKanaItem = postalCodeKanaItems.find(
                  item =>
                    item['都道府県名'] === line['都道府県名'] &&
                    (item['市区町村名'] === line['市区町村名'] ||
                      item['市区町村名'] === isj2Postal[line['市区町村名']]),
                )
                const postalCodeRomeItem = postalCodeRomeItems.find(
                  item =>
                    item['都道府県名'] === line['都道府県名'] &&
                    (item['市区町村名'] === line['市区町村名'] ||
                      item['市区町村名'] === isj2Postal[line['市区町村名']]),
                )

                if (postalCodeKanaItem && postalCodeRomeItem) {
                  hit++
                } else {
                  nohit++
                  nohitCases[line['都道府県名'] + line['市区町村名']] = true
                }
                const record = [
                  line['都道府県コード'],
                  line['都道府県名'],
                  postalCodeKanaItem
                    ? han2zen(postalCodeKanaItem['都道府県名カナ'])
                    : '',
                  postalCodeRomeItem
                    ? postalCodeRomeItem['都道府県名ローマ字']
                    : '',
                  line['市区町村コード'],
                  line['市区町村名'],
                  postalCodeKanaItem
                    ? han2zen(postalCodeKanaItem['市区町村名カナ'])
                    : '',
                  postalCodeRomeItem
                    ? postalCodeRomeItem['市区町村名ローマ字']
                    : '',
                  line['大字町丁目コード'],
                  line['大字町丁目名'],
                  line['緯度'],
                  line['経度'],
                ]
                  .map(item =>
                    item && typeof item === 'string' ? `"${item}"` : item,
                  )
                  .join(',')

                records.push(record)
              }) // line iteration
              bar.stop()
              const summary = { prefCode, hit, nohit, nohitCases: Object.keys(nohitCases) }
              resolve({ records, summary })
            }),
          )
        }
      }) // http.get response pipe event
    }) // http.get callback
  })
}

const main = async () => {
  process.stderr.write('郵便番号辞書のダウンロード中...')
  const postalCodeKanaItems = await downloadPostalCodeKana()
  const postalCodeRomeItems = await downloadPostalCodeRome()
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
      '"大字町丁目コード"',
      '"大字町丁目名"',
      '"緯度"',
      '"経度"',
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
      console.log(data)
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
  fs.writeFileSync(path.join(dataDir, 'latest.csv'), finalOutput.join('\n'))
}

try {
  fs.mkdirSync(dataDir)
} catch (error) {
  // already exists
}

main()
