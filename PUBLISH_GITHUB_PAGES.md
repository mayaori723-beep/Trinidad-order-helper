# GitHub Pages 公開手順

このアプリは静的ファイルだけで動くため、GitHub Pages でそのまま公開できます。

公開後のURL例:

- `https://<github-user>.github.io/<repository-name>/`

## 1. GitHub に新しい公開リポジトリを作る

GitHub の公式クイックスタートでは、新規リポジトリを作成して Pages を有効化できます。  
参考:

- [Quickstart for GitHub Pages](https://docs.github.com/en/pages/quickstart)
- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

おすすめ設定:

- Repository name: `trinidad-order-helper`
- Visibility: `Public`

## 2. このフォルダの中身を GitHub にアップロード

アップロードする主なファイル:

- `index.html`
- `style.css`
- `app.js`
- `.nojekyll`

補足:

- `README.md` も一緒に上げて大丈夫です。
- `order_form_app.py` は旧デスクトップ版なので、公開用には不要です。
- `test_output` フォルダはアップロード不要です。

## 3. GitHub Pages を有効化

GitHub のリポジトリで以下を設定します。

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. `Source: Deploy from a branch`
5. `Branch: main`
6. `Folder: / (root)`
7. `Save`

反映には数分かかることがあります。

## 4. 公開後の使い方

- 利用者は公開URLを開く
- 初回だけメーカーCSVを選ぶ
- 以後は同じブラウザなら、弊社発注リストだけ毎回選べば使える

## 注意点

- メーカーCSVは各利用者のブラウザ `localStorage` に保存されます。
- つまり、保存内容は「共有」ではなく「各自のブラウザごと」です。
- 複数人で使う場合でも、最初の一回だけ各自がメーカーCSVを登録する必要があります。
