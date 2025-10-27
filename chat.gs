/**
 * 日報チャットボット
 */

// 会話の状態を定義
const DAILY_REPORT_STATE = {
  ASK_NAME: 'ASK_NAME',                         // 名前を質問
  ASK_GOOD_THINGS: 'ASK_GOOD_THINGS',           // いいことあった?
  ASK_GOOD_DETAILS: 'ASK_GOOD_DETAILS',         // いいことの詳細
  ASK_WORRIES: 'ASK_WORRIES',                   // 悩み事
  ASK_WORRIES_DETAILS: 'ASK_WORRIES_DETAILS',   // 悩み事の詳細
  ASK_WORK_WORRIES: 'ASK_WORK_WORRIES',         // 常駐・会社の悩み
  ASK_WORK_WORRIES_DETAILS: 'ASK_WORK_WORRIES_DETAILS', // 常駐・会社の悩み詳細
  ASK_WHAT_DID: 'ASK_WHAT_DID',                 // 今日やったこと
  ASK_WHAT_DID_MORE: 'ASK_WHAT_DID_MORE',       // 他にある?(やったこと)
  ASK_WHAT_TODO: 'ASK_WHAT_TODO',               // 今日やること
  ASK_WHAT_TODO_MORE: 'ASK_WHAT_TODO_MORE',     // 他にある?(やること)
  ASK_FINAL_COMMENT: 'ASK_FINAL_COMMENT',       // 最後にひとこと
  DONE: 'DONE'
};

/**
 * Webアプリとして公開する場合のエントリーポイント
 */
function doGet() {
  const html = HtmlService.createHtmlOutputFromFile('DailyReportChatWebApp')
    .setTitle('日報チャットボット');
  return html;
}

/**
 * 日報チャットボットUIを開く（スプレッドシートのメニューから）
 */
function openDailyReportChatbot() {
  clearDailyReportData();
  const html = HtmlService.createHtmlOutputFromFile('DailyReportChatWebApp')
    .setWidth(450)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, '日報チャットボット');
}

/**
 * ユーザーのメッセージを処理し、会話の状態に応じて応答する
 * @param {string} userInput ユーザーからの入力テキスト
 * @return {string} チャットボットからの応答メッセージ
 */
function processDailyReportMessage(userInput) {
  try {
    const properties = PropertiesService.getUserProperties();
    let currentState = properties.getProperty('dailyReportState');
    const reportData = JSON.parse(properties.getProperty('dailyReportData') || '{}');

    let responseMessage = '';

    // 初回メッセージ
    if (!currentState) {
      currentState = DAILY_REPORT_STATE.ASK_NAME;
      properties.setProperty('dailyReportState', currentState);
      return 'お名前を教えてください。';
    }

    // 「ない」「なし」「特にない」などの否定的な回答を判定
    const isNegative = isNegativeAnswer(userInput);

    switch (currentState) {
      case DAILY_REPORT_STATE.ASK_NAME:
        // 名前を記録
        reportData.name = userInput;
        properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_GOOD_THINGS);
        responseMessage = userInput + 'さん、こんにちは!\n\n今日はなんかいいことはありましたか?';
        break;

      case DAILY_REPORT_STATE.ASK_GOOD_THINGS:
        if (isNegative) {
          // いいことがない場合は次の質問へ
          properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WORRIES);
          responseMessage = '悩み事はありましたか?';
        } else {
          // いいことがある場合は詳細を聞く
          if (!reportData.goodThings) reportData.goodThings = [];
          reportData.goodThings.push(userInput);
          properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_GOOD_DETAILS);
          responseMessage = 'それはいいですね!もう少し詳しく教えてください。';
        }
        break;

      case DAILY_REPORT_STATE.ASK_GOOD_DETAILS:
        // 詳細を記録して次の質問へ
        if (reportData.goodThings && reportData.goodThings.length > 0) {
          reportData.goodThings[reportData.goodThings.length - 1] += '\n詳細: ' + userInput;
        }
        properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WORRIES);
        responseMessage = '悩み事はありましたか?';
        break;

      case DAILY_REPORT_STATE.ASK_WORRIES:
        if (isNegative) {
          // 悩み事がない場合は次の質問へ
          properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WORK_WORRIES);
          responseMessage = '常駐や会社について悩み事はありますか?';
        } else {
          // 悩み事がある場合は詳細を聞く
          if (!reportData.worries) reportData.worries = [];
          reportData.worries.push(userInput);
          properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WORRIES_DETAILS);
          responseMessage = 'そうなんですね...もう少し詳しく聞かせてください。';
        }
        break;

      case DAILY_REPORT_STATE.ASK_WORRIES_DETAILS:
        // 詳細を記録して次の質問へ
        if (reportData.worries && reportData.worries.length > 0) {
          reportData.worries[reportData.worries.length - 1] += '\n詳細: ' + userInput;
        }
        properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WORK_WORRIES);
        responseMessage = '常駐や会社について悩み事はありますか?';
        break;

      case DAILY_REPORT_STATE.ASK_WORK_WORRIES:
        if (isNegative) {
          // 常駐・会社の悩み事がない場合は次の質問へ
          properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WHAT_DID);
          responseMessage = '今日やったことを教えてください!';
        } else {
          // 常駐・会社の悩み事がある場合は詳細を聞く
          if (!reportData.workWorries) reportData.workWorries = [];
          reportData.workWorries.push(userInput);
          properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WORK_WORRIES_DETAILS);
          responseMessage = 'なるほど...もう少し詳しく教えてください。';
        }
        break;

      case DAILY_REPORT_STATE.ASK_WORK_WORRIES_DETAILS:
        // 詳細を記録して次の質問へ
        if (reportData.workWorries && reportData.workWorries.length > 0) {
          reportData.workWorries[reportData.workWorries.length - 1] += '\n詳細: ' + userInput;
        }
        properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WHAT_DID);
        responseMessage = '今日やったことを教えてください!';
        break;

      case DAILY_REPORT_STATE.ASK_WHAT_DID:
        // 今日やったことを記録
        if (!reportData.whatDid) reportData.whatDid = [];
        reportData.whatDid.push(userInput);
        properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WHAT_DID_MORE);
        responseMessage = '他にはありますか?';
        break;

      case DAILY_REPORT_STATE.ASK_WHAT_DID_MORE:
        if (isNegative) {
          // 他にない場合は次の質問へ
          properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WHAT_TODO);
          responseMessage = '今日やることを教えてください!';
        } else {
          // 他にもある場合は記録して再度聞く
          reportData.whatDid.push(userInput);
          responseMessage = '他にはありますか?';
        }
        break;

      case DAILY_REPORT_STATE.ASK_WHAT_TODO:
        // 今日やることを記録
        if (!reportData.whatTodo) reportData.whatTodo = [];
        reportData.whatTodo.push(userInput);
        properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_WHAT_TODO_MORE);
        responseMessage = '他にはありますか?';
        break;

      case DAILY_REPORT_STATE.ASK_WHAT_TODO_MORE:
        if (isNegative) {
          // 他にない場合は最後の質問へ
          properties.setProperty('dailyReportState', DAILY_REPORT_STATE.ASK_FINAL_COMMENT);
          responseMessage = '最後にひとこと!';
        } else {
          // 他にもある場合は記録して再度聞く
          reportData.whatTodo.push(userInput);
          responseMessage = '他にはありますか?';
        }
        break;

      case DAILY_REPORT_STATE.ASK_FINAL_COMMENT:
        // 最後のコメントを記録
        reportData.finalComment = userInput;
        properties.setProperty('dailyReportState', DAILY_REPORT_STATE.DONE);

        // 日報を保存
        const saveResult = saveDailyReport(reportData);

        if (saveResult.success) {
          responseMessage = '日報の記録が完了しました!\n\nお疲れさまでした!';
        } else {
          responseMessage = '日報の保存中にエラーが発生しました: ' + saveResult.error;
        }
        break;

      case DAILY_REPORT_STATE.DONE:
        // 完了後のメッセージ
        responseMessage = '日報は既に完了しています。新しい日報を作成する場合は、チャットボットを開き直してください。';
        break;
    }

    properties.setProperty('dailyReportData', JSON.stringify(reportData));
    return responseMessage;

  } catch (e) {
    Logger.log('Error in processDailyReportMessage: ' + e.toString());
    return 'エラーが発生しました。システム管理者にご確認ください。: ' + e.message;
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
    'なかった'
  ];

  const lowerAnswer = answer.toLowerCase().trim();

  return negativePatterns.some(pattern =>
    lowerAnswer.includes(pattern) || lowerAnswer === pattern
  );
}

/**
 * 日報データをスプレッドシートに保存する
 * @param {object} reportData 日報データ
 * @return {object} 保存結果 {success: boolean, error: string}
 */
function saveDailyReport(reportData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dailyReportSheet = ss.getSheetByName('日報');

    // シートがない場合は作成
    if (!dailyReportSheet) {
      dailyReportSheet = ss.insertSheet('日報');
      // ヘッダー行を追加
      dailyReportSheet.appendRow([
        '日付',
        '時刻',
        '名前',
        'いいこと',
        '悩み事',
        '常駐・会社の悩み',
        '今日やったこと',
        '今日やること',
        '最後のひとこと'
      ]);
    }

    const now = new Date();
    const dateStr = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, 'JST', 'HH:mm:ss');

    // データを整形
    const name = reportData.name || '';
    const goodThings = reportData.goodThings ? reportData.goodThings.join('\n\n') : 'なし';
    const worries = reportData.worries ? reportData.worries.join('\n\n') : 'なし';
    const workWorries = reportData.workWorries ? reportData.workWorries.join('\n\n') : 'なし';
    const whatDid = reportData.whatDid ? reportData.whatDid.join('\n') : '';
    const whatTodo = reportData.whatTodo ? reportData.whatTodo.join('\n') : '';
    const finalComment = reportData.finalComment || '';

    // 日報を追加
    dailyReportSheet.appendRow([
      dateStr,
      timeStr,
      name,
      goodThings,
      worries,
      workWorries,
      whatDid,
      whatTodo,
      finalComment
    ]);

    return {
      success: true
    };

  } catch (e) {
    Logger.log('Error in saveDailyReport: ' + e.toString());
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * 日報データをクリアする
 */
function clearDailyReportData() {
  const properties = PropertiesService.getUserProperties();
  properties.deleteProperty('dailyReportState');
  properties.deleteProperty('dailyReportData');
}

/**
 * 保存された日報データを取得する
 * @return {object} 日報データ
 */
function getDailyReportData() {
  const properties = PropertiesService.getUserProperties();
  const data = properties.getProperty('dailyReportData');
  if (data) {
    return { success: true, data: JSON.parse(data) };
  }
  return { success: false, data: {} };
}
