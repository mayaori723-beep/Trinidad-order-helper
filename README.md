# メーカー発注フォーム自動入力アプリ

`placing_plans` の発注予定数を、メーカーCSV `gy_product` の `数量` 列へ自動反映するブラウザアプリです。

## できること

- `placing_plans` の `JANコード` と `発注予定数` を読む
- `gy_product` の `JANCODE` と一致した行の `数量` を更新する
- 更新済みCSVをブラウザからダウンロードする
- 一致しなかったJANや、今回更新対象外だったメーカー行のレポートを作る

## 使い方

1. [`index.html`](/Users/misumimaya/Desktop/trinidad発注アプリ/index.html) をブラウザで開く
2. 画面で以下を選択

   - 毎回: 弊社発注リストCSV
   - 初回だけ: メーカー発注フォームCSV

3. `数量を反映する` を押す
4. 出てきたダウンロードボタンから保存する

## 出力ファイル

- 更新済みCSV: `gy_product..._filled_日時.csv`
- レポート: `gy_product..._report_日時.txt`

## 現在の照合ルール

- `placing_plans` の `JANコード`
- `gy_product` の `JANCODE`

JANが一致した場合のみ `数量` を上書きします。

## 補足

- メーカーCSVはブラウザの `localStorage` に保存されるため、次回から再選択不要です。
- メーカーCSVを差し替えたい時だけ、画面から選び直してください。
- CSVは `Shift_JIS/CP932` を優先して読み込み、必要に応じて `UTF-8` も試します。
- 出力CSVはブラウザから `UTF-8` でダウンロードされます。
- 元のメーカーCSVは直接上書きせず、別名で保存します。

## 公開したい場合

`[PUBLISH_GITHUB_PAGES.md](/Users/misumimaya/Desktop/trinidad発注アプリ/PUBLISH_GITHUB_PAGES.md)` に GitHub Pages で公開する手順をまとめています。
