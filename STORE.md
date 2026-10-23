# Microsoft Edge Add-ons 申請資料

対象バージョン：1.0.3 ／ 公開者名：Yumoto ／ 確認日：2026年10月23日

操作手順は [PUBLISH.md](PUBLISH.md)、申請欄への転記用テキストは `store-assets/partner-center-inputs-ja.txt` を参照してください。

最終チェック結果と不具合修正は `FINAL-CHECK.md` を参照してください。

## 今回の申請用変更

- 日本語の名前・短い説明を `_locales/ja/messages.json` へ移し、`default_locale: ja` を設定しました。機能・権限は変更していません。
- ロケールをZIPに含め、生成前に依存ファイル・掲載画像・プライバシーポリシーの一致を検証します。
- GitHub Pagesへ配置できる `docs/privacy.html` と `.nojekyll` を生成します。
- プレビュー一覧で使う最終アクセス時刻の扱いをポリシーへ明記しました。

## 申請前に残っていること

1. 会社のSPO環境で動作を確認する。下の確認項目を参照。
2. GitHub Pages等で `docs/privacy.html` を公開し、認証不要で開けるHTTPS URLを取得する。
3. Partner Centerで開発者登録を完了し、実際の公開者情報を確認する。manifest.jsonのauthorは補助情報であり、Partner Centerの登録情報を変更するものではない。

サポート窓口の入力は公式の掲載項目では任意です。GitHubリポジトリを作ったら、そのIssuesページをサポートURLに設定することを推奨します。

## アップロードするもの

| 申請項目 | ファイル／設定 |
| --- | --- |
| 拡張機能パッケージ | `dist/tab-trim-1.0.3.zip` |
| 対象言語 | 日本語。現時点の画面・説明は日本語のみ |
| 名前 | Tab Trim — タブタイトルをすっきり |
| 短い説明 | `_locales/ja/messages.json` のextensionDescriptionから反映 |
| 詳細説明 | `store-assets/description-ja.txt`。761文字、規定の250〜10,000文字内 |
| ロゴ | `store-assets/logo-300.png`。300×300、PNG |
| スクリーンショット（任意） | `store-assets/screenshot-words-1280x800.png` と `screenshot-spaces-1280x800.png` |
| Privacy Policy URL | GitHub Pagesで公開したprivacy.htmlのHTTPS URL。ローカルファイルのパスは不可 |
| 審査用メモ | `store-assets/submission-notes-ja.txt` |
| サポート連絡先（任意） | 公開後に利用できるGitHub IssuesなどのURL |

スクリーンショットは実際の拡張機能画面をブラウザーの80%ズームで撮影したものです。架空の会社名を使い、社内サイト名・テナントURL・ログイン情報を含めていません。1280×800の規定サイズです。宣伝用タイルは任意なので、初回申請には追加していません。

## 目的の説明

ユーザーが登録した不要な文字列をタブのタイトルから自動で削除し、ページ名を識別しやすくする拡張機能です。設定とプレビュー、任意のURL条件はこの目的を支援します。

## 権限説明の入力文案

- HTTP/HTTPSサイトアクセス：ユーザーが登録した文字列を、アクセスを許可されたページのタイトルから自動で削除するため。対象URLを空欄にしたルールを全サイトへ適用する機能があるため、HTTP/HTTPSのホスト権限を必要とします。本文や入力フォームの内容は取得しません。
- storage：不要ワード、任意の対象URL、全体／ルール単位の有効・無効を、端末内に保存するため。
- scripting：インストール・更新時、すでに開かれているタブにもタイトル変更機能を適用するため。
- webNavigation：履歴APIによってURLだけが変更されるページ内遷移でも、任意のURL条件を再判定するため。

サイトのデータの読み取り・変更に関する権限表示が出る場合があります。設定を簡単にする現仕様で実際に使用する権限です。

## Privacy欄の入力方針

- リモートコード：使用なし。JavaScript・CSS・アイコンはすべてZIP内に含まれる。
- 外部送信・広告・アクセス解析・販売・第三者提供：なし。
- 実際の参照：開いているタブのタイトル・現在のURL等を端末内で処理する。最終アクセス時刻をプレビュー一覧の並べ替えに一時利用する。設定として登録したワードや対象URLはローカル保存する。閲覧履歴として記録しない。
- 「外部に送信しない」ことと「端末内でもタイトル・URLへ一切アクセスしない」ことは異なる。申請画面のデータ種類の定義に合わせ、実際のアクセス・利用を正確に申告する。
- 公開ポリシーと、拡張機能内のprivacy.htmlの内容を一致させる。今回の `store-assets/privacy.html` は同じ本文を使い、CSSを内蔵した公開用コピー。

## GitHub Pagesでのポリシー公開

今回のリモートは `https://github.com/03t1040c/edge-tab-rename.git`、ブランチはmainです。今回の変更をCommit・Pushした後、GitHubのSettings → PagesでDeploy from a branch、main、/docsを選びます。詳細は `PUBLISH.md` の手順2を参照してください。

既定ドメインでの予定URLは `https://03t1040c.github.io/edge-tab-rename/privacy.html` です。公開できたことは未確認です。Pages設定に表示された実際のURLを使い、認証なしで本文が開くことを確認してから申請欄へ入力してください。

`store-assets/privacy.html` と `docs/privacy.html` は、拡張機能内と同じ本文を使い、CSSを内蔵したコピーです。別の公開用リポジトリへHTMLだけを配置することもできます。

## 会社で確認する項目

- 不要ワード登録直後に、すでに開いているSPOタブも短くなる。
- 再読み込み、サイト内の別ページへの移動、戻る／進むでページ名が正しく変わる。
- 数分作業しても、長いサイト名に戻ったままにならない。
- 任意のURL条件を付けたルールが、対象外のサイトやパスに適用されない。
- 全体／個別停止・ルール削除で元タイトルへ戻る。
- Edge再起動後も設定が残り、OSスリープ／復帰後も動く。
- 普段のタブ数で体感の遅延がなく、Edgeのタスクマネージャーで継続的なCPU使用が発生しない。

## 公式資料

- [公開手順・掲載画像の仕様](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- [開発者ポリシー](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)
- [開発者登録](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)

現時点では未申請です。
