---
lab: 03
title: Web サーバーの構築
---

## 推定時間：30分

## タスク 1 - nginx をインストールする

1. Lab02 で接続した PowerShell の SSH セッションで、以下のコマンドを実行し、パッケージ一覧を最新化します。

    ```bash
    sudo apt update
    ```

2. 実行結果として、パッケージの取得ログが流れ、最後に以下のようなメッセージが表示されることを確認します。

    ```
    Reading package lists... Done
    Building dependency tree... Done
    Reading state information... Done
    44 packages can be upgraded. Run 'apt list --upgradable' to see them.
    ```

    ![apt update実行結果](./media/lab03-01.png)

3. 続けて、以下のコマンドを実行し、nginx をインストールします。

    ```bash
    sudo apt install nginx -y
    ```

4. インストールログが流れ、`azureuser@vm-intern-YYMMDD-NN:~$` のプロンプトに戻れば完了です。

    ![nginxインストール完了](./media/lab03-02.png)

    > 注：`-y` を付けることで、途中の確認メッセージ（Y/n）を省略できます。

5. 以下のコマンドで、nginx が起動していることを確認します。

    ```bash
    sudo systemctl status nginx
    ```

6. `Active: active (running)` と緑色で表示されていれば、正常に起動しています。

    ![nginx起動確認](./media/lab03-03.png)

    > 注：確認が終わったら `q` キーを押すと、コマンドの入力画面に戻ります。

7. Web ブラウザを開き、アドレス バーに `http://<VMのパブリックIPアドレス>` と入力してアクセスします。

    ![ブラウザでアクセス](./media/lab03-04.png)

8. 「Welcome to nginx!」という画面が表示されれば、Web サーバーが正常に動作しています。

    ![nginx初期ページ](./media/lab03-05.png)

    > 注：「保護されていない通信」という警告が表示されますが、これは HTTPS（暗号化通信）を設定していないためです。本研修では問題ありません。

## タスク 2 - サイトファイルを差し替える

1. 既定の公開フォルダに移動します。

    ```bash
    cd /var/www/html
    ```

    ![ディレクトリ移動](./media/lab03-06.png)

2. フォルダの中身を確認します。

    ```bash
    ls -la
    ```

3. 既定のページ `index.nginx-debian.html` が置かれていることを確認します。

    ![フォルダの中身確認](./media/lab03-07.png)

    | ファイル名 | サイズ |
    |---|---|
    | index.nginx-debian.html | 615 バイト |

4. 既定のページをバックアップとして退避します。

    ```bash
    sudo mv index.nginx-debian.html index.nginx-debian.html.bak
    ```

    ![既定ページの退避](./media/lab03-08.png)

    > 注：ファイル名を変更するコマンドです。削除ではなく、`.bak`という拡張子を付けて名前を変えているだけなので、元に戻したい場合はいつでも復元できます。

5. 新しいサイトのファイルを作成します。

    ```bash
    sudo nano index.html
    ```

6. ターミナル上のテキストエディタ「nano」が開きます。

    ![nano起動画面](./media/lab03-09.png)

7. 以下のサンプル HTML を貼り付けます（動作確認用のサンプルサイトです。実際の研修では、Day4 で学生自身が生成AIで作成したサイトに差し替えます）。

    ```html
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>Contoso Industries Japan</title>
    </head>
    <body>
      <h1>Contoso Industries Japan</h1>
      <p>このページは、自分の VM に公開した動作確認用サンプルサイトです。</p>
    </body>
    </html>
    ```

8. HTMLの内容を貼り付けたら、`Ctrl + O` を押して保存し、続けて `Enter` を押してファイル名を確定します。

9. `Ctrl + X` を押して、nano を終了します。

10. ファイルの権限を確認・設定します。

    ```bash
    sudo chmod 644 index.html
    ```

    ![権限設定](./media/lab03-10.png)

    > 注：nginx がこのファイルを正しく読み込めるようにするための設定です。

11. Web ブラウザで `http://<VMのパブリックIPアドレス>/` に再度アクセスし、「Contoso Industries Japan」のページが表示されることを確認します。

    ![サンプルサイト表示確認](./media/lab03-11.png)

これでタスク1・2（nginx導入、テスト用サイトの表示確認）は完成です。

## タスク 3 - サンプルチャットサイトを配置する

タスク2で作成したテスト用ページを、実際に AI と会話できるチャットサイトのひな形に差し替えます。

1. ホームディレクトリで、GitHub リポジトリからサンプルサイト一式を取得します。

    ```bash
    cd ~
    git clone https://github.com/ctct-edu/ContosoIndustriesJapan.git
    ```

    > 注：`git` が入っていない場合は、`sudo apt install git -y` を先に実行してください（Ubuntu 24.04 には標準で入っていることがほとんどです）。このリポジトリには演習手順とサンプルサイトの両方が入っていますが、VM に配置するのは `sampleChatbotSite` フォルダーの中身だけです。

2. `sampleChatbotSite` フォルダーの中身を、nginx の公開フォルダにコピーします。

    ```bash
    sudo cp -r ~/ContosoIndustriesJapan/sampleChatbotSite/* /var/www/html/
    ```

    > 注：タスク2で作成したテスト用の `index.html` は、このコピーで上書きされます。

3. Web ブラウザで `http://<VMのパブリックIPアドレス>/` に再度アクセスし、Ctrl + F5（スーパーリロード）で画面を更新します。

4. 画面上部に赤い帯で「config.js の設定が済んでいません。次の項目を書き換えてください：ENDPOINT、DEPLOYMENT、API_KEY」という案内が表示され、メッセージの入力欄が無効化されていることを確認します。

    ![サンプルチャットサイトの初期表示](./media/lab03-12.png)

    > 注：これは正常な状態です。`config.js` に接続先を書き込んでいないため、あえてエラーを表示して知らせる仕組みが組み込まれています。実際に AI と会話できるようにする設定は、Lab04（AI Foundry の作成と接続）で行います。

これでLab03（タスク1〜3：nginx導入、テストページ表示確認、サンプルチャットサイトの配置）は完成です。

> 注：サンプルチャットサイトの構成ファイル（`index.html`／`style.css`／`config.js`／`app.js`）は、このリポジトリの `sampleChatbotSite` フォルダーで管理しています。`config.js` の2か所（`ENDPOINT`・`API_KEY`）を書き換えることで動作します。書き換え方法（置換コマンドを使用）と、ブラウザから AI Foundry への直接アクセスに問題がないこと（CORSの制約を受けないこと）は、Lab04 で実機確認済みです。
