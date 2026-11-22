function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; } }
function requireRole(roles) {
  const user = getUser();
  if (!getToken() || !user || !roles.includes(user.role)) { window.location.href = 'login.html'; return null; }
  return user;
}
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {}); const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const opts = Object.assign({}, options, { headers });
  if (opts.body && !(opts.body instanceof FormData)) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.body); }
  const response = await fetch(API_URL + path, opts); let data = null;
  try { data = await response.json(); } catch (e) { /* non-JSON response */ }
  if (response.status === 401 && token) { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = 'login.html'; }
  if (!response.ok) throw new Error((data && data.message) || 'Request failed (' + response.status + ')');
  return data;
}
function parseDbDate(value) {
  if (!value) return null;
  return new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ','T') : value);
}
function formatDate(value) { const d = parseDbDate(value); return !d || isNaN(d) ? '-' : d.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function toInputValue(value) { const d=parseDbDate(value); if(!d||isNaN(d)) return ''; const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function bannerHtml(path, title) { return path ? `<img class="banner" src="${API_URL}/${escapeHtml(path)}" alt="${escapeHtml(title)}">` : '<div class="banner banner-placeholder"></div>'; }
function statusBadge(status) { const label=String(status||'').charAt(0).toUpperCase()+String(status||'').slice(1); return `<span class="badge badge-${escapeHtml(status)}">${escapeHtml(label)}</span>`; }
function showToast(message, type='success') { let box=document.getElementById('toast-box'); if(!box){box=document.createElement('div');box.id='toast-box';document.body.appendChild(box);} const toast=document.createElement('div');toast.className='toast '+type;toast.textContent=message;box.appendChild(toast);setTimeout(()=>toast.remove(),3500); }
