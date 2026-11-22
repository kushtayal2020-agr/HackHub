(function () {
  if (!getToken()) return;
  const host = document.querySelector('#navbar, nav, header');
  if (!host) return;
  const wrap = document.createElement('div');
  wrap.className = 'bell-wrap';
  wrap.innerHTML = '<button class="bell-btn" id="bell-btn" aria-label="Notifications">&#128276;<span class="bell-count" id="bell-count" hidden>0</span></button><div class="bell-menu" id="bell-menu" hidden><div class="bell-head"><b>Notifications</b><button class="btn-link" id="bell-readall">Mark all read</button></div><div id="bell-list"></div></div>';
  host.appendChild(wrap);
  const count = wrap.querySelector('#bell-count'); const menu = wrap.querySelector('#bell-menu'); const list = wrap.querySelector('#bell-list');
  async function refresh() {
    try {
      const data = await apiFetch('/api/notifications?limit=10'); count.textContent=data.unread; count.hidden=data.unread===0;
      list.innerHTML = data.notifications.length ? data.notifications.map((n) => `<a href="#" class="bell-item ${n.is_read?'':'unread'}" data-id="${n.id}" data-link="${escapeHtml(n.link||'')}">${escapeHtml(n.message)}<small>${formatDate(n.created_at)}</small></a>`).join('') : '<p class="muted pad">No notifications yet.</p>';
    } catch (err) { /* background refresh should not interrupt the page */ }
  }
  wrap.querySelector('#bell-btn').addEventListener('click', () => { menu.hidden=!menu.hidden; if(!menu.hidden) refresh(); });
  list.addEventListener('click', async (event) => { const item=event.target.closest('.bell-item'); if(!item)return; event.preventDefault(); try{await apiFetch('/api/notifications/'+item.dataset.id+'/read',{method:'PATCH'});}catch(err){} if(item.dataset.link) window.location.href=item.dataset.link; else refresh(); });
  wrap.querySelector('#bell-readall').addEventListener('click', async () => { try { await apiFetch('/api/notifications/read-all',{method:'PATCH'}); refresh(); } catch(err) { showToast(err.message,'error'); } });
  document.addEventListener('click', (event) => { if(!wrap.contains(event.target)) menu.hidden=true; }); refresh(); setInterval(refresh,30000);
}());
