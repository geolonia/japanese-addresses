const fs = require("fs");
const parse = require("csv-parse");
const basePath = process.argv[2] && process.argv[2] === 'staging' ? `${__dirname}/../build/staging-api/ja` : `${__dirname}/../api/ja`;
const mkdirp = require("mkdirp");
const path = require('path');

const PATCHES_PATH = `${__dirname}/../patches`;

const main = async () => {
  mkdirp.sync(basePath);
  const content = fs.readFileSync(`${__dirname}/../data/latest.csv`, 'utf-8');

  let addresses = []
  let addressKeys = []

  const parser = parse(content, { delimiter: "," });

  parser.on("readable", () => {
    const header = parser.read();

    let record;
    while ((record = parser.read())) {
      const item = record.reduce((prev, item, index) => {
        prev[header[index]] = item;
        return prev;
      }, {});

      if (!addresses[item.都道府県名]) {
        addresses[item.都道府県名] = []
      }

      addresses.push(item)
      addressKeys.push(`${item.都道府県名}${item.市区町村名}${item.大字町丁目名}`)
    }
  });

  parser.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  parser.on("end", () => {

    // patches以下の住所情報を追加
    let patches = []
    fs.readdirSync(PATCHES_PATH).map(fileName => {
      patches = patches.concat(JSON.parse(fs.readFileSync(path.join(PATCHES_PATH, fileName), 'utf8')));
    })
    patches.forEach(patch => {
      if (!addressKeys.includes(`${patch.都道府県名}${patch.市区町村名}${patch.大字町丁目名}`)) {
        addresses.push(patch)
      }
    });

    // 都道府県名および市区町村名用のJSON
    const _prefJson = {}
    const prefJson = {}
    const townJson = {}
    for (let i = 0; i < addresses.length; i++) {
      const prefName = addresses[i].都道府県名
      const cityName = addresses[i].市区町村名
      const zip = addresses[i].郵便番号

      const dir = path.join(basePath, prefName)

      mkdirp.sync(dir)

      if (!_prefJson[prefName]) {
        _prefJson[prefName] = {}
        prefJson[prefName] = []
        townJson[prefName] = []
      }
      _prefJson[prefName][cityName] = 1
      prefJson[prefName] = Object.keys(_prefJson[prefName])

      if (!townJson[prefName][cityName]) {
        townJson[prefName][cityName] = []
      }
      townJson[prefName][cityName].push({
        town: addresses[i].大字町丁目名,
        koaza: addresses[i]['小字・通称名'],
        lat: addresses[i].緯度 ? Number(addresses[i].緯度) : null,
        lng: addresses[i].経度 ? Number(addresses[i].経度) : null,
        zip: zip || null,
      })

      fs.writeFileSync(`${basePath}/${prefName}/${cityName}.json`, JSON.stringify(townJson[prefName][cityName]));
    }

    fs.writeFileSync(`${basePath}.json`, JSON.stringify(prefJson));
  });
};

main();
