import { LICENSE_LABELS, validateAsset, normalizeAsset, normalizeLibrary, summarize, expiryState, effectiveStatus, needsReview, filterAssets, toCsv, toAttributionMarkdown } from './core.js';

const STORAGE_KEY = 'rightsdesk.library.v1';
const $ = selector => document.querySelector(selector);
const elements = {
  list: $('#assetList'), empty: $('#emptyState'), dialog: $('#assetDialog'), form: $('#assetForm'), error: $('#formError'), toast: $('#toast'),
  total: $('#totalCount'), review: $('#reviewCount'), expiring: $('#expiringCount'), attribution: $('#attributionCount')
};
let assets = loadLibrary();
let toastTimer;
function loadLibrary() {
  try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"schemaVersion":1,"assets":[]}'); return normalizeLibrary(parsed); }
  catch { return []; }
}
function saveLibrary() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), assets })); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function showToast(message) {
  elements.toast.textContent = message; elements.toast.classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('visible'), 2600);
}
function download(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type }), url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
function render() {
  const counts = summarize(assets);
  elements.total.textContent = counts.total; elements.review.textContent = counts.needsReview; elements.expiring.textContent = counts.expiring; elements.attribution.textContent = counts.attribution;
  const visible = filterAssets(assets, { query: $('#searchInput').value, status: $('#statusFilter').value, type: $('#typeFilter').value });
  elements.empty.hidden = assets.length > 0;
  elements.list.innerHTML = visible.length ? visible.map(asset => {
    const status = effectiveStatus(asset), expiry = expiryState(asset);
    const badge = status === 'verified' ? 'badge-green' : status === 'restricted' ? 'badge-amber' : status === 'expired' ? 'badge-red' : 'badge-muted';
    const expiryLabel = expiry === 'soon' ? '<span class="expiry expiry-soon">Expires within 30 days</span>' : expiry === 'expired' ? '<span class="expiry expiry-expired">Expired</span>' : '';
    const source = asset.sourceUrl ? `<a href="${escapeHtml(asset.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : '<span class="muted">No source link</span>';
    return `<article class="asset-card" data-id="${escapeHtml(asset.id)}">
      <div class="asset-icon">${iconFor(asset.type)}</div>
      <div class="asset-main"><div class="asset-title-row"><h3>${escapeHtml(asset.name)}</h3><span class="badge ${badge}">${escapeHtml(statusLabel(status))}</span></div>
      <p class="asset-meta">${escapeHtml(asset.type)} · ${escapeHtml(asset.creator || 'Creator not recorded')} · ${escapeHtml(LICENSE_LABELS[asset.license])}</p>
      <div class="asset-details">${source}${asset.proofUrl ? `<a href="${escapeHtml(asset.proofUrl)}" target="_blank" rel="noopener noreferrer">License proof ↗</a>` : '<span class="muted">No proof link</span>'}${expiryLabel}</div>
      ${asset.attribution ? `<p class="credit-line"><strong>Credit:</strong> ${escapeHtml(asset.attribution)}</p>` : ''}
      <div class="asset-footer"><span>${needsReview(asset) ? 'Review source terms before use' : `${asset.uses.length} permitted-use note${asset.uses.length === 1 ? '' : 's'} recorded`}</span><div class="card-actions"><button class="text-button" data-action="edit">Edit</button><button class="text-button" data-action="copy">Copy credit</button><button class="text-button danger-text" data-action="delete">Delete</button></div></div></div></article>`;
  }).join('') : assets.length ? '<div class="no-results">No assets match these filters. Try another search or status.</div>' : '';
}
function statusLabel(status) { return ({ 'needs-review': 'Needs review', verified: 'Verified', restricted: 'Restricted', expired: 'Expired' })[status] || status; }
function iconFor(type) { return ({ Image: '▧', Font: 'Aa', Icon: '✣', Video: '▷', Audio: '♫', Template: '▤', Other: '◈' })[type] || '◈'; }
function openForm(asset) {
  elements.form.reset(); elements.error.textContent = ''; $('#assetId').value = asset?.id || '';
  $('#dialogTitle').textContent = asset ? 'Edit asset' : 'Add an asset'; $('#saveButton').textContent = asset ? 'Save changes' : 'Save asset';
  for (const key of ['name', 'type', 'status', 'sourceUrl', 'creator', 'license', 'proofUrl', 'acquiredAt', 'expiresAt', 'attribution', 'notes']) {
    const input = $(`#${key}`); if (asset) input.value = asset[key] ?? (key === 'status' ? 'needs-review' : '');
  }
  document.querySelectorAll('input[name="uses"]').forEach(input => { input.checked = Boolean(asset?.uses?.includes(input.value)); });
  elements.dialog.showModal(); $('#name').focus();
}
function readForm() {
  return { id: $('#assetId').value || `asset-${crypto.randomUUID()}`, name: $('#name').value, type: $('#type').value, status: $('#status').value,
    sourceUrl: $('#sourceUrl').value, creator: $('#creator').value, license: $('#license').value, proofUrl: $('#proofUrl').value,
    acquiredAt: $('#acquiredAt').value, expiresAt: $('#expiresAt').value,
    uses: [...document.querySelectorAll('input[name="uses"]:checked')].map(input => input.value),
    attribution: $('#attribution').value, notes: $('#notes').value };
}
elements.form.addEventListener('submit', event => {
  event.preventDefault(); const input = readForm(), errors = validateAsset(input);
  if (errors.length) { elements.error.textContent = errors.join(' '); return; }
  const previous = assets.find(asset => asset.id === input.id);
  const normalized = normalizeAsset({ ...input, createdAt: previous?.createdAt, updatedAt: new Date().toISOString() });
  assets = previous ? assets.map(asset => asset.id === input.id ? normalized : asset) : [normalized, ...assets];
  saveLibrary(); render(); elements.dialog.close(); showToast(previous ? 'Asset updated.' : 'Asset added.');
});
$('#newAssetButton').addEventListener('click', () => openForm());
$('#emptyAddButton').addEventListener('click', () => openForm());
$('#closeDialogButton').addEventListener('click', () => elements.dialog.close());
$('#cancelButton').addEventListener('click', () => elements.dialog.close());
['searchInput', 'statusFilter', 'typeFilter'].forEach(id => $(`#${id}`).addEventListener('input', render));
elements.list.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const card = button.closest('[data-id]'), asset = assets.find(item => item.id === card?.dataset.id); if (!asset) return;
  if (button.dataset.action === 'edit') openForm(asset);
  if (button.dataset.action === 'delete' && confirm(`Delete “${asset.name}” from this device?`)) { assets = assets.filter(item => item.id !== asset.id); saveLibrary(); render(); showToast('Asset deleted.'); }
  if (button.dataset.action === 'copy') {
    const text = asset.attribution || `${asset.name} — ${asset.creator || 'creator not recorded'} (${LICENSE_LABELS[asset.license]})`;
    try { await navigator.clipboard.writeText(text); showToast('Credit copied.'); } catch { showToast('Clipboard access was blocked by this browser.'); }
  }
});
$('#exportJsonButton').addEventListener('click', () => download('rightsdesk-backup.json', JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), assets }, null, 2), 'application/json'));
$('#exportCsvButton').addEventListener('click', () => download('rightsdesk-assets.csv', toCsv(assets), 'text/csv;charset=utf-8'));
$('#exportCreditsButton').addEventListener('click', () => download('rightsdesk-attribution-report.md', toAttributionMarkdown(assets), 'text/markdown;charset=utf-8'));
$('#importButton').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Backup must be smaller than 5 MB.');
    const parsed = JSON.parse(await file.text()), incoming = normalizeLibrary(parsed);
    if (!confirm(`Import ${incoming.length} assets? This replaces the current ${assets.length}-asset register.`)) return;
    assets = incoming; saveLibrary(); render(); showToast(`${assets.length} assets imported.`);
  } catch (error) { showToast(error.message || 'Could not read this backup.'); }
  finally { event.target.value = ''; }
});
render();
