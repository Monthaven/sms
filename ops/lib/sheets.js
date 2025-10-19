import { google } from "googleapis";

function buildClients() {
  const credentials = process.env.GOOGLE_SA_JSON;
  if (!credentials) {
    throw new Error("GOOGLE_SA_JSON env var required to use Google Sheets logging");
  }

  const parsed = JSON.parse(credentials);
  const scopes = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
  ];

  const auth = new google.auth.JWT(
    parsed.client_email,
    null,
    parsed.private_key,
    scopes,
  );

  return {
    drive: google.drive({ version: "v3", auth }),
    sheets: google.sheets({ version: "v4", auth }),
  };
}

export async function createLogSheet({ batchName, parentFolderId }) {
  const { drive, sheets } = buildClients();
  const title = `SMS Log — ${batchName}`;
  const response = await sheets.spreadsheets.create({
    requestBody: { properties: { title } },
  });

  const spreadsheetId = response.data.spreadsheetId;

  await drive.files.update({
    fileId: spreadsheetId,
    requestBody: { name: title },
    addParents: parentFolderId,
    removeParents: "",
  });

  return { id: spreadsheetId };
}

export async function appendLogRows(sheet, rows) {
  if (!sheet) return;
  const { sheets } = buildClients();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheet.id,
    range: "A:Z",
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}
