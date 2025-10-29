/**
 * 日報チャットボット
 * 会話フロー: 名前 → やったこと(最大5回) → 深堀り(各最大3回)
 */

// ========================================
// 設定
// ========================================

// 保存先スプレッドシートID
const SPREADSHEET_ID = '1CKngse7DuGj_vTaRc5l6lPNIWPyqpg-tFCdXbHgtaII';

// OpenAI APIキー（ChatGPT版を使う場合に設定）
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

// Slack Webhook URL（Slack通知を使う場合に設定）
// 設定方法: https://api.slack.com/messaging/webhooks で Incoming Webhook を作成
const SLACK_WEBHOOK_URL = 'YOUR_SLACK_WEBHOOK_URL_HERE';

// 使用するモード（false=従来版, true=ChatGPT版）
const USE_CHATGPT = true;

// Slack通知を有効にするかどうか
const ENABLE_SLACK_NOTIFICATION = true;

// ========================================
// ChatGPT用システムプロンプト
// ========================================

const SYSTEM_PROMPT = `あなたは優しくて話しやすい日報収集アシスタントです。
中学生と話すように、分かりやすく親しみやすい言葉で質問してください。

**会話の流れ：**
1. 最初に「お名前を教えてください😊」と聞く
2. 名前を聞いたら「今日は何をしましたか？」と聞いて、今日の1日を振り返ってもらう
3. 「今日やったこと」について聞く（最大3つまで）
   - 1つ目のことを聞く
   - そのことについて2〜3回深掘りする（「どんな感じだった？」「楽しかった？」など）
   - 「他に何かやったことはある？」と聞く
   - あれば2つ目も同じように深掘りする
   - 最大3つまで聞く
   - 「ない」と言われたら次へ
4. 「これからやること」を最大3回聞く
   - 「ない」と言われたらスキップ
5. 最後に「最後に一言お願いします！」と締める
6. **最後の一言をもらったら、その場で即座に励ましメッセージとJSONを1つの応答で返す（追加の確認やラリーは不要）**

**質問のスタイル：**
- 中学生にも分かる簡単な言葉を使う
- 優しく、励ますような口調で話す
- 「どんな感じだった？」「楽しかった？」「大変だった？」など身近な質問をする
- 深掘りは自然に、プレッシャーをかけずに
- 絵文字を適度に使ってフレンドリーに（😊 👍 など）
- 1つの質問は短く、シンプルに

**最初の質問例：**
- 「お名前を教えてください😊」

**2番目の質問例：**
- 「○○さん、今日は何をしましたか？😊」
- 「○○さん、今日の1日はどうでしたか？」
- 「○○さん、今日はどんなことがありましたか？」

**深掘りの例：**
- 「それ、どんな感じだった？」
- 「楽しかった？それとも大変だった？」
- 「何が一番印象に残ってる？」
- 「どうしてそれをやろうと思ったの？」
- 「やってみてどうだった？」
- 「そのとき、どんな気持ちだった？」
- 「もっと詳しく教えて！」

**深掘りのルール：**
- 1つのやったことについて、必ず2〜3回は深掘りする
- すぐに「他に何かある？」と聞かない
- 真髄に迫るような質問をする
- 感情や気持ちを引き出す質問をする
- 具体的な状況を聞く質問をする

**データ収集ルール：**
- 最初に必ず名前を聞く
- 名前を聞いた後、今日の1日全体について聞く
- やったことは最大3つまで聞く
- 各やったことについて2〜3回深掘りする
- これからやることは最大3つまで聞く
- ユーザーが「ない」「なし」「特にない」と答えたら、無理に聞かず次へ
- 最後は必ず「最後に一言お願いします！」で締める
- 最後の一言をもらったら、すぐに完了メッセージとJSONを返す
- 難しい言葉は使わない、中学生が普段使う言葉で話す

**完了時の応答形式：**
最後の一言をもらったら、**必ず1回の応答で**以下の形式で返してください：

ありがとう！[最後の一言の内容に応じた励ましや共感のメッセージ]！Slackに投稿します！

\`\`\`json
{
  "completed": true,
  "name": "名前",
  "whatDid": ["やったこと1", "やったこと2", "やったこと3"],
  "whatTodo": ["これからやること1", "これからやること2", "これからやること3"],
  "finalComment": "最後の一言"
}
\`\`\`

例：
- 最後の一言が「早起き頑張る」なら → 「ありがとう！早起き頑張ろうね！Slackに投稿します！」+ JSON
- 最後の一言が「お金がない」なら → 「ありがとう！バイト頑張ろうね！Slackに投稿します！」+ JSON
- 最後の一言が「疲れた」なら → 「ありがとう！ゆっくり休んでね！Slackに投稿します！」+ JSON
- 最後の一言が「暖房なしで頑張る」なら → 「ありがとう！暖房なしで頑張るんだね、でも無理しないでね！Slackに投稿します！」+ JSON

**重要：最後の一言を受け取ったら、追加の質問や確認は一切せず、励ましのメッセージとJSONを同時に返してください。ユーザーからの追加応答を待たないでください。**

**重要：**友達と話すような、リラックスした雰囲気で会話してください。`;

// ========================================
// 会話の状態を定義
// ========================================

const STATE = {
  ASK_NAME: 'ASK_NAME',                    // 名前を質問
  ASK_TASK: 'ASK_TASK',                    // やったことを質問
  ASK_TASK_MORE: 'ASK_TASK_MORE',          // 他にやったことはある?
  ASK_DETAIL: 'ASK_DETAIL',                // 深堀り質問
  DONE: 'DONE'                             // 完了
};

// ========================================
// エントリーポイント
// ========================================

/**
 * Webアプリとして公開する場合のエントリーポイント
 */
function doGet() {
  const html = HtmlService.createHtmlOutputFromFile('DailyReportChatWebApp')
    .setTitle('日報チャットボット');
  return html;
}

/**
 * 初回メッセージを取得
 */
function getInitialMessage() {
  clearAllData();

  if (USE_CHATGPT) {
    // ChatGPTから初回メッセージを取得（「開始」というメッセージで会話を始める）
    const response = chatWithOpenAI('開始');
    return response.message;
  } else {
    return 'こんにちは！日報作成をお手伝いします。今日やったことを教えてください。';
  }
}

/**
 * 日報チャットボットUIを開く（スプレッドシートのメニューから）
 */
function openDailyReportChatbot() {
  const html = HtmlService.createHtmlOutputFromFile('DailyReportChatWebApp')
    .setWidth(450)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, '日報チャットボット');
}

/**
 * スプレッドシートにメニューを追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('日報チャットボット')
    .addItem('チャットボットを開く', 'openDailyReportChatbot')
    .addItem('権限を付与', 'authorizeAPI')
    .addToUi();
}

/**
 * API権限を付与するための関数
 * この関数を一度実行すると、UrlFetchApp の使用権限が付与されます
 */
function authorizeAPI() {
  try {
    // ダミーのAPIリクエストを送信して権限を要求
    UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
    SpreadsheetApp.getUi().alert('権限が付与されました！\nチャットボットを使用できます。');
  } catch (e) {
    SpreadsheetApp.getUi().alert('権限の付与に失敗しました: ' + e.message);
  }
}

// ========================================
// メインの処理関数
// ========================================

/**
 * ユーザーのメッセージを処理
 * @param {string} userInput ユーザーからの入力テキスト
 * @return {string} チャットボットからの応答メッセージ
 */
function processDailyReportMessage(userInput) {
  if (USE_CHATGPT) {
    const result = chatWithOpenAI(userInput);
    return result.message || 'エラーが発生しました';
  } else {
    return processDailyReportMessageTraditional(userInput);
  }
}

// ========================================
// 従来版: ステートマシン方式
// ========================================

/**
 * 従来版: ユーザーのメッセージを処理
 * @param {string} userInput ユーザーからの入力テキスト
 * @return {string} チャットボットからの応答メッセージ
 */
function processDailyReportMessageTraditional(userInput) {
  try {
    const properties = PropertiesService.getUserProperties();
    let currentState = properties.getProperty('state');
    const reportData = JSON.parse(properties.getProperty('reportData') || '{}');

    // 初期化
    if (!reportData.tasks) reportData.tasks = [];
    if (!reportData.currentTaskIndex) reportData.currentTaskIndex = 0;
    if (!reportData.currentDetailCount) reportData.currentDetailCount = 0;

    let responseMessage = '';

    // 初回メッセージ
    if (!currentState) {
      currentState = STATE.ASK_NAME;
      properties.setProperty('state', currentState);
      return 'こんにちは！日報作成をお手伝いします。\n\nお名前を教えてください。';
    }

    switch (currentState) {
      case STATE.ASK_NAME:
        // 名前を記録
        reportData.name = userInput;
        currentState = STATE.ASK_TASK;
        properties.setProperty('state', currentState);
        responseMessage = userInput + 'さん、よろしくお願いします！\n\n今日やったことを教えてください。';
        break;

      case STATE.ASK_TASK:
        // やったことを記録
        reportData.tasks.push({
          task: userInput,
          details: []
        });
        reportData.currentTaskIndex = reportData.tasks.length - 1;
        reportData.currentDetailCount = 0;

        currentState = STATE.ASK_DETAIL;
        properties.setProperty('state', currentState);
        responseMessage = 'なるほど！「' + userInput + '」についてもう少し詳しく教えてください。';
        break;

      case STATE.ASK_DETAIL:
        // 深堀りの回答を記録
        const currentTask = reportData.tasks[reportData.currentTaskIndex];
        currentTask.details.push(userInput);
        reportData.currentDetailCount++;

        // 深堀りが3回に達したか、または「特にない」「ない」などの回答
        const isNegative = isNegativeAnswer(userInput);

        if (reportData.currentDetailCount >= 3 || isNegative) {
          // 次のタスクを聞くか、完了するか判断
          if (reportData.tasks.length >= 5) {
            // 5つのタスクが集まったので完了
            currentState = STATE.DONE;
            properties.setProperty('state', currentState);

            const saveResult = saveDailyReport(reportData);
            if (saveResult.success) {
              responseMessage = '日報の記録が完了しました！\n\nお疲れさまでした！';
            } else {
              responseMessage = '日報の保存中にエラーが発生しました: ' + saveResult.error;
            }
          } else {
            // 次のタスクを聞く
            currentState = STATE.ASK_TASK_MORE;
            properties.setProperty('state', currentState);
            responseMessage = 'ありがとうございます！\n\n他にやったことはありますか？';
          }
        } else {
          // まだ深堀りを続ける
          const detailQuestions = [
            'それについてもう少し詳しく教えてください。',
            'どんな工夫をしましたか？',
            '何か苦労した点はありましたか？'
          ];
          responseMessage = detailQuestions[reportData.currentDetailCount - 1] || 'もう少し詳しく教えてください。';
        }
        break;

      case STATE.ASK_TASK_MORE:
        const isNo = isNegativeAnswer(userInput);

        if (isNo) {
          // これ以上ないので完了
          currentState = STATE.DONE;
          properties.setProperty('state', currentState);

          const saveResult = saveDailyReport(reportData);
          if (saveResult.success) {
            responseMessage = '日報の記録が完了しました！\n\nお疲れさまでした！';
          } else {
            responseMessage = '日報の保存中にエラーが発生しました: ' + saveResult.error;
          }
        } else {
          // 新しいタスクを記録
          reportData.tasks.push({
            task: userInput,
            details: []
          });
          reportData.currentTaskIndex = reportData.tasks.length - 1;
          reportData.currentDetailCount = 0;

          currentState = STATE.ASK_DETAIL;
          properties.setProperty('state', currentState);
          responseMessage = 'なるほど！「' + userInput + '」についてもう少し詳しく教えてください。';
        }
        break;

      case STATE.DONE:
        responseMessage = '日報は既に完了しています。\n\n新しい日報を作成する場合は、チャットボットを開き直してください。';
        break;
    }

    properties.setProperty('reportData', JSON.stringify(reportData));
    return responseMessage;

  } catch (e) {
    Logger.log('Error: ' + e.toString());
    return 'エラーが発生しました: ' + e.message;
  }
}

/**
 * 否定的な回答かどうかを判定する
 * @param {string} answer ユーザーの回答
 * @return {boolean} 否定的な回答の場合true
 */
function isNegativeAnswer(answer) {
  const negativePatterns = [
    'ない',
    'なし',
    '特にない',
    '特になし',
    'ありません',
    'いいえ',
    'no',
    'ないです'
  ];

  const lowerAnswer = answer.toLowerCase().trim();

  return negativePatterns.some(pattern =>
    lowerAnswer.includes(pattern) || lowerAnswer === pattern
  );
}

// ========================================
// ChatGPT版: OpenAI API連携
// ========================================

/**
 * OpenAI APIを呼び出してChatGPTと会話する
 * @param {string} userMessage ユーザーからのメッセージ
 * @return {object} {message: string, completed: boolean}
 */
function chatWithOpenAI(userMessage) {
  try {
    if (OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
      return {
        message: 'エラー: OpenAI APIキーが設定されていません。',
        completed: false
      };
    }

    const properties = PropertiesService.getUserProperties();
    let chatHistory = JSON.parse(properties.getProperty('chatHistory') || '[]');

    if (chatHistory.length === 0) {
      chatHistory.push({
        role: 'system',
        content: SYSTEM_PROMPT
      });
    }

    chatHistory.push({
      role: 'user',
      content: userMessage
    });

    const response = UrlFetchApp.fetch(OPENAI_API_URL, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_API_KEY
      },
      payload: JSON.stringify({
        model: MODEL,
        messages: chatHistory,
        temperature: 0.7,
        max_tokens: 500
      }),
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      Logger.log('OpenAI API Error: ' + responseText);
      return {
        message: 'OpenAI APIエラーが発生しました',
        completed: false
      };
    }

    const jsonResponse = JSON.parse(responseText);
    const assistantMessage = jsonResponse.choices[0].message.content;

    chatHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    properties.setProperty('chatHistory', JSON.stringify(chatHistory));

    // JSON形式のデータが含まれているかチェック
    const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/);
    let displayMessage = assistantMessage;

    if (jsonMatch) {
      try {
        const reportData = JSON.parse(jsonMatch[1]);
        displayMessage = assistantMessage.replace(/```json\n[\s\S]*?\n```/g, '').trim();

        if (reportData.completed) {
          // スプレッドシートに保存（ユーザーへの通知なし）
          saveDailyReportFromChatGPT(reportData);
        }
      } catch (e) {
        Logger.log('JSON parse error: ' + e.toString());
      }
    }

    return {
      message: displayMessage,
      completed: false
    };

  } catch (e) {
    Logger.log('Error in chatWithOpenAI: ' + e.toString());
    return {
      message: 'エラーが発生しました: ' + e.message,
      completed: false
    };
  }
}

/**
 * ChatGPTから収集したデータをスプレッドシートに保存する
 * @param {object} reportData 日報データ
 * @return {object} 保存結果
 */
function saveDailyReportFromChatGPT(reportData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('日報');

    if (!sheet) {
      sheet = ss.insertSheet('日報');
      // ヘッダー行を設定（D列にSlack表示内容、E列以降にQ&Aペア：最大20個）
      const headers = ['日付', '時刻', '名前', 'Slack表示内容'];
      for (let i = 1; i <= 20; i++) {
        headers.push(`Q&A${i}`);
      }
      sheet.appendRow(headers);

      // ヘッダー行を太字にして色を付ける
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a86e8');
      headerRange.setFontColor('#ffffff');
      headerRange.setHorizontalAlignment('center');
      headerRange.setVerticalAlignment('middle');

      // ヘッダー行の高さを調整
      sheet.setRowHeight(1, 40);

      // 列幅を調整
      sheet.setColumnWidth(1, 110);  // 日付
      sheet.setColumnWidth(2, 90);   // 時刻
      sheet.setColumnWidth(3, 120);  // 名前
      sheet.setColumnWidth(4, 350);  // Slack表示内容
      for (let i = 5; i <= 24; i++) {
        sheet.setColumnWidth(i, 400); // Q&A列
      }

      // シート全体のフォントサイズとスタイルを設定
      const allRange = sheet.getRange(1, 1, 1000, headers.length);
      allRange.setFontFamily('Arial');
      allRange.setFontSize(11);

      // 枠線を追加
      headerRange.setBorder(true, true, true, true, true, true, '#ffffff', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

      // シートを固定（ヘッダー行）
      sheet.setFrozenRows(1);
    }

    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, 'JST', 'HH:mm:ss');
    const name = reportData.name || '';

    // Slack表示用の内容を作成
    const slackContent = createSlackContent(reportData);

    // 会話履歴を取得してQ&Aペアを作成
    const properties = PropertiesService.getUserProperties();
    const chatHistory = JSON.parse(properties.getProperty('chatHistory') || '[]');

    // Q&Aペアを抽出
    const qaPairs = [];
    let currentQ = '';

    for (let i = 0; i < chatHistory.length; i++) {
      const message = chatHistory[i];
      if (message.role === 'system') continue;

      if (message.role === 'assistant') {
        currentQ = message.content;
      } else if (message.role === 'user' && currentQ) {
        // 「開始」は除外
        if (message.content !== '開始') {
          qaPairs.push(`Q: ${currentQ}\nA: ${message.content}`);
        }
        currentQ = '';
      }
    }

    // 行データを作成
    const rowData = [
      dateStr,
      timeStr,
      name,
      slackContent
    ];

    // Q&Aペアを追加（最大20個）
    for (let i = 0; i < 20; i++) {
      rowData.push(qaPairs[i] || '');
    }

    sheet.appendRow(rowData);

    // 追加した行にテキストの折り返しと見やすいフォーマットを設定
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(lastRow, 1, 1, rowData.length);

    // テキストの折り返しと配置
    dataRange.setWrap(true);
    dataRange.setVerticalAlignment('top');

    // 行の高さを自動調整（最低100px）
    sheet.setRowHeight(lastRow, 100);

    // 日付・時刻・名前は中央揃え
    const dateTimeNameRange = sheet.getRange(lastRow, 1, 1, 3);
    dateTimeNameRange.setHorizontalAlignment('center');
    dateTimeNameRange.setVerticalAlignment('middle');

    // Slack表示内容とQ&Aは左揃え
    const contentRange = sheet.getRange(lastRow, 4, 1, rowData.length - 3);
    contentRange.setHorizontalAlignment('left');

    // 枠線を追加
    dataRange.setBorder(true, true, true, true, true, true, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);

    // 交互の背景色（偶数行を薄いグレーに）
    if (lastRow % 2 === 0) {
      dataRange.setBackground('#f8f9fa');
    }

    // Slack表示内容の背景色を薄い青に
    const slackContentRange = sheet.getRange(lastRow, 4, 1, 1);
    slackContentRange.setBackground('#e3f2fd');

    // Slack通知を送信
    if (ENABLE_SLACK_NOTIFICATION) {
      sendSlackNotification(name, reportData);
    }

    return { success: true };

  } catch (e) {
    Logger.log('Error in saveDailyReportFromChatGPT: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Slack表示用の内容を作成
 * @param {object} reportData 日報データ
 * @return {string} Slack表示内容
 */
function createSlackContent(reportData) {
  const lines = [];

  // やった
  if (reportData.whatDid && reportData.whatDid.length > 0) {
    lines.push('やった');
    reportData.whatDid.forEach(item => lines.push(item));
  }

  // やる
  if (reportData.whatTodo && reportData.whatTodo.length > 0) {
    lines.push('やる');
    reportData.whatTodo.forEach(item => lines.push(item));
  }

  // ひとこと
  if (reportData.finalComment) {
    lines.push('ひとこと');
    lines.push(reportData.finalComment);
  }

  return lines.join('\n');
}

// ========================================
// データ保存処理
// ========================================

/**
 * 日報データをスプレッドシートに保存する
 * @param {object} reportData 日報データ
 * @return {object} 保存結果
 */
function saveDailyReport(reportData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('日報');

    // シートがない場合は作成
    if (!sheet) {
      sheet = ss.insertSheet('日報');
      sheet.appendRow(['日付', '時刻', '名前', 'やったこと', '詳細']);
    }

    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, 'JST', 'HH:mm:ss');

    // 各タスクごとに行を追加
    reportData.tasks.forEach(task => {
      const details = task.details.join('\n');
      sheet.appendRow([
        dateStr,
        timeStr,
        reportData.name,
        task.task,
        details
      ]);
    });

    return { success: true };

  } catch (e) {
    Logger.log('Error in saveDailyReport: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

// ========================================
// Slack連携
// ========================================

/**
 * Slackに通知を送信する
 * @param {string} name ユーザー名
 * @param {object} reportData 日報データ
 */
function sendSlackNotification(name, reportData) {
  try {
    if (!ENABLE_SLACK_NOTIFICATION || SLACK_WEBHOOK_URL === 'YOUR_SLACK_WEBHOOK_URL_HERE') {
      Logger.log('Slack通知がスキップされました（無効または未設定）');
      return;
    }

    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd HH:mm');

    // やった
    let whatDidText = '';
    if (reportData.whatDid && reportData.whatDid.length > 0) {
      whatDidText = reportData.whatDid.map(item => `• ${item}`).join('\n');
    } else {
      whatDidText = 'なし';
    }

    // やる
    let whatTodoText = '';
    if (reportData.whatTodo && reportData.whatTodo.length > 0) {
      whatTodoText = reportData.whatTodo.map(item => `• ${item}`).join('\n');
    } else {
      whatTodoText = 'なし';
    }

    // ひとこと
    const finalComment = reportData.finalComment || 'なし';

    const message = {
      text: `📝 ${name}さんから日報が提出されました`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📝 ${name}`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*日時*\n${dateStr}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*やった*\n${whatDidText}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*やる*\n${whatTodoText}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*ひとこと*\n${finalComment}`
          }
        },
        {
          type: 'divider'
        }
      ]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      Logger.log('Slack通知を送信しました');
    } else {
      Logger.log('Slack通知の送信に失敗しました: ' + response.getContentText());
    }

  } catch (e) {
    Logger.log('Slack通知エラー: ' + e.toString());
  }
}

// ========================================
// データ管理
// ========================================

/**
 * すべてのデータをクリアする
 */
function clearAllData() {
  const properties = PropertiesService.getUserProperties();
  properties.deleteProperty('state');
  properties.deleteProperty('reportData');
  properties.deleteProperty('chatHistory');
}
