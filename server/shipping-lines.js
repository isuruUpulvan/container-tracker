// Best-effort mapping from a container number's owner-code prefix (first 4
// characters, ISO 6346) to the carrier name ShipsGo expects in its
// {shippingLine} field. ShipsGo requires this field to match their internal
// shipping line list exactly (case doesn't seem to matter in practice for
// most integrations, but exact wording does) — if we're not confident, we
// fall back to "OTHERS", which ShipsGo's own docs say is a valid fallback
// value that lets their system attempt detection on its own.
//
// Only container numbers can be guessed this way. Bill of lading and booking
// numbers don't have a reliable prefix convention, so those always fall back
// to "OTHERS" unless the caller already knows the carrier.

const PREFIX_TO_LINE = {
  MAEU: "MAERSK LINE",
  MSCU: "MSC",
  MEDU: "MSC",
  CMAU: "CMA CGM",
  CGMU: "CMA CGM",
  HLXU: "HAPAG LLOYD",
  HLCU: "HAPAG LLOYD",
  COSU: "COSCO",
  OOLU: "OOCL",
  ONEY: "ONE (OCEAN NETWORK EXPRESS)",
  EGHU: "EVERGREEN",
  EISU: "EVERGREEN",
  HMMU: "HMM",
  HDMU: "HMM",
  YMLU: "YANG MING",
  WHLU: "WAN HAI LINES",
  ZIMU: "ZIM",
  PILU: "PIL",
  SITU: "SITC",
  TSLU: "TS LINES",
  KMTU: "SM LINE",
  SMLU: "SM LINE",
  APLU: "APL",
  NYKU: "NYK LINE",
  MOLU: "MOL",
};

function guessShippingLineFromContainerNumber(containerNumber) {
  if (!containerNumber || containerNumber.length < 4) return "OTHERS";
  const prefix = containerNumber.slice(0, 4).toUpperCase();
  return PREFIX_TO_LINE[prefix] || "OTHERS";
}

module.exports = { guessShippingLineFromContainerNumber, PREFIX_TO_LINE };
