const REQUIRED_FIELDS = {
  placingJan: "JANコード",
  placingQty: "発注予定数",
  makerJan: "JANCODE",
  makerQty: "数量",
};

const placingInput = document.getElementById("placing-file");
const makerInput = document.getElementById("maker-file");
const placingName = document.getElementById("placing-name");
const placingHelp = document.getElementById("placing-help");
const makerName = document.getElementById("maker-name");
const runButton = document.getElementById("run-button");
const sampleButton = document.getElementById("sample-button");
const clearMakerButton = document.getElementById("clear-maker-button");
const statusEl = document.getElementById("status");
const resultCard = document.getElementById("result-card");
const summaryEl = document.getElementById("summary");
const csvSaveButton = document.getElementById("csv-save");
const reportSaveButton = document.getElementById("report-save");
const csvOpenButton = document.getElementById("csv-open");
const reportOpenButton = document.getElementById("report-open");
const previewBody = document.getElementById("preview-body");
const makerHelp = document.getElementById("maker-help");
const makerSiteLink = document.getElementById("maker-site-link");
const notesModeLine = document.getElementById("notes-mode-line");
const viewerCard = document.getElementById("viewer-card");
const viewerTitle = document.getElementById("viewer-title");
const viewerText = document.getElementById("viewer-text");
const zeroOutOfStockInput = document.getElementById("zero-out-of-stock");
const modeTrinidadButton = document.getElementById("mode-trinidad");
const modeCosmoButton = document.getElementById("mode-cosmo");

let placingFiles = [];
let makerFile = null;
let downloadUrls = [];
let latestOutputs = null;
let currentMode = "trinidad";

const MODE_CONFIG = {
  trinidad: {
    makerStorageKey: "maker-csv-cache-trinidad-v1",
    makerDefaultName: "gy_product を選択",
    makerSiteUrl: "https://www.tito-shop.com/",
    makerSiteLabel: "トリニダードのメーカーサイトを開く",
    makerHelpDefault: "トリニダードHP で 注文用CSVをダウンロード。初回だけ選択、以後はブラウザ内に保存した内容を使います。",
    makerHelpSelected: "トリニダードHP で 注文用CSVをダウンロード。今回選んだメーカーCSVで保存内容も更新されます。",
    makerHelpCached: "トリニダードHP で 注文用CSVをダウンロード。保存済みデータを使用します。更新日時: {savedAt}",
    placingHelp: "クロスモール → 発注処理 → 発注予定作成 → データ作成 → 発注予定一覧 → 116 トリニダード を CSV出力",
    placingPlaceholder: "placing_plans を選択",
    notesModeLine: "トリニダードでは通常どおり1本の弊社発注リストで使えます。",
    multiplePlacing: false,
  },
  cosmo: {
    makerStorageKey: "maker-csv-cache-cosmo-v1",
    makerDefaultName: "ONLINESHOP_PRODCUT_ORDER を選択",
    makerSiteUrl: "https://www.cosmodarts.com/onlineshop/jp",
    makerSiteLabel: "COSMOのメーカーサイトを開く",
    makerHelpDefault: "COSMO HP で ONLINESHOPで始まる注文用CSV をダウンロード。初回だけ選択、以後はブラウザ内に保存した内容を使います。",
    makerHelpSelected: "COSMO HP で ONLINESHOPで始まる注文用CSV をダウンロード。今回選んだメーカーCSVで保存内容も更新されます。",
    makerHelpCached: "COSMO HP で ONLINESHOPで始まる注文用CSV をダウンロード。保存済みデータを使用します。更新日時: {savedAt}",
    placingHelp: "クロスモール → 発注処理 → 発注予定作成 → データ作成 → 発注予定一覧 → 146 Cosmodarts 147コスモ の2つを CSV出力",
    placingPlaceholder: "placing_plans を2本選択",
    notesModeLine: "COSMOでは弊社発注リストを2本まとめて選択できます。",
    multiplePlacing: true,
  },
};

function setStatus(message) {
  statusEl.textContent = message;
}

function saveMakerCache(fileName, text) {
  const storageKey = MODE_CONFIG[currentMode].makerStorageKey;
  const payload = {
    fileName,
    text,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

function loadMakerCache() {
  try {
    const raw = localStorage.getItem(MODE_CONFIG[currentMode].makerStorageKey);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw);
    if (!data?.fileName || !data?.text) {
      return null;
    }
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function clearMakerCache() {
  localStorage.removeItem(MODE_CONFIG[currentMode].makerStorageKey);
}

function updateMakerCacheUi() {
  const mode = MODE_CONFIG[currentMode];
  const cache = loadMakerCache();
  if (makerFile) {
    makerHelp.innerHTML = mode.makerHelpSelected;
    return;
  }
  if (cache) {
    const savedAt = new Date(cache.savedAt).toLocaleString("ja-JP");
    makerName.textContent = `${cache.fileName} を保存済み`;
    makerHelp.innerHTML = mode.makerHelpCached.replace("{savedAt}", savedAt);
    return;
  }
  makerName.textContent = mode.makerDefaultName;
  makerHelp.innerHTML = mode.makerHelpDefault;
}

function revokeDownloads() {
  for (const url of downloadUrls) {
    URL.revokeObjectURL(url);
  }
  downloadUrls = [];
  latestOutputs = null;
}

function attachDropzone(zoneId, input, onFileSelected) {
  const zone = document.getElementById(zoneId);

  input.addEventListener("change", () => {
    const files = Array.from(input.files ?? []);
    onFileSelected(input.multiple ? files : (files[0] ?? null));
  });

  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("is-dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("is-dragover");
  });

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("is-dragover");
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) {
      const transfer = new DataTransfer();
      for (const file of files) {
        transfer.items.add(file);
      }
      input.files = transfer.files;
      onFileSelected(input.multiple ? files : (files[0] ?? null));
    }
  });
}

function updateSelectedFile(type, file) {
  if (type === "placing") {
    const files = Array.isArray(file) ? file : (file ? [file] : []);
    placingFiles = files;
    if (files.length === 0) {
      placingName.textContent = MODE_CONFIG[currentMode].placingPlaceholder;
    } else if (files.length === 1) {
      placingName.textContent = files[0].name;
    } else {
      placingName.textContent = `${files.length}ファイル選択済み`;
    }
  } else {
    makerFile = file;
    updateMakerCacheUi();
  }
}

async function readFileText(file) {
  const buffer = await file.arrayBuffer();
  const decoders = ["shift_jis", "utf-8"];

  for (const encoding of decoders) {
    try {
      const text = new TextDecoder(encoding, { fatal: true }).decode(buffer);
      if (text.includes(",")) {
        return text;
      }
    } catch (error) {
      continue;
    }
  }

  return new TextDecoder().decode(buffer);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        value += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(value);
      value = "";
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((header) => header.trim().replace(/^\ufeff/, ""));
  const records = rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });
    return record;
  });

  return { headers, records };
}

function serializeCsv(headers, records) {
  const escapeCell = (value) => {
    const text = `${value ?? ""}`;
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  };

  const lines = [
    headers.map(escapeCell).join(","),
    ...records.map((record) => headers.map((header) => escapeCell(record[header])).join(",")),
  ];

  return `\ufeff${lines.join("\r\n")}`;
}

function parseIntSafe(value) {
  const normalized = `${value ?? ""}`.trim().replaceAll(",", "");
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error(`数量が数値ではありません: ${value}`);
  }
  return parsed;
}

function normalizeJan(value) {
  return `${value ?? ""}`.trim().replace(/^'+/, "");
}

function applyModeUi() {
  const mode = MODE_CONFIG[currentMode];
  modeTrinidadButton.classList.toggle("is-active", currentMode === "trinidad");
  modeCosmoButton.classList.toggle("is-active", currentMode === "cosmo");
  placingInput.multiple = mode.multiplePlacing;
  placingInput.value = "";
  makerInput.value = "";
  placingFiles = [];
  makerFile = null;
  placingName.textContent = mode.placingPlaceholder;
  placingHelp.textContent = mode.placingHelp;
  notesModeLine.textContent = mode.notesModeLine;
  makerSiteLink.href = mode.makerSiteUrl;
  makerSiteLink.textContent = mode.makerSiteLabel;
  updateMakerCacheUi();
}

function validateHeaders(headers, required, label) {
  const missing = required.filter((field) => !headers.includes(field));
  if (missing.length > 0) {
    throw new Error(`${label} に必要な列がありません: ${missing.join(", ")}`);
  }
}

function buildOrderMap(records) {
  const qtyMap = new Map();

  for (const record of records) {
    const jan = normalizeJan(record[REQUIRED_FIELDS.placingJan]);
    if (!jan) {
      continue;
    }
    const qty = parseIntSafe(record[REQUIRED_FIELDS.placingQty]);
    qtyMap.set(jan, (qtyMap.get(jan) ?? 0) + qty);
  }

  return qtyMap;
}

function createReport(qtyMap, matchedJans, makerRecords) {
  const unmatchedOrders = [];
  for (const [jan, qty] of qtyMap.entries()) {
    if (!matchedJans.has(jan)) {
      unmatchedOrders.push({ jan, qty });
    }
  }

  const unmatchedMakerRows = makerRecords.filter((record) => {
    const jan = normalizeJan(record[REQUIRED_FIELDS.makerJan]);
    return jan && !matchedJans.has(jan);
  });

  const now = new Date();
  const lines = [
    "発注フォーム変換レポート",
    `作成日時: ${now.toLocaleString("ja-JP")}`,
    "",
    `発注リストJAN件数: ${qtyMap.size}`,
    `メーカーCSV反映JAN件数: ${matchedJans.size}`,
    `発注リスト未一致件数: ${unmatchedOrders.length}`,
    `メーカーCSV未一致行数: ${unmatchedMakerRows.length}`,
    "",
    "[発注リストにあるがメーカーCSVに見つからなかったJAN]",
  ];

  if (unmatchedOrders.length === 0) {
    lines.push("なし");
  } else {
    for (const item of unmatchedOrders) {
      lines.push(`${item.jan}\t数量=${item.qty}`);
    }
  }

  lines.push("", "[メーカーCSVにあるが今回の発注対象ではなかった行]");
  if (unmatchedMakerRows.length === 0) {
    lines.push("なし");
  } else {
    for (const row of unmatchedMakerRows.slice(0, 200)) {
      lines.push(
        [
          row["商品コード"] ?? "",
          row["商品名"] ?? "",
          row[REQUIRED_FIELDS.makerJan] ?? "",
          row[REQUIRED_FIELDS.makerQty] ?? "",
        ].join("\t"),
      );
    }
    if (unmatchedMakerRows.length > 200) {
      lines.push(`... ${unmatchedMakerRows.length - 200} 行省略`);
    }
  }

  return {
    text: lines.join("\n"),
    unmatchedOrders,
    unmatchedMakerRows,
  };
}

function isOutOfStock(record) {
  return `${record["在庫"] ?? ""}`.trim() === "×";
}

function renderPreview(items) {
  previewBody.innerHTML = "";

  if (items.length === 0) {
    previewBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-cell">一致したデータがありませんでした。</td>
      </tr>
    `;
    return;
  }

  for (const item of items.slice(0, 20)) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.jan)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(String(item.qty))}</td>
    `;
    previewBody.appendChild(row);
  }
}

function escapeHtml(value) {
  return `${value}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadBlob(text, fileName, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  downloadUrls.push(url);
  return { url, fileName };
}

async function saveWithPicker(fileName, text, mimeType) {
  if (!window.showSaveFilePicker) {
    return false;
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: mimeType === "text/plain;charset=utf-8" ? "Text File" : "CSV File",
        accept: mimeType === "text/plain;charset=utf-8"
          ? { "text/plain": [".txt"] }
          : { "text/csv": [".csv"] },
      },
    ],
  });
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
  return true;
}

function openTextViewer(title, text) {
  viewerTitle.textContent = title;
  viewerText.value = text;
  viewerCard.classList.remove("hidden");
  viewerCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openBlobInNewTab(url) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  return Boolean(opened);
}

function createTimestamp() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  return parts.join("");
}

async function processFiles() {
  if (placingFiles.length === 0) {
    setStatus("弊社発注リストを1つ以上選択してください。");
    return;
  }
  if (!MODE_CONFIG[currentMode].multiplePlacing && placingFiles.length > 1) {
    setStatus("トリニダードモードでは弊社発注リストは1本だけ選択してください。");
    return;
  }

  revokeDownloads();
  resultCard.classList.add("hidden");
  setStatus("処理中です...");

  try {
    const placingTextPromises = placingFiles.map((file) => readFileText(file));
    const makerCache = loadMakerCache();
    const makerTextPromise = makerFile
      ? readFileText(makerFile)
      : Promise.resolve(makerCache?.text ?? "");

    const placingTexts = await Promise.all(placingTextPromises);
    const makerText = await makerTextPromise;

    if (!makerText) {
      throw new Error("メーカー発注フォームを初回登録してください。");
    }

    const placingCsvList = placingTexts.map((text) => parseCsv(text));
    const makerCsv = parseCsv(makerText);

    for (const placingCsv of placingCsvList) {
      validateHeaders(
        placingCsv.headers,
        [REQUIRED_FIELDS.placingJan, REQUIRED_FIELDS.placingQty],
        "弊社発注リスト",
      );
    }
    validateHeaders(
      makerCsv.headers,
      [REQUIRED_FIELDS.makerJan, REQUIRED_FIELDS.makerQty],
      "メーカー発注フォーム",
    );

    const makerFileName = makerFile?.name ?? makerCache?.fileName ?? "maker_form.csv";
    if (makerFile) {
      saveMakerCache(makerFileName, makerText);
      makerFile = null;
      makerInput.value = "";
      updateMakerCacheUi();
    }

    const mergedPlacingRecords = placingCsvList.flatMap((csv) => csv.records);
    const qtyMap = buildOrderMap(mergedPlacingRecords);
    const matchedJans = new Set();
    const previewItems = [];
    let zeroedOutOfStockCount = 0;

    for (const record of makerCsv.records) {
      const jan = normalizeJan(record[REQUIRED_FIELDS.makerJan]);
      if (!jan || !qtyMap.has(jan)) {
        continue;
      }
      let qty = qtyMap.get(jan);
      if (zeroOutOfStockInput.checked && isOutOfStock(record)) {
        qty = 0;
        zeroedOutOfStockCount += 1;
      }
      record[REQUIRED_FIELDS.makerQty] = String(qty);
      matchedJans.add(jan);
      previewItems.push({
        jan,
        name: record["商品名"] ?? "",
        qty,
      });
    }

    const report = createReport(qtyMap, matchedJans, makerCsv.records);
    const timestamp = createTimestamp();
    const outputName = `${makerFileName.replace(/\.csv$/i, "")}_filled_${timestamp}.csv`;
    const reportName = `${makerFileName.replace(/\.csv$/i, "")}_report_${timestamp}.txt`;

    const outputCsv = serializeCsv(makerCsv.headers, makerCsv.records);
    const csvBlob = downloadBlob(outputCsv, outputName, "text/csv;charset=utf-8");
    const reportBlob = downloadBlob(report.text, reportName, "text/plain;charset=utf-8");
    latestOutputs = {
      csv: {
        ...csvBlob,
        text: outputCsv,
        title: "更新済みCSV",
        mimeType: "text/csv;charset=utf-8",
      },
      report: {
        ...reportBlob,
        text: report.text,
        title: "レポート",
        mimeType: "text/plain;charset=utf-8",
      },
    };

    const summaryLines = [
      `弊社発注リスト読込: ${placingFiles.length}ファイル / ${mergedPlacingRecords.length}行`,
      `反映完了: ${matchedJans.size}件のJANをメーカーCSVへ更新しました。`,
      `在庫×で数量0にした行: ${zeroedOutOfStockCount}行`,
      `発注リスト未一致: ${report.unmatchedOrders.length}件`,
      `メーカーCSV未一致: ${report.unmatchedMakerRows.length}行`,
      `出力ファイル名: ${outputName}`,
    ];

    summaryEl.innerHTML = summaryLines.map((line) => escapeHtml(line)).join("<br>");
    resultCard.classList.remove("hidden");
    renderPreview(previewItems);
    viewerCard.classList.add("hidden");
    setStatus("処理が完了しました。保存ボタン、または表示ボタンを使ってください。");
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "処理に失敗しました。");
  }
}

attachDropzone("placing-dropzone", placingInput, (file) => updateSelectedFile("placing", file));
attachDropzone("maker-dropzone", makerInput, (file) => updateSelectedFile("maker", file));

runButton.addEventListener("click", processFiles);

sampleButton.addEventListener("click", async () => {
  if (currentMode === "trinidad") {
    setStatus("トリニダードでは placing_plans を1本、メーカーCSVは gy_product を初回だけ選んで保存してください。");
  } else {
    setStatus("COSMOでは placing_plans を2本まとめて選び、メーカーCSVは ONLINESHOPで始まるCSVを初回だけ選んで保存してください。");
  }
});

clearMakerButton.addEventListener("click", () => {
  clearMakerCache();
  makerFile = null;
  makerInput.value = "";
  updateMakerCacheUi();
  setStatus("保存済みメーカーCSVを削除しました。次回は再度メーカーCSVを選択してください。");
});

modeTrinidadButton.addEventListener("click", () => {
  currentMode = "trinidad";
  applyModeUi();
  setStatus("トリニダードモードに切り替えました。");
});

modeCosmoButton.addEventListener("click", () => {
  currentMode = "cosmo";
  applyModeUi();
  setStatus("COSMOモードに切り替えました。");
});

csvSaveButton.addEventListener("click", async () => {
  if (!latestOutputs?.csv) {
    setStatus("先に数量反映を実行してください。");
    return;
  }
  try {
    const saved = await saveWithPicker(
      latestOutputs.csv.fileName,
      latestOutputs.csv.text,
      latestOutputs.csv.mimeType,
    );
    if (saved) {
      setStatus(`CSVを保存しました: ${latestOutputs.csv.fileName}`);
      return;
    }
  } catch (error) {
    console.error(error);
  }

  openTextViewer(latestOutputs.csv.title, latestOutputs.csv.text);
  const opened = openBlobInNewTab(latestOutputs.csv.url);
  setStatus(
    opened
      ? "CSVを別タブで開きました。保存はブラウザの保存機能を使ってください。"
      : "このブラウザでは直接保存できないため、CSV内容を画面に表示しました。",
  );
});

reportSaveButton.addEventListener("click", async () => {
  if (!latestOutputs?.report) {
    setStatus("先に数量反映を実行してください。");
    return;
  }
  try {
    const saved = await saveWithPicker(
      latestOutputs.report.fileName,
      latestOutputs.report.text,
      latestOutputs.report.mimeType,
    );
    if (saved) {
      setStatus(`レポートを保存しました: ${latestOutputs.report.fileName}`);
      return;
    }
  } catch (error) {
    console.error(error);
  }

  openTextViewer(latestOutputs.report.title, latestOutputs.report.text);
  const opened = openBlobInNewTab(latestOutputs.report.url);
  setStatus(
    opened
      ? "レポートを別タブで開きました。保存はブラウザの保存機能を使ってください。"
      : "このブラウザでは直接保存できないため、レポート内容を画面に表示しました。",
  );
});

csvOpenButton.addEventListener("click", () => {
  if (!latestOutputs?.csv) {
    setStatus("先に数量反映を実行してください。");
    return;
  }
  openTextViewer(latestOutputs.csv.title, latestOutputs.csv.text);
  setStatus("CSV内容を画面に表示しました。必要ならコピーしてください。");
});

reportOpenButton.addEventListener("click", () => {
  if (!latestOutputs?.report) {
    setStatus("先に数量反映を実行してください。");
    return;
  }
  openTextViewer(latestOutputs.report.title, latestOutputs.report.text);
  setStatus("レポート内容を画面に表示しました。必要ならコピーしてください。");
});

applyModeUi();
