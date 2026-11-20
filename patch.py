from pathlib import Path
p=Path('/mnt/data/io_work')
f=p/'model.py';s=f.read_text();s+='''

def linkage():
    if not valid: raise ValueError('먼저 데이터를 검증해야 합니다.')
    # Standard normalized column/row sums of the domestic production inducement matrix.
    n=len(codes)
    col=L.sum(axis=0); row=L.sum(axis=1); grand=L.sum()/n
    items=[{'code':codes[i],'name':names[i], 'power':float(col[i]/grand),
            'sensitivity':float(row[i]/grand), 'columnSum':float(col[i]),'rowSum':float(row[i])}
           for i in range(n)]
    return emit({'rows':items,'mean':float(grand),'count':n})
''';f.write_text(s)
f=p/'worker.js';s=f.read_text().replace("} else if(type==='explore') {","} else if(type==='linkage') {\n      result=py.runPython('linkage()');\n    } else if(type==='explore') {");f.write_text(s)
f=p/'index.html';s=f.read_text().replace('<a href="#comparison">시나리오 비교</a>','<a href="#comparison">시나리오 비교</a><a href="#linkage">산업 연관도</a>');needle='<section><h2>4. 자료 및 분석 범위 안내</h2>';block='''<section id="linkage"><h2>4. 산업별 영향력계수·감응도계수 분석</h2>
<p>2023년 기본부문 380개 산업의 국산 생산유발계수 행렬을 이용하여 산업 간 연관도를 비교합니다. 평균 1을 기준으로 1보다 크면 전체 산업 평균보다 높은 수준입니다.</p>
<button id="linkage-run" disabled type="button">산업 연관도 계산</button><p id="linkage-status" role="status">기본부문을 먼저 불러오세요.</p>
<label>산업 검색<input id="linkage-search" disabled placeholder="산업명 또는 코드"></label>
<label>정렬 기준<select id="linkage-sort"><option value="power">영향력계수 높은 순</option><option value="sensitivity">감응도계수 높은 순</option><option value="name">산업코드 순</option></select></label>
<div class="scroll"><table><caption>영향력계수 및 감응도계수 (무차원, 기본부문 380개)</caption><thead><tr><th>코드</th><th>산업</th><th>영향력계수</th><th>감응도계수</th><th>후방연쇄(열합)</th><th>전방연쇄(행합)</th></tr></thead><tbody id="linkage-rows"></tbody></table></div>
<p class="note">영향력계수 = 해당 산업 생산유발계수 열합 / 전체 열합의 평균. 감응도계수 = 해당 산업 생산유발계수 행합 / 전체 행합의 평균. 원자료의 국산 생산유발계수 기준이며 두 계수는 무차원입니다. 감응도는 모든 산업의 최종수요가 동일하게 증가하는 가상 조건에서의 상대적 반응 지표입니다.</p></section>
<section><h2>5. 자료 및 분석 범위 안내</h2>''';s=s.replace(needle,block);f.write_text(s)
f=p/'app.js';s=f.read_text();s=s.replace("'sector-search','amount'])$(id).disabled=false;","'sector-search','amount','linkage-run','linkage-search'])$(id).disabled=false;");s=s.replace("'sector-search','amount'])$(id).disabled=true;","'sector-search','amount','linkage-run','linkage-search'])$(id).disabled=true;");s+='''
// Basic-sector normalized linkage indices. Do not present these as official aggregate classification tables.
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
 $('linkage-status').textContent=`${data.count}개 기본부문 계산 완료 · 생산유발계수 평균 열합 ${fmt(data.mean)}`;
 }catch(e){$('linkage-status').textContent='계산 실패: '+e.message;}
 finally{$('linkage-run').disabled=false;}
};
$('linkage-search').oninput=renderLinkage;
$('linkage-sort').onchange=renderLinkage;
''';f.write_text(s)
f=p/'README.md';s=f.read_text();s+='''

## 산업 연관도(영향력·감응도) 분석

기본부문 엑셀을 로딩한 후 **산업 연관도 계산**을 누르면 380개 기본부문에 대해 영향력계수(정규화된 생산유발계수 열합)와 감응도계수(정규화된 행합)를 계산합니다. 검색·정렬을 지원합니다. 이 값은 업로드된 기본부문 국산 생산유발계수로 직접 산출한 분석값이며 대·중·소분류의 공식 투입산출표를 대체하지 않습니다.

### 계산식
- 영향력계수(j) = Σ_i L_ij / [(Σ_i Σ_j L_ij)/n]
- 감응도계수(i) = Σ_j L_ij / [(Σ_i Σ_j L_ij)/n]
- L = 업로드된 2023년 국산 생산유발계수 행렬, n = 380
- 계수는 무차원, 평균은 1입니다. 행합과 열합도 계수합으로서 금액이 아닙니다.

### 미충족 항목(중요)
과제 안내문의 대분류·중분류·소분류·기본부문 **각각의 투입산출표 활용** 요구 중 기본부문만 충족합니다. 다른 분류의 공식 투입산출표를 확보하고 검증해 별도 모델로 연결해야 완전 충족할 수 있습니다. 기본부문 380개를 임의로 합산한 계수를 공식 집계표로 제시하지 않습니다.
''';f.write_text(s)
