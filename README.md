# Geolonia 住所データ

全国の町丁目レベル（189,540件）の住所データをオープンデータとして公開いたします。

本データは、国土交通省国土数値情報ダウンロードサービスで配布されている「大字・町丁目レベル位置参照情報」をベースとしていますが、「大字・町丁目レベル位置参照情報」データは年に一回更新であるのに対して、本リポジトリで配布するデータは毎月更新しています。

[ダウンロード](./data/latest.csv)

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
* 緯度
* 経度

## 出展

本データは、以下のデータを元に、毎月 Geolonia にて更新作業を行っています。

* [国土交通省国土数値情報ダウンロードサイト](https://nlftp.mlit.go.jp/cgi-bin/isj/dls/_choose_method.cgi)
* [郵便番号データダウンロード - 日本郵便](https://www.post.japanpost.jp/zipcode/download.html)

## 貢献方法

* 本データに不具合がある場合には、[Issue](https://github.com/geolonia/japanese-addresses/issues) または[プルリクエスト](https://github.com/geolonia/japanese-addresses/pulls)にてご報告ください。

## スポンサー

* [一般社団法人 不動産テック協会](https://retechjapan.org/)

## ライセンス

Geolonia 住所データのライセンスは以下のとおりです。

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ja)

注: リポジトリに同梱されているデータ生成用のスクリプトのライセンスは MIT ライセンスとします。
