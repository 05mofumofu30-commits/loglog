// ==============================
// ユーティリティ
// ==============================

function sendToGoogleSheet(data) {
  fetch(
    "https://script.google.com/macros/s/AKfycbwhXYnsoiBkpxvtMpkYELqPHuOoZafmUmJfI0fbnZw39dFi0CtxBLN_rBOVqKmPrako/exec",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  ).catch((err) => {
    console.error("Google Sheet送信失敗", err);
  });
}

/**
 * ポイント（pips）計算
 * 将来拡張前提で symbol ごとに分岐
 */
function getPoints(entryPrice, targetPrice, symbol) {
  if (!entryPrice || !targetPrice) return "0.0";

  const diff = Math.abs(targetPrice - entryPrice);

  switch (symbol.toLowerCase()) {
    case "xauusd":
      // 1.0ドル = 100ポイント
      return (diff * 100).toFixed(1);
    default:
      return "0.0";
  }
}

/**
 * リスクリワード計算
 * (1:X) 形式で返す
 */
function getRiskReward(slPoints, tpPoints) {
  if (!slPoints || slPoints === 0) return "(0:0)";
  const rr = tpPoints / slPoints;
  return `(1：${rr.toFixed(1)})`;
}

/**
 * 日付フォーマット
 */
function formatDateTime(date) {
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    date.getFullYear() +
    "/" +
    pad(date.getMonth() + 1) +
    "/" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}

// ==============================
// DOMが読み込まれた後にイベント登録
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // 根拠フィールド追加
  // ==============================
  document.getElementById("add-reason").addEventListener("click", () => {
    const container = document.getElementById("reason-fields");
    const wrapper = document.createElement("div");
    wrapper.className = "reason-row";

    wrapper.innerHTML = `
      <select class="reason-type">
        <option value="フィボナッチ">フィボナッチ</option>
        <option value="エリオット">エリオット</option>
        <option value="ライン分析">ライン分析</option>
        <option value="チャートパターン">チャートパターン</option>
        <option value="MA">MA</option>
        <option value="BB">BB</option>
        <option value="一目均衡表">一目均衡表</option>
        <option value="ローソク足">ローソク足</option>
        <option value="オシレーター系">オシレーター系</option>
        <option value="その他">その他</option>
      </select>
      <textarea class="reason-text" rows="3"></textarea>
    `;
    container.appendChild(wrapper);
  });

  // ==============================
  // 計算ボタン
  // ==============================
  document.getElementById("calculate").addEventListener("click", () => {
    const symbol = document.getElementById("symbol").value;
    const entryPrice = parseFloat(document.getElementById("entryPrice").value);
    const tpPrice = parseFloat(document.getElementById("tpPrice").value);
    const slPrice = parseFloat(document.getElementById("slPrice").value);

    if (!entryPrice || !tpPrice || !slPrice) return;

    const tpPoints = parseFloat(getPoints(entryPrice, tpPrice, symbol));
    const slPoints = parseFloat(getPoints(entryPrice, slPrice, symbol));
    const rr = getRiskReward(slPoints, tpPoints);

    document.getElementById("tp-points").textContent = `(${tpPoints.toFixed(1)} pt)`;
    document.getElementById("sl-points").textContent = `(${slPoints.toFixed(1)} pt)`;
    document.getElementById("rr").textContent = rr;
  });

  // ==============================
  // 出力生成ボタン
  // ==============================
  document.getElementById("generate-output").addEventListener("click", () => {
    const symbol = document.getElementById("symbol").value;
    const entryType = document.getElementById("entryType").value;
    const timeframe = document.getElementById("timeframe").value;
    const entryPrice = document.getElementById("entryPrice").value;
    const tpPrice = document.getElementById("tpPrice").value;
    const slPrice = document.getElementById("slPrice").value;
    const lot = document.getElementById("lot").value;
    const result = document.getElementById("result").value;
    const comment = document.getElementById("comment").value;

    // 必須チェック
    if (!entryPrice || !tpPrice || !slPrice || !lot) {
      alert("エントリー価格・TP・SL・Lot は必須です");
      return;
    }

    const tpPoints = getPoints(parseFloat(entryPrice), parseFloat(tpPrice), symbol);
    const slPoints = getPoints(parseFloat(entryPrice), parseFloat(slPrice), symbol);
    const rr = getRiskReward(parseFloat(slPoints), parseFloat(tpPoints));

    // 根拠生成
    let reasonsText = "";
    document.querySelectorAll(".reason-row").forEach((row) => {
      const type = row.querySelector(".reason-type").value;
      const text = row.querySelector(".reason-text").value.trim();
      if (!text) return;
      reasonsText += `・${type}:\n`;
      text.split("\n").forEach((line) => {
        reasonsText += `　${line}\n`;
      });
      reasonsText += "\n";
    });

    // 見解整形
    let commentText = "";
    if (comment.trim()) {
      comment.split("\n").forEach((line) => {
        commentText += `　${line}\n`;
      });
    }

    const output = `作成日: ${formatDateTime(new Date())}
結果: ${result}

【エントリー基本情報】
・通貨ペア: ゴールドドル（${symbol.toUpperCase()}）
・エントリー種別: ${entryType}
・メイン時間足: ${timeframe}

【エントリー価格情報】
・Lot数: ${lot}
・エントリー価格: ${entryPrice}
・TP価格(${tpPoints}pt): ${tpPrice}
・SL価格(${slPoints}pt): ${slPrice}
・リスクリワード: ${rr}

【根拠】
${reasonsText || "　なし\n"}

【見解・感想】
${commentText || "　なし\n"}
`;

    document.getElementById("output").textContent = output;

    // Googleスプレッドシートに送信
    const dataToSend = {
      date: formatDateTime(new Date()),
      symbol: symbol.toUpperCase(),
      entryType: entryType,
      timeframe: timeframe,
      lot: lot,
      entryPrice: entryPrice,
      tpPrice: tpPrice,
      slPrice: slPrice,
      rr: rr,
      result: result,
      comment: comment,
      reasons: reasonsText.trim()
    };
    sendToGoogleSheet(dataToSend);
  });
});
