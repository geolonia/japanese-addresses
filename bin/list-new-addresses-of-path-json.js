#!/usr/bin/env node
const fs = require("fs");

const patchFile = process.argv[2] || 'patches/patch.json';

const addresses = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

addresses.forEach((address) => {
  console.log(`${address["都道府県名"]}${address["市区町村名"]}${address["大字町丁目名"]}`);
});
