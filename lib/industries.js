// Canonical industry list for lead capture.
//
// Built from the 215 distinct free-text values that had accumulated in
// CampaignData.industry across ~1,200 leads. Nearly all of that spread was
// spelling and casing noise, not real variety: "IT" / "It" / "it" / "iT" /
// "Technologies" / "Software" were one thing (~490 leads), and "Manufacturing"
// had thirteen misspellings ("Manifacturing", "Manufacuting", "Mfg", ...).
//
// Kept deliberately short — only categories with real volume behind them. The
// long tail (Insurance, BPO, Energy, Government, Travel, Architecture, each
// under ten leads) folds into the nearest heading or into Other, rather than
// turning this into a wall nobody reads.
//
// Excluded: job titles typed into the wrong box ("Admin Head", "It head"), and
// junk — a longitude ("73.4167938107609"), an email address, "Wagholi".
//
// Existing leads keep whatever free text they already hold. This list governs
// new capture only; no back-fill, no rewriting of history.
//
// Alphabetical so a native <select> gives usable type-ahead. OTHER_INDUSTRY
// stays last and reveals a text box — a BDM meeting a genuinely new industry
// must not be pushed into picking something wrong, and what they type is the
// signal for what belongs on this list next.
export const OTHER_INDUSTRY = 'Other';

export const INDUSTRIES = [
  'Automotive',
  'Banking & Finance',
  'Construction & Infrastructure',
  'Consulting',
  'Coworking Spaces',
  'Education',
  'Engineering & Industrial',
  'Food & Agriculture',
  'Healthcare & Hospitals',
  'Hospitality & Hotels',
  'Information Technology',
  'Logistics & Transport',
  'Manufacturing',
  'Media & Entertainment',
  'Pharmaceuticals',
  'Professional Services',
  'Real Estate',
  'Telecom & ISP',
  OTHER_INDUSTRY,
];
