#!/usr/bin/env node

const fs = require('fs')
const csvSync = require('csv-parse/lib/sync')
const httpcli = require('cheerio-httpcli')
const { normalize } = require('@geolonia/normalize-japanese-addresses')
const number2kanji = require('@geolonia/japanese-numeral').number2kanji
const Romanizer = require('js-hira-kata-romanize')
const r = new Romanizer({ chouon: Romanizer.CHOUON_SKIP, upper: Romanizer.UPPER_ALL })
const new_address_url = process.argv[2] || 'https://kokudo.or.jp/place/'

const zenkaku2hankaku = str => {
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  })
}

const hiragana2katakana = str => {
  return str.replace(/[\u3041-\u3096]/g, function(match) {
    const chr = match.charCodeAt(0) + 0x60
    return String.fromCharCode(chr)
  })
}

const convertNumberJo = str => {
  return str.replace(/(\d+)JO$/, ' $1-JO')
}

const formatDate = date => {
  const year = date.getFullYear()
  const month = ('00' + (date.getMonth() + 1)).slice(-2)
  const day = ('00' + date.getDate()).slice(-2)
  return `${year}${month}${day}`
}

const constructAddresses = (address, matchedData) => {
  let patches = []

  const oazaChochomokuKana = address.match(/（(.+)）/)[1]
  address = address.replace(/（.+）/, '')

  const oazaChochomoku = address.replace(`${matchedData[1]}${matchedData[5]}`, '')

  let match

  // 「宮城県石巻市湊西（みなとにし）１～３丁目」または「茨城県筑西市岡芹（おかぜり）１・２丁目」のような住所
  if (match = zenkaku2hankaku(oazaChochomoku).match(/(.+?)(\d+)([～・])(\d+)丁目/)) {
    const start = parseInt(match[2])
    const end = parseInt(match[4])

    for (let i = start; i <= end; i++) {
      patches.push({
        都道府県コード: matchedData[0],
        都道府県名: matchedData[1],
        都道府県名カナ: matchedData[2],
        都道府県名ローマ字: matchedData[3],
        市区町村コード: matchedData[4],
        市区町村名: matchedData[5],
        市区町村名カナ: matchedData[6],
        市区町村名ローマ字: matchedData[7],
        大字町丁目名: `${match[1]}${number2kanji(i)}丁目`,
        大字町丁目名カナ: `${hiragana2katakana(zenkaku2hankaku(oazaChochomokuKana))} ${i}`,
        大字町丁目名ローマ字: `${convertNumberJo(r.romanize(hiragana2katakana(zenkaku2hankaku(oazaChochomokuKana))))} ${i}`,
        '小字・通称名': '',
        緯度: null,
        経度: null,
        参照: new_address_url,
        更新日: formatDate(new Date()),
      })
    }
  // 「東京都国立市谷保（やほ）４丁目」のような住所
  } else if (match = zenkaku2hankaku(oazaChochomoku).match(/(.+?)(\d+)丁目/)) {
    patches.push({
      都道府県コード: matchedData[0],
      都道府県名: matchedData[1],
      都道府県名カナ: matchedData[2],
      都道府県名ローマ字: matchedData[3],
      市区町村コード: matchedData[4],
      市区町村名: matchedData[5],
      市区町村名カナ: matchedData[6],
      市区町村名ローマ字: matchedData[7],
      大字町丁目名: `${match[1]}${number2kanji(match[2])}丁目`,
      大字町丁目名カナ: `${hiragana2katakana(zenkaku2hankaku(oazaChochomokuKana))} ${match[2]}`,
      大字町丁目名ローマ字: `${convertNumberJo(r.romanize(hiragana2katakana(zenkaku2hankaku(oazaChochomokuKana))))} ${match[2]}`,
      '小字・通称名': '',
      緯度: null,
      経度: null,
      参照: new_address_url,
      更新日: formatDate(new Date()),
    })
  // 「茨城県筑西市八丁台（はっちょうだい）」のような住所
  } else {
    patches.push({
      都道府県コード: matchedData[0],
      都道府県名: matchedData[1],
      都道府県名カナ: matchedData[2],
      都道府県名ローマ字: matchedData[3],
      市区町村コード: matchedData[4],
      市区町村名: matchedData[5],
      市区町村名カナ: matchedData[6],
      市区町村名ローマ字: matchedData[7],
      大字町丁目名: zenkaku2hankaku(oazaChochomoku).replace(/\d/g, number => { return number2kanji(number) }),
      大字町丁目名カナ: hiragana2katakana(zenkaku2hankaku(oazaChochomokuKana)),
      大字町丁目名ローマ字: convertNumberJo(r.romanize(hiragana2katakana(zenkaku2hankaku(oazaChochomokuKana)))),
      '小字・通称名': '',
      緯度: null,
      経度: null,
      参照: new_address_url,
      更新日: formatDate(new Date()),
    })
  }

  return patches
}

const main = async () => {
  let patches = []

  // latest.csv を格納する配列
  const latestData = csvSync(fs.readFileSync(`${__dirname}/../data/latest.csv`, 'utf-8'))

  // 地名変更情報ページにあるtableの各セルを取得する
  const elements = httpcli.fetchSync(new_address_url).$('table.place-table td')
  
  for (let i = 0; i < elements.length; i++) {
    // 住所・地名のみを処理する
    if (i % 2 === 0) {
      let address = elements[i].children[0].data

      // 住所を正規化
      const data = await normalize(address)
      
      const prefecture = data.pref
      const city = data.city
      const matchedData = latestData.find(data => {
        return data[1] === prefecture && data[5] === city
      })

      patches = patches.concat(constructAddresses(address, matchedData))
    }
  }

  try {
    fs.writeFileSync(`patches/${formatDate(new Date())}.json`, JSON.stringify(patches, null, 2))
  } catch (e) {
    console.log(e)
  }
}

main()
