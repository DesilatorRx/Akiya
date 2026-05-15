// Single source of truth for affiliate / referral URLs. Swap a value
// here when a program is approved — every place in the UI updates.
//
// Wise: via Partnerize. When approved you'll get a tracking link. It is
// usually either:
//   1. a click URL:  https://wise.prf.hn/click/camref:1011xxxxx/...
//   2. a deep link that accepts a destination:
//      https://wise.prf.hn/click/camref:1011xxxxx/destination:https%3A%2F%2Fwise.com%2F...
// Paste whichever Partnerize gives you as WISE below (keep it a string).

export const AFFILIATES = {
  // TODO: replace with the approved Partnerize tracking URL.
  wise: 'https://wise.com/',
};
