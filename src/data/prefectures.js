// All 47 Japanese prefectures with their akiya-bank entry point.
//
// Municipal akiya banks are run city-by-city and their URLs change often,
// so deep-linking every town is unreliable. Each prefecture instead links
// to the national 空き家バンク aggregator (iju-join, run with MLIT) which
// lets the user drill into that prefecture's municipal listings. Verify
// the specific municipality's terms before acting — figures and residency
// conditions vary widely.

const NATIONAL_BANK = 'https://www.iju-join.jp/akiyabank/';

function bank(slug) {
  // iju-join groups by prefecture; this is a stable search entry.
  return `${NATIONAL_BANK}?pref=${encodeURIComponent(slug)}`;
}

export const PREFECTURES_47 = [
  { en: 'Hokkaido', ja: '北海道' },
  { en: 'Aomori', ja: '青森県' },
  { en: 'Iwate', ja: '岩手県' },
  { en: 'Miyagi', ja: '宮城県' },
  { en: 'Akita', ja: '秋田県' },
  { en: 'Yamagata', ja: '山形県' },
  { en: 'Fukushima', ja: '福島県' },
  { en: 'Ibaraki', ja: '茨城県' },
  { en: 'Tochigi', ja: '栃木県' },
  { en: 'Gunma', ja: '群馬県' },
  { en: 'Saitama', ja: '埼玉県' },
  { en: 'Chiba', ja: '千葉県' },
  { en: 'Tokyo', ja: '東京都' },
  { en: 'Kanagawa', ja: '神奈川県' },
  { en: 'Niigata', ja: '新潟県' },
  { en: 'Toyama', ja: '富山県' },
  { en: 'Ishikawa', ja: '石川県' },
  { en: 'Fukui', ja: '福井県' },
  { en: 'Yamanashi', ja: '山梨県' },
  { en: 'Nagano', ja: '長野県' },
  { en: 'Gifu', ja: '岐阜県' },
  { en: 'Shizuoka', ja: '静岡県' },
  { en: 'Aichi', ja: '愛知県' },
  { en: 'Mie', ja: '三重県' },
  { en: 'Shiga', ja: '滋賀県' },
  { en: 'Kyoto', ja: '京都府' },
  { en: 'Osaka', ja: '大阪府' },
  { en: 'Hyogo', ja: '兵庫県' },
  { en: 'Nara', ja: '奈良県' },
  { en: 'Wakayama', ja: '和歌山県' },
  { en: 'Tottori', ja: '鳥取県' },
  { en: 'Shimane', ja: '島根県' },
  { en: 'Okayama', ja: '岡山県' },
  { en: 'Hiroshima', ja: '広島県' },
  { en: 'Yamaguchi', ja: '山口県' },
  { en: 'Tokushima', ja: '徳島県' },
  { en: 'Kagawa', ja: '香川県' },
  { en: 'Ehime', ja: '愛媛県' },
  { en: 'Kochi', ja: '高知県' },
  { en: 'Fukuoka', ja: '福岡県' },
  { en: 'Saga', ja: '佐賀県' },
  { en: 'Nagasaki', ja: '長崎県' },
  { en: 'Kumamoto', ja: '熊本県' },
  { en: 'Oita', ja: '大分県' },
  { en: 'Miyazaki', ja: '宮崎県' },
  { en: 'Kagoshima', ja: '鹿児島県' },
  { en: 'Okinawa', ja: '沖縄県' },
].map((p) => ({ ...p, bankUrl: bank(p.ja) }));

// Bilingual agents/services that work with foreign akiya buyers. These are
// well-known English-facing services; treat as a starting directory, not an
// endorsement.
export const AGENTS = [
  {
    name: 'Akiya & Inaka',
    lang: 'EN / JP',
    focus: 'Rural akiya sourcing & renovation, nationwide',
    url: 'https://www.akiya-inaka.com/',
  },
  {
    name: 'Cheap Houses Japan',
    lang: 'EN',
    focus: 'Curated low-cost listings newsletter & buyer support',
    url: 'https://cheaphousesjapan.com/',
  },
  {
    name: 'LIFULL HOME’S Akiya Bank',
    lang: 'JP (EN via translate)',
    focus: 'Largest national akiya bank aggregator',
    url: 'https://www.homes.co.jp/akiyabank/',
  },
  {
    name: 'Japan Property Central',
    lang: 'EN',
    focus: 'Tokyo & nationwide agency, foreign-buyer guidance',
    url: 'https://japanpropertycentral.com/',
  },
  {
    name: 'Real Estate Japan',
    lang: 'EN',
    focus: 'Listings + how-to guides for non-residents',
    url: 'https://realestate.co.jp/',
  },
];
