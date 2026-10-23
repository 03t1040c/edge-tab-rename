# Microsoft Edge Add-onsへの登録手順

対象：Tab Trim 1.0.3 ／ 公開者名：Yumoto ／ 更新日：2026年10月23日

## 1. 今回の変更をGitHubへ反映する

GitHub DesktopのCurrent repositoryで `edge-tab-rename` を選びます。Summaryに「ストア申請用に日本語情報と公開ポリシーを整備」などと入力し、Commit to main → Push originを実行します。

今回の準備では、ローカルファイルの変更とZIP作成までを実施しています。GitHubへのpushや公開設定、Partner Centerへの送信は実施していません。

## 2. プライバシーポリシーの公開URLを用意する

このリポジトリでGitHub Pagesを使う場合：

1. [GitHubのリポジトリ](https://github.com/03t1040c/edge-tab-rename)を開く。
2. Settings → Pagesを開く。
3. Build and deployment → Sourceで「Deploy from a branch」を選ぶ。
4. Branchを `main`、フォルダを `/docs` にしてSaveを押す。
5. ActionsまたはPages設定画面で、公開処理の完了を確認する。
6. Pages画面に表示されたサイトURLの末尾へ `privacy.html` を付け、プライバシーポリシーが表示されることを確認する。

既定ドメインの場合の予定URL：`https://03t1040c.github.io/edge-tab-rename/privacy.html`

このURLの公開完了は未確認です。カスタムドメイン等がある場合は、Pages設定に表示された実際のURLを使ってください。認証が不要なウィンドウでも本文を表示できることを確認してから、申請欄へ入力します。

GitHub Freeでは公開リポジトリでPagesを使用できます。現在のリポジトリを非公開にしておきたい場合、プライバシーポリシー公開用の別の公開リポジトリを作り、`docs/privacy.html` だけを置く方法もあります。その場合は、別リポジトリの実際の公開URLを使います。

公開用HTMLは単独で表示でき、別途CSSやJavaScriptを配置する必要はありません。

## 3. Microsoft Edgeの開発者登録をする

1. [Partner CenterのMicrosoft Edge登録ページ](https://partner.microsoft.com/dashboard/microsoftedge/public/login)を開く。
2. 個人のMicrosoftアカウント（MSA）でサインインする。会社・学校のアカウント単独での新規登録はサポートされていません。
3. 登録フォームが出ない場合、Account settings → Programs → Microsoft Edge → Get startedを開く。
4. 居住地または事業所在地の国／地域を選ぶ。個人としての公開ならIndividual、法人としての公開ならCompanyを選ぶ。国／地域と個人・法人の区分は登録後に変更できません。
5. Publisher display nameへ「Yumoto」を入力する。利用可能かどうかは登録画面で確認する。法人アカウントの場合は登録済みの事業者名が必要です。
6. 自分の連絡先情報を入力し、開発者契約を確認して登録を完了する。
7. 確認メールや、求められた登録確認に対応する。

Microsoft Edgeプログラムへの拡張機能登録料は無料です。すでに登録済みならこの手順は不要です。manifest.jsonのauthorはPartner Centerのアカウント登録を代行するものではありません。

## 4. 新しい拡張機能とパッケージを登録する

1. Partner CenterのWorkspacesからMicrosoft Edgeを開く。
2. 「Create new extension」を選ぶ。
3. `dist/tab-trim-1.0.3.zip` をアップロードする。ZIPをさらに別のフォルダに包み直す必要はありません。
4. パッケージの検証が完了したらContinueを押す。

以前の1.0.0／1.0.1／1.0.2のZIPは提出せず、今回の1.0.3を使用します。日本語の名前と説明は `_locales/ja/messages.json` から反映されます。

## 5. AvailabilityとPropertiesを入力する

- Visibility：一般公開する場合はPublic。Hiddenは検索に出ず、掲載URLで案内する配布方式です。
- Markets：配布したい国／地域を選ぶ。初回を日本に限定することもできます。
- Category：仕事効率化やタブ整理に合うカテゴリを選ぶ。
- Website：任意。現時点でアクセス可能な紹介ページがなければ空欄で構いません。
- Support contact detail：任意。利用可能になったGitHub IssuesのURL等を指定できます。
- Mature content：本拡張機能の画像・説明・機能には成人向けコンテンツはありません。

## 6. Privacyを入力する

`STORE.md` または `store-assets/partner-center-inputs-ja.txt` から、次を転記します。

- Single Purpose：不要な文字列をタブタイトルから削除する目的の説明。
- Permission justification：storage、scripting、webNavigation、HTTP/HTTPSのホストアクセスそれぞれの用途。
- Remote code：使用なし（No, I am not using remote code）。
- Data usage：タイトル・現在のURL等を端末内で参照し、登録した設定だけをローカル保存する。外部送信、広告、アクセス解析、第三者提供はしない。
- Privacy Policy URL：手順2で表示を確認した、実際の公開URL。

データ種類のチェック欄は、申請画面に示される定義に合わせて選びます。「外部送信しない」ことを理由に「タイトル・URLへ一切アクセスしない」とは申告しないでください。端末内での参照・保存も対象に含む定義の場合は、その実態を申告します。

## 7. Store listingsを入力する

日本語の掲載情報を開き、次を設定します。

| 入力欄 | 使用するファイル／内容 |
| --- | --- |
| 名前・短い説明 | パッケージから反映される日本語を確認 |
| Description | `store-assets/description-ja.txt` の全文 |
| Extension logo | `store-assets/logo-300.png` |
| Screenshots（任意） | `store-assets/screenshot-words-1280x800.png` と `store-assets/screenshot-spaces-1280x800.png` |
| Search terms（任意） | タブタイトル、タイトル短縮、不要ワード、SharePoint、タブ整理 |

説明は761文字で、現在の規定の250〜10,000文字内です。ロゴは300×300、スクリーンショットは各1280×800です。宣伝用タイルと動画は任意なので、用意しなくても申請できます。対応していない言語の掲載情報は追加する必要がありません。

保存し、必要な項目がCompleteになっていることを確認します。

## 8. 審査へ提出する

1. PublishからSubmit your extension画面へ進む。
2. Notes for certificationへ `store-assets/submission-notes-ja.txt` の全文を貼り付ける。
3. 公開範囲、説明、プライバシーポリシーのURL、提出バージョンを確認する。
4. 最終のPublishを押して審査へ提出する。

Microsoftの案内では審査に最大7営業日かかる場合があります。審査通過後、公開状態はIn the Storeになります。差し戻しがあった場合は、指摘内容に応じて修正し、パッケージを更新する場合はバージョン番号を上げて再提出します。

## 公式資料

- [開発者登録・アカウント区分・登録料](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account)
- [申請画面・画像仕様・審査](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- [開発者ポリシー](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)
- [GitHub Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
