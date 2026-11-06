import { Platform, Alert } from "react-native";

/**
 * Cross-platform file download helper.
 *  - Web: Blob + DOM anchor download.
 *  - Android / iOS: write to expo-file-system cache and open the native share/save sheet.
 * Never throws; resolves to { ok, uri?, error? }.
 */

const MIME_BY_EXT = {
  json: "application/json",
  txt: "text/plain",
  csv: "text/csv",
  pdf: "application/pdf",
  html: "text/html",
  ics: "text/calendar",
};

const sanitizeFileName = (name) =>
  String(name || `goguide_${Date.now()}.txt`).replace(/[^a-zA-Z0-9._-]/g, "_");

const guessMime = (fileName) =>
  MIME_BY_EXT[String(fileName).split(".").pop()?.toLowerCase()] || "application/octet-stream";

function downloadOnWeb({ fileName, data, mimeType, isBase64 }) {
  let blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (isBase64) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    blob = new Blob([bytes], { type: mimeType });
  } else {
    blob = new Blob([data], { type: mimeType });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 15000);
}

async function saveOnNative({ fileName, data, mimeType, isBase64, dialogTitle }) {
  const FileSystem = require("expo-file-system/legacy");
  const Sharing = require("expo-sharing");

  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!dir) throw new Error("No writable storage directory available");
  const uri = `${dir}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, data, {
    encoding: isBase64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle: dialogTitle || "Save or share file",
      UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
    });
  }
  return uri;
}

/**
 * @param {object} opts
 * @param {string} opts.fileName
 * @param {string|Blob} opts.data       text content (or base64 string when isBase64)
 * @param {string} [opts.mimeType]
 * @param {boolean} [opts.isBase64]
 * @param {string} [opts.dialogTitle]
 */
export async function downloadFile(opts) {
  const fileName = sanitizeFileName(opts?.fileName);
  const mimeType = opts?.mimeType || guessMime(fileName);
  const payload = { ...opts, fileName, mimeType };
  try {
    if (Platform.OS === "web") {
      downloadOnWeb(payload);
      return { ok: true };
    }
    const uri = await saveOnNative(payload);
    return { ok: true, uri };
  } catch (error) {
    console.warn("[fileDownloader] failed:", error?.message || error);
    return { ok: false, error };
  }
}

/** Convenience: download JSON-serialisable data. Shows an alert on failure. */
export async function downloadJson(fileName, object) {
  const result = await downloadFile({
    fileName,
    data: JSON.stringify(object, null, 2),
    mimeType: "application/json",
    dialogTitle: "Save your GoGuide data",
  });
  if (!result.ok) Alert.alert("Download failed", "Could not save the file. Please try again.");
  return result;
}

/** Share/save an existing local file URI (e.g. output of expo-print). Native only. */
export async function shareLocalFile(uri, { mimeType, dialogTitle } = {}) {
  try {
    const Sharing = require("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) return { ok: false };
    await Sharing.shareAsync(uri, { mimeType, dialogTitle });
    return { ok: true, uri };
  } catch (error) {
    console.warn("[fileDownloader] share failed:", error?.message || error);
    return { ok: false, error };
  }
}
