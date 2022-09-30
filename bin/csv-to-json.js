#!/usr/bin/env node
const fs = require('fs')
const csvParse = require('csv-parse/lib/sync')

const csvFile = process.argv[2]
const reference = process.argv[3]
const buffer = fs.readFileSync(csvFile)

const formatDate = date => {
  const year = date.getFullYear();
  const month = ('00' + (date.getMonth() + 1)).slice(-2)
  const day = ('00' + date.getDate()).slice(-2)
  return `${year}/${month}/${day}`
}

const csvData = csvParse(buffer, {
  columns: [
    '都道府県コード',
    '都道府県名',
    '都道府県名カナ',
    '都道府県名ローマ字',
    '市区町村コード',
    '市区町村名',
    '市区町村名カナ',
    '市区町村名ローマ字',
    '大字町丁目名',
    '大字町丁目名カナ',
    '大字町丁目名ローマ字',
    '小字・通称名',
    '緯度',
    '経度',
  ],
})
const additions = { 参照: reference, 更新日: formatDate(new Date()) }
const json = JSON.stringify(
  csvData.map(data => { return { ...data, ...additions } }), null, 2,
)
console.log(json)
