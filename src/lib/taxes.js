// Japanese property tax + acquisition cost estimator.
//
// Recurring annual taxes are levied on the *assessed* value (固定資産税評価額),
// which is well below market price. We approximate the assessed value as a
// ratio of the listing price depending on how rural the location is.
//
//   Fixed Asset Tax (固定資産税)      1.4% / yr   — nationwide standard rate
//   City Planning Tax (都市計画税)   0–0.3% / yr — only inside designated
//                                                   urbanization promotion areas
//
// One-time acquisition costs (skipped entirely for free / ¥0 "giveaway"
// properties, which typically transfer via the akiya bank with the seller
// covering or waiving these):
//
//   Real Estate Acquisition Tax (不動産取得税) ~3% of assessed value
//   Registration & License Tax (登録免許税)    ~2% of assessed value
//   Stamp Duty (印紙税)                        flat, scaled by price band
//   Agent commission (仲介手数料)              3% + ¥60,000 + 10% consumption tax

export const ASSESSED_RATIOS = {
  rural: 0.5, // remote village akiya
  typical: 0.7, // default
  urban: 0.9, // dense city lot
};

const FIXED_ASSET_RATE = 0.014;
const CITY_PLANNING_MAX_RATE = 0.003;
const ACQUISITION_TAX_RATE = 0.03;
const REGISTRATION_TAX_RATE = 0.02;

// Japanese stamp duty on the sale contract, by price band (post-2014 reduced
// rates for real estate sale contracts).
function stampDuty(price) {
  if (price <= 0) return 0;
  if (price <= 1_000_000) return 500;
  if (price <= 5_000_000) return 1_000;
  if (price <= 10_000_000) return 5_000;
  if (price <= 50_000_000) return 10_000;
  return 30_000;
}

function agentCommission(price) {
  if (price <= 0) return 0;
  // Standard Japanese cap: 3% + ¥60,000, plus 10% consumption tax.
  return Math.round((price * 0.03 + 60_000) * 1.1);
}

/**
 * @param {number} price            Listing price in JPY (0 = free giveaway).
 * @param {object} [opts]
 * @param {keyof typeof ASSESSED_RATIOS} [opts.locality='typical']
 * @param {number} [opts.cityPlanningRate=CITY_PLANNING_MAX_RATE]  0–0.003
 * @returns {{
 *   assessedValue: number,
 *   annual: { fixedAsset: number, cityPlanning: number, total: number },
 *   acquisition: { acquisitionTax: number, registrationTax: number,
 *                  stampDuty: number, agentCommission: number, total: number },
 *   isFree: boolean
 * }}
 */
export function calcTax(price, opts = {}) {
  const { locality = 'typical', cityPlanningRate = CITY_PLANNING_MAX_RATE } =
    opts;

  const ratio = ASSESSED_RATIOS[locality] ?? ASSESSED_RATIOS.typical;
  const isFree = !price || price <= 0;
  const assessedValue = Math.round(price * ratio);

  const fixedAsset = Math.round(assessedValue * FIXED_ASSET_RATE);
  const cityPlanning = Math.round(
    assessedValue * Math.min(Math.max(cityPlanningRate, 0), CITY_PLANNING_MAX_RATE)
  );

  // Free properties skip every one-time acquisition cost.
  const acquisitionTax = isFree
    ? 0
    : Math.round(assessedValue * ACQUISITION_TAX_RATE);
  const registrationTax = isFree
    ? 0
    : Math.round(assessedValue * REGISTRATION_TAX_RATE);
  const duty = isFree ? 0 : stampDuty(price);
  const commission = isFree ? 0 : agentCommission(price);

  return {
    assessedValue,
    annual: {
      fixedAsset,
      cityPlanning,
      total: fixedAsset + cityPlanning,
    },
    acquisition: {
      acquisitionTax,
      registrationTax,
      stampDuty: duty,
      agentCommission: commission,
      total: acquisitionTax + registrationTax + duty + commission,
    },
    isFree,
  };
}

export const USD_PER_YEN = 1 / 155; // ~¥155 / USD

export function yenToUsd(yen) {
  return Math.round(yen * USD_PER_YEN);
}

export function formatYen(yen) {
  if (!yen || yen <= 0) return 'Free';
  return '¥' + yen.toLocaleString('ja-JP');
}

export function formatUsd(yen) {
  if (!yen || yen <= 0) return '$0';
  return '~$' + yenToUsd(yen).toLocaleString('en-US');
}

// Japanese listings quote area in m². Foreign buyers think in sq ft.
export function m2ToSqft(m2) {
  return Math.round(m2 * 10.7639);
}
