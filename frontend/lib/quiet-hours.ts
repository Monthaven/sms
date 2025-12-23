/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Quiet Hours enforcement utilities.
 * Ensures messages are only sent during business hours in recipient's timezone.
 * 
 * TCPA compliance: 8am-9pm local time
 */

// ZIP code to timezone mapping (first 3 digits of ZIP)
// This is a simplified mapping - production should use a full database
const ZIP_TIMEZONE_MAP: Record<string, string> = {
  // Eastern Time
  "100": "America/New_York", "101": "America/New_York", "102": "America/New_York", // NY
  "103": "America/New_York", "104": "America/New_York", "105": "America/New_York",
  "106": "America/New_York", "107": "America/New_York", "108": "America/New_York",
  "109": "America/New_York", "110": "America/New_York", "111": "America/New_York",
  "112": "America/New_York", "113": "America/New_York", "114": "America/New_York",
  "115": "America/New_York", "116": "America/New_York", "117": "America/New_York",
  "118": "America/New_York", "119": "America/New_York", "120": "America/New_York",
  "121": "America/New_York", "122": "America/New_York", "123": "America/New_York",
  "124": "America/New_York", "125": "America/New_York", "126": "America/New_York",
  "127": "America/New_York", "128": "America/New_York", "129": "America/New_York",
  "130": "America/New_York", "131": "America/New_York", "132": "America/New_York",
  "133": "America/New_York", "134": "America/New_York", "135": "America/New_York",
  "136": "America/New_York", "137": "America/New_York", "138": "America/New_York",
  "139": "America/New_York", "140": "America/New_York", "141": "America/New_York",
  "142": "America/New_York", "143": "America/New_York", "144": "America/New_York",
  "145": "America/New_York", "146": "America/New_York", "147": "America/New_York",
  "148": "America/New_York", "149": "America/New_York",
  "150": "America/New_York", // PA
  "151": "America/New_York", "152": "America/New_York", "153": "America/New_York",
  "154": "America/New_York", "155": "America/New_York", "156": "America/New_York",
  "157": "America/New_York", "158": "America/New_York", "159": "America/New_York",
  "160": "America/New_York", "161": "America/New_York", "162": "America/New_York",
  "163": "America/New_York", "164": "America/New_York", "165": "America/New_York",
  "166": "America/New_York", "167": "America/New_York", "168": "America/New_York",
  "169": "America/New_York",
  "190": "America/New_York", "191": "America/New_York", // Philadelphia
  "200": "America/New_York", "201": "America/New_York", // DC/NJ
  "202": "America/New_York", "203": "America/New_York", "204": "America/New_York",
  "205": "America/New_York", "206": "America/New_York", "207": "America/New_York",
  "208": "America/New_York",
  "210": "America/New_York", "211": "America/New_York", "212": "America/New_York",
  "220": "America/New_York", "221": "America/New_York", "222": "America/New_York", // VA
  "223": "America/New_York", "224": "America/New_York", "225": "America/New_York",
  "226": "America/New_York", "227": "America/New_York", "228": "America/New_York",
  "229": "America/New_York", "230": "America/New_York", "231": "America/New_York",
  "232": "America/New_York", "233": "America/New_York", "234": "America/New_York",
  "235": "America/New_York", "236": "America/New_York", "237": "America/New_York",
  "238": "America/New_York", "239": "America/New_York",
  "240": "America/New_York", "241": "America/New_York", "242": "America/New_York",
  "243": "America/New_York", "244": "America/New_York", "245": "America/New_York",
  "246": "America/New_York",
  "270": "America/New_York", "271": "America/New_York", "272": "America/New_York", // NC
  "273": "America/New_York", "274": "America/New_York", "275": "America/New_York",
  "276": "America/New_York", "277": "America/New_York", "278": "America/New_York",
  "279": "America/New_York", "280": "America/New_York", "281": "America/New_York",
  "282": "America/New_York", "283": "America/New_York", "284": "America/New_York",
  "285": "America/New_York", "286": "America/New_York", "287": "America/New_York",
  "288": "America/New_York", "289": "America/New_York",
  "290": "America/New_York", "291": "America/New_York", "292": "America/New_York", // SC
  "293": "America/New_York", "294": "America/New_York", "295": "America/New_York",
  "296": "America/New_York", "297": "America/New_York", "298": "America/New_York",
  "299": "America/New_York",
  "300": "America/New_York", "301": "America/New_York", "302": "America/New_York", // GA
  "303": "America/New_York", "304": "America/New_York", "305": "America/New_York",
  "306": "America/New_York", "307": "America/New_York", "308": "America/New_York",
  "309": "America/New_York", "310": "America/New_York", "311": "America/New_York",
  "312": "America/New_York", "313": "America/New_York", "314": "America/New_York",
  "315": "America/New_York", "316": "America/New_York", "317": "America/New_York",
  "318": "America/New_York", "319": "America/New_York",
  "320": "America/New_York", "321": "America/New_York", "322": "America/New_York", // FL
  "323": "America/New_York", "324": "America/New_York", "325": "America/New_York",
  "326": "America/New_York", "327": "America/New_York", "328": "America/New_York",
  "329": "America/New_York", "330": "America/New_York", "331": "America/New_York",
  "332": "America/New_York", "333": "America/New_York", "334": "America/New_York",
  "335": "America/New_York", "336": "America/New_York", "337": "America/New_York",
  "338": "America/New_York", "339": "America/New_York",
  "340": "America/New_York", "341": "America/New_York", "342": "America/New_York",
  "344": "America/New_York", "346": "America/New_York", "347": "America/New_York",
  "349": "America/New_York",
  
  // Central Time
  "350": "America/Chicago", "351": "America/Chicago", "352": "America/Chicago", // AL
  "354": "America/Chicago", "355": "America/Chicago", "356": "America/Chicago",
  "357": "America/Chicago", "358": "America/Chicago", "359": "America/Chicago",
  "360": "America/Chicago", "361": "America/Chicago", "362": "America/Chicago",
  "363": "America/Chicago", "364": "America/Chicago", "365": "America/Chicago",
  "366": "America/Chicago", "367": "America/Chicago", "368": "America/Chicago",
  "369": "America/Chicago",
  "370": "America/Chicago", "371": "America/Chicago", "372": "America/Chicago", // TN
  "373": "America/Chicago", "374": "America/Chicago", "375": "America/Chicago",
  "376": "America/Chicago", "377": "America/Chicago", "378": "America/Chicago",
  "379": "America/Chicago", "380": "America/Chicago", "381": "America/Chicago",
  "382": "America/Chicago", "383": "America/Chicago", "384": "America/Chicago",
  "385": "America/Chicago",
  "386": "America/New_York", "387": "America/New_York", // MS (mixed)
  "388": "America/Chicago", "389": "America/Chicago", "390": "America/Chicago",
  "391": "America/Chicago", "392": "America/Chicago", "393": "America/Chicago",
  "394": "America/Chicago", "395": "America/Chicago", "396": "America/Chicago",
  "397": "America/Chicago",
  "400": "America/Chicago", "401": "America/Chicago", "402": "America/Chicago", // KY
  "403": "America/Chicago", "404": "America/Chicago", "405": "America/Chicago",
  "406": "America/Chicago", "407": "America/Chicago", "408": "America/Chicago",
  "409": "America/Chicago", "410": "America/Chicago", "411": "America/Chicago",
  "412": "America/Chicago", "413": "America/Chicago", "414": "America/Chicago",
  "415": "America/Chicago", "416": "America/Chicago", "417": "America/Chicago",
  "418": "America/Chicago",
  "430": "America/Chicago", "431": "America/Chicago", "432": "America/Chicago", // OH
  "433": "America/Chicago", "434": "America/Chicago", "435": "America/Chicago",
  "436": "America/Chicago", "437": "America/Chicago", "438": "America/Chicago",
  "439": "America/Chicago",
  "460": "America/Chicago", "461": "America/Chicago", "462": "America/Chicago", // IN
  "463": "America/Chicago", "464": "America/Chicago", "465": "America/Chicago",
  "466": "America/Chicago", "467": "America/Chicago", "468": "America/Chicago",
  "469": "America/Chicago", "470": "America/Chicago", "471": "America/Chicago",
  "472": "America/Chicago", "473": "America/Chicago", "474": "America/Chicago",
  "475": "America/Chicago", "476": "America/Chicago", "477": "America/Chicago",
  "478": "America/Chicago", "479": "America/Chicago",
  "480": "America/Chicago", "481": "America/Chicago", "482": "America/Chicago", // MI (mixed)
  "483": "America/Chicago", "484": "America/Chicago", "485": "America/New_York",
  "486": "America/New_York", "487": "America/New_York", "488": "America/New_York",
  "489": "America/New_York", "490": "America/New_York", "491": "America/New_York",
  "492": "America/New_York", "493": "America/New_York", "494": "America/New_York",
  "495": "America/New_York", "496": "America/New_York", "497": "America/New_York",
  "498": "America/New_York", "499": "America/New_York",
  "530": "America/Chicago", "531": "America/Chicago", "532": "America/Chicago", // WI
  "534": "America/Chicago", "535": "America/Chicago", "537": "America/Chicago",
  "538": "America/Chicago", "539": "America/Chicago", "540": "America/Chicago",
  "541": "America/Chicago", "542": "America/Chicago", "543": "America/Chicago",
  "544": "America/Chicago", "545": "America/Chicago", "546": "America/Chicago",
  "547": "America/Chicago", "548": "America/Chicago", "549": "America/Chicago",
  "550": "America/Chicago", "551": "America/Chicago", "553": "America/Chicago", // MN
  "554": "America/Chicago", "555": "America/Chicago", "556": "America/Chicago",
  "557": "America/Chicago", "558": "America/Chicago", "559": "America/Chicago",
  "560": "America/Chicago", "561": "America/Chicago", "562": "America/Chicago",
  "563": "America/Chicago", "564": "America/Chicago", "565": "America/Chicago",
  "566": "America/Chicago", "567": "America/Chicago",
  "570": "America/Chicago", "571": "America/Chicago", "572": "America/Chicago", // SD (mixed)
  "573": "America/Chicago", "574": "America/Chicago", "575": "America/Chicago",
  "576": "America/Chicago", "577": "America/Chicago",
  "580": "America/Chicago", "581": "America/Chicago", "582": "America/Chicago", // ND (mixed)
  "583": "America/Chicago", "584": "America/Chicago", "585": "America/Chicago",
  "586": "America/Chicago", "587": "America/Chicago", "588": "America/Denver",
  "590": "America/Denver", "591": "America/Denver", "592": "America/Denver", // MT
  "593": "America/Denver", "594": "America/Denver", "595": "America/Denver",
  "596": "America/Denver", "597": "America/Denver", "598": "America/Denver",
  "599": "America/Denver",
  "600": "America/Chicago", "601": "America/Chicago", "602": "America/Chicago", // IL
  "603": "America/Chicago", "604": "America/Chicago", "605": "America/Chicago",
  "606": "America/Chicago", "607": "America/Chicago", "608": "America/Chicago",
  "609": "America/Chicago", "610": "America/Chicago", "611": "America/Chicago",
  "612": "America/Chicago", "613": "America/Chicago", "614": "America/Chicago",
  "615": "America/Chicago", "616": "America/Chicago", "617": "America/Chicago",
  "618": "America/Chicago", "619": "America/Chicago", "620": "America/Chicago",
  "622": "America/Chicago", "623": "America/Chicago", "624": "America/Chicago",
  "625": "America/Chicago", "626": "America/Chicago", "627": "America/Chicago",
  "628": "America/Chicago", "629": "America/Chicago",
  "630": "America/Chicago", "631": "America/Chicago", "633": "America/Chicago", // MO
  "634": "America/Chicago", "635": "America/Chicago", "636": "America/Chicago",
  "637": "America/Chicago", "638": "America/Chicago", "639": "America/Chicago",
  "640": "America/Chicago", "641": "America/Chicago", "644": "America/Chicago",
  "645": "America/Chicago", "646": "America/Chicago", "647": "America/Chicago",
  "648": "America/Chicago", "649": "America/Chicago", "650": "America/Chicago",
  "651": "America/Chicago", "652": "America/Chicago", "653": "America/Chicago",
  "654": "America/Chicago", "655": "America/Chicago", "656": "America/Chicago",
  "657": "America/Chicago", "658": "America/Chicago",
  "660": "America/Chicago", "661": "America/Chicago", "662": "America/Chicago", // KS
  "664": "America/Chicago", "665": "America/Chicago", "666": "America/Chicago",
  "667": "America/Chicago", "668": "America/Chicago", "669": "America/Chicago",
  "670": "America/Chicago", "671": "America/Chicago", "672": "America/Chicago",
  "673": "America/Chicago", "674": "America/Chicago", "675": "America/Chicago",
  "676": "America/Chicago", "677": "America/Chicago", "678": "America/Chicago",
  "679": "America/Chicago",
  "680": "America/Chicago", "681": "America/Chicago", "683": "America/Chicago", // NE
  "684": "America/Chicago", "685": "America/Chicago", "686": "America/Chicago",
  "687": "America/Chicago", "688": "America/Chicago", "689": "America/Chicago",
  "690": "America/Chicago", "691": "America/Chicago", "692": "America/Chicago",
  "693": "America/Denver",
  "700": "America/Chicago", "701": "America/Chicago", "703": "America/Chicago", // LA
  "704": "America/Chicago", "705": "America/Chicago", "706": "America/Chicago",
  "707": "America/Chicago", "708": "America/Chicago", "710": "America/Chicago",
  "711": "America/Chicago", "712": "America/Chicago", "713": "America/Chicago",
  "714": "America/Chicago",
  "716": "America/Chicago", "717": "America/Chicago", "718": "America/Chicago", // AR
  "719": "America/Chicago", "720": "America/Chicago", "721": "America/Chicago",
  "722": "America/Chicago", "723": "America/Chicago", "724": "America/Chicago",
  "725": "America/Chicago", "726": "America/Chicago", "727": "America/Chicago",
  "728": "America/Chicago", "729": "America/Chicago",
  "730": "America/Chicago", "731": "America/Chicago", "733": "America/Chicago", // OK
  "734": "America/Chicago", "735": "America/Chicago", "736": "America/Chicago",
  "737": "America/Chicago", "738": "America/Chicago", "739": "America/Chicago",
  "740": "America/Chicago", "741": "America/Chicago", "743": "America/Chicago",
  "744": "America/Chicago", "745": "America/Chicago", "746": "America/Chicago",
  "747": "America/Chicago", "748": "America/Chicago", "749": "America/Chicago",
  "750": "America/Chicago", "751": "America/Chicago", "752": "America/Chicago", // TX
  "753": "America/Chicago", "754": "America/Chicago", "755": "America/Chicago",
  "756": "America/Chicago", "757": "America/Chicago", "758": "America/Chicago",
  "759": "America/Chicago", "760": "America/Chicago", "761": "America/Chicago",
  "762": "America/Chicago", "763": "America/Chicago", "764": "America/Chicago",
  "765": "America/Chicago", "766": "America/Chicago", "767": "America/Chicago",
  "768": "America/Chicago", "769": "America/Chicago", "770": "America/Chicago",
  "772": "America/Chicago", "773": "America/Chicago", "774": "America/Chicago",
  "775": "America/Chicago", "776": "America/Chicago", "777": "America/Chicago",
  "778": "America/Chicago", "779": "America/Chicago", "780": "America/Chicago",
  "781": "America/Chicago", "782": "America/Chicago", "783": "America/Chicago",
  "784": "America/Chicago", "785": "America/Chicago", "786": "America/Chicago",
  "787": "America/Chicago", "788": "America/Chicago", "789": "America/Chicago",
  "790": "America/Chicago", "791": "America/Chicago", "792": "America/Chicago",
  "793": "America/Chicago", "794": "America/Chicago", "795": "America/Chicago",
  "796": "America/Chicago", "797": "America/Chicago", "798": "America/Denver",
  "799": "America/Denver",
  
  // Mountain Time
  "800": "America/Denver", "801": "America/Denver", "802": "America/Denver", // CO
  "803": "America/Denver", "804": "America/Denver", "805": "America/Denver",
  "806": "America/Denver", "807": "America/Denver", "808": "America/Denver",
  "809": "America/Denver", "810": "America/Denver", "811": "America/Denver",
  "812": "America/Denver", "813": "America/Denver", "814": "America/Denver",
  "815": "America/Denver", "816": "America/Denver",
  "820": "America/Denver", "821": "America/Denver", "822": "America/Denver", // WY
  "823": "America/Denver", "824": "America/Denver", "825": "America/Denver",
  "826": "America/Denver", "827": "America/Denver", "828": "America/Denver",
  "829": "America/Denver", "830": "America/Denver", "831": "America/Denver",
  "832": "America/Denver",
  "833": "America/Denver", "834": "America/Denver", "835": "America/Denver", // ID
  "836": "America/Denver", "837": "America/Denver", "838": "America/Denver",
  "840": "America/Denver", "841": "America/Denver", "842": "America/Denver", // UT
  "843": "America/Denver", "844": "America/Denver", "845": "America/Denver",
  "846": "America/Denver", "847": "America/Denver",
  "850": "America/Phoenix", "851": "America/Phoenix", "852": "America/Phoenix", // AZ (no DST)
  "853": "America/Phoenix", "855": "America/Phoenix", "856": "America/Phoenix",
  "857": "America/Phoenix", "858": "America/Phoenix", "859": "America/Phoenix",
  "860": "America/Phoenix",
  "863": "America/Denver", "864": "America/Denver", "865": "America/Denver", // Navajo Nation
  "870": "America/Denver", "871": "America/Denver", "872": "America/Denver", // NM
  "873": "America/Denver", "874": "America/Denver", "875": "America/Denver",
  "877": "America/Denver", "878": "America/Denver", "879": "America/Denver",
  "880": "America/Denver", "881": "America/Denver", "882": "America/Denver",
  "883": "America/Denver", "884": "America/Denver",
  "889": "America/Denver", // NV (split)
  "890": "America/Los_Angeles", "891": "America/Los_Angeles",
  "893": "America/Los_Angeles", "894": "America/Los_Angeles",
  "895": "America/Los_Angeles", "897": "America/Los_Angeles",
  "898": "America/Los_Angeles",
  
  // Pacific Time
  "900": "America/Los_Angeles", "901": "America/Los_Angeles", "902": "America/Los_Angeles", // CA
  "903": "America/Los_Angeles", "904": "America/Los_Angeles", "905": "America/Los_Angeles",
  "906": "America/Los_Angeles", "907": "America/Los_Angeles", "908": "America/Los_Angeles",
  "910": "America/Los_Angeles", "911": "America/Los_Angeles", "912": "America/Los_Angeles",
  "913": "America/Los_Angeles", "914": "America/Los_Angeles", "915": "America/Los_Angeles",
  "916": "America/Los_Angeles", "917": "America/Los_Angeles", "918": "America/Los_Angeles",
  "919": "America/Los_Angeles", "920": "America/Los_Angeles", "921": "America/Los_Angeles",
  "922": "America/Los_Angeles", "923": "America/Los_Angeles", "924": "America/Los_Angeles",
  "925": "America/Los_Angeles", "926": "America/Los_Angeles", "927": "America/Los_Angeles",
  "928": "America/Los_Angeles", "930": "America/Los_Angeles", "931": "America/Los_Angeles",
  "932": "America/Los_Angeles", "933": "America/Los_Angeles", "934": "America/Los_Angeles",
  "935": "America/Los_Angeles", "936": "America/Los_Angeles", "937": "America/Los_Angeles",
  "938": "America/Los_Angeles", "939": "America/Los_Angeles", "940": "America/Los_Angeles",
  "941": "America/Los_Angeles", "942": "America/Los_Angeles", "943": "America/Los_Angeles",
  "944": "America/Los_Angeles", "945": "America/Los_Angeles", "946": "America/Los_Angeles",
  "947": "America/Los_Angeles", "948": "America/Los_Angeles", "949": "America/Los_Angeles",
  "950": "America/Los_Angeles", "951": "America/Los_Angeles", "952": "America/Los_Angeles",
  "953": "America/Los_Angeles", "954": "America/Los_Angeles", "955": "America/Los_Angeles",
  "956": "America/Los_Angeles", "957": "America/Los_Angeles", "958": "America/Los_Angeles",
  "959": "America/Los_Angeles", "960": "America/Los_Angeles", "961": "America/Los_Angeles",
  "970": "America/Los_Angeles", "971": "America/Los_Angeles", "972": "America/Los_Angeles", // OR
  "973": "America/Los_Angeles", "974": "America/Los_Angeles", "975": "America/Los_Angeles",
  "976": "America/Los_Angeles", "977": "America/Los_Angeles", "978": "America/Los_Angeles",
  "979": "America/Los_Angeles",
  "980": "America/Los_Angeles", "981": "America/Los_Angeles", "982": "America/Los_Angeles", // WA
  "983": "America/Los_Angeles", "984": "America/Los_Angeles", "985": "America/Los_Angeles",
  "986": "America/Los_Angeles", "988": "America/Los_Angeles", "989": "America/Los_Angeles",
  "990": "America/Los_Angeles", "991": "America/Los_Angeles", "992": "America/Los_Angeles",
  "993": "America/Los_Angeles", "994": "America/Los_Angeles",
  "995": "America/Anchorage", "996": "America/Anchorage", "997": "America/Anchorage", // AK
  "998": "America/Anchorage", "999": "America/Anchorage",
  "967": "Pacific/Honolulu", "968": "Pacific/Honolulu", // HI
};

// Default timezone if ZIP not found
const DEFAULT_TIMEZONE = "America/Chicago";

// Business hours
const QUIET_HOURS_START = 21; // 9pm
const QUIET_HOURS_END = 8;    // 8am

export function getTimezoneForZip(zip: string | null | undefined): string {
  if (!zip) return DEFAULT_TIMEZONE;
  const prefix = zip.replace(/\D/g, "").slice(0, 3);
  return ZIP_TIMEZONE_MAP[prefix] ?? DEFAULT_TIMEZONE;
}

export function getLocalHour(timezone: string, date: Date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    });
    const hourStr = formatter.format(date);
    return parseInt(hourStr, 10);
  } catch {
    // Fallback to UTC offset guess
    return date.getUTCHours();
  }
}

export interface QuietHoursResult {
  canSend: boolean;
  reason?: string;
  localHour: number;
  timezone: string;
  nextSendAt?: Date;
}

/**
 * Check if a message can be sent now based on recipient's ZIP code.
 * Returns canSend: true if within 8am-9pm local time.
 */
export function checkQuietHours(zip: string | null | undefined): QuietHoursResult {
  const timezone = getTimezoneForZip(zip);
  const now = new Date();
  const localHour = getLocalHour(timezone, now);
  
  // Business hours: 8am to 9pm
  const canSend = localHour >= QUIET_HOURS_END && localHour < QUIET_HOURS_START;
  
  let reason: string | undefined;
  let nextSendAt: Date | undefined;
  
  if (!canSend) {
    if (localHour >= QUIET_HOURS_START) {
      reason = `Outside business hours (after 9pm local)`;
      // Next available: 8am tomorrow
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      nextSendAt = tomorrow;
    } else {
      reason = `Outside business hours (before 8am local)`;
      // Next available: 8am today
      const today = new Date(now);
      today.setHours(8, 0, 0, 0);
      nextSendAt = today;
    }
  }
  
  return {
    canSend,
    reason,
    localHour,
    timezone,
    nextSendAt,
  };
}

/**
 * Calculate when to send a message respecting quiet hours.
 * Returns the next valid send time.
 */
export function getNextSendTime(zip: string | null | undefined): Date {
  const result = checkQuietHours(zip);
  if (result.canSend) {
    return new Date();
  }
  return result.nextSendAt ?? new Date();
}
