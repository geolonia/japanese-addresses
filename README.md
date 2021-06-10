# Geolonia 住所データ

全国の町丁目レベル（190,165件）の住所データをオープンデータとして公開いたします。

本データは、国土交通省位置参照情報ダウンロードサービスで配布されている「大字・町丁目レベル位置参照情報」をベースとしていますが、「大字・町丁目レベル位置参照情報」データは年に一回更新であるのに対して、本リポジトリで配布するデータは毎月更新しています。

[ダウンロード](https://raw.githubusercontent.com/geolonia/japanese-addresses/master/data/latest_v2.csv)

## 住所データ仕様

### ファイルフォーマット

CSV

### 列

* 都道府県コード
* 都道府県名
* 都道府県名カナ
* 都道府県名ローマ字
* 市区町村コード
* 市区町村名
* 市区町村名カナ
* 市区町村名ローマ字
* 大字町丁目コード
* 大字町丁目名
* 緯度（代表点）
* 経度（代表点）

## API

このデータを使用した API をご提供しています。

### 都道府県 - 市町村エンドポイント

```
https://geolonia.github.io/japanese-addresses/api/ja.json
```

例: [https://geolonia.github.io/japanese-addresses/api/ja.json](https://geolonia.github.io/japanese-addresses/api/ja.json)

```
{
  "北海道": [
    "札幌市中央区",
    "札幌市北区",
    "札幌市東区",
    ...
  ],
  "青森県": [
    "青森市",
    "弘前市",
    "八戸市",
    ...
  ],
  "岩手県": [
    "盛岡市",
    "宮古市",
    "大船渡市",
    ...
  ],
```

### 町丁目エンドポイント

```
https://geolonia.github.io/japanese-addresses/api/ja/<都道府県名>/<市区町村名>.json
```

※ 都道府県名及び市区町村名は URL エンコードを行ってください。

例: [https://geolonia.github.io/japanese-addresses/api/ja/%E5%8C%97%E6%B5%B7%E9%81%93/%E6%9C%AD%E5%B9%8C%E5%B8%82%E4%B8%AD%E5%A4%AE%E5%8C%BA.json](https://geolonia.github.io/japanese-addresses/api/ja/%E5%8C%97%E6%B5%B7%E9%81%93/%E6%9C%AD%E5%B9%8C%E5%B8%82%E4%B8%AD%E5%A4%AE%E5%8C%BA.json)

```
[
  "旭ケ丘一丁目",
  "旭ケ丘二丁目",
  "旭ケ丘三丁目",
  "旭ケ丘四丁目",
  "旭ケ丘五丁目",
  "旭ケ丘六丁目",
  "大通西十丁目",
  "大通西十一丁目",
  ...
  ...
]
```

### 小字まで含んだ住所の代表点（緯度、経度）の決め方

「長野県長野市篠ノ井塩崎長谷」のように小字まで含んだ住所については、街区レベル位置参照情報より、その住所に属する街区の緯度、経度を複数取得できるので、以下の方法で代表点を決め、その緯度と経度をAPIで返すようにしています。

例えばA、B、Cの3点が「長野県長野市篠ノ井塩崎長谷」に属する街区だとして、A、B、Cを囲む一番小さな長方形（バウンディングボックス）を作り、その中心を求めます。次にA、B、Cの中からその長方形の中心に最も近い点を選びます。たとえばそれがCだとすると、「長野県長野市篠ノ井塩崎長谷」の代表点はCと決め、その緯度、経度を返すようにしています。

上記方法をとることで、下図のような三日月や飛び地の地形でうまく代表点を決められない問題に対応している。

![三日月問題](images/crescent.jpg)

![飛び地問題](images/enclave.jpg)

### 注意

* 町丁目エンドポイントは、すべての地名を網羅しているわけではありません。


## 出典

本データは、以下のデータを元に、毎月 Geolonia にて更新作業を行っています。

* [国土交通省位置参照情報ダウンロードサイト](https://nlftp.mlit.go.jp/cgi-bin/isj/dls/_choose_method.cgi)
* [郵便番号データダウンロード - 日本郵便](https://www.post.japanpost.jp/zipcode/download.html)

## 貢献方法

* 本データに不具合がある場合には、[Issue](https://github.com/geolonia/japanese-addresses/issues) または[プルリクエスト](https://github.com/geolonia/japanese-addresses/pulls)にてご報告ください。

## スポンサー

* [一般社団法人 不動産テック協会](https://retechjapan.org/)

## 関連情報

* [【プレスリリース】不動産テック協会、Geolonia と共同で不動産情報の共通 ID 付与の取り組みを開始](https://retechjapan.org/news/archives/pressrelease-20200731/)
* [【プレスリリース】日本全国の住所マスターデータをオープンデータとして無料公開](https://geolonia.com/pressrelease/2020/08/05/japanese-addresses.html)

## ライセンス

Geolonia 住所データのライセンスは以下のとおりです。

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)

注: リポジトリに同梱されているデータ生成用のスクリプトのライセンスは MIT ライセンスとします。
