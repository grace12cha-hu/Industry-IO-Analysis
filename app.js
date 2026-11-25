const $=id=>document.getElementById(id);
const fmt=x=>Number(x).toLocaleString('ko-KR',{maximumFractionDigits:3});
let currentClass="basic"; let worker, nextId=0, requests=new Map(), sectors=[], rowChoices=[], cells=[], basket=[], result=null;
function text(tag,value){const e=document.createElement(tag);e.textContent=value;return e;}
function call(type,payload){return new Promise((resolve,reject)=>{const id=++nextId;requests.set(id,{resolve,reject});worker.postMessage({id,type,payload});});}
function startWorker(){worker=new Worker('./worker.js?v=20261120-fourclass');worker.onmessage=({data:d})=>{if(d.type==='status'){$('status').textContent=d.text;return;}const p=requests.get(d.id);if(!p)return;requests.delete(d.id);d.ok?p.resolve(d.result):p.reject(Error(d.error));};worker.onerror=e=>{for(const p of requests.values())p.reject(Error(e.message||'Worker 실행 오류'));requests.clear();};}
function options(el,list){el.replaceChildren(...list.map(x=>{const o=document.createElement('option');o.value=x.code;o.textContent=x.code+' '+x.name;return o;}));}
function invalidate(){result=null;$('results').hidden=true;}
async function load(buffer){
 invalidate();basket=[];renderBasket();linkageRows=[];$('linkage-rows').replaceChildren();$('linkage-status').textContent='선택한 분류에서 연관도 계산을 실행하세요.';
 for(const id of ['sheet','row','sector','add','run','row-search','col-search','sector-search','amount','linkage-run','linkage-search'])$(id).disabled=true;
 if(worker)worker.terminate();for(const p of requests.values())p.reject(Error('데이터 다시 로드'));requests.clear();startWorker();
 try{const info=await call('init',buffer);sectors=info.sectors;options($('sector'),sectors);$('sector-search').value='';$('row-search').value='';$('col-search').value='';$('sheet').replaceChildren(...info.sheets.map(s=>{const o=text('option',s);o.value=s;return o;}));
 $('validation').textContent=JSON.stringify(info.residuals,null,2)+'\n최대 절대 잔차: 허용값 1e-8 미만';
 for(const id of ['sheet','row','sector','add','run','row-search','col-search','sector-search','amount','linkage-run','linkage-search'])$(id).disabled=false;
 await explore();$('status').textContent='준비 완료 · '+sectors.length+'개 부문 · '+info.sheets.length+'개 시트 · 계수 검증 통과';
 }catch(e){$('status').textContent='준비 실패: '+e.message+' — 새로고침 후 재시도하세요.';}
}
let exploreSeq=0;
async function explore(){const seq=++exploreSeq;try{const d=await call('explore',{sheet:$('sheet').value,row:$('row').value});if(seq!==exploreSeq)return;rowChoices=d.rows;filterRows(d.selected);cells=d.cells;$('unit').textContent=d.unit;$('explore-caption').textContent=$('sheet').value+' / 행: '+d.selected+' '+d.name;renderCells();}catch(e){$('status').textContent=e.message;}}
function filterRows(selected){const q=$('row-search').value.trim();options($('row'),rowChoices.filter(r=>(r.code+' '+r.name).includes(q)));if([...$('row').options].some(o=>o.value===selected))$('row').value=selected;}
function renderCells(){const q=$('col-search').value.trim();$('cells').replaceChildren(...cells.filter(c=>(c.code+' '+c.name).includes(q)).map(c=>{const tr=document.createElement('tr');for(const v of [c.code,c.name,c.value===null?'빈 셀':typeof c.value==='number'?fmt(c.value):c.value])tr.append(text('td',v));return tr;}));}
$('sheet').onchange=()=>{$('row-search').value='';$('row').replaceChildren();explore();};$('row').onchange=explore;
$('row-search').oninput=()=>{filterRows();if($('row').value)explore();else{$('cells').replaceChildren();$('explore-caption').textContent='일치하는 행이 없습니다.';}};
$('col-search').oninput=renderCells;
$('sector-search').oninput=()=>{const q=$('sector-search').value.trim();options($('sector'),sectors.filter(s=>(s.code+' '+s.name).includes(q)));};
function renderBasket(){$('basket').replaceChildren(...basket.map((s,i)=>{const li=text('li',s.code+' '+s.name+' / '+fmt(s.amount)+'백만원 ');const b=text('button','삭제');b.type='button';b.onclick=()=>{basket.splice(i,1);invalidate();renderBasket();};li.append(b);return li;}));$('sim-status').textContent=basket.length?basket.length+'개 입력 준비. 계산 버튼을 누르세요.':'시나리오를 추가하세요.';}
$('scenario').onsubmit=e=>{e.preventDefault();const amount=Number($('amount').value),s=sectors.find(s=>s.code===$('sector').value);if(!s||!Number.isFinite(amount)||amount<=0){$('sim-status').textContent='산업과 양의 증가액을 확인하세요.';return;}basket.push({...s,amount});invalidate();renderBasket();};
$('clear').onclick=()=>{basket=[];invalidate();renderBasket();};
$('run').onclick=async()=>{if(!basket.length){$('sim-status').textContent='시나리오를 먼저 추가하세요.';return;}const snapshot=basket.map(s=>({...s}));$('run').disabled=true;$('sim-status').textContent='계산 중…';try{const r=await call('simulate',snapshot);if(JSON.stringify(snapshot)!==JSON.stringify(basket)){$('sim-status').textContent='입력이 변경되었습니다. 다시 계산하세요.';return;}result=r;renderResult();$('sim-status').textContent='계산 완료. 아래 결과는 현재 시나리오에 대응합니다.';}catch(e){invalidate();$('sim-status').textContent='계산 실패: '+e.message;}finally{$('run').disabled=false;}};
function renderResult(){$('results').hidden=false;$('cards').replaceChildren(...[['수요 증가액',result.demand],['생산유발액',result.production],['수입유발액',result.imports],['부가가치유발액',result.valueAdded]].map(([title,v])=>{const d=text('div',title);d.className='card';d.append(text('strong',fmt(v)),text('span','백만원'));return d;}));const max=Math.max(...result.rows.map(r=>r.production),1);$('bars').replaceChildren(...result.rows.slice(0,15).map(r=>{const d=text('div',r.name+' · '+fmt(r.production)+'백만원');d.className='bar';const t=document.createElement('div');t.className='track';const f=document.createElement('div');f.className='fill';f.style.width=Math.max(0,r.production/max*100)+'%';t.append(f);d.append(t);return d;}));$('result-rows').replaceChildren(...result.rows.map(r=>{const tr=document.createElement('tr');[r.code,r.name,fmt(r.production),fmt(r.imports),fmt(r.valueAdded)].forEach(v=>tr.append(text('td',v)));return tr;}));}
function csvCell(v){let s=String(v);if(/^[=+@-]/.test(s)&&typeof v!=='number')s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
$('download').onclick=()=>{if(!result)return;const rows=[['산업코드','산업명','생산유발액_백만원','수입유발액_백만원','부가가치유발액_백만원'],...result.rows.map(r=>[r.code,r.name,r.production,r.imports,r.valueAdded])];const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='io-2023-'+currentClass+'-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

async function loadDefaultWorkbook(){
 try {
  $('status').textContent='기본 Excel 내려받는 중…';
  const file=currentClass==='basic'?'./data/io-2023.xlsx':'./data/io-2023-'+currentClass+'.xlsx';
  const response=await fetch(file);
  if(!response.ok)throw Error('기본 Excel 다운로드 실패 (HTTP '+response.status+')');
  await load(await response.arrayBuffer());
 }catch(error){
  $('status').textContent='준비 실패: '+error.message+' — 연결 상태를 확인하고 새로고침하세요.';
 }
}
$('classification').onchange=()=>{currentClass=$('classification').value;basket=[];sectors=[];rowChoices=[];cells=[];renderBasket();linkageRows=[];$('linkage-rows').replaceChildren();$('linkage-status').textContent='선택한 분류를 먼저 불러오세요.';$('load-basic').disabled=false;$('load-basic').textContent='선택 분류 불러오기';$('status').textContent='분류를 변경했습니다. 선택 분류 불러오기를 누르세요.';for(const id of ['sheet','row','sector','add','run','row-search','col-search','sector-search','amount','linkage-run','linkage-search'])$(id).disabled=true;invalidate();};
$('load-basic').onclick=async()=>{
 const button=$('load-basic');
 button.disabled=true;
 $('classification').disabled=true;
 button.textContent='불러오는 중…';
 try {
  await loadDefaultWorkbook();
  const ready=!$('sheet').disabled;
  if(ready){$('current-class').textContent=$('classification').selectedOptions[0].textContent+' · '+sectors.length+'개 부문';$('linkage-caption').textContent='영향력계수 및 감응도계수 (무차원, '+sectors.length+'개 부문)';}
  button.textContent=ready?'선택 분류 불러오기 완료':'선택 분류 다시 불러오기';
  button.disabled=ready;
 }finally{
  $('classification').disabled=false;
  if($('sheet').disabled){button.disabled=false;button.textContent='선택 분류 다시 불러오기';}
 }
};

// Independent scenario comparison: preserve results as snapshots, not references.
const comparisons=[];
function renderComparisons(){
 $('compare-status').textContent=comparisons.length?`${comparisons.length}개 시나리오 저장됨`:'저장된 비교 결과가 없습니다.';
 $('compare-rows').replaceChildren(...comparisons.map((r,i)=>{const tr=document.createElement('tr');[r.name,r.className,r.sectorNames,fmt(r.demand),fmt(r.production),fmt(r.imports),fmt(r.valueAdded),fmt(r.multiplier),fmt(100*r.imports/r.demand),fmt(100*r.valueAdded/r.demand)].forEach(v=>tr.append(text('td',v)));const td=document.createElement('td'),b=text('button','삭제');b.type='button';b.onclick=()=>{comparisons.splice(i,1);renderComparisons();};td.append(b);tr.append(td);return tr;}));
 const max=Math.max(1,...comparisons.map(r=>r.multiplier));$('compare-bars').replaceChildren(...comparisons.map(r=>{const d=text('div',r.name+' · '+fmt(r.multiplier)+'배');d.className='bar';const track=document.createElement('div');track.className='track';const fill=document.createElement('div');fill.className='fill';fill.style.width=(r.multiplier/max*100)+'%';track.append(fill);d.append(track);return d;}));
}
$('save-comparison').onclick=()=>{if(!result){$('compare-status').textContent='먼저 파급효과를 계산하세요.';return;}const name=$('compare-name').value.trim()||'시나리오 '+(comparisons.length+1);comparisons.push({name,className:$('classification').selectedOptions[0].textContent,sectorNames:basket.map(s=>s.name).join(', '),demand:result.demand,production:result.production,imports:result.imports,valueAdded:result.valueAdded,multiplier:result.multiplier});$('compare-name').value='';renderComparisons();};
$('clear-comparison').onclick=()=>{comparisons.length=0;renderComparisons();};

// Normalized linkage indices for the currently loaded official classification.
let linkageRows=[];
function renderLinkage(){
 const q=$('linkage-search').value.trim().toLowerCase(),sort=$('linkage-sort').value;
 const rows=linkageRows.filter(r=>(r.code+' '+r.name).toLowerCase().includes(q));
 rows.sort((a,b)=>sort==='name'?a.code.localeCompare(b.code):b[sort]-a[sort]);
 $('linkage-rows').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');
  for(const v of [r.code,r.name,fmt(r.power),fmt(r.sensitivity),fmt(r.columnSum),fmt(r.rowSum)])tr.append(text('td',v));
  return tr;}));
}
$('linkage-run').onclick=async()=>{
 $('linkage-run').disabled=true;$('linkage-status').textContent='연관도 계산 중…';
 try{const data=await call('linkage',null);linkageRows=data.rows;renderLinkage();
 $('linkage-status').textContent=`${$('classification').selectedOptions[0].textContent} · ${data.count}개 부문 계산 완료 · 생산유발계수 평균 열합 ${fmt(data.mean)}`;
 }catch(e){$('linkage-status').textContent='계산 실패: '+e.message;}
 finally{$('linkage-run').disabled=false;}
};
$('linkage-search').oninput=renderLinkage;
$('linkage-sort').onchange=renderLinkage;

function exportCSV(name,rows){const u=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
const oldCompare=renderComparisons;
renderComparisons=function(){oldCompare();const max=Math.max(1,...comparisons.flatMap(r=>[r.multiplier,r.imports/r.demand,r.valueAdded/r.demand]));$('ratio-chart').replaceChildren(...comparisons.map(r=>{const box=text('div',r.name+' · '+r.className);box.className='ratio-box';for(const [label,v,cls] of [['생산',r.multiplier,'prod'],['수입',r.imports/r.demand,'imp'],['부가가치',r.valueAdded/r.demand,'va']]){const line=text('div',label+' '+fmt(v));const track=text('div','');track.className='track';const fill=text('div','');fill.className='fill '+cls;fill.style.width=Math.max(0,v/max*100)+'%';track.append(fill);line.append(track);box.append(line);}return box;}));};
$('compare-csv').onclick=()=>exportCSV('scenario-comparison.csv',[['시나리오','분류','산업','수요_백만원','생산_백만원','수입_백만원','부가가치_백만원','생산배수','수입유발률_%','부가가치유발률_%'],...comparisons.map(r=>[r.name,r.className,r.sectorNames,r.demand,r.production,r.imports,r.valueAdded,r.multiplier,100*r.imports/r.demand,100*r.valueAdded/r.demand])]);
const ns='http://www.w3.org/2000/svg';function svgEl(tag,attrs,label){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(label!==undefined)e.textContent=label;return e;}
function drawQuadrant(){const host=$('quadrant');host.replaceChildren();if(!linkageRows.length){$('quadrant-summary').textContent='연관도 계산 후 표시됩니다.';return;}const q=$('linkage-search').value.trim().toLowerCase();const rows=linkageRows.filter(r=>(r.code+' '+r.name).toLowerCase().includes(q));const lo=Math.min(0,...linkageRows.flatMap(r=>[r.power,r.sensitivity])),hi=Math.max(1.2,...linkageRows.flatMap(r=>[r.power,r.sensitivity]))*1.05;const x=v=>65+(v-lo)/(hi-lo)*665,y=v=>340-(v-lo)/(hi-lo)*290;const s=svgEl('svg',{viewBox:'0 0 780 390',xmlns:ns,role:'img','aria-label':'영향력계수와 감응도계수 산점도'});s.append(svgEl('rect',{width:780,height:390,fill:'#ffffff'}));for(const v of [lo,1,hi]){s.append(svgEl('line',{x1:x(v),x2:x(v),y1:50,y2:340,stroke:v===1?'#b45309':'#cbd5e1','stroke-dasharray':v===1?'6 4':'none'}),svgEl('line',{x1:65,x2:730,y1:y(v),y2:y(v),stroke:v===1?'#b45309':'#cbd5e1','stroke-dasharray':v===1?'6 4':'none'}),svgEl('text',{x:x(v),y:358,'text-anchor':'middle','font-size':12},fmt(v)),svgEl('text',{x:57,y:y(v)+4,'text-anchor':'end','font-size':12},fmt(v)));}s.append(svgEl('text',{x:390,y:382,'text-anchor':'middle','font-size':14},'영향력계수'),svgEl('text',{x:65,y:25,'font-size':14},'감응도계수'));let counts=[0,0,0,0];for(const r of rows){const i=(r.power>=1?1:0)+(r.sensitivity>=1?2:0);counts[i]++;const c=svgEl('circle',{cx:x(r.power),cy:y(r.sensitivity),r:4.5,fill:['#94a3b8','#2563eb','#d97706','#0f766e'][i],opacity:.8});c.append(svgEl('title',{},r.code+' '+r.name+' | 영향력 '+fmt(r.power)+' / 감응도 '+fmt(r.sensitivity)));s.append(c);}host.append(s);$('quadrant-summary').textContent=`검색 결과 ${rows.length}개 · 모두 1 미만 ${counts[0]} / 영향력만 1 이상 ${counts[1]} / 감응도만 1 이상 ${counts[2]} / 모두 1 이상 ${counts[3]}`;}
const oldLinkage=renderLinkage;renderLinkage=function(){oldLinkage();drawQuadrant();};$('linkage-search').oninput=renderLinkage;$('linkage-sort').onchange=renderLinkage;$('classification').addEventListener('change',drawQuadrant);
$('linkage-csv').onclick=()=>{if(linkageRows.length)exportCSV('linkage-'+currentClass+'.csv',[['코드','산업','영향력','감응도','열합','행합'],...linkageRows.map(r=>[r.code,r.name,r.power,r.sensitivity,r.columnSum,r.rowSum])]);};$('plot-download').onclick=()=>{const s=$('quadrant').querySelector('svg');if(!s)return;const u=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(s)],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=u;a.download='linkage-'+currentClass+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
