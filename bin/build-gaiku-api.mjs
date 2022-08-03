#!/usr/bin/env node

import fs from 'fs/promises'
import csvParse from 'csv-parse/lib/sync.js'
import asyc from 'async'

const dataDirBase = `${process.cwd()}/data`
const apiDirBase = `${process.cwd()}/api/ja`

const main = async () => {
  const csv = await fs.readFile(`${dataDirBase}/latest_gaiku.csv`);

  const items = csvParse(csv, { columns: true, skip_empty_lines: true })

  const gaikuMap = items.reduce((prev, item) => {

    const {
      都道府県名: pref,
      市区町村名: city,
      大字町丁目名: town,
      街区番号: gaiku,
      緯度,
      経度,
    } = item
    const lat = parseFloat(緯度)
    const lng = parseFloat(経度)

    if(
      !pref ||
      !city ||
      !town ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      throw new Error(`Invalid`)
    }
    const key = `${pref}/${city}/${town}`
    if(!prev[key]) {
      prev[key] = {}
    }
    prev[key][gaiku] = { lat, lng }
    return prev
  }, {})

  for (const key in gaikuMap) {
    const gaikuDirname = `${apiDirBase}/${key}`
    await fs.mkdir(gaikuDirname, { recursive: true })
    const eachGaikuMap = gaikuMap[key]
    const gaikuFilename = `${gaikuDirname}.json`

    const gaikuItems = Object.keys(eachGaikuMap).map(gaiku => {
      const { lat, lng } = eachGaikuMap[gaiku]
      return {gaiku, lat, lng }
    })
    await fs.writeFile(gaikuFilename, JSON.stringify(gaikuItems))
  }
}

main()
