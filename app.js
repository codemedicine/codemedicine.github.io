/* Tech Medical Encyclopedia client app
   - Loads assets/data.json
   - Provides client-side search/filter and browsing
   - Renders entries in SPA style
*/

let DATA = null;
let INDEX = [];
let CURRENT = null;

function q(sel){ return document.querySelector(sel); }
function el(tag, attrs={}, ...children){ const e=document.createElement(tag); for(const k in attrs) e.setAttribute(k, attrs[k]); for(const c of children) { if(typeof c==='string') e.appendChild(document.createTextNode(c)); else if(c) e.appendChild(c);} return e; }

function loadData(){
  return fetch('assets/data.json').then(r=>r.json()).then(j=>{ DATA=j; INDEX=j.entries; });
}

function fuzzyScore(a, b){
  a = a.toLowerCase(); b = b.toLowerCase();
  if(a === b) return 100;
  if(a.includes(b)) return 80;
  // token overlap
  const at = a.split(/\W+/).filter(Boolean);
  const bt = b.split(/\W+/).filter(Boolean);
  let score = 0;
  for(const t of bt) if(at.includes(t)) score += 10;
  return score;
}

function search(query, types){
  if(!query) return INDEX.filter(it => types.includes(it.type));
  const out = INDEX.map(it => {
    const s = fuzzyScore(it.title + ' ' + it.summary + ' ' + (it.tags||[]).join(' '), query);
    return {...it, _score: s};
  }).filter(it => it._score>0 && types.includes(it.type));
  out.sort((a,b)=> b._score - a._score);
  return out;
}

function renderIndex(list){
  const container = q('#indexList');
  container.innerHTML = '';
  list.forEach(it=>{
    const div = el('div',{class:'index-item', 'data-id':it.id}, el('strong',{}, it.title), el('div',{class:'meta'}, it.type));
    div.addEventListener('click', ()=> showEntry(it.id));
    container.appendChild(div);
  });
}

function renderFeatured(){
  const grid = q('#featured');
  grid.innerHTML = '';
  const featured = INDEX.slice(0,6);
  featured.forEach(it=>{
    const t = el('div',{class:'tile'}, el('h3',{}, it.title), el('div',{class:'meta'}, it.type), el('p',{}, it.summary));
    t.addEventListener('click', ()=> showEntry(it.id));
    grid.appendChild(t);
  });
}

function showEntry(id){
  const it = INDEX.find(x=>x.id===id);
  if(!it) return;
  CURRENT = it;
  const content = q('#content');
  const breadcrumbs = q('#breadcrumbs');
  breadcrumbs.textContent = `${it.type} / ${it.title}`;
  content.innerHTML = `
    <article>
      <h2>${it.title}</h2>
      <div class="meta">${it.type} · ${it.tags ? it.tags.join(', ') : ''}</div>
      <div class="content-body">${it.content || ''}</div>
    </article>
  `;
  window.scrollTo({top:0, behavior:'smooth'});
}

function exportResults(list){
  const rows = [['id','type','title','summary','tags']];
  for(const it of list) rows.push([it.id, it.type, it.title, (it.summary||'').replace(/"/g,'""'), (it.tags||[]).join('|')]);
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='codemedicine_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await loadData();
  renderIndex(INDEX);
  renderFeatured();

  const searchInput = q('#searchInput');
  const filters = Array.from(document.querySelectorAll('.typefilter'));
  const viewAll = q('#viewAll');
  const exportBtn = q('#exportBtn');

  function getTypes(){
    return filters.filter(f=>f.checked).map(f=>f.value);
  }

  function doSearch(){
    const qv = searchInput.value.trim();
    const types = getTypes();
    const results = search(qv, types);
    renderIndex(results);
    // render list in main
    const content = q('#content');
    const breadcrumbs = q('#breadcrumbs');
    breadcrumbs.textContent = qv ? `Search: ${qv}` : 'Home';
    content.innerHTML = '<div class="card"><h3>Search results</h3><div id="searchList"></div></div>';
    const list = q('#searchList');
    if(results.length===0) list.appendChild(el('div',{}, 'No results'));
    results.forEach(it=>{
      const node = el('div',{class:'tile'}, el('h3',{}, it.title), el('div',{class:'meta'}, it.type), el('p',{}, it.summary));
      node.addEventListener('click', ()=> showEntry(it.id));
      list.appendChild(node);
    });
  }

  searchInput.addEventListener('input', ()=>{
    if(searchInput.value.length >= 2) doSearch();
    else { renderIndex(INDEX); q('#content').innerHTML = '<h2>Welcome — code is for medicine</h2><p class="lead">A technology-styled, searchable medical encyclopedia.</p>'; renderFeatured(); }
  });

  filters.forEach(f=> f.addEventListener('change', ()=> { if(searchInput.value.length>=2) doSearch(); else renderIndex(INDEX); }));

  viewAll.addEventListener('click', ()=> {
    renderIndex(INDEX);
    q('#content').innerHTML = '<div class="card"><h3>All entries</h3></div>';
    const list = q('.card');
    INDEX.forEach(it=> { const node = el('div',{class:'tile'}, el('h3',{}, it.title), el('div',{class:'meta'}, it.type)); node.addEventListener('click', ()=> showEntry(it.id)); q('.card').appendChild(node); });
  });

  exportBtn.addEventListener('click', ()=> {
    const types = getTypes();
    const results = search(searchInput.value.trim(), types);
    exportResults(results);
  });
});
