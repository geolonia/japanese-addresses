const fs = require('fs')
const path = require('path')
const { expect } = require('chai')

describe('latest.csvのテスト', () => {
  let lines
  before(() => {
    lines = fs
      .readFileSync(path.join(path.dirname(__filename), '../data/latest.csv'), {
        encoding: 'utf-8',
      })
      .split(/\n/)
  })

  it('一行目のデータを確認する', () => {
    data = lines[1]
    expect(data).to.equal('"01","北海道","ホッカイドウ","HOKKAIDO","01101","札幌市中央区","サッポロシチュウオウク","SAPPORO SHI CHUO KU","旭ケ丘一丁目","アサヒガオカ 1","ASAHIGAOKA 1",,43.04223,141.319722')
  })

  it('大字のローマ字を取得できる', () => {
    data = lines[31765]
    expect(data).to.equal('"20","長野県","ナガノケン","NAGANO KEN","20201","長野市","ナガノシ","NAGANO SHI","篠ノ井塩崎","シノノイシオザキ","SHINONOI SHIOZAKI",,36.552969,138.109935')
  })

  // https://github.com/geolonia/japanese-addresses/issues/57
  it('緯度・経度は常に数値型', () => {
    data = lines[31768]
    expect(data).to.equal('"20","長野県","ナガノケン","NAGANO KEN","20201","長野市","ナガノシ","NAGANO SHI","篠ノ井塩崎","シノノイシオザキ","SHINONOI SHIOZAKI","四之宮",36.555444,138.10524')
  })

  it('大字町丁名データの全角スペースを削除する', () => {
    data = lines[21958]
    expect(data).to.equal('"01","北海道","ホッカイドウ","HOKKAIDO","01632","河東郡士幌町","カトウグンシホロチョウ","KATO GUN SHIHORO CHO","字士幌仲通",,,,43.168944,143.246195')
  })

  // https://github.com/geolonia/japanese-addresses/issues/97
  it('上伊那郡南箕輪の市区町村コードが空欄にならない', () => {
    data = lines[33864]
    expect(data).to.equal('"20","長野県","ナガノケン","NAGANO KEN","20385","上伊那郡南箕輪村","カミイナグンミナミミノワムラ","KAMIINA GUN MINAMIMINOWA MURA","（大字なし）",,,,35.864863,137.960291')
  })

  // https://github.com/geolonia/japanese-addresses/issues/110
  it('ken_all.csv 由来の「(5115-5149、5171、5183、5186、」のような不要な文字列を削除する', () => {
    data = lines[34623]
    expect(data).to.equal('"29","奈良県","ナラケン","NARA KEN","29201","奈良市","ナラシ","NARA SHI","中町","ナカマチ","NAKAMACHI",,34.673048,135.747687')
  })

  // https://github.com/geolonia/japanese-addresses/issues/122
  it('東京都渋谷区千駄ヶ谷のローマ字データが欠損していない', () => {
    data = lines[27800]
    expect(data).to.equal('"13","東京都","トウキョウト","TOKYO TO","13113","渋谷区","シブヤク","SHIBUYA KU","千駄ケ谷一丁目","センダガヤ 1","SENDAGAYA 1",,35.679251,139.710893')
  })
})
