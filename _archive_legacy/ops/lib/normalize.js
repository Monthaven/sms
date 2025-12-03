import { parsePhoneNumberFromString } from "libphonenumber-js";

function normalizeString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function withinQuietHours(now, quietHours) {
  if (!quietHours) return false;
  const [start, end] = quietHours.split("-");
  if (!start || !end) return false;
  const startHour = Number.parseInt(start, 10);
  const endHour = Number.parseInt(end, 10);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return false;
  const hour = now.getHours();
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }
  return hour >= startHour || hour < endHour;
}

export function shouldRespectQuietHours(now = new Date()) {
  const quietHours = process.env.QUIET_HOURS;
  return withinQuietHours(now, quietHours);
}

export function normalizeLeads(rows) {
  const seen = new Set();
  const leads = [];

  for (const row of rows) {
    const phoneCandidate = normalizeString(row.phone ?? row.Phone ?? row.phone_number ?? row.PhoneNumber);
    const parsed = parsePhoneNumberFromString(phoneCandidate, "US");
    if (!parsed || !parsed.isValid()) {
      continue;
    }
    const phone = parsed.number;
    if (seen.has(phone)) {
      continue;
    }
    seen.add(phone);

    const firstName = normalizeString(row.first ?? row.FirstName ?? row.first_name ?? row.firstname);
    const lastName = normalizeString(row.last ?? row.LastName ?? row.last_name ?? row.lastname);

    leads.push({
      FirstName: firstName,
      LastName: lastName,
      StreetAddress: normalizeString(row.address ?? row.Address ?? row.street ?? row.StreetAddress),
      City: normalizeString(row.City ?? row.city),
      State: normalizeString(row.State ?? row.state),
      Zip: normalizeString(row.Zip ?? row.ZIP ?? row.zip),
      phone,
      raw: row,
    });
  }

  return leads;
}
