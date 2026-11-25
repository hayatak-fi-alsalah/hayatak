'use strict';
/* حياتك في الصلاة - Hayatak fi al-Salah. Plain JS PWA, no build step. */
const $ = s => document.querySelector(s);
const AR = '٠١٢٣٤٥٦٧٨٩';
const num = n => String(n).replace(/\d/g, d => AR[+d]);
const store = {
  get(k, d) { try { const v = localStorage.getItem('hq.' + k); if (v == null) return d; const p = JSON.parse(v); if (p == null) return d; if (d !== undefined && d !== null && (typeof p !== typeof d || Array.isArray(p) !== Array.isArray(d))) return d; return p; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hq.' + k, JSON.stringify(v)); } catch (e) {} }
};
const fetchJ = async (u, ms = 10000) => { const c = new AbortController(), tm = setTimeout(() => c.abort(), ms); try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); } finally { clearTimeout(tm); } };
const iso = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const toast = m => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };
const buzz = (ms = 15) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

const CITIES = [
  ['cairo', 'القاهرة', 30.0444, 31.2357], ['giza', 'الجيزة', 30.0131, 31.2089], ['alex', 'الإسكندرية', 31.2001, 29.9187],
  ['qalyubia', 'القليوبية (بنها)', 30.4659, 31.1848], ['mansoura', 'المنصورة', 31.0409, 31.3785], ['tanta', 'طنطا', 30.7865, 31.0004],
  ['port', 'بورسعيد', 31.2653, 32.3019], ['suez', 'السويس', 29.9668, 32.5498], ['ismailia', 'الإسماعيلية', 30.5965, 32.2715],
  ['fayoum', 'الفيوم', 29.3084, 30.8428], ['minya', 'المنيا', 28.1099, 30.7503], ['asyut', 'أسيوط', 27.1783, 31.1859],
  ['sohag', 'سوهاج', 26.5591, 31.6948], ['luxor', 'الأقصر', 25.6872, 32.6396], ['aswan', 'أسوان', 24.0889, 32.8998],
  ['makkah', 'مكة المكرمة', 21.3891, 39.8579], ['madinah', 'المدينة المنورة', 24.4672, 39.6111]
];
const PR = [['Fajr', 'الفجر'], ['Dhuhr', 'الظهر'], ['Asr', 'العصر'], ['Maghrib', 'المغرب'], ['Isha', 'العشاء']];
const NAF = [['f2', 'قبل الفجر', 2], ['d4', 'قبل الظهر', 4], ['d2', 'بعد الظهر', 2], ['m2', 'بعد المغرب', 2], ['i2', 'بعد العشاء', 2]];

/* ---------- place & prayer times ---------- */
const METHODS = [[0, 'تلقائي حسب موقعك'], [5, 'الهيئة المصرية العامة للمساحة'], [4, 'أم القرى (مكة)'], [3, 'رابطة العالم الإسلامي'], [2, 'أمريكا الشمالية (ISNA)'], [1, 'جامعة العلوم الإسلامية بكراتشي'], [13, 'ديانت (تركيا)'], [16, 'دبي'], [9, 'الكويت'], [10, 'قطر'], [11, 'سنغافورة'], [3.5, 'المغرب العربي (MWL)'], [7, 'جامعة طهران'], [12, 'اتحاد المنظمات الإسلامية بفرنسا']];
function methodFor() {
  const m = store.get('method', 0); if (m && m !== 3.5) return m; if (m === 3.5) return 3;
  const { lat, lon } = place, inb = (a, b, c, d) => lat >= a && lat <= b && lon >= c && lon <= d;
  if (inb(22, 31.8, 24.6, 37)) return 5;           // Egypt
  if (inb(16, 32.5, 34.5, 56)) return inb(22.5, 26.5, 51, 56.5) ? 16 : inb(28.5, 30.2, 46.5, 48.6) ? 9 : inb(24.4, 26.3, 50.7, 51.7) ? 10 : 4; // Arabia and Gulf
  if (inb(36, 42.2, 26, 45)) return 13;            // Turkey
  if (inb(5, 38, 60, 93)) return 1;                // Pakistan, India, Bangladesh, Afghanistan
  if (inb(25, 40, 44, 63.5)) return 7;             // Iran
  if (inb(0.8, 7, 99, 120)) return 11;             // Malaysia, Singapore
  if (inb(24, 72, -170, -50)) return 2;            // North America
  if (inb(41, 51.5, -5.5, 9.8)) return 12;         // France
  return 3;                                        // MWL elsewhere
}
async function geoName(lat, lon) {
  const key = 'geo.' + lat.toFixed(3) + '.' + lon.toFixed(3), c = store.get(key); if (c) return c;
  let nm = null;
  try { const j = await fetchJ(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&addressdetails=1&accept-language=ar&lat=${lat}&lon=${lon}`, 8000); const a = j.address || {};
    const city = a.city || a.town || a.village || a.state || a.county, sub = a.suburb || a.city_district || a.neighbourhood || a.quarter || a.district;
    const state = a.state && a.state !== city ? a.state : null; nm = [state || city, sub && sub !== (state || city) ? sub : (state && city && city !== state ? city : null)].filter(Boolean).join('، ') || null; } catch (e) {}
  if (!nm) { try { const j = await fetchJ(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ar`, 8000); nm = [j.principalSubdivision, j.city || j.locality].filter((x, i, a) => x && a.indexOf(x) === i).join('، ') || null; } catch (e) {} }
  if (nm) store.set(key, nm); return nm;
}
async function nameGps() { if (!place || place.id !== 'gps') return; const nm = await geoName(place.lat, place.lon); if (nm && place.id === 'gps') { place.name = nm; store.set('place', place); render(); } }
let place = store.get('place', { id: 'cairo', name: 'القاهرة', lat: 30.0444, lon: 31.2357 });
let day = null, tomorrow = null, ready = false;
const to12 = t => { const [h, m] = t.split(' ')[0].split(':').map(Number); return num(h % 12 || 12) + ':' + num(String(m).padStart(2, '0')) + ' ' + (h >= 12 ? 'م' : 'ص'); };

const IQG = { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 };
const iqGap = k => { const o = store.get('iqg', {}); return Number.isFinite(+o[k]) && o[k] !== undefined ? +o[k] : IQG[k]; };
const hm12 = s => { s = ((s % 86400) + 86400) % 86400; const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return to12(h + ':' + m); };
const REMD = { m: { on: true, t: '06:00' }, e: { on: true, t: '18:00' }, q: { on: false, t: '02:00' } };
const getRem = () => { const r = store.get('rem', {}); return { m: Object.assign({}, REMD.m, r.m), e: Object.assign({}, REMD.e, r.e), q: Object.assign({}, REMD.q, r.q) }; };
function qiyamWins() { if (!day) return null; const m = secs(day.t.Maghrib), f = secs((tomorrow || day).t.Fajr) + 86400, n = f - m; return [['الثلث الأول', m + n / 3], ['منتصف الليل', m + n / 2], ['الثلث الأخير', m + n * 2 / 3]]; }
const secs = t => { const [h, m] = t.split(' ')[0].split(':').map(Number); return h * 3600 + m * 60; };
const nowSecs = tz => { try { const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date()); const g = t => (+p.find(x => x.type === t).value) % 24; return g('hour') * 3600 + g('minute') * 60 + g('second'); } catch (e) { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); } };
const fmtHMS = s => num(Math.floor(s / 3600)) + ':' + num(String(Math.floor(s / 60) % 60).padStart(2, '0')) + ':' + num(String(s % 60).padStart(2, '0'));
function dstr(d) { return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear(); }
const tuneStr = () => { const o = store.get('offs', {}); return `0,${o.Fajr || 0},0,${o.Dhuhr || 0},${o.Asr || 0},${o.Maghrib || 0},0,${o.Isha || 0},0`; };
async function loadDay(d) {
  const key = `t3.${store.get('method', 0)}.${store.get('school', 0)}.${tuneStr()}.${place.lat.toFixed(2)}.${place.lon.toFixed(2)}.${dstr(d)}`;
  const c = store.get(key);
  if (c) return c;
  const method = methodFor();
  const j = await fetchJ(`https://api.aladhan.com/v1/timings/${dstr(d)}?latitude=${place.lat}&longitude=${place.lon}&method=${method}&school=${store.get('school', 0)}&tune=${tuneStr()}`);
  if (!j || !j.data || !j.data.timings || !j.data.date) throw new Error('bad data');
  const h = j.data.date.hijri;
  const out = { t: j.data.timings, tz: j.data.meta.timezone, hijri: `${num(h.day)} ${h.month.ar} ${num(h.year)} هـ`, hd: +h.day, hm: +h.month.number, hy: +h.year, wd: h.weekday.ar };
  store.set(key, out); return out;
}
let failed = false, rtok = 0, lastRT = 0;
function pruneCache() { try { const keep = new Set(); for (let i = -1; i <= 2; i++) keep.add(dstr(new Date(Date.now() + i * 864e5))); Object.keys(localStorage).forEach(k => { if (!k.startsWith('hq.t2.')) return; const m = k.match(/(\d\d-\d\d-\d{4})$/); if (m && !keep.has(m[1])) localStorage.removeItem(k); }); } catch (e) {} }
async function refreshTimes() {
  lastRT = Date.now(); const my = ++rtok; failed = false; const ld0 = store.get('lastDay'), pk = place.id + place.lat.toFixed(2) + place.lon.toFixed(2); if (ld0 && ld0.t && ld0.pk === pk && !day) { day = ld0; ready = true; } else if (!(day && day.pk === pk)) ready = false; render();
  try {
    const d = new Date(), t = new Date(Date.now() + 864e5);
    const [a, b] = await Promise.all([loadDay(d), loadDay(t).catch(() => null)]);
    if (my !== rtok) return; day = a; tomorrow = b; day.d = iso(); day.pk = pk; ready = true; pruneCache();
  } catch (e) { if (my !== rtok) return; const ld = store.get('lastDay'); day = ld && ld.t ? ld : null; tomorrow = null; ready = !!day; failed = !day; if (day) toast('مفيش اتصال، بعرض آخر مواقيت محفوظة'); else toast('مفيش اتصال، جرب تاني'); }
  if (day && ready) store.set('lastDay', day);
  render();
}
function nextPrayer() {
  if (!day) return null;
  const now = nowSecs(day.tz);
  const list = PR.map(([k, n]) => ({ k, n, s: secs(day.t[k]) }));
  const nx = list.find(p => p.s > now);
  const prev = [...list].reverse().find(p => p.s <= now);
  if (nx) return { ...nx, left: nx.s - now, span: nx.s - (prev ? prev.s : secs(day.t.Isha) - 86400) , now };
  const f = tomorrow ? secs(tomorrow.t.Fajr) : secs(day.t.Fajr);
  return { k: 'Fajr', n: 'الفجر', left: 86400 - now + f, span: 86400 - secs(day.t.Isha) + f, now, tmr: true };
}
const HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
const HM = ['', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
function hijriOf(d) { const p = {}; HF.formatToParts(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)).forEach(x => p[x.type] = +x.value); return { d: p.day, m: p.month, y: p.year }; }
function fastInfo(d) {
  const h = hijriOf(d), w = d.getDay(), tags = [];
  if (h.m === 9 || (h.m === 10 && h.d === 1) || (h.m === 12 && h.d >= 10 && h.d <= 13)) return { h, tags };
  if (h.d >= 13 && h.d <= 15) tags.push('white');
  if (w === 1) tags.push('mon'); if (w === 4) tags.push('thu');
  return { h, tags };
}
function fastList(n, from) {
  const out = [], base = from ? new Date(from) : new Date(); base.setHours(12, 0, 0, 0);
  for (let i = 0; i < n; i++) { const d = new Date(base.getTime() + i * 864e5), f = fastInfo(d); if (f.tags.length) out.push({ d, i, h: f.h, tags: f.tags }); }
  return out;
}
const fastLabel = t => t.includes('white') ? 'الأيام البيض' : t.includes('mon') ? 'صيام الاثنين' : 'صيام الخميس';
const fastRel = i => i === 0 ? 'اليوم' : i === 1 ? 'غدا' : i === 2 ? 'بعد يومين' : 'بعد ' + num(i) + ' أيام';
const DN = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function fastChip() {
  const l = fastList(10)[0]; if (!l) return 'صيام السنة';
  return fastRel(l.i) + ' · ' + (l.tags.includes('white') ? 'الأيام البيض' : DN[l.d.getDay()]);
}
function viewFasting() {
  const list = fastList(60), g = d => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(d), a = store.get('alarm', {});
  const n0 = list[0], rows = list.slice(0, 14).map(x => `<div class="frow"><div class="fd"><b>${DN[x.d.getDay()]}</b><span>${g(x.d)}</span></div><div class="fh">${num(x.h.d)} ${HM[x.h.m]} ${num(x.h.y)}</div><div class="ft"><span class="pill${x.tags.includes('white') ? ' s' : ''}">${fastLabel(x.tags)}</span><span class="muted">${fastRel(x.i)}</span></div></div>`).join('');
  return { head: hdr('أيام الصيام المستحبة', '', true), body: `
  ${n0 ? `<div class="card center"><div class="muted">أقرب يوم صيام</div><div style="font-size:22px;font-weight:700;margin:6px 0">${fastLabel(n0.tags)}</div><div>${DN[n0.d.getDay()]} ${g(n0.d)} · ${num(n0.h.d)} ${HM[n0.h.m]} ${num(n0.h.y)} هـ</div><div style="margin-top:8px;color:var(--ac2);font-weight:700">${fastRel(n0.i)}</div></div>` : ''}
  <div class="card"><label class="sw"><span>تذكير الليلة اللي قبل الصيام<br><span class="muted">إشعار الساعة ٨ مساء قبل الاثنين والخميس والأيام البيض (في تطبيق الأندرويد)</span></span><input type="checkbox" data-alarm="fastr" ${a.fastr !== false ? 'checked' : ''}></label></div>
  <div class="card"><h3>الجاي</h3>${rows}</div>
  <div class="card"><h3>إيه هي الأيام البيض؟</h3><div class="muted" style="line-height:1.9">أيام ١٣ و١٤ و١٥ من كل شهر هجري، وسُميت بيضاء لأن لياليها بيضاء بالقمر. وبرضه سنة صيام الاثنين والخميس. بنستثني رمضان والعيدين وأيام التشريق.</div></div>
  <div class="card"><h3>الدليل باختصار</h3><div class="muted" style="line-height:1.9">• الأيام البيض: حديث أبي ذر «إذا صمت من الشهر ثلاثة أيام فصم ثلاث عشرة وأربع عشرة وخمس عشرة»، رواه الترمذي والنسائي.<br>• الاثنين والخميس: «تُعرض الأعمال يوم الاثنين والخميس، فأحب أن يُعرض عملي وأنا صائم»، رواه الترمذي.</div><div class="muted" style="margin-top:8px;font-size:12px">التاريخ الهجري بالتقويم المحسوب (أم القرى)، وممكن يختلف يوم عن رؤية الهلال في مصر.</div></div>` };
}
function thirds() {
  if (!day) return '';
  const m = secs(day.t.Maghrib), f = (tomorrow ? secs(tomorrow.t.Fajr) : secs(day.t.Fajr)) + 86400, n = f - m;
  const f12 = s => to12(`${String(Math.floor(((s % 86400) / 3600))).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`);
  return `<div class="card"><h3>ثلث الليل</h3><div class="thirds"><div>الثلث الأول<b>${f12(m)}</b></div><div>منتصف الليل<b>${f12(m + n / 2)}</b></div><div>الثلث الأخير<b>${f12(m + 2 * n / 3)}</b></div></div></div>`;
}

/* ---------- tracking ---------- */
function togP(e, k) { if (e[k] || e[k + 'x']) { e[k] = false; delete e[k + 'x']; delete e[k + 'm']; } else e[k] = true; }
let lpT = null, lpAt = 0;
function sheet(date, k) {
  const t = trk(), e = t[date] = t[date] || {}; const n = PR.find(x => x[0] === k)[1];
  const st = e[k + 'x'] ? 'x' : e[k] === 'late' ? 'late' : e[k] ? 'on' : '', m = e[k + 'm'] || '';
  const o = (g, v, l, cur) => `<button class="chip${cur === v ? ' on' : ''}" data-sh="${g}:${v}" data-sd="${date}" data-sk="${k}">${l}</button>`;
  let el = $('#sheet'); if (!el) { el = document.createElement('div'); el.id = 'sheet'; document.body.appendChild(el); }
  el.innerHTML = `<div class="shbg" data-shclose></div><div class="shp"><h3>${n}</h3><div class="muted">الوقت</div><div class="chips">${o('w', 'on', 'في الوقت', st)}${o('w', 'late', 'متأخرة', st)}${o('w', 'x', 'فائتة', st)}</div><div class="muted">طريقة الصلاة</div><div class="chips">${o('m', 'a', 'فردي', m)}${o('m', 'c', 'جماعة', m)}${o('m', 'm', 'في المسجد', m)}</div><div class="muted" style="margin:6px 0 12px">في المسجد +٥ نقاط، جماعة +٣، متأخرة ٥ بدل ١٠، الفائتة بصفر.</div><div style="display:flex;gap:8px"><button class="btn g" data-sh="clr:" data-sd="${date}" data-sk="${k}" style="flex:1">مسح</button><button class="btn" data-shclose style="flex:1">تم</button></div></div>`;
}
let lpXY = null;
function lpStart(b, x, y) { const k = b.dataset.chk || b.dataset.tchk; if (/^n/.test(k)) return; clearTimeout(lpT); lpXY = [x, y]; lpT = setTimeout(() => { lpT = null; lpAt = Date.now(); buzz(40); openFor(b); }, 450); }
const lpStop = () => { clearTimeout(lpT); lpT = null; };
document.addEventListener('touchstart', ev => { const b = ev.target.closest('[data-chk],[data-tchk]'); if (!b || !ev.touches[0]) return; lpStart(b, ev.touches[0].clientX, ev.touches[0].clientY); }, { passive: true });
document.addEventListener('touchmove', ev => { if (lpT && lpXY && ev.touches[0] && Math.hypot(ev.touches[0].clientX - lpXY[0], ev.touches[0].clientY - lpXY[1]) > 14) lpStop(); }, { passive: true });
document.addEventListener('touchend', ev => { lpStop(); if (Date.now() - lpAt < 900 && ev.target.closest('[data-chk],[data-tchk]') && ev.cancelable) ev.preventDefault(); }, { passive: false });
document.addEventListener('touchcancel', () => { if (Date.now() - lpAt > 900) lpStop(); }, { passive: true });
document.addEventListener('mousedown', ev => { if (ev.button !== 0 || ('ontouchstart' in window && ev.sourceCapabilities && ev.sourceCapabilities.firesTouchEvents)) return; const b = ev.target.closest('[data-chk],[data-tchk]'); if (b) lpStart(b, ev.clientX, ev.clientY); });
document.addEventListener('mouseup', lpStop); document.addEventListener('scroll', lpStop, { passive: true });
function openFor(b) { const k = b.dataset.chk || b.dataset.tchk; if (/^n/.test(k)) return; let date = iso(); if (b.dataset.tchk) { const d = new Date(); d.setDate(d.getDate() + store.get('tday', 0)); date = iso(d); } store.set('hintLP', 1); sheet(date, k); }
document.addEventListener('contextmenu', ev => { const b = ev.target.closest('[data-chk],[data-tchk]'); if (!b) return; ev.preventDefault(); lpStop(); if (!$('#sheet') && Date.now() - lpAt > 900) { lpAt = Date.now(); openFor(b); } });
const trk = () => { const t = store.get('trk', {}); return t && typeof t === 'object' && !Array.isArray(t) ? t : {}; };
function setTrk(t) { store.set('trk', t); }
const NAFN = () => NAF.reduce((a, x) => a + x[2], 0);
function dayTier(e) { e = e || {}; if (!PR.every(([k]) => e[k])) return 0; const nf = NAF.every(([k]) => e['n' + k]); return nf && e.w ? 3 : nf ? 2 : 1; }
const TIERS = [null, ['🥉', 'برونزي', 20], ['🥈', 'فضي', 50], ['🥇', 'ذهبي', 100]];
const prayPts = (e, k) => !e[k] ? 0 : (e[k] === 'late' ? 5 : 10) + (e[k + 'm'] === 'm' ? 5 : e[k + 'm'] === 'c' ? 3 : 0);
const chkIn = (e, k) => e[k + 'x'] ? '✕' : e[k] === 'late' ? '⏱' : e[k] ? '✓' : '';
const chkCls = (e, k) => e[k + 'x'] ? ' miss' : e[k] === 'late' ? ' on late' : e[k] ? ' on ' + (e[k + 'm'] || 'a') : '';
const chkTag = (e, k) => { const a = []; if (e[k + 'x']) a.push('<b class="tx">فائتة</b>'); else if (e[k] === 'late') a.push('<b class="tl">متأخرة</b>'); const mk = e[k + 'm'], m = { a: 'فردي', c: 'جماعة', m: 'مسجد' }[mk]; if (m && e[k]) a.push('<b class="t' + mk + '">' + m + '</b>'); return a.length ? `<div class="tag">${a.join(' · ')}</div>` : ''; };
function dayXp(e) { let x = 0; PR.forEach(([k]) => { x += prayPts(e, k); }); NAF.forEach(([k]) => { if (e['n' + k]) x += 3; }); if (e.w) x += 10; const t = dayTier(e); if (t) x += TIERS[t][2]; return x; }
function xpOf(t) { let x = 0; for (const d in t) x += dayXp(t[d]); return x; }
function streaks(t) {
  const full = d => { const e = t[d] || {}; return PR.every(([k]) => e[k]); };
  let cur = 0; const d = new Date(); if (!full(iso(d))) d.setDate(d.getDate() - 1);
  while (full(iso(d))) { cur++; d.setDate(d.getDate() - 1); }
  const days = Object.keys(t).filter(full).sort(); let best = 0, run = 0, prev = null;
  days.forEach(x => { const dt = new Date(x); run = prev && (dt - prev) === 864e5 ? run + 1 : 1; best = Math.max(best, run); prev = dt; });
  return { cur, best };
}
const GEMS = ['⚫', '🟡', '🔷', '🟢', '🟣', '🔴', '💎'];

/* ---------- data ---------- */
let AD = null, QU = null;
const loadAd = async () => AD || (AD = await fetchJ('data/adhkar.json', 30000));
const loadQu = async () => QU || (QU = await fetchJ('data/quran.json', 45000));
const GROUPS = [
  ['sel', '⭐', 'الأذكار المختارة', [130, 129, 107, 131, 34, 35, 132]],
  ['pray', '🕌', 'الصلاة', [6, 7, 10, 11, 12, 13, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 32, 33]],
  ['sleep', '🌙', 'النوم والاستيقاظ', [2, 3, 29, 30, 31]],
  ['home', '🏠', 'المنزل', [4, 5, 8, 9]],
  ['food', '🍽️', 'الطعام والشراب', [68, 69, 70, 71, 72, 73, 74, 75, 76]],
  ['cloth', '👕', 'الملابس', [14, 15, 16, 17]],
  ['sick', '🤒', 'المرض والوفاة', [49, 50, 51, 124, 125, 52, 53, 54, 55, 56, 57, 58, 59, 60]],
  ['hard', '⛈️', 'الأوقات الصعبة', [34, 35, 36, 37, 38, 39, 40, 42, 43, 44, 45, 46, 82, 126, 128]],
  ['money', '💰', 'المال', [41, 90, 91]],
  ['trip', '🚗', 'السفر', [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105]],
  ['soc', '💬', 'اجتماعية', [77, 78, 83, 84, 85, 86, 87, 89, 93, 108, 109, 112, 113, 114]],
  ['kids', '👶', 'الأطفال', [47, 48]],
  ['wed', '💍', 'الزواج', [79, 80, 81]],
  ['hajj', '🕋', 'الحج والعمرة', [115, 116, 117, 118, 119, 120, 121]],
  ['wx', '🌧️', 'الطقس والهلال', [61, 62, 63, 64, 65, 66, 67]],
  ['misc', '📿', 'متفرقات', []]
];
const used = new Set([1, ...GROUPS.flatMap(g => g[3])]);
function groupCats(g) { if (g[0] === 'misc') return AD.filter(c => !used.has(c.id)).map(c => c.id); return g[3]; }

const SV = (p, w = 24) => `<svg class="sv" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  mosque: SV('<path d="M12 3c1.5 1.4 2 2.2 2 3.2a2 2 0 0 1-4 0c0-1 .5-1.8 2-3.2z"/><path d="M6 21v-7a6 6 0 0 1 12 0v7"/><path d="M3 21h18M9 21v-4a3 3 0 0 1 6 0v4"/>'),
  quran: SV('<path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13C17 4 14 4.5 12 6z"/><path d="M12 6v13"/>'),
  hands: SV('<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V10M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M7 11 5.5 9.5a1.4 1.4 0 0 0-2 2L8 17c1.2 2.2 2.8 3 5 3h1.5a3.5 3.5 0 0 0 3.5-3.5V9.5a1.5 1.5 0 0 0-3 0"/>'),
  clock: SV('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M5 4 2.5 6.5M19 4l2.5 2.5"/>'),
  check: SV('<path d="M12 3l2.4 1.8 3-.2 1 2.8 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-1 2.8-3-.2L12 21l-2.4-1.8-3 .2-1-2.8L3.2 14.8l.9-2.9-.9-2.9 2.4-1.8 1-2.8 3 .2z"/><path d="m8.5 12.2 2.5 2.5 4.5-5"/>'),
  compass: SV('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  beads: SV('<circle cx="12" cy="4" r="1.6"/><circle cx="17" cy="7" r="1.6"/><circle cx="18.5" cy="12.5" r="1.6"/><circle cx="16" cy="18" r="1.6"/><circle cx="10" cy="19.5" r="1.6"/><circle cx="5.5" cy="15.5" r="1.6"/><circle cx="5.5" cy="9" r="1.6"/>'),
  gear: SV('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  spk: SV('<path d="M3 9.2v5.6h3.6l4.9 4.2V5L6.6 9.2z" fill="currentColor" stroke="none"/><path d="M14.6 8.6a4.6 4.6 0 0 1 0 6.8" stroke-width="2.2"/><path d="M17.4 5.8a8.6 8.6 0 0 1 0 12.4" stroke-width="2.2"/>'),
  next: SV('<path d="m14.5 6-6 6 6 6"/>'), prev: SV('<path d="m9.5 6 6 6-6 6"/>'),
  play: SV('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>'), pause: SV('<path d="M8 5v14M16 5v14" stroke-width="3"/>'),
  dl: SV('<path d="M12 4v11m-4.5-4.2L12 15.3l4.5-4.5M5 19.5h14"/>'), list: SV('<path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" stroke-width="2.4"/>'),
  star: SV('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>'), more: SV('<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/>'),
  nav: SV('<path d="m3 11 18-8-8 18-2-8z" fill="currentColor"/>', 18)
};
/* ---------- views ---------- */
const V = {};
V.fasting = viewFasting;
function hdr(title, icons = '', back = false) {
  return `<header id="top">${back ? '<a class="ib" href="javascript:history.back()" aria-label="رجوع">→</a>' : ''}<h1>${title}</h1>${icons}</header>`;
}
const ico = (href, e, label) => `<a class="ib" href="${href}" aria-label="${label}">${e}</a>`;

V.prayers = () => {
  if (!ready || !day) return { head: hdr('الصلوات', ico('#/settings', '⚙️', 'الإعدادات')), body: failed ? '<div class="card center"><div class="sub">تعذر تحميل المواقيت. تأكد من الاتصال وجرب تاني.</div><button class="btn" data-retry style="margin-top:12px">إعادة المحاولة</button><div class="sub" style="margin-top:12px">أو اختار مدينتك من الإعدادات.</div></div>' : '<div class="card center sub">بحمّل المواقيت…</div>' };
  const np = nextPrayer(), t = trk()[iso()] || {}, snd = store.get('snd', {});
  const pct = Math.max(0, Math.min(100, 100 - (np.left / np.span) * 100));
  const g = new Date();
  const fast = (day.hd >= 13 && day.hd <= 15) ? 'الأيام البيض' : (g.getDay() === 1 || g.getDay() === 4) ? (g.getDay() === 1 ? 'صيام الاثنين' : 'صيام الخميس') : '';
  const rows = PR.map(([k, n]) => `<div class="prow${np.k === k ? ' now' : ''}"><button class="chk${chkCls(t, k)}" data-chk="${k}" aria-label="صليت ${n}">${chkIn(t, k)}</button><div class="n">${n}${chkTag(t, k)}<div class="iq">الإقامة ${hm12(secs(day.t[k]) + iqGap(k) * 60)}</div></div><div class="t">${to12(day.t[k])}</div><button class="snd${snd[k] === false ? ' off' : ''}" data-snd="${k}" aria-label="صوت الأذان">${IC.spk}</button></div>`).join('');
  return {
    head: '',
    body: `<div class="htop"><div class="hh"><h2>${np.n} خلال</h2><div class="cd" id="cd">${fmtHMS(np.left)}</div></div><div class="hb"><a class="ib dk" href="#/qibla" aria-label="القبلة">${IC.compass}</a><a class="ib dk" href="#/tasbih" aria-label="تسبيح">${IC.beads}</a><a class="ib dk" href="#/settings" aria-label="الإعدادات">${IC.gear}</a></div></div>
      <div class="hero"><div class="bar"><i id="cdbar" style="width:${pct}%"></i></div>
      <a class="loc" href="#/city"><span>${(place.name || '').split('،')[0]}</span><span class="arr">${IC.nav}</span></a>
      <div class="sub dt">${day.hijri} • ${new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(g)}</div>
      <div class="chips"><span class="pill s">تتبع الصلاة مفعّل <i class="tk">✓</i></span><a class="pill fastc" href="#/fasting">🌙 ${fastChip()}</a></div></div>
      <div class="card plist" style="padding:6px 10px">${rows}</div><div class="mosque"><div class="mb">${IC.mosque}</div><span>${num(NAF.reduce((a, x) => a + (t['n' + x[0]] ? x[2] : 0), 0))}/١٢</span></div>${store.get('hintLP') ? '' : '<div class="hint">💡 اضغط مطولا على دايرة أي صلاة تختار حالتها: في الوقت، متأخرة، فائتة، جماعة، في المسجد</div>'}
      <div class="card"><h3>الشروق</h3><div class="sub">تنتهي صلاة الفجر عند ${to12(day.t.Sunrise)}</div></div>${thirds()}
      <div class="center"><a class="btn g" href="#/city" style="text-decoration:none;display:inline-block">تغيير المدينة</a></div>`
  };
};

V.city = () => ({
  head: hdr('المدينة', '', true),
  body: `<div class="card"><button class="btn" data-geo>📍 استخدم موقعي الحالي</button><div class="muted" id="geomsg" style="margin-top:8px"></div></div>
    <div class="card list">${CITIES.map(c => `<a href="#/prayers" data-city="${c[0]}">${c[1]}<span class="m">${place.id === c[0] ? '✓' : ''}</span></a>`).join('')}</div>`
});

V.adhkar = async () => {
  await loadAd();
  const tile = (g, wide) => `<a class="tile${wide ? ' wide' : ''}" href="#/adhkar/g/${g[0]}"><span class="e">${g[1]}</span>${g[2]}</a>`;
  return {
    head: (setTimeout(qaRefresh, 60), hdr('الأذكار', ico('#/tasbih', '📿', 'تسبيح') + ico('#/alarms', '🔔', 'تذكيرات الأذكار'))),
    body: `<div class="card"><h3>أذكار من القرآن بصوت مشاري العفاسي</h3><div class="muted" id="qa-note" style="margin-bottom:8px">شغّلها أونلاين أو حمّلها تشتغل من غير إنترنت</div>${QAI.map(([r, n]) => `<div class="qarow"><button class="aud" data-qa="${r}" aria-label="تشغيل ${n}">${IC.play}</button><b style="flex:1">${n}</b><span class="qas" id="qs-${r.replace(':', '_')}"><button class="chip" data-qdla="${r}">${IC.dl} تحميل</button></span></div>`).join('')}<button class="btn" id="qa-all" data-qdlall style="width:100%;margin-top:10px">${IC.dl} تحميل الكل للتشغيل بدون إنترنت</button></div>
      <a class="tile wide" style="margin-bottom:12px" href="#/alarms"><span class="e">🔔</span><span style="flex:1">تذكيرات الأذكار وقيام الليل<br><span class="muted" style="font-size:12px">${(r => `الصباح ${r.m.on ? r.m.t : 'متوقف'} · المساء ${r.e.on ? r.e.t : 'متوقف'} · القيام ${r.q.on ? r.q.t : 'متوقف'}`)(getRem())}</span></span></a>
      <a class="tile wide" style="margin-bottom:12px" href="#/adhkar/c/1"><span class="e">🌅</span>أذكار الصباح والمساء</a>
      <a class="tile wide" style="margin-bottom:12px" href="#/adhkar/c/27"><span class="e">🤲</span>الأذكار بعد الصلاة</a>
      <div class="grid">${GROUPS.map(g => tile(g)).join('')}</div>
      <div class="card" style="margin-top:14px"><h3>بحث في كل الأذكار</h3><input type="search" id="q" placeholder="اكتب كلمة…"><div class="list" id="qr"></div></div>
      <div class="center muted" style="margin-bottom:8px">المصدر: حصن المسلم (مجموعة أذكار موثقة)</div>`
  };
};
V.group = async id => {
  await loadAd(); const g = GROUPS.find(x => x[0] === id) || GROUPS[0];
  const ids = groupCats(g);
  return { head: hdr(g[2], '', true), body: `<div class="card list">${ids.map(i => { const c = AD.find(x => x.id === i); return c ? `<a href="#/adhkar/c/${c.id}">${c.title}<span class="m">${num(c.items.length)}</span></a>` : ''; }).join('')}</div>` };
};
V.cat = async id => {
  await loadAd(); const c = AD.find(x => x.id === +id); if (!c) return { head: hdr('الأذكار', '', true), body: '<div class="card center sub">القسم ده مش موجود. <a href="#/adhkar">ارجع للأذكار</a></div>' };
  const st = store.get('ad.' + c.id, { d: iso(), c: {} }); if (st.d !== iso()) { st.d = iso(); st.c = {}; store.set('ad.' + c.id, st); }
  const done = c.items.filter((x, i) => (st.c[i] || 0) >= (x.count || 1)).length;
  return {
    head: hdr(c.title, '', true),
    body: `<div class="card sub">${num(done)} من ${num(c.items.length)} خلصتهم اليوم. دوس على الذكر كل مرة تقوله.</div>` +
      (c.audio ? `<div class="card plyr"><button class="btn${curAud === 'c:' + c.id ? '' : ' g'}" data-aud="c:${c.id}" data-af="${c.audio}">${curAud === 'c:' + c.id ? '⏸ إيقاف' : '▶ استمع للقسم كامل'}</button><button class="chip" data-arate>${adRate}x</button><button class="chip" data-dla="${c.audio}">⬇ حمّل بدون إنترنت</button></div>` : '') +
      c.items.map((x, i) => { const n = st.c[i] || 0, tot = x.count || 1, fin = n >= tot; return `<div class="dh${fin ? ' done' : ''}" data-dh="${c.id}:${i}">${x.a ? `<button class="aud${curAud === 'i:' + c.id + ':' + i ? ' on' : ''}" data-aud="i:${c.id}:${i}" data-af="${x.a}" aria-label="استمع">${curAud === 'i:' + c.id + ':' + i ? '⏸' : '▶'}</button>` : ''}<div class="t">${x.text}</div><div class="c"><span>${fin ? 'تم ✓' : num(n) + ' / ' + num(tot)}</span><span>${tot > 1 ? 'التكرار ' + num(tot) : ''}</span></div><div class="bar"><i style="width:${Math.min(100, n / tot * 100)}%"></i></div></div>`; }).join('') +
      `<div class="center"><button class="btn g" data-dreset="${c.id}">ابدأ من الأول</button></div>`
  };
};

V.quran = async () => {
  const q = await loadQu(); const last = store.get('qlast', null), wird = store.get('wird', { ppd: 5 });
  const tab = store.get('qtab', 's');
  const sRow = s => `<a class="srow" href="#/quran/s/${s.n}"><span class="hex">${num(s.n)}</span><span class="nm">${s.name}</span><span class="mt">${s.type === 'Meccan' ? 'مكية' : 'مدنية'} • ${num(s.ayahs)} آية</span></a>`;
  let list;
  if (tab === 's') list = q.surahs.map(sRow).join('');
  else { const firsts = {}; q.pages.forEach((p, i) => { const j = p[0][3]; if (!(j in firsts)) firsts[j] = i + 1; }); list = Object.keys(firsts).map(j => `<a class="srow" href="#/quran/p/${firsts[j]}"><span class="hex">${num(j)}</span><span class="nm">الجزء ${num(j)}</span><span class="mt">صفحة ${num(firsts[j])}</span></a>`).join(''); }
  const tp = store.get('wirdp', { d: iso(), n: 0 });
  return {
    head: hdr('القرآن', ico('#/quran/search', '🔍', 'بحث') + ico('#/quran/marks', '⭐', 'العلامات')),
    body: `<h3 style="margin:8px 4px">الأنشطة الأخيرة</h3>
    ${store.get('qbm', 0) ? `<a class="rec" href="#/quran/p/${store.get('qbm', 0)}"><span class="hex">★</span><span style="flex:1"><b>مكان وقوفك</b><br><span class="muted">صفحة ${num(store.get('qbm', 0))} من ٦٠٤</span></span><span class="btn g" style="padding:6px 14px;min-height:0">كمّل</span></a>` : ''}
    ${last ? `<a class="rec" href="#/quran/p/${last}"><span class="hex">${num(q.pages[last - 1][0][0])}</span><span style="flex:1"><b>آخر قراءة</b><br><span class="muted">صفحة ${num(last)} من ٦٠٤</span></span><span class="btn g" style="padding:6px 14px;min-height:0">كمّل</span></a>` : ''}
    <a class="rec" href="#/quran/wird"><span class="hex">📖</span><span style="flex:1"><b>الورد اليومي</b><br><span class="muted">${num(wird.ppd)} صفحات يوميا · الختمة في ${num(Math.ceil(604 / wird.ppd))} يوم</span></span></a>
    <div class="seg"><button data-qtab="s" class="${tab === 's' ? 'on' : ''}">سورة</button><button data-qtab="j" class="${tab === 'j' ? 'on' : ''}">جزء</button></div>${list}`
  };
};
function mushafPage(q, n) {
  const p = q.pages[n - 1]; let out = '';
  p.forEach(([s, a, t]) => {
    if (a === 1) { out += `<div class="sf"><i></i><b>سورة ${q.surahs[s - 1].name}</b><i></i></div>`; if (s !== 1 && s !== 9) out += '<div class="bsm">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>'; }
    out += `${t} <span class="vn">${num(a)}</span> `;
  });
  return out;
}
const AYB = 'https://cdn.islamic.network/quran/audio/64/ar.alafasy/';
let qpA = null, qpOn = false, qAuto = false;
function pageAyahs(q, n) { const pre = []; let c = 0; q.surahs.forEach(s => { pre[s.n] = c; c += s.ayahs; }); return q.pages[n - 1].map(([s, a]) => pre[s] + a); }
function stopQ() { qpOn = false; try { if (qpA) { qpA.pause(); qpA = null; } } catch (e) {} const b = $('#qplay'); if (b) b.innerHTML = IC.play; }
async function playPage(n) {
  const q = await loadQu(); stopAud(); stopAdhan(); stopQ(); qpOn = true; const list = pageAyahs(q, n); let i = 0; const b = $('#qplay'); if (b) b.innerHTML = IC.pause;
  const next = async () => {
    if (!qpOn) return;
    if (i >= list.length) { qpOn = false; if (b) b.innerHTML = IC.play; if (n < 604) { qAuto = true; location.hash = '#/quran/p/' + (n + 1); } return; }
    try { qpA = new Audio(await cachedUrl(AYB + list[i] + '.mp3', 'hq-quran')); i++; qpA.onended = next; qpA.onerror = () => { stopQ(); toast('الصوت محتاج إنترنت أو حمّله الأول'); }; await qpA.play(); } catch (e) { stopQ(); toast('اضغط تاني لتشغيل الصوت'); }
  };
  next();
}
async function dlPage(n) {
  const q = await loadQu(); const list = pageAyahs(q, n); let ok = 0; toast('بنحمّل صوت الصفحة…');
  for (const g of list) { try { await cacheFetch(AYB + g + '.mp3', 'hq-quran'); ok++; } catch (e) {} }
  toast(ok === list.length ? 'اتحمّلت الصفحة، هتشتغل من غير إنترنت ✓' : 'اتحمّل ' + num(ok) + ' من ' + num(list.length) + '، جرب تاني');
}
V.reader = async n => {
  const q = await loadQu(); n = Math.max(1, Math.min(604, +n || 1)); store.set('qlast', n); stopQ();
  const qs = store.get('qs', 26), bm = store.get('qbm', 0);
  const surah = q.surahs[q.pages[n - 1][0][0] - 1].name, juz = q.pages[n - 1][0][3];
  if (qAuto) { qAuto = false; setTimeout(() => playPage(n), 400); }
  return {
    head: `<div class="qtop"><a class="ib qback" href="#/quran" aria-label="رجوع">→</a><a class="qchip" href="#/quran" data-qjuz>الجزء ${num(juz)}</a><a class="qchip" href="#/quran">${surah}</a></div>`,
    body: `<div class="qpage" data-n="${n}" data-cap="${qs}">${mushafPage(q, n)}</div>
    <div class="qmore" id="qmore" hidden><button class="chip" data-qs="-2">أ-</button><button class="chip" data-qs="2">أ+</button><button class="chip" data-wdone="${n}">✓ قرأت الصفحة (ورد اليوم)</button></div>
    <div class="qctl"><a class="qb" href="#/quran/p/${Math.min(604, n + 1)}" aria-label="التالية">${IC.next}</a><button class="qb" id="qplay" data-qplay="${n}" aria-label="استماع">${IC.play}</button><button class="qb" data-qdl="${n}" aria-label="تحميل الصوت">${IC.dl}</button><a class="qb" href="#/quran" aria-label="الفهرس">${IC.list}</a><button class="qb${bm === n ? ' on' : ''}" id="qstar" data-qbm="${n}" aria-label="مكان الوقوف">${IC.star}</button><button class="qb" data-qmore aria-label="المزيد">${IC.more}</button><span class="qn">${num(n)}</span><a class="qb" href="#/quran/p/${Math.max(1, n - 1)}" aria-label="السابقة">${IC.prev}</a></div>`
  };
};
const qFit = {}; let qFontOK = false;
function fitQ() {
  const el = $('.qpage'); if (!el) return;
  const ct = $('.qctl'); if (ct) { const h = ct.getBoundingClientRect().top - el.getBoundingClientRect().top - 8; if (h > 200) el.style.height = h + 'px'; }
  const n = el.dataset.n, cap = +el.dataset.cap || 26, key = n + '|' + cap + '|' + el.clientWidth + '|' + el.clientHeight + '|' + (qFontOK ? 1 : 0);
  if (qFit[key]) { el.style.fontSize = qFit[key] + 'px'; return; }
  let lo = 12, hi = Math.min(cap, 34);
  while (hi - lo > 0.5) { const mid = (lo + hi) / 2; el.style.fontSize = mid + 'px'; if (el.scrollHeight <= el.clientHeight + 1) lo = mid; else hi = mid; }
  el.style.fontSize = lo + 'px'; qFit[key] = lo;
}
let qSw = null;
document.addEventListener('touchstart', e => { qSw = $('.qpage') && e.target.closest('.qpage') ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
document.addEventListener('touchend', e => { if (!qSw) return; const dx = e.changedTouches[0].clientX - qSw[0], dy = e.changedTouches[0].clientY - qSw[1]; qSw = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) { const n = +$('.qpage').dataset.n; location.hash = '#/quran/p/' + (dx < 0 ? Math.min(604, n + 1) : Math.max(1, n - 1)); } }, { passive: true });
window.addEventListener('resize', () => { if ($('.qpage')) fitQ(); });
V.surah = async n => { const q = await loadQu(); const i = q.pages.findIndex(p => p.some(a => a[0] === +n && a[1] === 1)); return V.reader(i + 1); };
V.marks = async () => {
  const marks = store.get('marks', []);
  return { head: hdr('العلامات', '', true), body: `<div class="card list">${marks.length ? marks.sort((a, b) => a - b).map(m => `<a href="#/quran/p/${m}">صفحة ${num(m)}<span class="m">›</span></a>`).join('') : '<div class="sub center">لسه مفيش علامات. دوس ☆ في أي صفحة.</div>'}</div>` };
};
V.qsearch = async () => ({ head: hdr('بحث في المصحف', '', true), body: '<div class="card"><input type="search" id="qs2" placeholder="اكتب كلمة من الآية (بدون تشكيل)"><div class="list" id="qsr" style="margin-top:8px"></div></div>' });
V.wird = async () => {
  const w = store.get('wird', { ppd: 5, pos: 1 }), tp = store.get('wirdp', { d: iso(), n: 0 }); const nxt = store.get('wirdpos', 1);
  return {
    head: hdr('الورد اليومي', '', true),
    body: `<div class="card"><h3>هدفك كل يوم</h3><div class="chips">${[1, 2, 5, 10, 20].map(n => `<button class="chip${w.ppd === n ? ' on' : ''}" data-ppd="${n}">${num(n)} ${n === 1 ? 'صفحة' : 'صفحات'}</button>`).join('')}</div>
    <div class="sub">الختمة في ${num(Math.ceil(604 / w.ppd))} يوم</div></div>
    <div class="card"><h3>النهاردة</h3><div class="big">${num(tp.d === iso() ? tp.n : 0)} / ${num(w.ppd)}</div><div class="prog"><i style="width:${Math.min(100, (tp.d === iso() ? tp.n : 0) / w.ppd * 100)}%"></i></div>
    <div class="center" style="margin-top:14px"><a class="btn" style="text-decoration:none;display:inline-block" href="#/quran/p/${nxt}">ابدأ الورد من صفحة ${num(nxt)}</a></div></div>`
  };
};

function calCard(t) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth(), first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
  const names = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; let cells = '';
  for (let i = 0; i < (first + 1) % 7; i++) cells += '<div></div>';
  for (let d = 1; d <= dim; d++) {
    const e = t[iso(new Date(y, m, d))] || {}, c = PR.filter(([k]) => e[k]).length, fut = d > n.getDate();
    cells += `<div style="opacity:${fut ? .35 : 1};display:grid;place-items:center"><span style="width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-size:14px;background:${c ? `conic-gradient(${c === 5 ? 'var(--ok)' : 'var(--gold)'} ${c * 72}deg,var(--card2) 0)` : 'var(--card2)'};${d === n.getDate() ? 'outline:2px solid var(--ac2);' : ''}"><span style="width:30px;height:30px;border-radius:50%;background:var(--card);display:grid;place-items:center">${num(d)}</span></span></div>`;
  }
  return `<div class="card"><h3>${new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(n)}</h3><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;text-align:center"><div class="muted">ح</div><div class="muted">ن</div><div class="muted">ث</div><div class="muted">ر</div><div class="muted">خ</div><div class="muted">ج</div><div class="muted">س</div>${cells}</div></div>`;
}
function badgeCard(t, st) {
  let total = 0, fajr = 0, sun = 0; for (const d in t) { PR.forEach(([k]) => { if (t[d][k]) total++; }); if (t[d].Fajr) fajr++; if (t[d].nf2) sun++; }
  const B = [['🏛️', 'المداومة', st.best >= 7, 'أسبوع كامل'], ['🛡️', 'حارس الفجر', fajr >= 7, '٧ فجور'], ['🌅', 'خير من الدنيا', sun >= 7, 'سنة الفجر ٧ أيام'], ['🏔️', 'المداومة الكبرى', st.best >= 30, '٣٠ يوم']];
  return `<div class="card"><h3>الأوسمة</h3><div class="circ" style="grid-template-columns:repeat(4,1fr)">${B.map(b => `<div style="opacity:${b[2] ? 1 : .35}"><span style="font-size:36px">${b[0]}</span>${b[1]}</div>`).join('')}</div>
  <div style="background:var(--card2);border-radius:18px;padding:14px;margin-top:14px"><div class="muted">التالي</div><b>ألف صلاة</b><div class="prog"><i style="width:${Math.min(100, total / 10)}%"></i></div><div class="muted" style="margin-top:6px">${num(total)} / ١٠٠٠ · بقيت ${num(Math.max(0, 1000 - total))} صلاة</div></div></div>`;
}
V.track = () => {
  const t = trk(), td = store.get('tday', 0); const d = new Date(); d.setDate(d.getDate() + td); const k = iso(d), e = t[k] || {};
  const xp = xpOf(t), lvl = Math.floor(xp / 150) + 1, prog = (xp % 150) / 150 * 100, st = streaks(t);
  const naf = NAF.reduce((a, [x, n, c]) => a + (e['n' + x] ? c : 0), 0);
  const label = td === 0 ? 'اليوم' : td === -1 ? 'أمس' : new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long' }).format(d);
  return {
    head: hdr('تتبع الصلوات', '<span class="ib" style="width:auto;padding:0 14px;font-size:14px;border-radius:999px">المستوى ' + num(lvl) + '</span>'),
    body: `<div class="gems">${GEMS.map((g, i) => `<span class="${i === (lvl - 1) % GEMS.length ? 'on' : ''}">${g}</span>`).join('')}</div>
    <div class="prog" style="margin:0 0 16px"><i style="width:${prog}%"></i></div>
    ${store.get('hintLP') ? '' : '<div class="hint">💡 اضغط مطولا على دايرة أي صلاة تختار حالتها</div>'}<div class="card"><div class="days"><button class="ib" data-tday="-1" aria-label="اليوم السابق">›</button><b>${label}</b><button class="ib" data-tday="1" ${td >= 0 ? 'disabled style="opacity:.3"' : ''} aria-label="اليوم التالي">‹</button></div>
    <div class="circ">${PR.map(([p, n]) => `<div><button class="chk${chkCls(e, p)}" data-tchk="${p}" style="width:48px;height:48px">${chkIn(e, p)}</button>${n}${chkTag(e, p)}</div>`).join('')}</div></div>
    <div class="card"><h3>النوافل <span class="muted" style="float:left">${num(naf)} / ١٢</span></h3><div class="circ">${NAF.map(([x, n, c]) => `<div><button class="chk${e['n' + x] ? ' on' : ''}" data-tchk="n${x}" style="width:44px;height:44px;font-size:16px">${e['n' + x] ? '✓' : num(c)}</button>${n}</div>`).join('')}</div></div>
    ${calCard(t)}${badgeCard(t, st)}
    <div class="card"><h3>الهدف اليومي</h3><div class="stats"><div><b>🔥 ${num(st.cur)} يوم</b><span>السلسلة الحالية</span></div><div><b>🏅 ${num(st.best)} يوم</b><span>أطول سلسلة</span></div><div><b>⭐ ${num(xp)}</b><span>النقاط</span></div></div>
    <div class="muted" style="margin-top:10px">كل فرض بـ ١٠ نقاط وكل نافلة بـ ٣ وإنجاز الورد بـ ١٠. الصلاة في المسجد +٥، جماعة +٣، متأخرة ٥ بدل ١٠، والفائتة بصفر. اضغط مطولا على أي صلاة لتحديد حالتها. كل ١٥٠ نقطة مستوى جديد.</div></div>
    <div class="card"><h3>مستوى اليوم ${dayTier(e) ? TIERS[dayTier(e)][0] + ' ' + TIERS[dayTier(e)][1] : ''}</h3>
    <div class="muted" style="line-height:2">🥉 برونزي: الصلوات الخمس كلها (+٢٠)<br>🥈 فضي: الصلوات + كل النوافل (+٥٠)<br>🥇 ذهبي: الصلوات + النوافل + ورد اليوم (+١٠٠)</div>
    <div class="muted" style="margin-top:8px">${dayTier(e) === 3 ? 'يوم كامل، ما شاء الله 🎉' : 'نقاط اليوم: ' + num(dayXp(e))}</div></div>`
  };
};

V.alarms = () => {
  const a = store.get('alarm', { pre: true, preMin: 15, at: true, iqama: true, iqMin: 10, audio: true, kahf: true, aftr: false });
  const sw = (k, label, sub) => `<label class="sw"><span>${label}${sub ? `<br><span class="muted">${sub}</span>` : ''}</span><input type="checkbox" data-alarm="${k}" ${(['wirdr', 'persist', 'fastr'].includes(k) ? a[k] !== false : a[k]) ? 'checked' : ''}></label>`;
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  return {
    head: hdr('المنبهات', ico('#/settings', '⚙️', 'الإعدادات')),
    body: `<div class="card"><h3>التنبيهات</h3>${sw('pre', 'تنبيه قبل الصلاة', 'قبل كل صلاة بـ ' + num(a.preMin) + ' دقيقة')}${sw('at', 'تنبيه وقت الأذان')}${sw('iqama', 'تنبيه الإقامة', 'بحسب كل صلاة (شوفها تحت)')}${sw('audio', 'تشغيل صوت الأذان داخل التطبيق')}${sw('wirdr', 'تذكير الورد اليومي', 'لو ما خلصتش ورد النهاردة، تنبيه الساعة ٨ مساء')}${sw('persist', 'إشعار دائم بالصلاة القادمة', 'بيفضل ظاهر ومعاه العدّ التنازلي، وبيخلي التطبيق شغّال في الخلفية (أندرويد)')}${sw('aftr', 'تذكير أذكار بعد الصلاة', 'بعد كل صلاة بـ ٢٠ دقيقة')}${sw('fastr', 'تذكير الصيام (الاثنين والخميس والأيام البيض)', 'إشعار الساعة ٨ مساء قبلها بيوم')}${sw('kahf', 'تذكير الجمعة', 'سورة الكهف والإكثار من الصلاة على النبي ﷺ، الجمعة الساعة ٩ صباحا')}</div>
    <div class="card"><h3>دقايق التنبيه قبل الصلاة</h3><div class="chips">${[5, 10, 15, 20, 30].map(n => `<button class="chip${a.preMin === n ? ' on' : ''}" data-premin="${n}">${num(n)}</button>`).join('')}</div>
    <h3>الإقامة بعد الأذان (بالدقايق)</h3>${PR.map(([k, n]) => `<div class="prm"><span>${n}</span><span><button class="chip" data-iqd="${k}:-5">−</button> <b>${num(iqGap(k))}</b> <button class="chip" data-iqd="${k}:5">+</button></span></div>`).join('')}</div>
    <div class="card"><h3>تذكيرات الأذكار وقيام الليل</h3><div class="muted" style="margin-bottom:8px">اختار الوقت اللي يناسبك. بتشتغل والتطبيق مقفول في نسخة الأندرويد.</div>${[['m', 'أذكار الصباح'], ['e', 'أذكار المساء'], ['q', 'قيام الليل']].map(([k, n]) => { const r = getRem()[k]; return `<div class="prm"><span>${n}</span><span><input type="time" data-rt="${k}" value="${r.t}" style="background:var(--card2);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:6px"> <label class="sw"><input type="checkbox" data-rc="${k}"${r.on ? ' checked' : ''}></label></span></div>`; }).join('')}<div class="muted" style="margin:10px 0 6px">أوقات مقترحة للقيام (من مواقيت اليوم):</div><div class="chips">${(qiyamWins() || []).map(([n, s2]) => `<button class="chip" data-qset="${Math.floor(s2 / 60) % 1440}">${n} ${hm12(s2)}</button>`).join('')}</div></div>
    <a class="tile wide" style="margin-bottom:14px" href="#/ramadan"><span class="e">🌙</span>رمضان والسحور</a>
    <div class="card"><h3>إذن الإشعارات</h3><div class="sub">الحالة: ${perm === 'granted' ? 'مفعّل ✓' : perm === 'denied' ? 'مرفوض من إعدادات المتصفح' : perm === 'unsupported' ? 'غير مدعوم' : 'لم يُفعّل بعد'}</div>
    <div class="muted" style="margin:14px 0 6px">صوت الأذان</div><div class="slist">${SOUNDS.map(([k, n, o]) => `<div class="srow${(a.sound || 'aaqib') === k ? ' sel' : ''}"><button class="aud" data-sprev="${k}" aria-label="سماع">▶</button><div data-asound="${k}" style="flex:1"><b>${n}</b><div class="muted">${o}</div></div>${k.startsWith('r:') ? (voiceHas[k] ? '<span class="muted">محمّل ✓</span>' : `<button class="chip" data-dlv="${k}">⬇ تحميل</button>`) : ''}<span class="ck">${(a.sound || 'aaqib') === k ? '✓' : ''}</span></div>`).join('')}</div><button class="btn" data-perm style="margin-top:10px">تفعيل الإشعارات</button><button class="btn g" data-testalarm style="margin-top:10px">جرب تنبيه الآن</button>
    <div class="muted" style="margin-top:12px">ملاحظة صادقة: التنبيهات في نسخة الويب بتشتغل لما التطبيق يكون مفتوح أو شغال في الخلفية. للتنبيه المضمون والأذان بصوت المشاري والتطبيق مقفول، هنعمل نسخة أندرويد (APK) في الخطوة الجاية.</div></div>`
  };
};

V.ramadan = async () => {
  const sa = store.get('suhoor', { on: true, min: 45 }); let body;
  const inR = day && day.hm === 9;
  let table = '<div class="sub center">بحمّل الجدول…</div>';
  try {
    const hy = day ? (day.hm > 9 ? day.hy + 1 : day.hy) : 1448, key = `ram.${methodFor()}.${place.lat.toFixed(1)}.${place.lon.toFixed(1)}.${hy}`;
    let rows = store.get(key);
    if (!rows) { const j = await fetchJ(`https://api.aladhan.com/v1/hijriCalendar/${hy}/9?latitude=${place.lat}&longitude=${place.lon}&method=${methodFor()}`); if (!j || !Array.isArray(j.data) || !j.data.length) throw new Error('bad'); rows = j.data.map(x => [x.date.hijri.day, x.date.gregorian.date, x.timings.Fajr, x.timings.Maghrib]); store.set(key, rows); }
    const first = rows[0][1].split('-'), gd = new Date(+first[2], +first[1] - 1, +first[0]), left = Math.ceil((gd - new Date()) / 864e5);
    body = `<div class="card center"><div class="sub">${inR ? 'رمضان مبارك 🌙' : left > 0 ? 'باقي على رمضان تقريبا' : 'رمضان'}</div>${!inR && left > 0 ? `<div class="big">${num(left)} يوم</div>` : ''}<div class="sub">${hy} هـ</div></div>`;
    table = `<div class="card"><h3>إمساكية رمضان · ${place.name}</h3><div class="list">${rows.map(r => `<div class="li"><span>${num(r[0])} رمضان · ${num(+r[1].slice(0, 2)) + '/' + num(+r[1].slice(3, 5))}</span><span class="m">إمساك ${to12(r[2])} · إفطار ${to12(r[3])}</span></div>`).join('')}</div></div>`;
  } catch (e) { body = ''; table = '<div class="card sub center">تعذر تحميل الإمساكية. تأكد من الاتصال.</div>'; }
  return { head: hdr('رمضان', '', true), body: `${body}<div class="card"><label class="sw"><span>منبه السحور<br><span class="muted">قبل أذان الفجر بـ ${num(sa.min)} دقيقة، في رمضان فقط</span></span><input type="checkbox" data-suhoor="on" ${sa.on ? 'checked' : ''}></label><div class="chips">${[20, 30, 45, 60, 90].map(n => `<button class="chip${sa.min === n ? ' on' : ''}" data-suhmin="${n}">${num(n)}</button>`).join('')}</div>
  <div class="muted">صوت المسحراتي هيتضاف مع نسخة الأندرويد، والمنبه شغال في رمضان تلقائيا حسب موقعك.</div></div>${table}` };
};
V.tasbih = () => {
  const items = ['سُبْحَانَ اللَّهِ', 'الْحَمْدُ لِلَّهِ', 'اللَّهُ أَكْبَرُ', 'لَا إِلَهَ إِلَّا اللَّهُ', 'أَسْتَغْفِرُ اللَّهَ', 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ'];
  const s = store.get('tas', { i: 0, c: {}, t: 33 }); const c = s.c[s.i] || 0;
  return {
    head: hdr('تسبيح', `<button class="ib" data-tasreset aria-label="تصفير">↻</button>`, true),
    body: `<div class="card center"><div style="display:flex;justify-content:space-between;align-items:center"><button class="ib" data-tasnav="-1">›</button><span style="font-family:AmiriQuran,serif;font-size:26px;flex:1">${items[s.i]}</span><button class="ib" data-tasnav="1">‹</button></div></div>
    <div class="chips" style="justify-content:center">${[33, 99, 100, 0].map(n => `<button class="chip${s.t === n ? ' on' : ''}" data-tast="${n}">${n ? 'من ' + num(n) : 'مفتوح'}</button>`).join('')}</div>
    <button class="tas" id="tasbtn"><span class="n" id="tasn">${num(c)}</span><span class="muted" id="tasz">${s.t ? 'الدورة ' + num(c % s.t) + ' / ' + num(s.t) : ''}</span>
    <div class="strand"><div class="cord"></div><div class="in" id="strand">${'<div class="bead"></div>'.repeat(14)}</div></div><span class="muted">اضغط للعد</span></button>`
  };
};
let qibla = { heading: null };
const qiblaB = () => { const r = Math.PI / 180, dl = (39.8262 - place.lon) * r; return ((Math.atan2(Math.sin(dl), Math.cos(place.lat * r) * Math.tan(21.4225 * r) - Math.sin(place.lat * r) * Math.cos(dl)) / r) + 360) % 360; };
const QN = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
V.qibla = () => {
  const r = Math.PI / 180, dl = (39.8262 - place.lon) * r;
  const b = ((Math.atan2(Math.sin(dl), Math.cos(place.lat * r) * Math.tan(21.4225 * r) - Math.sin(place.lat * r) * Math.cos(dl)) / r) + 360) % 360;
  const names = ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'];
  window.__qb = b;
  return { head: hdr('القبلة', '', true), body: `<div class="center"><div class="compass" id="cmp"><div class="dial" id="qn"><i class="n">ش</i><i class="e">شرق</i><i class="s">ج</i><i class="w">غرب</i></div><div class="ar" id="qar" style="transform:rotate(${b}deg)"><span>🕋</span></div><div class="hub">✦</div></div><div class="big">${num(Math.round(b))}°</div><div class="sub">${names[Math.round(b / 45) % 8]} من ${place.name}، مقاسة من الشمال مع عقارب الساعة</div><div class="muted" style="margin-top:6px">لف الموبايل لحد ما الكعبة تبقى لفوق، والدايرة هتخضر لما تبقى مظبوط.</div><button class="btn" data-compass style="margin-top:12px">شغّل البوصلة</button><div class="muted" id="cmsg" style="margin-top:8px"></div></div>` };
};
V.settings = () => ({
  head: hdr('الإعدادات', '', true),
  body: `<div class="card list"><a href="#/city">المدينة<span class="m">${place.name}</span></a><a href="#/alarms">المنبهات<span class="m">›</span></a><a href="#/ramadan">رمضان والسحور<span class="m">›</span></a>
  </div>
  <div class="card"><h3>طريقة حساب المواقيت</h3><div class="chips">${METHODS.map(m => `<button class="chip${store.get('method', 0) === m[0] ? ' on' : ''}" data-method="${m[0]}">${m[1]}</button>`).join('')}</div><div class="muted">الوضع التلقائي بيختار الطريقة المناسبة لبلدك.</div></div>
  <div class="card"><h3>ضبط المواقيت</h3><div class="muted">مذهب العصر</div><div class="chips"><button class="chip${store.get('school', 0) === 0 ? ' on' : ''}" data-school="0">الجمهور (شافعي، مالكي، حنبلي)</button><button class="chip${store.get('school', 0) === 1 ? ' on' : ''}" data-school="1">حنفي</button></div>
   <div class="muted" style="margin-top:8px">تعديل بالدقايق لكل صلاة</div>${PR.filter(p => p[0] !== 'Sunrise').map(([k, n]) => { const o = store.get('offs', {})[k] || 0; return `<div class="prm" style="align-items:center"><span>${n}</span><span class="step"><button class="ib" data-off="${k}:-1">−</button><b style="min-width:44px;text-align:center">${o > 0 ? '+' : ''}${num(o)}</b><button class="ib" data-off="${k}:1">+</button></span></div>`; }).join('')}</div>
   <div class="card"><h3>صلاحيات التطبيق</h3>
   <div class="muted" style="margin-bottom:8px">التطبيق محتاج الصلاحيات دي عشان يشتغل صح. مفيش بيانات بتتبعت لأي حد، كله بيتخزن على موبايلك.</div>
   <div class="prm"><span>📍 الموقع<br><span class="muted">لحساب مواقيت الصلاة واتجاه القبلة حسب مكانك. تقدر تختار مدينتك بإيدك بدل كده.</span></span><b id="pm-loc">…</b></div>
   <button class="btn g" data-loc style="width:100%;margin:6px 0 12px">السماح بالموقع</button>
   <div class="prm"><span>🔔 الإشعارات<br><span class="muted">لتنبيهات الصلاة والإقامة والجمعة والورد والسحور.</span></span><b>${'Notification' in window ? ({ granted: 'مسموح ✓', denied: 'مرفوض', default: 'لسه' })[Notification.permission] : 'مش مدعوم'}</b></div>
   ${NATIVE ? `<div class="card"><h3>لو التنبيهات مش بتشتغل والتطبيق مقفول</h3><div class="muted" style="line-height:1.9">بعض الموبايلات (ريلمي، أوبو، شاومي، هواوي، وبعض سامسونج) بتقفل التطبيقات في الخلفية عشان توفر البطارية. اعمل الخطوات دي مرة واحدة:<br>١. اضغط "إعدادات البطارية" واختار حياتك في الصلاة، وخليها "بدون قيود" أو "السماح بالنشاط في الخلفية".<br>٢. اضغط "التشغيل التلقائي" وفعّله للتطبيق.<br>٣. من إعدادات التطبيق، تأكد إن الإشعارات والمنبهات مسموحة.<br>٤. في قائمة التطبيقات الأخيرة، اسحب على التطبيق ومسكه لحد ما يظهر القفل 🔒.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn" data-nat="battery">إعدادات البطارية</button><button class="btn g" data-nat="auto">التشغيل التلقائي</button><button class="btn g" data-nat="app">إعدادات التطبيق</button></div></div><div class="card"><h3>تجربة التنبيه</h3><div class="muted" id="natst" style="line-height:1.9">${nativeStatus()}</div><button class="btn" data-nat="test" style="margin-top:10px">جرب تنبيه بعد ١٠ ثواني</button><div class="muted" style="margin-top:6px">اضغط الزرار، اقفل التطبيق واقفل الشاشة، وانتظر.</div></div>` : ''}
      <button class="btn g" data-perm style="width:100%;margin:6px 0 12px">تفعيل الإشعارات</button>
   <div class="prm"><span>🧭 حساسات الحركة<br><span class="muted">لبوصلة القبلة.</span></span><b>${window.DeviceOrientationEvent ? 'متاح' : 'مش مدعوم'}</b></div>
   <div class="prm"><span>🔊 الصوت والاهتزاز<br><span class="muted">لصوت الأذان وعدّاد التسبيح. مش محتاج إذن.</span></span><b>تلقائي</b></div>
   <div class="muted" style="margin-top:8px">لو رفضت صلاحية بالغلط: من إعدادات المتصفح أو التطبيق، اختار الصلاحيات وفعّلها.</div></div>
   <div class="card"><h3>للتواصل والدعم ومزيد من التحديثات</h3><div class="list">
   <a href="https://t.me/MGSNC" target="_blank" rel="noopener">تيليجرام<span class="m">↗</span></a>
   <a href="mailto:mojshshm29@gmail.com">الإيميل: mojshshm29@gmail.com<span class="m">✉</span></a></div></div>
   <div class="card"><h3>اقتراحاتك</h3><div class="muted" style="line-height:1.9;margin-bottom:10px">عندك فكرة أو ميزة نفسك تشوفها في التطبيق؟ أو لقيت مشكلة؟ ابعتلنا على تيليجرام أو الإيميل، وكل اقتراح بنقراه ونحاول نضيفه في التحديثات الجاية.</div>
   <a class="btn" style="display:block;text-align:center;text-decoration:none" href="https://t.me/MGSNC" target="_blank" rel="noopener">ابعت اقتراح على تيليجرام</a>
   <a class="btn g" style="display:block;text-align:center;text-decoration:none;margin-top:10px" href="mailto:mojshshm29@gmail.com?subject=%D8%A7%D9%82%D8%AA%D8%B1%D8%A7%D8%AD%20%D9%84%D8%AA%D8%B7%D8%A8%D9%8A%D9%82%20%D8%AD%D9%8A%D8%A7%D8%AA%D9%83%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%B5%D9%84%D8%A7%D8%A9">ابعت اقتراح بالإيميل</a></div>
   <div class="card"><h3>المصادر والشكر</h3><div class="muted" style="line-height:1.9;font-size:12.5px">تلاوة مشاري العفاسي: Islamic Network (alquran.cloud) · أذان من الإنترنت: أرشيف الإنترنت، مجموعة Adhan Notifications · الأذكار: حصن المسلم (مشروع Adhkar-json) · المصحف: api.alquran.cloud (رسم عثماني) · المواقيت: Aladhan · الخطوط: Amiri Quran وCairo (OFL) · الموقع: OpenStreetMap.<br>أصوات الأذان من ويكيميديا كومنز: «The Adhan» بصوت Atcovi (CC BY-SA 4.0) · «Call to prayer» بصوت صباح فخري (ملكية عامة) · «Adhan, Great Mosque of Mecca» لـ Seyfula Islam (CC BY 3.0).</div></div>
   <div class="card"><button class="btn" data-share style="width:100%">مشاركة التطبيق مع الأصحاب</button>
  <button class="btn g hide" id="inst" data-install style="width:100%;margin-top:10px">ثبّت التطبيق على الشاشة الرئيسية</button></div>`
});

/* ---------- router ---------- */
const NAV = [['prayers', IC.mosque, 'الصلوات'], ['quran', IC.quran, 'القرآن'], ['adhkar', IC.hands, 'الأذكار'], ['alarms', IC.clock, 'المنبهات'], ['track', IC.check, 'تتبع الصلوات']];
let rtk = 0, lastH = null;
async function render() {
  const myr = ++rtk;
  const h = (location.hash || '#/prayers').slice(2).split('/'); const r = h[0] || 'prayers';
  let v;
  try {
    if (r === 'adhkar') v = h[1] === 'g' ? await V.group(h[2]) : h[1] === 'c' ? await V.cat(h[2]) : await V.adhkar();
    else if (r === 'ramadan') v = await V.ramadan();
    else if (r === 'quran') v = h[1] === 'p' ? await V.reader(h[2]) : h[1] === 's' ? await V.surah(h[2]) : h[1] === 'marks' ? await V.marks() : h[1] === 'search' ? await V.qsearch() : h[1] === 'wird' ? await V.wird() : await V.quran();
    else v = (V[r] || V.prayers)();
  } catch (e) { v = { head: hdr('حياتك في الصلاة', '', true), body: '<div class="card center"><div class="sub">تعذر التحميل. تأكد من الاتصال وجرب تاني.</div><button class="btn" data-retry style="margin-top:12px">إعادة المحاولة</button></div>' }; }
  if (myr !== rtk) return;
  if (!v || typeof v.body !== 'string') v = { head: hdr('حياتك في الصلاة'), body: '' };
  if (!(r === 'adhkar' && h[1] === 'c')) stopAud();
  document.body.classList.toggle('home', r === 'prayers' || r === '');
  document.body.classList.toggle('reading', r === 'quran' && h[1] === 'p');
  document.querySelectorAll('#top,.qtop').forEach(x => x.remove());
  $('#view').insertAdjacentHTML('beforebegin', v.head);
  $('#view').innerHTML = v.body + '<footer class="rights">الحقوق المحفوظة لـ محمد مجدي ♥</footer>';
  const top = ['prayers', 'quran', 'adhkar', 'alarms', 'track'].includes(r) ? r : (r === 'city' || r === 'settings' || r === 'fasting' ? 'prayers' : r === 'tasbih' || r === 'qibla' ? 'adhkar' : r);
  $('#nav').innerHTML = NAV.map(([k, e, n]) => `<a href="#/${k}" class="${top === k ? 'on' : ''}"><span class="i">${e}</span>${n}</a>`).join('');
  if (location.hash !== lastH && !(h[1] === 'p')) window.scrollTo(0, 0); lastH = location.hash;
  if (r === 'tasbih') tasInit();
  if ($('.qpage')) { fitQ(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { qFontOK = true; fitQ(); }); }
  if (r === 'settings' && navigator.permissions) navigator.permissions.query({ name: 'geolocation' }).then(p => { const el = $('#pm-loc'); if (el) el.textContent = ({ granted: 'مسموح ✓', denied: 'مرفوض', prompt: 'لسه' })[p.state] || p.state; }).catch(() => {});
}
window.addEventListener('hashchange', () => { const hh = (location.hash || '#/prayers').slice(2).split('/')[0]; const tp = ['prayers', 'quran', 'adhkar', 'alarms', 'track'].includes(hh) ? hh : (hh === 'city' || hh === 'settings' || hh === 'fasting' ? 'prayers' : hh === 'tasbih' || hh === 'qibla' ? 'adhkar' : hh); document.querySelectorAll('#nav a').forEach(x => x.classList.toggle('on', x.getAttribute('href') === '#/' + tp)); render(); });

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-chk],[data-snd],[data-city],[data-geo],[data-dh],[data-dreset],[data-qtab],[data-mark],[data-qs],[data-wdone],[data-ppd],[data-tday],[data-tchk],[data-alarm],[data-premin],[data-iqmin],[data-iqd],[data-qset],[data-qjuz],[data-qmore],[data-qplay],[data-qdl],[data-qbm],[data-dlv],[data-dla],[data-aud],[data-nat],[data-qa],[data-qdla],[data-qdlall],[data-arate],[data-off],[data-school],[data-sprev],[data-asound],[data-aprev],[data-loc],[data-retry],[data-sh],[data-shclose],[data-testalarm],[data-tasnav],[data-tast],[data-tasreset],[data-compass],[data-share],[data-install],[data-suhoor],[data-suhmin],[data-method]');
  if (Date.now() - lpAt < 700 && e.target.closest('[data-chk],[data-tchk]')) { return; }
  if (!t) return; const d = t.dataset;
  if (d.retry !== undefined) { if (/^#\/prayers/.test(location.hash) || !location.hash) refreshTimes(); else render(); return; }
  if (d.shclose !== undefined) { const x = $('#sheet'); if (x) x.remove(); return; }
  if (d.sh) { const [g, v] = d.sh.split(':'), tt = trk(), e = tt[d.sd] = tt[d.sd] || {}, k = d.sk; if (g === 'w') { if (v === 'x') { e[k] = false; e[k + 'x'] = 1; delete e[k + 'm']; } else { delete e[k + 'x']; e[k] = v === 'late' ? 'late' : true; } } else if (g === 'm') { delete e[k + 'x']; if (!e[k]) e[k] = true; e[k + 'm'] = e[k + 'm'] === v ? undefined : v; } else { e[k] = false; delete e[k + 'x']; delete e[k + 'm']; } setTrk(tt); sheet(d.sd, k); render(); return; }
  if (d.chk) { const a = trk(), k = iso(); a[k] = a[k] || {}; togP(a[k], d.chk); setTrk(a); buzz(); render(); }
  else if (d.snd) { const s = store.get('snd', {}); s[d.snd] = s[d.snd] === false ? true : false; store.set('snd', s); render(); }
  else if (d.city) { const c = CITIES.find(x => x[0] === d.city); place = { id: c[0], name: c[1], lat: c[2], lon: c[3] }; store.set('place', place); refreshTimes(); }
  else if (d.geo !== undefined) {
    const m = $('#geomsg'); m.textContent = 'بحدد موقعك…';
    if (!navigator.geolocation) { m.textContent = 'المتصفح مش بيدعم تحديد الموقع'; return; }
    const ok = p => { place = { id: 'gps', name: 'موقعك الحالي', lat: p.coords.latitude, lon: p.coords.longitude }; store.set('place', place); location.hash = '#/prayers'; refreshTimes(); nameGps(); };
    const fail = e => { m.textContent = e && e.code === 1 ? 'إذن الموقع مرفوض. افتح إعدادات الموبايل ← التطبيقات ← حياتك في الصلاة ← الأذونات ← الموقع، واختار "سماح"، أو اختار مدينتك من القايمة.' : 'مقدرتش أحدد موقعك. شغّل الـ GPS وجرب تاني أو اختار مدينتك من القايمة.'; };
    navigator.geolocation.getCurrentPosition(ok, () => { m.textContent = 'بحاول بدقة أعلى…'; navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: true, timeout: 25000, maximumAge: 600000 }); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 1800000 });
  }
  else if (d.dh) { const [id, i] = d.dh.split(':'); const c = AD.find(x => x.id === +id); const st = store.get('ad.' + id, { d: iso(), c: {} }); const tot = c.items[i].count || 1; if ((st.c[i] || 0) < tot) { st.c[i] = (st.c[i] || 0) + 1; st.d = iso(); store.set('ad.' + id, st); buzz(10); const fin = st.c[i] >= tot; t.classList.toggle('done', fin); const sp = t.querySelector('.c span'); if (sp) sp.textContent = fin ? 'تم ✓' : num(st.c[i]) + ' / ' + num(tot); const hd = $('#view .card.sub'); if (hd) hd.textContent = `${num(c.items.filter((x, k) => (st.c[k] || 0) >= (x.count || 1)).length)} من ${num(c.items.length)} خلصتهم اليوم. دوس على الذكر كل مرة تقولها.`; } }
  else if (d.dreset) { store.set('ad.' + d.dreset, { d: iso(), c: {} }); render(); }
  else if (d.qtab) { store.set('qtab', d.qtab); render(); }
  else if (d.mark) { const m = store.get('marks', []), n = +d.mark, i = m.indexOf(n); i < 0 ? m.push(n) : m.splice(i, 1); store.set('marks', m); render(); }
  else if (d.qs) { store.set('qs', Math.max(18, Math.min(44, store.get('qs', 27) + +d.qs))); render(); }
  else if (d.wdone) { const n = +d.wdone, p = store.get('wirdp', { d: iso(), n: 0 }); if (p.d !== iso()) { p.d = iso(); p.n = 0; } p.n++; store.set('wirdp', p); { const wd = store.get('wird', { ppd: 5 }); if (p.n >= wd.ppd) { const tt = trk(), kk = iso(); tt[kk] = tt[kk] || {}; tt[kk].w = 1; setTrk(tt); } } store.set('wirdpos', Math.min(604, n + 1)); toast('تم تسجيل الصفحة ✓'); const mm = $('#qmore'); if (mm) mm.hidden = true; else render(); }
  else if (d.ppd) { const w = store.get('wird', { ppd: 5 }); w.ppd = +d.ppd; store.set('wird', w); render(); }
  else if (d.tday) { store.set('tday', Math.min(0, store.get('tday', 0) + +d.tday)); render(); }
  else if (d.tchk) { const a = trk(), dt = new Date(); dt.setDate(dt.getDate() + store.get('tday', 0)); const k = iso(dt); a[k] = a[k] || {}; if (/^n/.test(d.tchk)) a[k][d.tchk] = !a[k][d.tchk]; else togP(a[k], d.tchk); setTrk(a); buzz(); render(); }
  else if (d.alarm) { const a = store.get('alarm', { pre: true, preMin: 15, at: true, iqama: true, iqMin: 10, audio: true, kahf: true, aftr: false }); a[d.alarm] = t.checked; store.set('alarm', a); }
  else if (d.premin) { const a = store.get('alarm', {}); a.preMin = +d.premin; store.set('alarm', a); render(); }
  else if (d.iqd) { const [k, dv] = d.iqd.split(':'), o = store.get('iqg', {}); o[k] = Math.max(0, Math.min(60, iqGap(k) + +dv)); store.set('iqg', o); render(); }
  else if (d.qset) { const r = getRem(); const m = +d.qset; r.q.t = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); r.q.on = true; store.set('rem', r); render(); }
  else if (d.qjuz !== undefined) { store.set('qtab', 'j'); }
  else if (d.qmore !== undefined) { const m = $('#qmore'); if (m) m.hidden = !m.hidden; }
  else if (d.qplay) { if (qpOn) stopQ(); else playPage(+d.qplay); }
  else if (d.qdl) { dlPage(+d.qdl); }
  else if (d.qbm) { store.set('qbm', +d.qbm); toast('اتحفظ مكان وقوفك ★'); const b = $('#qstar'); if (b) b.classList.add('on'); }
  else if (d.dlv) { dlVoice(d.dlv); }
  else if (d.dla) { dlAudio(d.dla); }
  else if (d.iqmin) { const a = store.get('alarm', {}); a.iqMin = +d.iqmin; store.set('alarm', a); render(); }
  else if (d.loc !== undefined) { navigator.geolocation ? navigator.geolocation.getCurrentPosition(() => { toast('تم السماح بالموقع ✓'); render(); }, () => toast('الموقع مرفوض. فعّله من إعدادات المتصفح.'), { timeout: 10000 }) : toast('الجهاز مش بيدعم الموقع'); }
  else if (d.aud) { playAud(d.aud, d.af); }
  else if (d.nat === 'test') { await nativeTest(); }
  else if (d.nat) { try { const p = window.Capacitor.registerPlugin('SettingsOpener'); await p.open({ kind: d.nat }); } catch (e) { toast('افتح إعدادات الموبايل ← التطبيقات ← حياتك في الصلاة ← البطارية'); } }
  else if (d.qa) { playQA(d.qa); }
  else if (d.qdla) { dlQA([d.qdla]); }
  else if (d.qdlall !== undefined) { dlQA(QAI.map(x => x[0])); }
  else if (d.arate !== undefined) { adRate = adRate === 1 ? 1.25 : adRate === 1.25 ? 1.5 : adRate === 1.5 ? 0.75 : 1; if (adA) adA.playbackRate = adRate; render(); }
  else if (d.sprev) { playSound(d.sprev); }
  else if (d.school !== undefined) { store.set('school', +d.school); refreshTimes(); }
  else if (d.off) { const [k, dv] = d.off.split(':'), o = store.get('offs', {}); o[k] = Math.max(-30, Math.min(30, (o[k] || 0) + +dv)); store.set('offs', o); refreshTimes(); }
  else if (d.asound) { const a = store.get('alarm', {}); a.sound = d.asound; store.set('alarm', a); render(); playSound(d.asound); }
  else if (d.aprev !== undefined) { playSound(store.get('alarm', {}).sound || 'aaqib'); }
  else if (d.perm !== undefined) { if (NATIVE) { await nativeAsk(); toast('تم، التنبيهات هتشتغل والتطبيق مقفول'); } else if ('Notification' in window) { await Notification.requestPermission(); render(); } }
  else if (d.testalarm !== undefined) { notify('تجربة التنبيه', 'التنبيهات شغالة ✓'); }
  else if (d.tasnav) { const s = store.get('tas', { i: 0, c: {}, t: 33 }); s.i = (s.i + +d.tasnav + 8) % 8; store.set('tas', s); render(); }
  else if (d.tast !== undefined) { const s = store.get('tas', { i: 0, c: {}, t: 33 }); s.t = +d.tast; store.set('tas', s); render(); }
  else if (d.tasreset !== undefined) { const s = store.get('tas', { i: 0, c: {}, t: 33 }); s.c[s.i] = 0; store.set('tas', s); render(); }
  else if (d.compass !== undefined) startCompass();
  else if (d.share !== undefined) {
    const url = location.href.split('#')[0];
    if (navigator.share) { try { await navigator.share({ title: 'حياتك في الصلاة', text: 'تطبيق مواقيت الصلاة والأذكار والمصحف', url }); } catch (x) {} }
    else { try { await navigator.clipboard.writeText(url); toast('تم نسخ لينك التطبيق'); } catch (x) { toast(url); } }
  }
  else if (d.suhoor) { const x = store.get('suhoor', { on: true, min: 45 }); x.on = t.checked; store.set('suhoor', x); }
  else if (d.suhmin) { const x = store.get('suhoor', { on: true, min: 45 }); x.min = +d.suhmin; store.set('suhoor', x); render(); }
  else if (d.method !== undefined) { store.set('method', +d.method); refreshTimes(); }
  else if (d.install !== undefined && deferred) { deferred.prompt(); deferred = null; }
});
let dbT = null;
document.addEventListener('input', e => { clearTimeout(dbT); dbT = setTimeout(() => onInput(e), e.target.id === 'qs2' ? 300 : 120); });
async function onInput(e) {
  if (e.target.id === 'q') {
    await loadAd(); const v = e.target.value.trim().replace(/[\u064B-\u0652\u0670]/g, ''); const out = $('#qr');
    if (v.length < 2) { out.innerHTML = ''; return; }
    out.innerHTML = AD.filter(c => c.title.replace(/[\u064B-\u0652\u0670]/g, '').includes(v) || c.items.some(i => i.text.replace(/[\u064B-\u0652\u0670]/g, '').includes(v))).slice(0, 30).map(c => `<a href="#/adhkar/c/${c.id}">${c.title}<span class="m">›</span></a>`).join('') || '<div class="muted" style="padding:10px">مفيش نتائج</div>';
  }
  if (e.target.id === 'qs2') {
    const q = await loadQu(); const v = e.target.value.trim().replace(/[\u064B-\u0652\u0670\u0671]/g, ''); const out = $('#qsr');
    if (v.length < 3) { out.innerHTML = ''; return; }
    const res = []; q.pages.forEach((p, pi) => p.forEach(([s, a, t]) => { if (res.length < 40 && t.replace(/[\u064B-\u0652\u0670\u0671\u06E1\u0653-\u0655]/g, '').replace(/[ٱأإآ]/g, 'ا').includes(v.replace(/[ٱأإآ]/g, 'ا'))) res.push([s, a, t, pi + 1]); }));
    out.innerHTML = res.map(([s, a, t, p]) => `<a href="#/quran/p/${p}" style="display:block"><b>${q.surahs[s - 1].name} ${num(a)}</b><div style="font-family:AmiriQuran,serif;font-size:18px;line-height:2">${t}</div></a>`).join('') || '<div class="muted" style="padding:10px">مفيش نتائج</div>';
  }
}

/* tasbih beads */
let off = 0;
function tasInit() {
  const b = $('#tasbtn'); if (!b) return;
  let sx = null;
  const bump = () => {
    const s = store.get('tas', { i: 0, c: {}, t: 33 }); s.c[s.i] = (s.c[s.i] || 0) + 1; store.set('tas', s);
    const c = s.c[s.i]; $('#tasn').textContent = num(c); $('#tasz').textContent = s.t ? 'الدورة ' + num(c % s.t) + ' / ' + num(s.t) : '';
    off += 70; const el = $('#strand'); el.style.transform = `translateX(${off % 280}px)`;
    if (off % 280 === 0) setTimeout(() => { el.style.transition = 'none'; el.style.transform = 'translateX(0)'; void el.offsetWidth; el.style.transition = ''; }, 190);
    buzz(s.t && c % s.t === 0 ? 120 : 12);
    if (s.t && c % s.t === 0) toast('أتممت ' + num(c / s.t) + ' دورة 🎉');
  };
  b.onclick = bump;
  b.addEventListener('touchstart', ev => { sx = ev.touches[0].clientX; }, { passive: true });
  b.addEventListener('touchmove', ev => { if (sx != null && Math.abs(ev.touches[0].clientX - sx) > 60) { sx = ev.touches[0].clientX; bump(); } }, { passive: true });
}
/* compass */
let cmpOn = false;
async function startCompass() {
  const D = window.DeviceOrientationEvent, m = $('#cmsg');
  try { if (D && D.requestPermission) { if ((await D.requestPermission()) !== 'granted') { m.textContent = 'محتاج إذن الحساسات'; return; } } } catch (e) { m.textContent = 'مقدرتش أشغل البوصلة'; return; }
  if (!D) { m.textContent = 'الجهاز مش بيدعم البوصلة'; return; }
  if (cmpOn) return; cmpOn = true; m.textContent = 'لف الموبايل لحد ما السهم يبقى لفوق';
  const h = ev => { const v = typeof ev.webkitCompassHeading === 'number' ? ev.webkitCompassHeading : (ev.alpha != null ? (360 - ev.alpha) % 360 : null); if (v == null) return; const ar = $('#qar'); if (!ar) return; const rot = window.__qb - v; ar.style.transform = `rotate(${rot}deg)`; const qd = $('#qn'); if (qd) qd.style.transform = `rotate(${-v}deg)`; const dd = Math.abs(((rot % 360) + 540) % 360 - 180); $('#cmp').classList.toggle('ok', 180 - dd < 5); };
  window.addEventListener('deviceorientationabsolute', h, true); window.addEventListener('deviceorientation', h, true);
}

/* ---------- notifications ---------- */
let swReg = null, fired = {}, audio = null;
async function notify(title, body) {
  try { if ('Notification' in window && Notification.permission === 'granted') { if (swReg) swReg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: title, dir: 'rtl', lang: 'ar', vibrate: [200, 100, 200] }).catch(() => toast(title + ': ' + body)); else new Notification(title, { body }); } else toast(title + ': ' + body); } catch (e) { toast(title); }
}
const ADB = 'https://cdn.jsdelivr.net/gh/rn0x/Adhkar-json@main/audio/';
let adA = null, curAud = null, adRate = 1;
function stopAud() { try { if (adA) { adA.pause(); adA = null; } } catch (e) {} curAud = null; }
async function playAud(key, file) {
  if (curAud === key && adA) { stopAud(); render(); return; }
  stopAud(); stopAdhan(); curAud = key;
  try { adA = new Audio(await cachedUrl(ADB + file, 'hq-adhkar')); adA.playbackRate = adRate; adA.onended = () => { curAud = null; adA = null; render(); }; adA.onerror = () => { curAud = null; adA = null; toast('الصوت محتاج إنترنت'); render(); }; adA.play().catch(() => { curAud = null; render(); }); } catch (e) { curAud = null; }
  render();
}
const QAI = [['255:255', 'آية الكرسي'], ['6222:6225', 'الإخلاص'], ['6226:6230', 'الفلق'], ['6231:6236', 'الناس']];
const qaList = r => { const [a, b] = r.split(':').map(Number); const o = []; for (let n = a; n <= b; n++) o.push(n); return o; };
const qaU = n => 'https://cdn.islamic.network/quran/audio/64/ar.alafasy/' + n + '.mp3';
const qaId = r => 'qs-' + r.replace(':', '_');
async function qaRefresh() {
  let all = true;
  for (const [r] of QAI) { let ok = true; for (const n of qaList(r)) if (!(await hasCached(qaU(n), 'hq-quran'))) { ok = false; break; } if (!ok) all = false; const el = document.getElementById(qaId(r)); if (el) el.innerHTML = ok ? '<span class="muted">محمّل ✓</span>' : `<button class="chip" data-qdla="${r}">${IC.dl} تحميل</button>`; }
  const b = $('#qa-all'); if (b) { b.disabled = all; b.textContent = all ? 'كله جاهز بدون إنترنت ✓' : 'تحميل الكل للتشغيل بدون إنترنت'; }
}
async function dlQA(list, label) {
  const tot = list.reduce((x, r) => x + qaList(r).length, 0); let done = 0, bad = 0; const b = $('#qa-all');
  for (const r of list) for (const n of qaList(r)) {
    try { await cacheFetch(qaU(n), 'hq-quran'); } catch (e) { bad++; }
    done++; const el = document.getElementById(qaId(r)); if (el) el.innerHTML = `<span class="muted">${num(done)}/${num(tot)}</span>`; if (b && list.length > 1) b.textContent = 'بنحمّل… ' + num(done) + ' من ' + num(tot);
  }
  toast(bad ? 'اتحمّل جزء، جرب تاني للباقي' : 'اتحمّل ✓ هيشتغل من غير إنترنت'); qaRefresh();
}
async function playQA(r) {
  const [a, b] = r.split(':').map(Number); stopAud(); stopAdhan(); let n = a;
  const next = async () => { if (n > b) { adA = null; return; } try { const u = await cachedUrl(qaU(n), 'hq-quran'); adA = new Audio(u); n++; adA.onended = next; adA.onerror = () => { adA = null; toast('الصوت محتاج إنترنت، دوس تحميل الأول'); }; adA.play().catch(() => toast('اضغط تاني لتشغيل الصوت')); } catch (e) {} };
  next();
}
const SOUNDS = [['aaqib', 'أذان هادي', 'بصوت عاقب عزيز'], ['sabah', 'صباح فخري', 'سوريا، المدرسة الحلبية'], ['makkah', 'المسجد الحرام', 'مكة المكرمة'],
  ['r:Mishary_Rashid_al_Afasy_Fajr_Adhan', 'مشاري العفاسي', 'أذان الفجر، من الإنترنت'], ['r:Nasser_al_Qatami_Adhan', 'ناصر القطامي', 'السعودية، من الإنترنت'], ['r:Majed_al_Hamathani_Adhan', 'ماجد الهمذاني', 'من الإنترنت'], ['r:Ahmed_al_Imadi_Adhan', 'أحمد العمادي', 'من الإنترنت']];
const ARC = 'https://archive.org/download/adhan.notifications/';
const adUrl = k => k.startsWith('r:') ? ARC + k.slice(2) + '.mp3' : 'audio/adhan-' + k + '.mp3';
let prevA = null;
async function cacheFetch(url, cname) { const c = await caches.open(cname); let r = await c.match(url); if (!r) { const f = await fetch(url); if (!f.ok) throw new Error('bad'); await c.put(url, f.clone()); r = f; } return r; }
async function cachedUrl(url, cname) { try { const c = await caches.open(cname); const r = await c.match(url); if (r) return URL.createObjectURL(await r.blob()); } catch (e) {} return url; }
async function hasCached(url, cname) { try { return !!(await (await caches.open(cname)).match(url)); } catch (e) { return false; } }
async function dlVoice(k) { toast('بنحمّل الصوت…'); try { await cacheFetch(adUrl(k), 'hq-voices'); toast('اتحمّل، هيشتغل من غير إنترنت ✓'); } catch (e) { toast('التحميل فشل، جرب تاني'); } voiceHas[k] = await hasCached(adUrl(k), 'hq-voices'); render(); }
async function dlAudio(f) { toast('بنحمّل الصوت…'); try { await cacheFetch(ADB + f, 'hq-adhkar'); toast('اتحمّل ✓'); } catch (e) { toast('التحميل فشل، جرب تاني'); } render(); }
let voiceHas = {}; (async () => { for (const r of SOUNDS) if (r[0].startsWith('r:')) voiceHas[r[0]] = await hasCached(adUrl(r[0]), 'hq-voices'); })();

function stopAdhan() { try { if (audio) { audio.pause(); audio.currentTime = 0; } if (prevA) { prevA.pause(); prevA = null; } } catch (e) {} }
async function playSound(id) { stopAdhan(); try { const a = new Audio(id.startsWith('r:') ? await cachedUrl(adUrl(id), 'hq-voices') : adUrl(id)); prevA = a; a.onerror = () => toast('الصوت مش متاح دلوقتي'); a.play().catch(() => toast('اضغط تاني لتشغيل الصوت')); } catch (e) {} }
function playMasa() { try { const a = new Audio('audio/masaharati.mp3'); a.play().catch(() => {}); } catch (e) {} }
function playAdhan() { const a = store.get('alarm', { audio: true }); if (!a.audio) return; try { stopAdhan(); audio = new Audio(adUrl(a.sound || 'aaqib')); { const sk = a.sound || 'aaqib'; if (sk.startsWith('r:') && voiceHas[sk]) cachedUrl(adUrl(sk), 'hq-voices').then(u => { audio.src = u; audio.play().catch(() => {}); }); } audio.play().catch(() => {}); } catch (e) {} }
function checkAlarms() {
  const g = new Date(), kid = 'kahf' + iso(g);
  if (g.getDay() === 5 && g.getHours() === 9 && g.getMinutes() < 2 && !fired[kid] && store.get('alarm', { kahf: true }).kahf !== false) { fired[kid] = 1; notify('يوم الجمعة', 'لا تنسَ قراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ'); }
  { const wr = store.get('alarm', {}), wid = 'wird' + iso(g), wp = store.get('wirdp', { d: iso(), n: 0 }), wd = store.get('wird', { ppd: 5 }), done = wp.d === iso() && wp.n >= wd.ppd;
    if (wr.wirdr !== false && g.getHours() === 20 && g.getMinutes() < 2 && !done && !fired[wid]) { fired[wid] = 1; notify('الورد اليومي 📖', 'لسه ما قرأتش ورد النهاردة، ' + num(wd.ppd) + ' صفحات في انتظارك'); } }
  if (day && day.hm === 9) {
    const sa = store.get('suhoor', { on: true, min: 45 }), nowS = nowSecs(day.tz), st = secs(day.t.Fajr) - sa.min * 60, id = 'suh' + iso();
    if (sa.on && nowS >= st && nowS < st + 45 && !fired[id]) { fired[id] = 1; notify('السحور 🌙', `باقي ${num(sa.min)} دقيقة على أذان الفجر`); playMasa(); }
  }
  if (!day) return; const a = store.get('alarm', { pre: true, preMin: 15, at: true, iqama: true, iqMin: 10 }), snd = store.get('snd', {}), now = nowSecs(day.tz);
  PR.forEach(([k, n]) => {
    if (snd[k] === false) return; const t = secs(day.t[k]);
    const ev = [['pre', t - a.preMin * 60, `بعد ${num(a.preMin)} دقيقة صلاة ${n}`, false], ['at', t, `حان الآن موعد أذان ${n}`, true], ['iqama', t + iqGap(k) * 60, `إقامة صلاة ${n}`, false]];
    ev.forEach(([w, s, msg, snd2]) => { const id = iso() + k + w; if (a[w] && now >= s && now < s + 45 && !fired[id]) { fired[id] = 1; notify('حياتك في الصلاة', msg); if (snd2) playAdhan(); } });
  });
}
let tick = 0;
setInterval(() => {
  try { const el = $('#cd'); if (day && el) { const np = nextPrayer(); el.textContent = fmtHMS(np.left); if (tick % 20 === 0) { const bar = $('#cdbar'); if (bar) bar.style.width = Math.max(0, Math.min(100, 100 - np.left / np.span * 100)) + '%'; } if ((np.left === 0 || np.left > 86300 || day.d && day.d !== iso()) && Date.now() - lastRT > 60000) refreshTimes(); }
  } catch (e) {} if (++tick % 5 === 0 && !NATIVE) { try { checkAlarms(); } catch (e) {} }
}, 1000);

/* ---------- boot ---------- */
let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; const b = $('#inst'); if (b) b.classList.remove('hide'); });
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if ('serviceWorker' in navigator && !NATIVE) {
  const had = !!navigator.serviceWorker.controller; let upd = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) upd = true; });
  window.addEventListener('hashchange', () => { if (upd && !$('#sheet')) location.reload(); });
  document.addEventListener('visibilitychange', () => { if (upd && document.visibilityState === 'hidden') location.reload(); });
  navigator.serviceWorker.register('sw.js').then(r => { swReg = r; r.update().catch(() => {}); }).catch(() => {});
  const idle = window.requestIdleCallback || (f => setTimeout(f, 3000));
  window.addEventListener('load', () => idle(() => { ['data/adhkar.json', 'data/quran.json', 'fonts/AmiriQuran.woff2'].forEach((u, k) => setTimeout(() => fetch(u).catch(() => {}), 2500 * (k + 1))); }));
}
if (!location.hash) location.hash = '#/prayers';
if (place && place.id === 'gps') { if (place.name === 'موقعي') place.name = 'موقعك الحالي'; nameGps(); }
render(); refreshTimes();
setTimeout(() => { try { loadQu().catch(() => {}); } catch (e) {} }, 4000);

let errT = 0;
window.addEventListener('error', () => { if (Date.now() - errT > 5000) { errT = Date.now(); } });
window.addEventListener('unhandledrejection', ev => { ev.preventDefault(); });

/* ---------- native Android: closed-app alarms ---------- */
let _ln = null;
const LN = () => { if (_ln) return _ln; try { const C = window.Capacitor; if (!C) return null; _ln = (C.Plugins && C.Plugins.LocalNotifications) || C.registerPlugin('LocalNotifications'); } catch (e) { store.set('nativeErr', 'LN:' + e); } return _ln; };
const NVOICES = ['aaqib', 'sabah', 'makkah'];
async function nativeAsk() {
  const ln = LN(); if (!ln) return;
  try { await ln.requestPermissions(); } catch (e) {}
  try { const r = await ln.checkExactNotificationSetting(); if (r && r.exact_alarm !== 'granted') await ln.changeExactNotificationSetting(); } catch (e) {}
  nativeSig = ''; nativeSync();
  setTimeout(batteryFlow, 1500);
}
let batBusy = false;
async function batteryFlow() {
  if (batBusy || store.get('batDone', false)) return; batBusy = true;
  try {
    const p = window.Capacitor.registerPlugin('SettingsOpener');
    let ign = false; try { ign = (await p.isIgnoring()).value; } catch (e) {}
    if (!ign && confirm('عشان الأذان والتذكيرات تشتغل والتطبيق مقفول، لازم تسمح للتطبيق يشتغل في الخلفية. هيظهرلك سؤال من النظام، اختار "سماح". وبعدين في إعدادات التطبيق ← البطارية اختار "بدون قيود" (Unrestricted). تمام؟')) {
      store.set('autoPending', true); await p.open({ kind: 'ignore' });
    } else { store.set('batDone', true); }
  } catch (e) { store.set('batDone', true); }
  batBusy = false;
}
document.addEventListener('visibilitychange', async () => {
  if (!NATIVE || document.visibilityState !== 'visible' || !store.get('autoPending', false)) return;
  store.set('autoPending', false); store.set('batDone', true);
  setTimeout(() => { try { if (confirm('خطوة أخيرة: في بعض الموبايلات (زي ريلمي) لازم تفعّل "التشغيل التلقائي" للتطبيق. أفتحلك الصفحة؟')) window.Capacitor.registerPlugin('SettingsOpener').open({ kind: 'auto' }); } catch (e) {} }, 600);
});
function tzOff(ts, tz) { try { const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ts)); const g = t => +p.find(x => x.type === t).value; return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(ts / 1000) * 1000; } catch (e) { return -new Date(ts).getTimezoneOffset() * 60000; } }
function zonedEpoch(dt, hh, mm, tz) { const guess = Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate(), hh, mm); let t = guess - tzOff(guess, tz); t = guess - tzOff(t, tz); return t; }
let nativeSig = '', nativeBusy = false;
async function nativeSync() {
  const ln = LN(); if (!NATIVE || !ln || nativeBusy || !day || !ready) return;
  const a = store.get('alarm', { pre: true, preMin: 15, at: true, iqama: true, iqMin: 10, audio: true, kahf: true, aftr: false }), snd = store.get('snd', {});
  const sig = JSON.stringify([getRem(), store.get('iqg', {}), a, snd, store.get('offs', {}), store.get('method', 0), store.get('school', 0), place.lat, place.lon, iso()]);
  if (sig === nativeSig) return; nativeBusy = true;
  try {
    const perm = await ln.checkPermissions(); if (!perm || perm.display !== 'granted') { store.set('nativeErr', 'إذن الإشعارات مش مفعّل'); nativeBusy = false; return; }
    const voice = NVOICES.includes(a.sound) ? a.sound : 'aaqib';
    for (const v of NVOICES) { try { await ln.createChannel({ id: 'adhan_' + v, name: 'الأذان', description: 'تنبيه وقت الأذان', importance: 5, sound: 'adhan_' + v + '.mp3', vibration: true, visibility: 1 }); } catch (e) {} }
    try { await ln.createChannel({ id: 'iqama_soft', name: 'الإقامة', description: 'نغمة خفيفة وقت الإقامة', importance: 4, sound: 'iqama_soft.wav', vibration: false, visibility: 1 }); } catch (e) {}
    try { await ln.createChannel({ id: 'pre_nasheed', name: 'قبل الصلاة (إلا صلاتي)', description: 'تنبيه قبل الصلاة بنشيد إلا صلاتي', importance: 4, sound: 'pre_nasheed.mp3', vibration: true, visibility: 1 }); } catch (e) {}
    try { await ln.createChannel({ id: 'pre_soft', name: 'قبل الصلاة', description: 'تنبيه قبل الصلاة', importance: 4, sound: 'pre_soft.wav', vibration: true, visibility: 1 }); } catch (e) {}
    try { await ln.createChannel({ id: 'reminder', name: 'التذكيرات', description: 'قبل الصلاة والإقامة والأذكار', importance: 4, vibration: true, visibility: 1 }); } catch (e) {}
    try { await ln.createChannel({ id: 'adhan_quiet', name: 'الأذان بدون صوت طويل', importance: 4, vibration: true }); } catch (e) {}
    const days = []; for (let i = 0; i < 7; i++) { try { days.push([new Date(Date.now() + i * 864e5), await loadDay(new Date(Date.now() + i * 864e5))]); } catch (e) { if (i < 2) { nativeBusy = false; return; } break; } }
    const out = [], now = Date.now(); let n = 0;
    days.forEach(([dt, dd], di) => {
      PR.forEach(([k, name], pi) => {
        if (snd[k] === false) return; const m = String(dd.t[k]).match(/(\d+):(\d+)/); if (!m) return; const t = zonedEpoch(dt, +m[1], +m[2], dd.tz);
        const base = (di * 10 + pi) * 10;
        const ev = [['pre', t - a.preMin * 60000, 'بعد ' + num(a.preMin) + ' دقيقة صلاة ' + name, 'pre_nasheed', 1], ['at', t, 'حان الآن موعد أذان ' + name, a.audio === false ? 'adhan_quiet' : 'adhan_' + voice, 2], ['iqama', t + iqGap(k) * 60000, 'إقامة صلاة ' + name, 'iqama_soft', 3]];
        if (a.aftr) out.push({ id: 100 + base + 4, title: 'أذكار بعد الصلاة', body: 'سبّح واحمد وكبّر بعد صلاة ' + name + ' 🤲', channelId: 'reminder', schedule: { at: new Date(t + 20 * 60000), allowWhileIdle: true }, smallIcon: 'ic_stat_hayatak' });
        ev.forEach(([w, at, body, ch, off]) => { if (a[w] && at > now + 5000) out.push({ id: 100 + base + off, title: 'حياتك في الصلاة', body, channelId: ch, schedule: { at: new Date(at), allowWhileIdle: true }, smallIcon: 'ic_stat_hayatak' }); });
      });
      { const rm = getRem(); [['m', 'أذكار الصباح', 'وقت أذكار الصباح، حصّن يومك 🌅'], ['e', 'أذكار المساء', 'وقت أذكار المساء 🌙'], ['q', 'قيام الليل', 'قم ولو بركعتين، الله ينادي عباده في الثلث الأخير']].forEach(([key, title, body], x) => { const r = rm[key]; if (!r.on) return; const [hh, mm] = r.t.split(':').map(Number); const at = zonedEpoch(dt, hh, mm, dd.tz); if (at > now + 5000) out.push({ id: 91000 + di * 10 + x, title, body, channelId: 'reminder', schedule: { at: new Date(at), allowWhileIdle: true }, smallIcon: 'ic_stat_hayatak' }); }); }
      if (a.fastr !== false) { const nx = new Date(dt.getTime() + 864e5), f = fastInfo(nx); if (f.tags.length) { const at = zonedEpoch(dt, 20, 0, dd.tz); if (at > now) out.push({ id: 85000 + di, title: 'صيام بكرة', body: 'بكرة ' + DN[nx.getDay()] + (f.tags.includes('white') ? ' من الأيام البيض' : ' يوم صيام سنة') + '، انوِ الصيام من الليلة 🌙', channelId: 'reminder', schedule: { at: new Date(at), allowWhileIdle: true }, smallIcon: 'ic_stat_hayatak' }); } }
      if (dt.getDay() === 5 && a.kahf !== false) { const at = zonedEpoch(dt, 9, 0, dd.tz); if (at > now) out.push({ id: 90000 + di, title: 'يوم الجمعة', body: 'لا تنسَ قراءة سورة الكهف والإكثار من الصلاة على النبي ﷺ', channelId: 'reminder', schedule: { at: new Date(at), allowWhileIdle: true } }); }
    });
    try { const items = []; days.forEach(([dt, dd]) => PR.forEach(([k, name]) => { const m = String(dd.t[k]).match(/(\d+):(\d+)/); if (!m) return; const t = zonedEpoch(dt, +m[1], +m[2], dd.tz); if (t > now - 60000) items.push([name, t, to12(dd.t[k])]); })); items.sort((x, y) => x[1] - y[1]); await window.Capacitor.registerPlugin('SettingsOpener').persist({ on: a.persist !== false, items: JSON.stringify(items.slice(0, 40)) }); } catch (e) {}
    const pend = await ln.getPending(); if (pend && pend.notifications && pend.notifications.length) await ln.cancel({ notifications: pend.notifications.map(x => ({ id: x.id })) });
    if (out.length) await ln.schedule({ notifications: out });
    nativeSig = sig; store.set('nativeCount', out.length); store.set('nativeErr', ''); store.set('nativeNext', out.length ? Math.min(...out.map(x => +x.schedule.at)) : 0);
  } catch (e) { store.set('nativeErr', String(e && (e.message || e)).slice(0, 120)); }
  nativeBusy = false;
}
if (NATIVE) { setTimeout(() => { nativeAsk(); }, 2500); setInterval(nativeSync, 20000); }

function nativeStatus() {
  const n = store.get('nativeCount', 0), e = store.get('nativeErr', ''), nx = store.get('nativeNext', 0);
  return (e ? '⚠️ مشكلة: ' + e + '<br>' : '') + 'التنبيهات المجدولة: ' + num(n) + (nx ? '<br>أقرب تنبيه: ' + new Date(nx).toLocaleString('ar-EG', { weekday: 'long', hour: 'numeric', minute: 'numeric' }) : '');
}
async function nativeTest() {
  const ln = LN(); if (!ln) { toast('مشكلة: مكتبة التنبيهات مش شغالة'); return; }
  try {
    const p = await ln.requestPermissions(); if (!p || p.display !== 'granted') { toast('الإشعارات مش مسموحة، فعّلها من إعدادات التطبيق'); return; }
    try { await ln.createChannel({ id: 'adhan_aaqib', name: 'الأذان', description: 'تنبيه وقت الأذان', importance: 5, sound: 'adhan_aaqib.mp3', vibration: true, visibility: 1 }); } catch (e) {}
    let ex = 'unknown'; try { ex = (await ln.checkExactNotificationSetting()).exact_alarm; } catch (e) {}
    await ln.schedule({ notifications: [{ id: 777001, title: 'حياتك في الصلاة', body: 'تجربة التنبيه نجحت ✓', channelId: 'adhan_aaqib', schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true }, smallIcon: 'ic_stat_hayatak' }] });
    toast('اتجدول بعد ١٠ ثواني (المنبهات الدقيقة: ' + ex + ')، اقفل التطبيق');
  } catch (e) { toast('فشل: ' + String(e && (e.message || e)).slice(0, 80)); store.set('nativeErr', 'test:' + String(e && (e.message || e)).slice(0, 100)); }
}

document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.rt) { const r = getRem(); r[t.dataset.rt].t = t.value || r[t.dataset.rt].t; store.set('rem', r); toast('اتحفظ ✓'); }
  else if (t.dataset.rc) { const r = getRem(); r[t.dataset.rc].on = t.checked; store.set('rem', r); }
});
