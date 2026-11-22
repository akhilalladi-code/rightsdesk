export const SCHEMA_VERSION = 1;
export const LICENSE_LABELS = {
  unknown: 'Unknown — verify before use',
  CC0: 'CC0 / public domain dedication',
  'CC-BY': 'Creative Commons Attribution',
  'CC-BY-SA': 'Creative Commons Attribution-ShareAlike',
  'CC-BY-NC': 'Creative Commons Attribution-NonCommercial',
  commercial: 'Commercial stock license',
  'royalty-free': 'Royalty-free license (check terms)',
  paid: 'Purchased / paid license',
  client: 'Client supplied',
  custom: 'Custom permission / agreement'
};
const TYPES = ['Image', 'Font', 'Icon', 'Video', 'Audio', 'Template', 'Other'];
const STATUSES = ['needs-review', 'verified', 'restricted'];
const USES = ['Commercial', 'Social media', 'Print', 'Web', 'Paid advertising', 'Modification'];
const MAX_ASSETS = 5000;
export function cleanText(value, max = 800) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function isHttpUrl(value) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
}
export function validateAsset(input) {
  const errors = [], name = cleanText(input?.name, 120), sourceUrl = cleanText(input?.sourceUrl, 500), proofUrl = cleanText(input?.proofUrl, 500);
  if (!name) errors.push('Asset name is required.');
  if (!isHttpUrl(sourceUrl)) errors.push('Source URL must use HTTP or HTTPS.');
  if (!isHttpUrl(proofUrl)) errors.push('Proof URL must use HTTP or HTTPS.');
  if (input?.expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt)) errors.push('Expiry date must be a valid YYYY-MM-DD date.');
  if (input?.acquiredAt && !/^\d{4}-\d{2}-\d{2}$/.test(input.acquiredAt)) errors.push('Acquisition date must be a valid YYYY-MM-DD date.');
  return errors;
}
export function normalizeAsset(input, now = new Date()) {
  const raw = input && typeof input === 'object' ? input : {};
  const status = STATUSES.includes(raw.status) ? raw.status : 'needs-review';
  const type = TYPES.includes(raw.type) ? raw.type : 'Other';
  const license = Object.hasOwn(LICENSE_LABELS, raw.license) ? raw.license : 'unknown';
  const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(raw.expiresAt || '') ? raw.expiresAt : '';
  const acquiredAt = /^\d{4}-\d{2}-\d{2}$/.test(raw.acquiredAt || '') ? raw.acquiredAt : '';
  const uses = Array.isArray(raw.uses) ? [...new Set(raw.uses.filter(use => USES.includes(use)))] : [];
  const id = typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : `asset-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, name: cleanText(raw.name, 120), type, status, sourceUrl: isHttpUrl(cleanText(raw.sourceUrl, 500)) ? cleanText(raw.sourceUrl, 500) : '', creator: cleanText(raw.creator, 120), license, proofUrl: isHttpUrl(cleanText(raw.proofUrl, 500)) ? cleanText(raw.proofUrl, 500) : '', acquiredAt, expiresAt, uses, attribution: cleanText(raw.attribution, 500), notes: cleanText(raw.notes, 800), createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now.toISOString(), updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now.toISOString() };
}
export function normalizeLibrary(data, now = new Date()) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Import must be a JSON object.');
  if (data.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported backup version. Expected ${SCHEMA_VERSION}.`);
  if (!Array.isArray(data.assets)) throw new Error('Backup is missing the assets array.');
  if (data.assets.length > MAX_ASSETS) throw new Error(`Backup exceeds the ${MAX_ASSETS.toLocaleString()} asset limit.`);
  return data.assets.map(item => normalizeAsset(item, now));
}
export function expiryState(asset, today = new Date()) {
  if (!asset.expiresAt) return 'none';
  const expiry = new Date(`${asset.expiresAt}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return 'none';
  const current = new Date(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`);
  const days = Math.ceil((expiry - current) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'valid';
}
export function effectiveStatus(asset, today = new Date()) { return expiryState(asset, today) === 'expired' ? 'expired' : asset.status; }
export function needsReview(asset) { return asset.status === 'needs-review' || asset.license === 'unknown' || !asset.sourceUrl || !asset.proofUrl; }
export function summarize(assets, today = new Date()) {
  return { total: assets.length, needsReview: assets.filter(needsReview).length, expiring: assets.filter(asset => expiryState(asset, today) === 'soon').length, attribution: assets.filter(asset => Boolean(asset.attribution)).length };
}
export function filterAssets(assets, { query = '', status = 'all', type = 'all' } = {}, today = new Date()) {
  const needle = query.trim().toLowerCase();
  return assets.filter(asset => {
    const matchesQuery = !needle || [asset.name, asset.creator, asset.sourceUrl, asset.license, asset.notes].some(value => value.toLowerCase().includes(needle));
    const currentStatus = effectiveStatus(asset, today);
    const matchesStatus = status === 'all' || (status === 'needs-review' ? needsReview(asset) : currentStatus === status);
    return matchesQuery && matchesStatus && (type === 'all' || asset.type === type);
  }).sort((a, b) => a.name.localeCompare(b.name));
}
export function toCsv(assets) {
  const headers = ['name', 'type', 'status', 'creator', 'license', 'sourceUrl', 'proofUrl', 'acquiredAt', 'expiresAt', 'uses', 'attribution', 'notes'];
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [headers.map(quote).join(','), ...assets.map(asset => headers.map(key => quote(Array.isArray(asset[key]) ? asset[key].join('; ') : asset[key])).join(','))].join('\r\n');
}
export function toAttributionMarkdown(assets) {
  const lines = ['# Creative asset attribution report', '', `Generated: ${new Date().toISOString().slice(0, 10)}`, '', 'This report reproduces attribution notes recorded by the user. Verify each original license and its current terms before publication.', ''];
  for (const asset of assets) lines.push(`## ${asset.name}`, `- Creator: ${asset.creator || 'Not recorded'}`, `- License: ${LICENSE_LABELS[asset.license] || asset.license}`, `- Source: ${asset.sourceUrl || 'Not recorded'}`, `- Proof: ${asset.proofUrl || 'Not recorded'}`, `- Recorded uses: ${asset.uses.length ? asset.uses.join(', ') : 'Not recorded'}`, `- Status: ${effectiveStatus(asset)}`, `- Attribution: ${asset.attribution || 'No attribution text recorded'}`, '');
  return lines.join('\n');
}