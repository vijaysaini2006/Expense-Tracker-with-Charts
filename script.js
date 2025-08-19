/* Expense Tracker — script.js
   - localStorage persistence
   - CRUD (Add/Edit/Delete)
   - Filters (category & date range)
   - Currency selection and totals
   - SVG Pie and Bar charts (animated)
   - Theme toggle
*/

/* ======= Utilities ======= */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const storageKey = 'expense_tracker_v1';

// default state
let state = {
  entries: [], // {id, amount, category, date, note}
  currency: 'INR'
};

/* ======= Elements ======= */
const form = $('#expenseForm');
const amountEl = $('#amount');
const categoryEl = $('#category');
const dateEl = $('#date');
const noteEl = $('#note');
const entryIdEl = $('#entryId');
const clearBtn = $('#clearBtn');
const saveBtn = $('#saveBtn');

const listEl = $('#list');
const totalAmountEl = $('#totalAmount');
const monthAmountEl = $('#monthAmount');

const pieSvg = $('#pieChart');
const barSvg = $('#barChart');

const filterCategory = $('#filterCategory');
const fromDate = $('#fromDate');
const toDate = $('#toDate');
const applyFilterBtn = $('#applyFilter');
const resetFilterBtn = $('#resetFilter');

const currencySelect = $('#currency');
const themeToggle = $('#themeToggle');

/* ======= Init ======= */
function loadState(){
  const raw = localStorage.getItem(storageKey);
  if(raw){
    try{ state = JSON.parse(raw); }catch(e){ console.error('invalid storage', e) }
  } else {
    state = {...state}; // keep default
  }
  // fill UI selects
  currencySelect.value = state.currency || 'INR';
  // render
  renderAll();
}
function saveState(){
  localStorage.setItem(storageKey, JSON.stringify(state));
}

/* ======= Helpers ======= */
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function formatCurrency(amount){
  const cur = state.currency || 'INR';
  const num = Number(amount) || 0;
  if(cur === 'INR') return '₹' + num.toFixed(2);
  if(cur === 'USD') return '$' + num.toFixed(2);
  if(cur === 'EUR') return '€' + num.toFixed(2);
  return num.toFixed(2);
}

function parseDateInput(v){
  return v ? new Date(v) : null;
}

function startOfMonth(d){
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/* ======= CRUD ======= */
form.addEventListener('submit', e=>{
  e.preventDefault();
  const amount = parseFloat(amountEl.value);
  const category = categoryEl.value;
  const date = dateEl.value;
  const note = noteEl.value.trim();
  if(!amount || !category || !date) return alert('Please fill Amount, Category and Date.');
  const id = entryIdEl.value;
  if(id){
    // edit
    const idx = state.entries.findIndex(en => en.id === id);
    if(idx > -1){
      state.entries[idx] = {...state.entries[idx], amount, category, date, note};
    }
    entryIdEl.value = '';
    saveBtn.textContent = 'Add Expense';
  } else {
    // add
    const entry = { id: uid(), amount, category, date, note };
    state.entries.push(entry);
  }
  form.reset();
  saveState();
  renderAll();
});

clearBtn.addEventListener('click', ()=>{
  form.reset();
  entryIdEl.value = '';
  saveBtn.textContent = 'Add Expense';
});

/* ======= Filters ======= */
applyFilterBtn.addEventListener('click', ()=> renderAll(getFilters()));
resetFilterBtn.addEventListener('click', ()=>{
  filterCategory.value = '';
  fromDate.value = '';
  toDate.value = '';
  renderAll();
});

function getFilters(){
  return {
    category: filterCategory.value || '',
    from: fromDate.value ? new Date(fromDate.value) : null,
    to: toDate.value ? new Date(toDate.value) : null
  };
}

/* ======= Render List & Totals ======= */
function renderAll(filters = null){
  // compute totals, filtered list
  const entries = state.entries.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
  const filtered = applyFilters(entries, filters);
  renderList(filtered);
  renderTotals(entries);
  renderCharts(entries);
}

function applyFilters(entries, filters){
  if(!filters) return entries;
  return entries.filter(en => {
    if(filters.category && en.category !== filters.category) return false;
    if(filters.from){
      const d = new Date(en.date);
      if(d < filters.from) return false;
    }
    if(filters.to){
      const d = new Date(en.date);
      // include the day
      const end = new Date(filters.to); end.setHours(23,59,59,999);
      if(d > end) return false;
    }
    return true;
  });
}

function renderList(entries){
  listEl.innerHTML = '';
  if(!entries.length) { listEl.innerHTML = '<div class="card small">No expenses yet.</div>'; return; }
  const tpl = document.getElementById('listItemTemplate');
  entries.forEach(en => {
    const node = tpl.content.cloneNode(true);
    const item = node.querySelector('.list-item');
    item.querySelector('.title').textContent = en.category;
    item.querySelector('.note').textContent = en.note || '';
    item.querySelector('.amt').textContent = formatCurrency(en.amount);
    item.querySelector('.date').textContent = new Date(en.date).toLocaleDateString();
    // category icon color / emoji
    const icon = item.querySelector('.cat.icon');
    icon.textContent = {
      'Food':'🍔','Travel':'✈️','Shopping':'🛍️','Bills':'💡','Other':'🔖'
    }[en.category] || '🔖';
    // actions
    const editBtn = item.querySelector('.edit');
    const delBtn = item.querySelector('.del');
    editBtn.addEventListener('click', ()=> startEdit(en.id));
    delBtn.addEventListener('click', ()=> {
      if(confirm('Delete this entry?')) {
        state.entries = state.entries.filter(x => x.id !== en.id);
        saveState(); renderAll();
      }
    });
    listEl.appendChild(node);
  });
}

function startEdit(id){
  const item = state.entries.find(e=> e.id === id);
  if(!item) return;
  amountEl.value = item.amount;
  categoryEl.value = item.category;
  dateEl.value = item.date;
  noteEl.value = item.note || '';
  entryIdEl.value = item.id;
  saveBtn.textContent = 'Save Changes';
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ======= Totals ======= */
function renderTotals(allEntries){
  const total = allEntries.reduce((s, e)=> s + Number(e.amount), 0);
  totalAmountEl.textContent = formatCurrency(total);
  // this month
  const now = new Date();
  const thisMonthTotal = allEntries.reduce((s,e)=> {
    const d = new Date(e.date);
    return (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) ? s + Number(e.amount) : s;
  }, 0);
  monthAmountEl.textContent = formatCurrency(thisMonthTotal);
}

/* ======= Charts (SVG simple drawing) ======= */

/* Pie chart: category breakdown */
function renderCharts(allEntries){
  drawPie(allEntries);
  drawBar(allEntries);
}

function aggregateByCategory(entries){
  const map = {};
  entries.forEach(e => {
    map[e.category] = (map[e.category] || 0) + Number(e.amount);
  });
  return Object.entries(map).map(([k,v]) => ({category:k, value:v}));
}

function drawPie(entries){
  const agg = aggregateByCategory(entries);
  const total = agg.reduce((s,a)=> s + a.value, 0) || 1;
  const svg = pieSvg;
  svg.innerHTML = ''; // clear

  const cx = 100, cy = 100, r = 80;
  let startAngle = -Math.PI/2; // start from top
  const colors = {'Food':'#FFD166','Travel':'#06b6d4','Shopping':'#f472b6','Bills':'#60a5fa','Other':'#a78bfa'};
  agg.forEach((item, idx) => {
    const slice = item.value;
    const angle = slice / total * Math.PI*2;
    const end = startAngle + angle;
    // arc path
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    path.setAttribute('d', d);
    path.setAttribute('fill', colors[item.category] || '#cbd5e1');
    path.setAttribute('opacity', '0');
    svg.appendChild(path);

    // animate opacity + scale by transitioning stroke-dashoffset trick
    // simple fade-in with delay
    setTimeout(()=> path.setAttribute('opacity','1'), idx * 120);

    // label (small)
    const mid = startAngle + angle/2;
    const lx = cx + (r+18) * Math.cos(mid);
    const ly = cy + (r+18) * Math.sin(mid);
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = `${item.category} (${Math.round(item.value)})`;
    svg.appendChild(text);

    startAngle = end;
  });

  if(agg.length === 0){
    // placeholder circle
    const circ = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circ.setAttribute('cx', cx); circ.setAttribute('cy', cy); circ.setAttribute('r', r);
    circ.setAttribute('fill', 'rgba(255,255,255,0.03)');
    svg.appendChild(circ);
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x', cx); t.setAttribute('y', cy); t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline','middle'); t.textContent = 'No data';
    svg.appendChild(t);
  }
}

/* Bar chart: monthly totals for last 6 months */
function drawBar(entries){
  // compute last 6 months
  const now = new Date();
  const months = [];
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()+1}`;
    months.push({label: d.toLocaleString(undefined,{month:'short'}), key, date:d, total:0});
  }
  entries.forEach(e=>{
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()+1}`;
    const m = months.find(x=> x.key === key);
    if(m) m.total += Number(e.amount);
  });

  const svg = barSvg;
  svg.innerHTML = '';
  const w = 300, h = 120, pad = 20;
  const max = Math.max(...months.map(m=>m.total), 10);

  // bars
  months.forEach((m, idx)=>{
    const bw = (w - pad*2) / months.length * 0.6;
    const gap = ((w - pad*2) / months.length) - bw;
    const x = pad + idx * (bw + gap) + gap/2;
    const ph = (m.total / max) * (h - pad*2);
    const y = h - pad - ph;

    // rect
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', x); rect.setAttribute('y', h - pad); rect.setAttribute('width', bw); rect.setAttribute('height', 0);
    rect.setAttribute('fill', '#60a5fa'); rect.setAttribute('rx', 6);
    svg.appendChild(rect);

    // animate height
    setTimeout(()=> {
      rect.setAttribute('y', y);
      rect.setAttribute('height', ph);
      rect.style.transition = 'all 600ms cubic-bezier(.2,.9,.2,1)';
    }, idx * 80);

    // label
    const tx = document.createElementNS('http://www.w3.org/2000/svg','text');
    tx.setAttribute('x', x + bw/2); tx.setAttribute('y', h - 6); tx.setAttribute('text-anchor','middle');
    tx.textContent = m.label;
    svg.appendChild(tx);
  });
}

/* ======= Currency & Theme ======= */
currencySelect.addEventListener('change', (e)=>{
  state.currency = e.target.value;
  saveState(); renderAll();
});

themeToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('light');
  themeToggle.textContent = document.body.classList.contains('light') ? 'Light' : 'Dark';
});

/* ======= Demo data helper (optional) ======= */
function addDemoData(){
  if(state.entries.length) return;
  const now = new Date();
  const s = [
    {amount: 200, category:'Food', date: isoDaysAgo(2), note:'Lunch'},
    {amount: 1200, category:'Bills', date: isoDaysAgo(5), note:'Electricity'},
    {amount: 450, category:'Travel', date: isoDaysAgo(12), note:'Taxi'},
    {amount: 999, category:'Shopping', date: isoDaysAgo(25), note:'Shoes'},
    {amount: 150, category:'Food', date: isoDaysAgo(40), note:'Snacks'},
  ];
  s.forEach(it=> state.entries.push({...it, id: uid()}));
  saveState(); renderAll();
}
function isoDaysAgo(n){
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10);
}

/* ======= Init app ======= */
loadState();
// addDemoData(); // uncomment to seed demo entries once for testing
