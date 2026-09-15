// platform/functions/advisor-directory.mjs
function verifiedProfiles(raw) {
  let profiles = [];
  try {
    profiles = JSON.parse(raw || "[]");
  } catch {
    return [];
  }
  return profiles.filter((p) => p.publishConsent === true && p.reviewedBy && p.reviewedAt && p.verificationUrl && /^https:\/\//.test(p.verificationUrl) && p.name && p.id).map((p) => ({ id: String(p.id).slice(0, 80), name: String(p.name).slice(0, 150), practice: String(p.practice || "").slice(0, 150), region: String(p.region || "").slice(0, 120), specialties: Array.isArray(p.specialties) ? p.specialties.map(String).slice(0, 12) : [], formats: Array.isArray(p.formats) ? p.formats.map(String).slice(0, 4) : [], credentials: String(p.credentials || "").slice(0, 1e3), verificationUrl: p.verificationUrl, reviewedBy: String(p.reviewedBy).slice(0, 150), reviewedAt: String(p.reviewedAt).slice(0, 40), website: /^https:\/\//.test(p.website || "") ? p.website : "", fees: String(p.fees || "Discuss directly with the advisor.").slice(0, 500) }));
}
var advisor_directory_default = async (request) => {
  if (request.method !== "GET") return Response.json({ error: "Use GET." }, { status: 405 });
  return Response.json({ profiles: verifiedProfiles(process.env.LT_VERIFIED_ADVISORS), notice: "Verification records are supplied by the LifeTogether review team. Confirm current credentials, scope, availability and fees directly before engaging an advisor." }, { headers: { "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
};
export {
  advisor_directory_default as default,
  verifiedProfiles
};
