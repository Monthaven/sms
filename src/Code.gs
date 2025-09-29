/*************************************************************
 * Crown & Oak SMS – Unified SMS System (Production)
 * EZ Texting + Notion + Google Sheets
 *************************************************************/

const SP = PropertiesService.getScriptProperties();

/** =======================
 * CONFIG
 * ======================= */
const CONFIG = {
  REGION_DEFAULT: 'US',
  HOLDER_SPREADSHEET_ID: SP.getProperty('HOLDER_SPREADSHEET_ID') || '',
  BULK_DATA_SPREADSHEET_ID: SP.getProperty('BULK_DATA_SPREADSHEET_ID') || '',
  QUIET_HOURS_START: 21, // 9pm
  QUIET_HOURS_END: 8,    // 8am
  BATCH_SIZE: 50,

  SHEETS: {
    EZ_CONTACTS: 'EZ_Contacts',
    FILTER_SENDREADY: 'Filter_SendReady',
    DELIVERY_STATUS: 'Delivery_Status',
    INBOUND_MESSAGES: 'Inbound_Messages',
    WEBHOOK_RAW: 'Webhook_Raw',
    SUPPRESSION: 'Suppression',
    DEBUG_EVENTS: 'Debug_Events'
  },

  NOTION: {
    TOKEN: SP.getProperty('NOTION_TOKEN') || '',
    VERSION: '2022-06-28',
    LEAD_STAGING_DB: SP.getProperty('LEAD_STAGING_DB') || '',
    CAMPAIGN_BATCHES_DB: SP.getProperty('CAMPAIGN_BATCHES_DB') || '',
    THREAD_TRACKING_DB: SP.getProperty('THREAD_TRACKING_DB') || '',
    PROCESSING_QUEUE_DB: SP.getProperty('PROCESSING_QUEUE_DB') || '',
    PROPS: {
      phoneE164: 'Phone E164',
      lineType: 'Line Type',
      dncOptOut: 'DNC Opt Out',
      sendStatus: 'Send Status',
      lastSendAt: 'Last Send At',
      lastDeliveryAt: 'Last Delivery At',
      lastInbound: 'Last Inbound'
    }
  },

  EZ: {
    AUTH_URL: 'https://a.eztexting.com/v1/tokens/create',
    REFRESH_URL: 'https://a.eztexting.com/v1/tokens/refresh',
    SEND_URL: 'https://a.eztexting.com/v1/messages',
    CONTACTS_URL: 'https://a.eztexting.com/v1/contacts',
    MSG_LOOKUP_URL: 'https://a.eztexting.com/v1/messages/',
    USER: SP.getProperty('EZ_USER') || '',  // app key
    PASS: SP.getProperty('EZ_PASS') || ''   // app secret
  },

  FLAGS: {
    GLOBAL_PAUSE: (SP.getProperty('GLOBAL_PAUSE_SMS') || 'false').toLowerCase() === 'true',
    USE_SHEETS_SOURCE: (SP.getProperty('USE_SHEETS_SOURCE') || 'false').toLowerCase() === 'true'
  }
};

/** =======================
 * GENERIC HELPERS
 * ======================= */
function normalizePhone(phone) {
  if (!phone) return '';
  const d = String(phone).replace(/\D+/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.startsWith('1')) return '+' + d;
  return d.length >= 10 ? '+1' + d.slice(-10) : '';
}
function isQuietHours() {
  const h = new Date().getHours();
  return h >= CONFIG.QUIET_HOURS_START || h < CONFIG.QUIET_HOURS_END;
}
function holderSS_() {
  if (!CONFIG.HOLDER_SPREADSHEET_ID) throw new Error('HOLDER_SPREADSHEET_ID missing.');
  return SpreadsheetApp.openById(CONFIG.HOLDER_SPREADSHEET_ID);
}
function ensureSheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (header && header.length) sh.getRange(1, 1, 1, header.length).setValues([header]);
  return sh;
}
function logCampaignSend(campaignId, phone, message, status, externalId) {
  const sh = ensureSheet_(holderSS_(), 'Campaign_Log', ['Timestamp','CampaignID','E164','Message','Status','ProviderID']);
  sh.appendRow([new Date(), campaignId, phone, message, status, externalId || '']);
}

/** =======================
 * NOTION HELPERS
 * ======================= */
function notionHeaders_() {
  return {
    'Authorization': `Bearer ${CONFIG.NOTION.TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': CONFIG.NOTION.VERSION
  };
}
function notionRequest_(method, endpoint, body) {
  const url = 'https://api.notion.com' + endpoint;
  const res = UrlFetchApp.fetch(url, {
    method: method.toUpperCase(),
    headers: notionHeaders_(),
    muteHttpExceptions: true,
    payload: body ? JSON.stringify(body) : undefined
  });
  const code = res.getResponseCode();
  const txt = res.getContentText() || '';
  if (code < 200 || code >= 300) {
    console.error('Notion API error', code, txt);
    return null;
  }
  return txt ? JSON.parse(txt) : {};
}
function queryNotionDatabase(dbKeyOrId, query) {
  const dbId = SP.getProperty(dbKeyOrId) || dbKeyOrId;
  return (notionRequest_('post', `/v1/databases/${dbId}/query`, query || {}) || {}).results || [];
}
function updateNotionPage(pageId, properties, dbForSchema) {
  return !!notionRequest_('patch', `/v1/pages/${pageId}`, { properties: properties || {} });
}

function getPageTitle_(page) {
  const entry = Object.entries(page.properties || {}).find(([, v]) => v && v.type === 'title');
  const title = entry && entry[1] && entry[1].title && entry[1].title[0] && entry[1].title[0].plain_text;
  return title || '';
}
function getTextProp_(prop) {
  if (!prop) return '';
  if (prop.type === 'title' && prop.title?.length) return prop.title.map(t => t.plain_text || '').join('');
  if (prop.type === 'rich_text' && prop.rich_text?.length) return prop.rich_text.map(t => t.plain_text || '').join('');
  return '';
}
function getPhoneFromLeadPage_(lead) {
  const p = lead.properties && lead.properties[CONFIG.NOTION.PROPS.phoneE164];
  if (!p) return '';
  if (p.type === 'phone_number' && p.phone_number) return p.phone_number;
  if (p.type === 'rich_text' && p.rich_text?.length) return p.rich_text.map(x => x.plain_text || '').join('');
  return '';
}
function getRichText_(lead, name) {
  const p = lead.properties && lead.properties[name];
  if (!p) return '';
  if (p.type === 'rich_text' && p.rich_text?.length) return p.rich_text.map(x => x.plain_text || '').join('');
  if (p.type === 'title' && p.title?.length) return p.title.map(x => x.plain_text || '').join('');
  return '';
}

/** =======================
 * EZ TEXTING (OAuth + Send)
 * ======================= */
function ezGetAccessToken_() {
  const cached = SP.getProperty('EZ_ACCESS_TOKEN');
  if (cached) return cached;
  if (!CONFIG.EZ.USER || !CONFIG.EZ.PASS) {
    console.error('Missing EZ_USER/EZ_PASS app credentials (Script Properties).');
    return null;
  }
  const resp = UrlFetchApp.fetch(CONFIG.EZ.AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    muteHttpExceptions: true,
    payload: JSON.stringify({ appKey: CONFIG.EZ.USER, appSecret: CONFIG.EZ.PASS })
  });
  const code = resp.getResponseCode();
  const txt = resp.getContentText() || '{}';
  if (code < 200 || code >= 300) {
    console.error('EZ token create failed:', code, txt);
    return null;
  }
  const data = JSON.parse(txt);
  if (data.accessToken) {
    SP.setProperty('EZ_ACCESS_TOKEN', data.accessToken);
    if (data.refreshToken) SP.setProperty('EZ_REFRESH_TOKEN', data.refreshToken);
    return data.accessToken;
  }
  return null;
}
function ezAuthorizedFetch_(url, opts) {
  let token = ezGetAccessToken_();
  if (!token) return { ok: false, code: 0, text: 'no token' };
  const doFetch = () =>
    UrlFetchApp.fetch(url, {
      method: (opts?.method || 'GET').toUpperCase(),
      muteHttpExceptions: true,
      headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, opts?.headers || {}),
      payload: opts?.body ? JSON.stringify(opts.body) : undefined
    });
  let res = doFetch();
  if (res.getResponseCode() === 401) {
    try { SP.deleteProperty('EZ_ACCESS_TOKEN'); } catch(_) {}
    token = ezGetAccessToken_();
    res = doFetch();
  }
  const code = res.getResponseCode();
  const txt = res.getContentText() || '';
  let data; try { data = JSON.parse(txt); } catch(_) { data = {}; }
  return { ok: code >= 200 && code < 300, code, text: txt, data };
}
function sendSMSToLead(lead, template, campaignId) {
  let phone = '';
  if (lead.properties) {
    phone = getPhoneFromLeadPage_(lead) || lead.properties['Phone E164']?.rich_text?.[0]?.plain_text || '';
  }
  phone = normalizePhone(phone);
  if (!phone) {
    console.error('No valid phone for lead:', lead && lead.id);
    return false;
  }
  const streetAddress = lead.properties ? getRichText_(lead, 'Property Address') : '';
  const ownerName = lead.properties ? (getRichText_(lead, 'Owner Name') || getRichText_(lead, 'Company')) : '';
  const firstName = (ownerName.split(/\s+/)[0] || '').trim();

  let message = String(template || '');
  message = message.replace(/\$\{StreetAddress\}/g, streetAddress || '');
  message = message.replace(/\$\{FirstName\}/g, firstName || ownerName || '');

  const payload = { toNumbers: [phone.replace(/\D+/g, '')], message };
  const resp = ezAuthorizedFetch_(CONFIG.EZ.SEND_URL, { method: 'POST', body: payload });

  if (resp.ok) {
    logCampaignSend(campaignId, phone, message, 'Sent', resp.data.id || 'success');
    return true;
  }
  console.error('EZ send error', resp.code, resp.text);
  logCampaignSend(campaignId, phone, message, 'Failed', resp.text || resp.code);
  return false;
}

/** =======================
 * LEAD SOURCE (Sheets or Notion)
 * ======================= */
function buildHeaderIndex_(headers) {
  const idx = {};
  const map = headers.reduce((m, h, i) => (m[String(h).toLowerCase().replace(/\s+|_/g,'')] = i, m), {});
  const want = {
    phone: ['Phone E164','E164','Primary Phone E164'],
    address: ['Property Address'],
    ownerName: ['Owner Name'],
    lineType: ['Line Type']
  };
  Object.entries(want).forEach(([key, list]) => {
    idx[key] = -1;
    for (const label of list) {
      const k = String(label).toLowerCase().replace(/\s+|_/g,'');
      if (k in map) { idx[key] = map[k]; break; }
    }
  });
  return idx;
}
function readSendReadyFromHolder_(limit) {
  const sh = holderSS_().getSheetByName(CONFIG.SHEETS.FILTER_SENDREADY);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(String);
  const idx = buildHeaderIndex_(headers);
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const phone = idx.phone >= 0 ? String(row[idx.phone] || '') : '';
    const lineType = idx.lineType >= 0 ? String(row[idx.lineType] || '') : '';
    if (!phone) continue;
    if (lineType && lineType.toLowerCase() !== 'wireless') continue;
    out.push({
      properties: {
        'Phone E164': { rich_text: [{ plain_text: normalizePhone(phone) }] },
        'Property Address': { rich_text: [{ plain_text: idx.address >= 0 ? String(row[idx.address] || '') : '' }] },
        'Owner Name': { rich_text: [{ plain_text: idx.ownerName >= 0 ? String(row[idx.ownerName] || '') : '' }] }
      }
    });
    if (limit && out.length >= limit) break;
  }
  return out;
}

/** =======================
 * CAMPAIGN SEND
 * ======================= */
function executeCampaignSend() {
  if (CONFIG.FLAGS.GLOBAL_PAUSE) { console.log('Global pause ON'); return; }
  if (isQuietHours()) { console.log('Quiet hours active'); return; }

  const campaigns = queryNotionDatabase('CAMPAIGN_BATCHES_DB', {
    filter: { property: 'Status', select: { equals: 'Queued' } },
    page_size: 1
  });
  if (!campaigns.length) { console.log('No queued campaigns'); return; }

  processCampaign(campaigns[0]);
}
function processCampaign(campaign) {
  const explicitId = getTextProp_(campaign.properties['Campaign ID']);
  const titleText = getPageTitle_(campaign);
  const campaignId = explicitId || titleText || campaign.id;

  const template = getTextProp_(campaign.properties['Message Template']);
  const maxSends = campaign.properties['Target Count']?.number || CONFIG.BATCH_SIZE;
  if (!template) { console.error('Missing template'); return; }

  const pageSize = Math.min(maxSends, CONFIG.BATCH_SIZE);
  const leads = CONFIG.FLAGS.USE_SHEETS_SOURCE
    ? readSendReadyFromHolder_(pageSize)
    : queryNotionDatabase('LEAD_STAGING_DB', {
        filter: {
          and: [
            { property: CONFIG.NOTION.PROPS.lineType,   select: { equals: 'Wireless' } },
            { property: CONFIG.NOTION.PROPS.dncOptOut, checkbox: { equals: false } }
          ]
        },
        sorts: [{ property: CONFIG.NOTION.PROPS.lastSendAt, direction: 'ascending' }],
        page_size: pageSize
      });

  console.log(`Sending ${leads.length} leads for campaign ${campaignId}`);
  updateNotionPage(campaign.id, { 'Status': { select: { name: 'Sending' } } }, 'CAMPAIGN_BATCHES_DB');

  let okCount = 0;
  leads.forEach(lead => {
    const ok = sendSMSToLead(lead, template, campaignId);
    if (ok && !CONFIG.FLAGS.USE_SHEETS_SOURCE && lead.id) {
      updateNotionPage(lead.id, {
        [CONFIG.NOTION.PROPS.sendStatus]: { select: { name: 'Sent' } },
        [CONFIG.NOTION.PROPS.lastSendAt]: { date: { start: new Date().toISOString() } }
      }, 'LEAD_STAGING_DB');
    } else if (ok && CONFIG.FLAGS.USE_SHEETS_SOURCE) {
      const phoneStub = lead.properties?.['Phone E164']?.rich_text?.[0]?.plain_text || '';
      if (phoneStub) markHolderRowSent_(phoneStub);
    } else if (!ok) {
      // count failure below
    }
    if (ok) {
      okCount++;
    }
    Utilities.sleep(200);
  });

  updateNotionPage(campaign.id, {
    'Status': { select: { name: 'Completed' } },
    'Sent Count': { number: okCount }
  }, 'CAMPAIGN_BATCHES_DB');

  console.log(`Campaign ${campaignId} complete: ${okCount} sent`);
}
function dryRunCampaignQueued() {
  const campaigns = queryNotionDatabase('CAMPAIGN_BATCHES_DB', {
    filter: { property: 'Status', select: { equals: 'Queued' } },
    page_size: 1
  });
  if (!campaigns.length) { console.log('No queued campaigns'); return; }

  const c = campaigns[0];
  const name = getPageTitle_(c) || getTextProp_(c.properties['Campaign Name']) || c.id;
  const template = getTextProp_(c.properties['Message Template']) || '';
  const pageSize = Math.min(c.properties['Target Count']?.number || 20, CONFIG.BATCH_SIZE);

  const leads = CONFIG.FLAGS.USE_SHEETS_SOURCE
    ? readSendReadyFromHolder_(pageSize)
    : queryNotionDatabase('LEAD_STAGING_DB', {
        filter: {
          and: [
            { property: CONFIG.NOTION.PROPS.lineType,   select: { equals: 'Wireless' } },
            { property: CONFIG.NOTION.PROPS.dncOptOut, checkbox: { equals: false } }
          ]
        },
        page_size: pageSize
      });

  console.log(`DRY-RUN "${name}"`);
  leads.forEach((lead, i) => {
    const phone = normalizePhone(getPhoneFromLeadPage_(lead) || (lead.properties?.['Phone E164']?.rich_text?.[0]?.plain_text || ''));
    const addr = getRichText_(lead, 'Property Address');
    const owner = getRichText_(lead, 'Owner Name');
    const first = (owner.split(/\s+/)[0] || '').trim();
    let msg = template.replace(/\$\{StreetAddress\}/g, addr || '').replace(/\$\{FirstName\}/g, first || owner || '');
    console.log(`#${i+1}: ${phone} ← "${msg}"`);
  });
}

/** =======================
 * DELIVERY + INBOUND (Sheets + Webhook)
 * ======================= */
function processDeliveryConfirmations() {
  const sh = holderSS_().getSheetByName(CONFIG.SHEETS.DELIVERY_STATUS);
  if (!sh) return;
  const values = sh.getDataRange().getValues();
  if (!values.length) return;
  const head = values[0];
  const col = Object.fromEntries(head.map((h,i)=>[h,i]));
  let processedCol = head.indexOf('Processed');
  if (processedCol === -1) { processedCol = head.length; sh.getRange(1, processedCol+1).setValue('Processed'); }

  const phonesSent = [], phonesDelivered = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (row[processedCol] === true) continue;
    const status = String(row[col['Status']] || '').toUpperCase();
    const e164 = String(row[col['E164']] || '').trim();
    if (!e164) continue;
    if (status === 'SENT' || status === 'QUEUED' || status === 'SUBMITTED') phonesSent.push(e164);
    if (status === 'DELIVERED') phonesDelivered.push(e164);
    sh.getRange(r+1, processedCol+1).setValue(true);
  }
  if (phonesSent.length) updateLeadsByPhones(phonesSent, 'Sent');
  if (phonesDelivered.length) updateLeadsByPhones(phonesDelivered, 'Delivered');
}
function updateLeadsByPhones(phones, newStatus) {
  phones.forEach(raw => {
    const phone = normalizePhone(raw);
    if (!phone) return;
    const res = notionRequest_('post', `/v1/databases/${SP.getProperty('LEAD_STAGING_DB')}/query`, {
      filter: { property: CONFIG.NOTION.PROPS.phoneE164, phone_number: { equals: phone } }
    });
    if (!res || !res.results || !res.results.length) return;
    const pageId = res.results[0].id;
    const props = { [CONFIG.NOTION.PROPS.sendStatus]: { select: { name: newStatus } } };
    if (newStatus === 'Delivered') props[CONFIG.NOTION.PROPS.lastDeliveryAt] = { date: { start: new Date().toISOString() } };
    notionRequest_('patch', `/v1/pages/${pageId}`, { properties: props });
  });
}

/** webhook (publish as web app) */
function doPost(e) { return handleWebhook_(e); }
function doGet(e)  { return handleWebhook_(e); }
function handleWebhook_(e) {
  const ss = holderSS_();
  const raw = ensureSheet_(ss, CONFIG.SHEETS.WEBHOOK_RAW, ['Timestamp','Raw','Source']);
  const body = e?.postData?.contents || '';
  const type = e?.postData?.type || '';

  raw.appendRow([new Date(), body, type || '(none)']);
  if (!body) return ContentService.createTextOutput('OK');

  let payload = {};
  try { payload = JSON.parse(body); } catch(_) {}

  // detect inbound vs delivery
  const isInbound =
    !!(payload.messageBody || payload.body || payload.message) &&
    !!(payload.phone || payload.from || payload.msisdn || payload.fromNumber || payload.contactPhone);

  if (isInbound) {
    const phone = normalizePhone(payload.phone || payload.from || payload.msisdn || payload.contactPhone);
    const text  = String(payload.messageBody || payload.body || payload.message || '');
    recordInbound_(phone, text);
  } else {
    // delivery
    const phone = normalizePhone(payload.to || payload.phone || payload.recipient || payload.msisdn);
    const status = String(payload.deliveryStatus || payload.messageStatus || payload.status || '');
    recordDelivery_(phone, status);
  }
  return ContentService.createTextOutput('OK');
}
function recordInbound_(phone, text) {
  const sh = ensureSheet_(holderSS_(), CONFIG.SHEETS.INBOUND_MESSAGES, ['Timestamp','E164','Body','Classification']);
  const cls = classifyInbound_(text);
  sh.appendRow([new Date(), phone, text, cls]);

  // update Notion status
  const res = notionRequest_('post', `/v1/databases/${SP.getProperty('LEAD_STAGING_DB')}/query`, {
    filter: { property: CONFIG.NOTION.PROPS.phoneE164, phone_number: { equals: phone } }
  });
  if (res?.results?.length) {
    const pid = res.results[0].id;
    const statusMap = { 'STOP': 'DNC', 'Interested': 'Active', 'Not Interested': 'Closed', 'Follow Up Later': 'Follow Up Later', 'Responded': 'Responded', 'Unknown': 'Responded' };
    const status = statusMap[cls] || 'Responded';
    const props = {
      [CONFIG.NOTION.PROPS.lastInbound]: { rich_text: [{ text: { content: text.slice(0, 200) } }] },
      [CONFIG.NOTION.PROPS.sendStatus]: { select: { name: status } }
    };
    if (cls === 'STOP') props[CONFIG.NOTION.PROPS.dncOptOut] = { checkbox: true };
    notionRequest_('patch', `/v1/pages/${pid}`, { properties: props });
  }
}
function recordDelivery_(phone, status) {
  const sh = ensureSheet_(holderSS_(), CONFIG.SHEETS.DELIVERY_STATUS, ['Timestamp','E164','Message','Status']);
  sh.appendRow([new Date(), phone, '', status || '']);
}
function classifyInbound_(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return 'Unknown';
  if (/\b(stop|unsubscribe|quit|end|cancel)\b/.test(t)) return 'STOP';
  if (/\b(yes|interested|call me|sure|okay|ok|yep)\b/.test(t)) return 'Interested';
  if (/\b(not interested|no thanks|remove me)\b/.test(t)) return 'Not Interested';
  if (/\b(later|next (week|month|year)|follow up)\b/.test(t)) return 'Follow Up Later';
  return 'Responded';
}

/** =======================
 * SHEETS MENU & TRIGGERS
 * ======================= */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('DM Tools')
    .addItem('Dry-Run Queued Campaign', 'dryRunCampaignQueued')
    .addItem('Run Queued Campaign Now', 'executeCampaignSend')
    .addSeparator()
    .addItem('Process Delivery Confirmations', 'processDeliveryConfirmations')
    .addSeparator()
    .addItem('Enable Delivery Poll (5m)', 'setupDeliveryProcessingTriggers')
    .addToUi();
}
function setupDeliveryProcessingTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processDeliveryConfirmations') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processDeliveryConfirmations').timeBased().everyMinutes(5).create();
}

/** =======================
 * PLACEHOLDER STUBS FOR OPTIONAL SHEETS OPS
 * ======================= */
function markHolderRowSent_(phone) {
  // Stub: replace with sheet lookup if you need to mark holder rows as sent.
  console.log('Mark row sent for', phone);
}
