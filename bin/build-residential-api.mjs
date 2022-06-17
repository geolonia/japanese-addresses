#!/usr/bin/env node

import fs from 'fs/promises'
import unzip from 'unzipper'
import csvParse from 'csv-parse/lib/sync.js'
import { normalize, config } from '@geolonia/normalize-japanese-addresses'
import process from 'process'
import child_process from 'child_process'
import os from 'os'
import cluster from 'cluster'

config.japaneseAddressesApi = `file://${process.cwd()}/api/ja`

const csvDir = 'data/base-registry/mt_rsdtdsp_rsdt/city'
const csvPosDir = 'data/base-registry/mt_rsdtdsp_rsdt_pos/city'

let city2prefMap = undefined
const city2pref = async (city) => {
  if(!city2prefMap) {
    city2prefMap = {}
    const ja = JSON.parse(await fs.readFile('api/ja.json'))
    for (const pref in ja) {
      const cities = ja[pref];
      for (const city of cities) {
        city2prefMap[city] = pref
      }
    }
  }
  return city2prefMap[city]
}

/**
 *
 * @param {unzip.File} file
 */
const file2jyukyoCityTree = async (file, posFile) => {
  const [buffer, posBuffer] = await Promise.all([file.buffer(), posFile.buffer()])
  const items = csvParse(buffer, { columns: true, skip_empty_lines: true })
  const posItems = csvParse(posBuffer, { columns: true, skip_empty_lines: true })

  const posMap = new Map()
  for (const posItem of posItems) {
    if(posItem.代表点_座標参照系 !== 'EPSG:6668') {
      throw new Error('Unexpected CRS.')
    }
    const key = [posItem.全国地方公共団体コード, posItem.町字id, posItem.街区id, posItem.住居id, posItem.住居2id].join('/')
    const { 代表点_経度: lat, 代表点_緯度: lng } = posItem
    posMap.set(key, { lat, lng })
  }

  const normalizedItems = []
  for (const item of items) {
    const _city = item.市区町村名 + item.政令市区名
    const _pref = await city2pref(_city)
    const _town = item['大字・町名'] + item.丁目名

    const key = [item.全国地方公共団体コード, item.町字id, item.街区id, item.住居id, item.住居2id].join('/')
    const { lat = null, lng = null } = posMap.get(key) || {}

    const { pref, city, town } = await normalize(`${_pref || ''}${_city}${_town}`)
    normalizedItems.push({...item, pref, city, town, gaiku: item.街区符号, jyukyo: item.住居番号, lat, lng })
  }

  const { pref, city } = normalizedItems[0]

  const tree = normalizedItems.reduce((prev, item) => {
    const { town, gaiku, jyukyo, lat, lng } = item
    if(!prev[town]) {
      prev[town] = []
    }
  prev[town].push({ gaiku, jyukyo, lat, lng })
    return prev
  }, {})
  return { tree, pref, city }
}

const extendAPIwithResidentialInfo = async (tree, { pref, city }) => {
  const cityDirname = `api/ja/${pref}/${city}`
  await fs.mkdir(cityDirname, { recursive: true })
  const cityList = JSON.parse(await fs.readFile(`api/ja/${pref}/${city}.json`))
  for (const town in tree) {
    if(!cityList.find((townItem) => townItem.town === town)) {
      console.log(town, cityList.length)
      console.warn(`Skipping unknown town name: ${pref}/${city}/${town}`)
    } else {
      const townDirname = `api/ja/${pref}/${city}/${town}`
      const residentialFilename = `${townDirname}/住居表示.json`
      const banchiGoItems = tree[town]

      await fs.mkdir(townDirname, { recursive: true })
      await fs.writeFile(residentialFilename, JSON.stringify(banchiGoItems))
    }
  }
  await fs.writeFile(`api/ja/${pref}/${city}.json`, JSON.stringify(cityList.map(town => {
    if(tree[town.town]) {
      return { ...town, residential: true }
    } else {
      return town
    }
  })))
}

const main = async () => {
  console.time('all')
  const filenames = await fs.readdir(csvDir)

  const promises = []

  while (filenames.length > 0) {
    const filename = filenames.shift()
    if(!filename) continue;
    promises.push(new Promise((resolve) => {
      cluster
        .fork({ FILENAME: filename })
        .on('exit', resolve)
    }))
  }
  await Promise.all(promises)
  console.timeEnd('all')
}

const worker = async () => {
  const filename = process.env.FILENAME
  console.time(filename)
  const posFilename = filename.replace('mt_rsdtdsp_rsdt_', 'mt_rsdtdsp_rsdt_pos_')
  if(posFilename === filename) {
    throw new Error(`Position not found: ${filename}.`)
  }
  const { files: [csvFile] } = await unzip.Open.file(`${csvDir}/${filename}`);
  const { files: [csvPosFile] } = await unzip.Open.file(`${csvPosDir}/${posFilename}`);
  try {
    const { tree, pref, city } = await file2jyukyoCityTree(csvFile, csvPosFile)
    await extendAPIwithResidentialInfo(tree, { pref, city })
  } catch (error) {
    console.error(error)
  }
  console.timeEnd(filename)
  process.exit()
}

cluster.isWorker ? worker() : main()

