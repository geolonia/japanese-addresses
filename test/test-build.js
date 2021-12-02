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
    expect(data).to.equal('"20","長野県","ナガノケン","NAGANO KEN","20201","長野市","ナガノシ","NAGANO SHI","青木島二丁目","アオキジマ 2","AOKIJIMA 2",,36.617509,138.18148')
  })

  it('大字のローマ字を取得できる', () => {
    data = lines[152]
    expect(data).to.equal('"20","長野県","ナガノケン","NAGANO KEN","20201","長野市","ナガノシ","NAGANO SHI","篠ノ井塩崎","シノノイシオザキ","SHINONOI SHIOZAKI",,36.552969,138.109935')
  })

  // https://github.com/geolonia/japanese-addresses/issues/57
  it('緯度・経度は常に数値型', () => {
    data = lines[2245]
    expect(data).to.equal('"20","長野県","ナガノケン","NAGANO KEN","20201","長野市","ナガノシ","NAGANO SHI","篠ノ井塩崎","シノノイシオザキ","SHINONOI SHIOZAKI","四之宮",36.555444,138.10524')
  })
})
