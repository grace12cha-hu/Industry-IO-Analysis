from pathlib import Path
p=Path('/mnt/data/io_work/Sample_IO-main'); h=p/'index.html'; s=h.read_text();s=s.replace('<a href="#simulation">시뮬레이터</a>','<a href="#simulation">시뮬레이터</a><a href="#comparison">시나리오 비교</a>');s=s.replace('</main><footer>', '''<section id="comparison"><h2>3. 시나리오 비교 분석</h2><p>파급효과 계산 후 결과를 저장해 서로 다른 산업의 동일한 최종수요 증가가 가져오는 효과를 비교합니다. 모든 금액은 백만원입니다.</p><label>시나리오 이름<input id="compare-name" placeholder="예: 자동차 10억원"></label><button id="save-comparison" type="button">현재 계산 결과 저장</button><button id="clear-comparison" type="button">비교 초기화</button><p id="compare-status" role="status">저장된 비교 결과가 없습니다.</p><div class="scroll"><table><caption>시나리오별 총 파급효과 비교 (백만원, 배수는 무차원)</caption><thead><tr><th>시나리오</th><th>수요 증가</th><th>생산유발</th><th>수입유발</th><th>부가가치유발</th><th>생산유발배수</th><th>삭제</th></tr></thead><tbody id="compare-rows"></tbody></table></div><h3>생산유발배수 비교</h3><div id="compare-bars"></div><p class="note">산업 간 파급효과 차이를 비교하는 탐색 도구입니다. 유발효과는 모형에 따른 추정치이며 실제 관측된 인과효과가 아닙니다.</p></section><section><h2>4. 자료 및 분석 범위 안내</h2><p>기본 데이터: 2023년 생산자가격 기본부문(380부문) 산업연관표. 원본 Excel에 포함된 12개 시트를 탐색할 수 있습니다.</p><p><strong>분석 범위:</strong> 현재 제공된 원본 파일의 기본부문만 계산을 지원합니다. 대분류·중분류·소분류 계산은 해당 분류의 공식 거래표 및 계수표가 확보되어야 하므로, 임의로 기본부문 결과를 합쳐 공식 분류별 유발계수로 표시하지 않습니다.</p><p>산식: 생산유발액 = 생산유발계수 행렬 × 국내 최종수요 증가 벡터. 수입 및 부가가치유발액도 해당 계수행렬을 사용합니다. 결과는 백만원, 생산유발배수는 배입니다.</p></section></main><footer>''');h.write_text(s)
a=p/'app.js';t=a.read_text();t+='''
// Independent scenario comparison: preserve results as snapshots, not references.
const comparisons=[];
function renderComparisons(){
 $('compare-status').textContent=comparisons.length?`${comparisons.length}개 시나리오 저장됨`:'저장된 비교 결과가 없습니다.';
 $('compare-rows').replaceChildren(...comparisons.map((r,i)=>{const tr=document.createElement('tr');[r.name,fmt(r.demand),fmt(r.production),fmt(r.imports),fmt(r.valueAdded),fmt(r.multiplier)].forEach(v=>tr.append(text('td',v)));const td=document.createElement('td'),b=text('button','삭제');b.type='button';b.onclick=()=>{comparisons.splice(i,1);renderComparisons();};td.append(b);tr.append(td);return tr;}));
 const max=Math.max(1,...comparisons.map(r=>r.multiplier));$('compare-bars').replaceChildren(...comparisons.map(r=>{const d=text('div',r.name+' · '+fmt(r.multiplier)+'배');d.className='bar';const track=document.createElement('div');track.className='track';const fill=document.createElement('div');fill.className='fill';fill.style.width=(r.multiplier/max*100)+'%';track.append(fill);d.append(track);return d;}));
}
$('save-comparison').onclick=()=>{if(!result){$('compare-status').textContent='먼저 파급효과를 계산하세요.';return;}const name=$('compare-name').value.trim()||'시나리오 '+(comparisons.length+1);comparisons.push({name,demand:result.demand,production:result.production,imports:result.imports,valueAdded:result.valueAdded,multiplier:result.multiplier});$('compare-name').value='';renderComparisons();};
$('clear-comparison').onclick=()=>{comparisons.length=0;renderComparisons();};
''';a.write_text(t)
css=p/'style.css';css.write_text(css.read_text()+'\n#comparison button {margin:0.4rem 0.4rem 0.4rem 0} #comparison input {max-width:34rem} #compare-rows td {white-space:nowrap}\n')
(p/'README.md').write_text('''# 2023 산업연관표 분석 웹앱

## 목적
2023년 생산자가격 기본부문 산업연관표를 브라우저에서 탐색하고, 국내 최종수요 증가에 따른 생산·수입·부가가치 유발액을 시뮬레이션하며, 시나리오별 결과를 비교합니다.

## 사용 방법
1. `기본부문 불러오기`를 눌러 Excel을 불러옵니다. 첫 로딩은 Pyodide 설치 및 행렬 검증으로 시간이 걸릴 수 있습니다.
2. **원자료 탐색**에서 12개 시트를 선택하고 산업명 또는 코드를 검색하여 원표의 행과 열을 확인합니다.
3. **시뮬레이터**에서 산업을 검색하고 국내 생산물 최종수요 증가액(백만원)을 입력해 시나리오에 추가합니다. 여러 산업을 추가할 수 있습니다.
4. `파급효과 계산`을 누르면 생산·수입·부가가치 유발액, 생산유발 상위 산업 및 산업별 결과가 나타납니다. CSV 다운로드도 가능합니다.
5. **시나리오 비교 분석**에서 현재 결과를 이름과 함께 저장합니다. 다른 산업 또는 증가액으로 다시 계산하여 저장하면 유발액과 생산유발배수를 나란히 비교할 수 있습니다.

## 계산 방식과 단위
- 국내 최종수요 증가 벡터 f (백만원)
- 생산유발액 x = Lf, 수입유발액 m = Mf, 부가가치유발액 v = Vf (백만원)
- 생산유발배수 = 전체 생산유발액 / 전체 최종수요 증가액 (배, 무차원)
- 사용 계수행렬은 제공된 원본 Excel의 `생산유발계수`, `수입유발계수`, `부가가치유발계수` 시트에서 읽습니다.
- 로딩 시 국산투입계수와 생산유발계수 등 간 행렬 일치 여부를 검사합니다.

## 자료 및 제약
- 자료: 과제에서 제공된 `data/io-2023.xlsx` (2023년 생산자가격 기본부문 380개, 12개 시트).
- 원자료에 포함된 합계/지표 행은 산업행과 구별해야 하며, 시트별 단위는 원표의 머리글을 확인해야 합니다.
- **중요:** 본 배포본은 기본부문(380부문)의 계수행렬만 지원합니다. 대·중·소분류의 공식 산업연관분석을 하려면 해당 분류별 공식 자료가 추가로 필요합니다. 임의로 기본부문 계수를 합산하여 공식 분류별 계수로 표시하지 않습니다.
- 양(+)의 국내 생산물 최종수요 증가만 지원하며 고정계수·선형모형의 추정치입니다. 실제 경제의 인과효과를 보장하지 않습니다.
- 개인정보나 비공개 자료를 업로드하지 마세요. 공개 저장소에 Excel 파일이 게시됩니다.

## 기술 구성
GitHub Pages 정적 호스팅 / HTML·CSS·JavaScript / Web Worker / Pyodide(Python, NumPy, openpyxl). 서버 측 계산은 사용하지 않습니다.

## 파일 구조
`index.html`, `style.css`, `app.js`, `worker.js`, `model.py`, `data/io-2023.xlsx`, `README.md`, `.nojekyll`.

## 참고
- 과제 안내서 「과제물1: GitHub를 활용한 산업연관표 분석 웹앱 구축」
- 제공된 교수 예시 저장소: https://github.com/profguclass/Sample_IO
''',encoding='utf-8')
(p/'.nojekyll').touch()
