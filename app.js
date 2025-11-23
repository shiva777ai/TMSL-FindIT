/* Upgraded TMSL FindIt — local-only prototype with comments
   - Credentials key: tmsl_user_creds
   - Items key: tmsl_findit_items_v1
   NOTE: credentials and items stored in localStorage (plaintext). Prototype only.
*/

// Keys
const CRED_KEY = 'tmsl_user_creds';
const STORAGE_KEY = 'tmsl_findit_items_v1';
const maxImageBytes = 3145728; // 3MB

// DOM references
const loginView = document.getElementById('loginView');
const loginId = document.getElementById('loginId');
const loginPass = document.getElementById('loginPass');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const changePassBtn = document.getElementById('changePassBtn');
const changePassModal = document.getElementById('changePassModal');
const oldPassInput = document.getElementById('oldPass');
const newPassInput = document.getElementById('newPass');
const doChangePass = document.getElementById('doChangePass');
const closeChangePass = document.getElementById('closeChangePass');

const appEl = document.getElementById('app');
const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logout');

const totalCount = document.getElementById('totalCount');
const lostCount = document.getElementById('lostCount');
const foundCount = document.getElementById('foundCount');
const openCount = document.getElementById('openCount');

const listEl = document.getElementById('list');
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterSelect');
const statusSelect = document.getElementById('statusSelect');
const sortSelect = document.getElementById('sortSelect');
const tabs = Array.from(document.querySelectorAll('.tab'));

const itemForm = document.getElementById('itemForm');
const imgInput = document.getElementById('imageInput');
const imgPreview = document.getElementById('imgPreview');
const postedByInput = document.getElementById('postedBy');
const lockPostedByCheckbox = document.getElementById('lockPostedBy');

const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const clearLocalBtn = document.getElementById('clearLocal');
const clearLocal2Btn = document.getElementById('clearLocal2');
const seedBtn = document.getElementById('seedDemo');

const formMsg = document.getElementById('formMsg');

let currentUser = null;
let state = { mode: 'lost', query: '', category: 'all', status: 'all', sort: 'newest', items: [] };

/* === AUTH HELPERS === */
function readCreds(){ try{ return JSON.parse(localStorage.getItem(CRED_KEY) || 'null'); } catch(e){ return null; } }
function saveCreds(obj){ localStorage.setItem(CRED_KEY, JSON.stringify(obj)); }

function createAccount(id, pass){
  saveCreds({ id, pass });
  currentUser = { id };
  onLogin();
}

function attemptLogin(id, pass){
  const creds = readCreds();
  if(!creds) return false;
  if(creds.id === id && creds.pass === pass){ currentUser = { id }; onLogin(); return true; }
  return false;
}

function logout(){
  currentUser = null;
  showLogin();
}

/* === UI: login / app === */
function showLogin(){
  appEl.style.display = 'none';
  loginView.style.display = '';
  loginId.value=''; loginPass.value='';
}
function onLogin(){
  loginView.style.display = 'none';
  appEl.style.display = '';
  welcomeText.textContent = `Hi ${currentUser.id}`;
  postedByInput.value = currentUser.id;
  if(lockPostedByCheckbox.checked) postedByInput.value = currentUser.id;
  state.items = loadItems();
  renderList();
  updateHeaderCounts();
}

/* === storage items === */
function loadItems(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } }
function saveItems(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

/* === login handlers === */
loginBtn.addEventListener('click', () => {
  const id = loginId.value.trim(); const pass = loginPass.value;
  if(!id || !pass){ alert('Enter ID and password'); return; }
  if(!attemptLogin(id, pass)) alert('Login failed — wrong ID or password. You can create an account.');
});

registerBtn.addEventListener('click', () => {
  const id = loginId.value.trim(); const pass = loginPass.value;
  if(!id || !pass){ alert('Enter ID and password to create account'); return; }
  if(confirm(`Create account for "${id}" in this browser?`)) createAccount(id, pass);
});

logoutBtn.addEventListener('click', () => { logout(); });

/* Change password modal */
changePassBtn.addEventListener('click', () => {
  changePassModal.style.display = '';
  oldPassInput.value=''; newPassInput.value='';
});
closeChangePass.addEventListener('click', () => changePassModal.style.display='none');
doChangePass.addEventListener('click', () => {
  const oldP = oldPassInput.value; const newP = newPassInput.value;
  const creds = readCreds();
  if(!creds){ alert('No account exists'); changePassModal.style.display='none'; return; }
  if(oldP !== creds.pass){ alert('Current password does not match'); return; }
  if(!newP){ alert('Enter a new password'); return; }
  saveCreds({ id: creds.id, pass: newP });
  alert('Password updated locally');
  changePassModal.style.display='none';
});

/* === utilities === */
function genId(){ return 'it_' + Math.random().toString(36).slice(2,9); }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function categoryLabel(c){ return c === 'id-card' ? 'ID Card' : c === 'electronics' ? 'Electronics' : c === 'books' ? 'Books' : c === 'accessories' ? 'Accessories' : 'Others'; }
function iconFor(c){ if(c==='id-card') return '🪪'; if(c==='electronics') return '🎧'; if(c==='books') return '📒'; if(c==='accessories') return '👛'; return '📦'; }
function showMessage(msg, t=2400){ formMsg.textContent = msg; if(t) setTimeout(()=>{ if(formMsg.textContent===msg) formMsg.textContent=''; }, t); }

/* === render / list === */
function updateHeaderCounts(){
  const items = loadItems();
  totalCount.textContent = `Items: ${items.length}`;
  lostCount.textContent = `Lost: ${items.filter(i=>i.type==='lost').length}`;
  foundCount.textContent = `Found: ${items.filter(i=>i.type==='found').length}`;
  openCount.textContent = `Open: ${items.filter(i=>i.status==='open').length}`;
}

function sortItems(arr){
  if(state.sort === 'newest') arr.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  else arr.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
}

function renderList(){
  let items = state.items.filter(it=> it.type === state.mode);

  if(state.status !== 'all') items = items.filter(it => it.status === state.status);
  if(state.category !== 'all') items = items.filter(it => it.category === state.category);
  if(state.query){
    const q = state.query.toLowerCase();
    items = items.filter(it => (it.title+' '+(it.location||'')+' '+(it.notes||'')+' '+(it.postedBy||'')).toLowerCase().includes(q));
  }
  sortItems(items);

  if(items.length === 0){
    listEl.innerHTML = `<div style="padding:18px;border-radius:10px;background:rgba(255,255,255,0.02);color:var(--muted)"><strong>No ${state.mode} items</strong><div style="margin-top:8px">Try changing filters, seed demo, or post an item.</div></div>`;
    updateHeaderCounts();
    return;
  }

  listEl.innerHTML = '';
  items.forEach((it) => {
    // ensure comments array exists
    if(!Array.isArray(it.comments)) it.comments = [];

    const art = document.createElement('article');
    art.className = 'item-card';
    if(currentUser && it.postedBy === currentUser.id) art.classList.add('mine');

    const commentCount = it.comments.length || 0;

    art.innerHTML = `
      <div class="thumb" aria-hidden="true">${iconFor(it.category)}</div>
      <div>
        <div class="title">${escapeHtml(it.title)}</div>
        <div class="meta">${it.location ? `<strong>${escapeHtml(it.location)}</strong> • ` : ''}${it.date ? escapeHtml(it.date) : ''} • <span style="color:var(--muted)">${escapeHtml(it.postedBy || 'Anonymous')}</span></div>
        <div class="chips" style="margin-top:8px">
          <div class="chip">${escapeHtml(categoryLabel(it.category))}</div>
          <div class="chip">${it.status === 'open' ? 'Open' : (it.status === 'claimed' ? 'Claimed' : 'Returned')}</div>
          <div class="chip">💬 ${commentCount} comments</div>
        </div>
        ${it.notes ? `<div style="margin-top:10px;color:var(--muted);font-size:13px">${escapeHtml(it.notes)}</div>` : ''}
      </div>
      <div class="actions">
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <div style="display:flex;gap:10px">
            <button class="btn-sm btn-ghost-sm" data-id="${it.id}" data-action="view">View</button>
            <button class="btn-sm btn-primary-sm" data-id="${it.id}" data-action="claim">${it.status==='open'?'Claim':'Mark returned'}</button>
          </div>
          <button class="btn-sm btn-ghost-sm" data-id="${it.id}" data-action="comments">Comments (${commentCount})</button>
        </div>
      </div>
    `;
    listEl.appendChild(art);
  });

  // event listeners
  listEl.querySelectorAll('button[data-action="view"]').forEach(b => b.addEventListener('click', e => openDetails(e.currentTarget.dataset.id)));
  listEl.querySelectorAll('button[data-action="claim"]').forEach(b => b.addEventListener('click', e => toggleClaim(e.currentTarget.dataset.id)));
  listEl.querySelectorAll('button[data-action="comments"]').forEach(b => b.addEventListener('click', e => openComments(e.currentTarget.dataset.id)));

  updateHeaderCounts();
}

/* === details modal with comments === */
function openDetails(id){
  const it = state.items.find(x=>x.id===id);
  if(!it) return;

  // ensure comments array exists and normalize
  if(!Array.isArray(it.comments)) it.comments = [];

  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  const masked = it.postedBy ? maskContact(it.postedBy) : 'Not provided';
  wrap.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Item details">
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="flex:0 0 96px;font-size:48px;display:flex;align-items:center;justify-content:center">${iconFor(it.category)}</div>
        <div style="flex:1;min-width:240px">
          <h3>${escapeHtml(it.title)}</h3>
          <div class="muted-contrast" style="margin-top:6px">${it.type === 'lost' ? 'Lost' : 'Found'} • ${it.location ? escapeHtml(it.location) : ''} ${it.date ? '• ' + escapeHtml(it.date) : ''}</div>
          <p style="margin-top:10px;color:#e8f0ff">${it.notes ? escapeHtml(it.notes) : ''}</p>
          ${it.image ? `<img src="${it.image}" class="preview" alt="Item image">` : ''}
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            <button id="editBtn" class="btn btn-ghost">Edit</button>
            <button id="deleteBtn" class="btn btn-ghost">Delete</button>
            <button id="closeBtn" class="btn btn-primary">Close</button>
          </div>

          <div style="margin-top:14px">
            <div style="font-size:13px;color:var(--muted)">Poster contact</div>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
              <div id="posterMasked" style="font-weight:700">${escapeHtml(masked)}</div>
              <button id="revealContact" class="btn btn-ghost">Reveal</button>
            </div>
          </div>

          <!-- Comments area -->
          <div style="margin-top:16px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="font-weight:700">Comments <span id="commentsCount">(${it.comments.length})</span></div>
            </div>

            <div id="commentsList" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;max-height:220px;overflow:auto;padding-right:6px">
              ${it.comments.length ? it.comments.map(c => commentHtml(c)).join('') : `<div style="color:var(--muted)">No comments yet. Be the first to comment.</div>`}
            </div>

            <div style="margin-top:10px;display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap">
              <input id="commentInput" placeholder="Write a short comment" style="flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.02);color:#eaf2ff" />
              <button id="postCommentBtn" class="btn btn-primary">Post</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  // helpers inside modal
  const commentsListEl = wrap.querySelector('#commentsList');
  const commentsCountEl = wrap.querySelector('#commentsCount');
  const commentInput = wrap.querySelector('#commentInput');
  const postCommentBtn = wrap.querySelector('#postCommentBtn');

  wrap.addEventListener('click', e => { if(e.target === wrap) wrap.remove(); });
  wrap.querySelector('#closeBtn').addEventListener('click', ()=> wrap.remove());
  wrap.querySelector('#deleteBtn').addEventListener('click', ()=> {
    if(!confirm('Delete this item?')) return;
    state.items = state.items.filter(x=>x.id!==id);
    saveItems(state.items);
    renderList();
    wrap.remove();
    showMessage('Item deleted');
  });
  wrap.querySelector('#editBtn').addEventListener('click', ()=> { wrap.remove(); startEdit(it); });

  wrap.querySelector('#revealContact').addEventListener('click', ()=> {
    if(!it.postedBy){ alert('No contact provided'); return; }
    if(!confirm('Reveal full contact info? This will display the poster contact on screen.')) return;
    wrap.querySelector('#posterMasked').textContent = it.postedBy;
  });

  // post comment
  postCommentBtn.addEventListener('click', ()=> {
    const text = (commentInput.value || '').trim();
    if(!text) { alert('Type a comment'); return; }
    const by = currentUser ? currentUser.id : 'Anonymous';
    const c = { id: genId(), by, text, createdAt: new Date().toISOString() };
    it.comments = it.comments || [];
    it.comments.push(c);
    // save
    const idx = state.items.findIndex(x=>x.id===it.id);
    if(idx !== -1){ state.items[idx] = it; saveItems(state.items); }

    // update UI
    const newNode = document.createElement('div');
    newNode.innerHTML = commentHtml(c);
    commentsListEl.appendChild(newNode.firstElementChild);
    commentsCountEl.textContent = `(${it.comments.length})`;
    // update card counts
    renderList();
    commentInput.value = '';
  });

  // delegate delete comment inside modal
  commentsListEl.addEventListener('click', (ev) => {
    const del = ev.target.closest && ev.target.closest('[data-comment-delete]');
    if(!del) return;
    const cid = del.getAttribute('data-comment-delete');
    if(!confirm('Delete this comment?')) return;
    it.comments = (it.comments || []).filter(cc => cc.id !== cid);
    // update storage & UI
    const idx = state.items.findIndex(x=>x.id===it.id);
    if(idx !== -1){ state.items[idx] = it; saveItems(state.items); }
    // redraw comments list
    commentsListEl.innerHTML = it.comments.length ? it.comments.map(c => commentHtml(c)).join('') : `<div style="color:var(--muted)">No comments yet. Be the first to comment.</div>`;
    commentsCountEl.textContent = `(${it.comments.length})`;
    renderList();
  });
}

// small helper to produce comment html (string)
function commentHtml(c){
  const time = new Date(c.createdAt).toLocaleString();
  const by = escapeHtml(c.by || 'Anonymous');
  const text = escapeHtml(c.text);
  // if currentUser matches comment author, provide delete button
  const canDelete = currentUser && c.by === currentUser.id;
  return `<div style="background:rgba(255,255,255,0.02);padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.02);display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
            <div style="flex:1">
              <div style="font-weight:700">${by} <span style="font-weight:400;color:var(--muted);font-size:12px">• ${time}</span></div>
              <div style="margin-top:6px;color:#eaf2ff">${text}</div>
            </div>
            ${canDelete ? `<button data-comment-delete="${c.id}" class="btn btn-ghost" style="height:34px">Delete</button>` : ''}
          </div>`;
}

function openComments(id){
  // simply open the same details modal where comments live
  openDetails(id);
}

function maskContact(s){
  if(!s) return '';
  if(/\S+@\S+\.\S+/.test(s)){
    const [u,domain] = s.split('@');
    const uMasked = u.length <=2 ? u[0] + '*' : u.slice(0,2) + '*'.repeat(Math.max(1, u.length-2));
    return `${uMasked}@${domain}`;
  }
  const digits = s.replace(/\D/g,'');
  if(digits.length >= 6){
    const start = digits.slice(0,2);
    const end = digits.slice(-2);
    return `${start}****${end}`;
  }
  return s.length > 4 ? s.slice(0,2) + '...' + s.slice(-1) : s[0] + '...';
}

/* === claim / status toggle === */
function toggleClaim(id){
  const idx = state.items.findIndex(x=>x.id===id);
  if(idx === -1) return;
  const it = state.items[idx];
  if(it.status === 'open'){
    if(!confirm('Are you the owner? This will mark the item as claimed.')) return;
    it.status = 'claimed';
  } else {
    if(!confirm('Mark this item as returned?')) return;
    it.status = 'returned';
  }
  state.items[idx] = it;
  saveItems(state.items);
  renderList();
  showMessage('Status updated');
}

/* === form submit (create / edit) === */
itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(itemForm);
  const title = (fd.get('title')||'').trim();
  if(!title){ showMessage('Item name required'); return; }
  const type = fd.get('type') || 'lost';
  const category = fd.get('category') || 'others';
  const date = fd.get('date') || '';
  const location = (fd.get('location')||'').trim();
  const notes = (fd.get('notes')||'').trim();
  let postedBy = (fd.get('postedBy')||'').trim();
  if(lockPostedByCheckbox.checked && currentUser) postedBy = currentUser.id;

  let imageData = '';
  if(imgInput.files && imgInput.files[0]){
    const file = imgInput.files[0];
    if(file.size > maxImageBytes){ showMessage('Image too large — choose under 3MB'); return; }
    try{ imageData = await fileToDataUrl(file); } catch(err){ console.error(err); showMessage('Failed to read image'); return; }
  } else {
    if(itemForm.dataset.editId){
      const existing = state.items.find(i=>i.id===itemForm.dataset.editId);
      if(existing && existing.image) imageData = existing.image || '';
    }
  }

  if(itemForm.dataset.editId){
    const id = itemForm.dataset.editId;
    const idx = state.items.findIndex(x=>x.id===id);
    if(idx === -1){ showMessage('Edit failed: not found'); delete itemForm.dataset.editId; return; }
    const it = state.items[idx];
    it.type = type; it.title = title; it.category = category; it.date = date; it.location = location;
    it.notes = notes; it.postedBy = postedBy; it.image = imageData;
    // keep comments if present
    if(!Array.isArray(it.comments)) it.comments = it.comments ? Array.from(it.comments) : [];
    state.items[idx] = it;
    saveItems(state.items);
    renderList();
    showMessage('Item updated');
    itemForm.reset();
    imgPreview.style.display='none';
    delete itemForm.dataset.editId;
    return;
  }

  const newItem = { id: genId(), type, title, category, date, location, notes, postedBy, status:'open', image:imageData, createdAt:new Date().toISOString(), comments: [] };
  state.items.unshift(newItem);
  saveItems(state.items);
  renderList();
  itemForm.reset();
  imgPreview.style.display='none';
  showMessage('Posted');
});

/* image preview */
imgInput.addEventListener('change', async () => {
  const f = imgInput.files[0];
  if(!f){ imgPreview.style.display='none'; return; }
  if(f.size > maxImageBytes){ showMessage('Image too large — choose under 3MB'); imgInput.value=''; imgPreview.style.display='none'; return; }
  try{ const dataUrl = await fileToDataUrl(f); imgPreview.src = dataUrl; imgPreview.style.display='block'; } catch(err){ console.error(err); showMessage('Could not preview image'); }
});
function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onerror=()=>rej(new Error('file read error')); r.onload=()=>res(r.result); r.readAsDataURL(file); }); }

/* search / filter / sort / tabs */
searchInput.addEventListener('input', e => { state.query = e.target.value.trim(); renderList(); });
filterSelect.addEventListener('change', e => { state.category = e.target.value; renderList(); });
statusSelect.addEventListener('change', e => { state.status = e.target.value; renderList(); });
sortSelect.addEventListener('change', e => { state.sort = e.target.value; renderList(); });
tabs.forEach(btn => btn.addEventListener('click', e => {
  tabs.forEach(b=>b.classList.remove('active')); e.currentTarget.classList.add('active'); state.mode = e.currentTarget.dataset.mode; renderList();
}));

/* static actions: export / import / clear / seed */
exportBtn.addEventListener('click', () => {
  const data = JSON.stringify(state.items, null, 2);
  const blob = new Blob([data], { type:'application/json' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'tmsl_findit_items.json'; a.click(); URL.revokeObjectURL(url);
});
importFile.addEventListener('change', async (e) => {
  const f = e.target.files[0]; if(!f) return;
  try{
    const txt = await f.text(); const parsed = JSON.parse(txt); if(!Array.isArray(parsed)) throw new Error('Invalid file');
    // ensure comments arrays exist in imported items
    const normalized = parsed.map(p => ({ ...p, comments: Array.isArray(p.comments) ? p.comments : [] }));
    const merged = normalized.concat(loadItems()); saveItems(merged); state.items = merged; renderList(); showMessage('Imported (merged)');
  }catch(err){ console.error(err); showMessage('Import failed'); } finally { importFile.value=''; }
});
clearLocalBtn.addEventListener('click', ()=> { if(!confirm('Remove ALL items stored in this browser? This cannot be undone.')) return; localStorage.removeItem(STORAGE_KEY); state.items=[]; renderList(); showMessage('Local data cleared'); });
clearLocal2Btn.addEventListener('click', ()=> { clearLocalBtn.click(); });
seedBtn.addEventListener('click', ()=> seedDemo());

function seedDemo(){
  const now = new Date();
  const sample = [
    { id: genId(), type:'lost', title:'College ID Card - CSE', category:'id-card', date:'2025-11-20', location:'Canteen', notes:'Name printed on card', postedBy:'Team Tango Charlie', status:'open', image:'', createdAt: now.toISOString(), comments: [] },
    { id: genId(), type:'lost', title:'Black Earbuds Case', category:'electronics', date:'2025-11-21', location:'Central Library', notes:'No name on case', postedBy:'Team Tango Charlie', status:'open', image:'', createdAt: now.toISOString(), comments: [] },
    { id: genId(), type:'found', title:'Physics Notebook', category:'books', date:'2025-11-19', location:'Block A - 2nd floor', notes:'Name: Ankit Sharma', postedBy:'Team Tango Charlie', status:'open', image:'', createdAt: now.toISOString(), comments: [] }
  ];
  const items = sample.concat(loadItems()); saveItems(items); state.items = items; renderList(); showMessage('Seeded demo');
}

/* init */
(function init(){
  const creds = readCreds();
  if(creds && creds.id){ currentUser = { id: creds.id }; onLogin(); }
  else showLogin();
  state.items = loadItems();

  lockPostedByCheckbox.addEventListener('change', () => {
    if(lockPostedByCheckbox.checked && currentUser) postedByInput.value = currentUser.id;
  });
  window.addEventListener('storage', () => updateHeaderCounts());
})();
