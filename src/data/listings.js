// Phase 1 demo data. In Phase 2 this static array is replaced by live
// Supabase queries (see src/lib/supabase.js). Keep the shape stable so the
// swap is a drop-in.
//
// condition: 'move-in' | 'needs-work' | 'tear-down'
// locality:  'rural' | 'typical' | 'urban'  (feeds calcTax assessed ratio)
// price:     JPY, 0 = free akiya-bank giveaway

export const CONDITIONS = {
  'move-in': { label: 'Move-in ready', color: '#2e7d32' },
  'needs-work': { label: 'Needs work', color: '#bc7a2e' },
  'tear-down': { label: 'Tear-down / land value', color: '#bc2e2e' },
};

export const PREFECTURES = [
  'Hokkaido',
  'Nagano',
  'Niigata',
  'Gifu',
  'Wakayama',
  'Tokushima',
  'Kochi',
  'Ehime',
  'Oita',
  'Kagoshima',
];

export const LISTINGS = [
  {
    id: 'aky-001',
    title: 'Mountain-view minka with timber beams',
    prefecture: 'Nagano',
    city: 'Iiyama',
    price: 0,
    isFree: true,
    condition: 'needs-work',
    locality: 'rural',
    sizeM2: 142,
    landM2: 530,
    yearBuilt: 1968,
    bedrooms: 4,
    lat: 36.8514,
    lng: 138.366,
    image: 'https://picsum.photos/seed/aky001/800/520',
    description:
      'Traditional kominka offered free through the Iiyama akiya bank. ' +
      'Solid post-and-beam structure, deep snow-country roof, large ' +
      'engawa veranda. Needs roof and plumbing work. Buyer pays only ' +
      'transfer registration.',
  },
  {
    id: 'aky-002',
    title: 'Renovated machiya near Kochi castle',
    prefecture: 'Kochi',
    city: 'Kochi',
    price: 8_900_000,
    isFree: false,
    condition: 'move-in',
    locality: 'urban',
    sizeM2: 96,
    landM2: 110,
    yearBuilt: 1979,
    bedrooms: 3,
    lat: 33.5597,
    lng: 133.5311,
    image: 'https://picsum.photos/seed/aky002/800/520',
    description:
      'Fully renovated townhouse, walking distance to Kochi Castle and ' +
      'the Sunday market. New kitchen, retiled bath, insulated. ' +
      'Move-in ready, ideal for a remote-work base.',
  },
  {
    id: 'aky-003',
    title: 'Coastal farmhouse with citrus grove',
    prefecture: 'Ehime',
    city: 'Yawatahama',
    price: 2_300_000,
    isFree: false,
    condition: 'needs-work',
    locality: 'rural',
    sizeM2: 118,
    landM2: 940,
    yearBuilt: 1972,
    bedrooms: 3,
    lat: 33.4626,
    lng: 132.4231,
    image: 'https://picsum.photos/seed/aky003/800/520',
    description:
      'Hillside farmhouse overlooking the Uwa Sea with a producing ' +
      'mikan citrus grove on the land. Habitable but dated interior. ' +
      'Strong potential for a small agritourism stay.',
  },
  {
    id: 'aky-004',
    title: 'Free snow-country house, large workshop',
    prefecture: 'Niigata',
    city: 'Tokamachi',
    price: 0,
    isFree: true,
    condition: 'needs-work',
    locality: 'rural',
    sizeM2: 165,
    landM2: 680,
    yearBuilt: 1965,
    bedrooms: 5,
    lat: 37.1278,
    lng: 138.7558,
    image: 'https://picsum.photos/seed/aky004/800/520',
    description:
      'Offered free via the Tokamachi akiya bank. Detached workshop ' +
      'building plus main house. Heavy snow region — reinforced ' +
      'structure. Requires interior modernisation.',
  },
  {
    id: 'aky-005',
    title: 'Tear-down lot, river frontage',
    prefecture: 'Gifu',
    city: 'Gujo',
    price: 1_200_000,
    isFree: false,
    condition: 'tear-down',
    locality: 'rural',
    sizeM2: 88,
    landM2: 410,
    yearBuilt: 1958,
    bedrooms: 3,
    lat: 35.7486,
    lng: 136.9636,
    image: 'https://picsum.photos/seed/aky005/800/520',
    description:
      'Priced for land value. Existing structure is beyond economical ' +
      'repair — best demolished and rebuilt. Quiet riverside parcel in ' +
      'the historic water town of Gujo Hachiman.',
  },
  {
    id: 'aky-006',
    title: 'Hokkaido cabin near ski fields',
    prefecture: 'Hokkaido',
    city: 'Kutchan',
    price: 14_500_000,
    isFree: false,
    condition: 'move-in',
    locality: 'typical',
    sizeM2: 104,
    landM2: 600,
    yearBuilt: 1995,
    bedrooms: 3,
    lat: 42.9018,
    lng: 140.7593,
    image: 'https://picsum.photos/seed/aky006/800/520',
    description:
      'Insulated four-season cabin near the Niseko/Kutchan ski area. ' +
      'Wood stove, double glazing, snow-load roof. Move-in ready with ' +
      'strong winter rental demand.',
  },
  {
    id: 'aky-007',
    title: 'Onsen-town house, walk to baths',
    prefecture: 'Oita',
    city: 'Beppu',
    price: 4_700_000,
    isFree: false,
    condition: 'needs-work',
    locality: 'urban',
    sizeM2: 92,
    landM2: 95,
    yearBuilt: 1981,
    bedrooms: 3,
    lat: 33.2846,
    lng: 131.4914,
    image: 'https://picsum.photos/seed/aky007/800/520',
    description:
      'Compact house in Beppu, minutes on foot from public onsen. ' +
      'Cosmetic renovation needed. City-centre location with year-round ' +
      'tourism footfall.',
  },
  {
    id: 'aky-008',
    title: 'Free village house with rice paddy',
    prefecture: 'Tokushima',
    city: 'Miyoshi',
    price: 0,
    isFree: true,
    condition: 'needs-work',
    locality: 'rural',
    sizeM2: 130,
    landM2: 1_250,
    yearBuilt: 1963,
    bedrooms: 4,
    lat: 34.0211,
    lng: 133.8056,
    image: 'https://picsum.photos/seed/aky008/800/520',
    description:
      'Iya Valley region akiya offered free, includes an adjoining ' +
      'rice paddy and vegetable plot. Remote and scenic. Buyer commits ' +
      'to residency or restoration per the local bank terms.',
  },
  {
    id: 'aky-009',
    title: 'Seaside cottage, Kagoshima bay',
    prefecture: 'Kagoshima',
    city: 'Tarumizu',
    price: 3_600_000,
    isFree: false,
    condition: 'move-in',
    locality: 'typical',
    sizeM2: 86,
    landM2: 320,
    yearBuilt: 1988,
    bedrooms: 2,
    lat: 31.4911,
    lng: 130.7036,
    image: 'https://picsum.photos/seed/aky009/800/520',
    description:
      'Tidy two-bedroom cottage with Sakurajima volcano views across ' +
      'the bay. Recently re-roofed, ready to occupy. Mild climate, ' +
      'low cost of living.',
  },
  {
    id: 'aky-010',
    title: 'Forest retreat with cedar grounds',
    prefecture: 'Wakayama',
    city: 'Tanabe',
    price: 5_900_000,
    isFree: false,
    condition: 'needs-work',
    locality: 'rural',
    sizeM2: 124,
    landM2: 1_010,
    yearBuilt: 1976,
    bedrooms: 3,
    lat: 33.7297,
    lng: 135.3781,
    image: 'https://picsum.photos/seed/aky010/800/520',
    description:
      'Secluded house on cedar-wooded grounds near the Kumano Kodo ' +
      'pilgrimage route. Structurally sound, interior needs updating. ' +
      'Excellent for a guesthouse or writer/artist retreat.',
  },
];
