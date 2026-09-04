const enc = new TextEncoder();
const u16 = n => [n & 255, (n >>> 8) & 255];
const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
let crcTable;
function crc32(bytes){
  if(!crcTable){ crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;}); }
  let c=0xffffffff; for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8); return (c^0xffffffff)>>>0;
}
function zipStore(files){
  const local=[], central=[]; let offset=0;
  for(const [name,content] of files){
    const nb=enc.encode(name), data=typeof content==='string'?enc.encode(content):content, crc=crc32(data);
    const lh=new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),0,0]);
    local.push(lh,nb,data);
    const ch=new Uint8Array([80,75,1,2,20,0,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(offset)]);
    central.push(ch,nb); offset+=lh.length+nb.length+data.length;
  }
  const csize=central.reduce((s,x)=>s+x.length,0), count=files.length;
  const end=new Uint8Array([80,75,5,6,0,0,0,0,...u16(count),...u16(count),...u32(csize),...u32(offset),0,0]);
  return new Blob([...local,...central,end],{type:'application/zip'});
}
const x=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const safeName=s=>String(s||'OnStood').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,80)||'OnStood';
function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200);}
function textOnly(v){ return String(v??'').replace(/\\n/g,'\n').replace(/\\t/g,'\t').trim(); }
function wordCount(v){ return textOnly(v).split(/\s+/).filter(Boolean).length; }
function pageTargetToWords(pages){
  const nums=String(pages||'').match(/\d+/g)?.map(Number)||[];
  const target=nums.length>1?(nums[0]+nums[1])/2:(nums[0]||8);
  return Math.max(900,Math.round(target*330));
}
function normalizeList(value){
  if(Array.isArray(value)) return value.map(v=>typeof v==='string'?textOnly(v):v).filter(Boolean);
  if(!value) return [];
  return textOnly(value).split(/\n|;(?=\s*[A-Z])/).map(v=>v.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
}
function paragraphsFromText(value){
  return textOnly(value).split(/\n{2,}|(?<=\.)\s*\n/).map(v=>v.trim()).filter(Boolean);
}
function titleCaseHeading(v){ return textOnly(v).replace(/^#{1,6}\s*/,'').replace(/^\d+(?:\.\d+)*[.)]?\s*/, '').trim(); }

function normalizeAcademicWork(raw, fallbackTitle='OnStood Academic Work'){
  let data=raw;
  if(typeof raw==='string'){
    const s=textOnly(raw).replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
    try{ data=JSON.parse(s); }catch{ data={ title:fallbackTitle, document_text:s }; }
  }
  if(!data || typeof data!=='object') data={ title:fallbackTitle, document_text:textOnly(raw) };

  // Some models still wrap the structured response in document_text as JSON.
  if(typeof data.document_text==='string'){
    const maybe=textOnly(data.document_text);
    if(/^\s*\{/.test(maybe)){
      try{ data={...data,...JSON.parse(maybe)}; }catch{}
    }
  }

  const title=textOnly(data.title)||fallbackTitle;
  const abstract=textOnly(data.abstract||data.executive_summary||data.summary||'');
  const keywords=normalizeList(data.keywords);
  const references=normalizeList(data.references||data.bibliography);
  let sections=[];

  if(Array.isArray(data.sections)){
    sections=data.sections.map((section,index)=>({
      title:titleCaseHeading(section?.title||section?.heading||`Section ${index+1}`),
      level:Math.min(3,Math.max(1,Number(section?.level||1))),
      paragraphs:Array.isArray(section?.paragraphs)
        ? section.paragraphs.map(textOnly).filter(Boolean)
        : paragraphsFromText(section?.body||section?.content||section?.text||''),
      bullets:normalizeList(section?.bullets),
      table:section?.table||null,
      formula:section?.formula||null
    })).filter(s=>s.title||s.paragraphs.length||s.bullets.length);
  }

  if(!sections.length && data.document_text){
    const source=textOnly(data.document_text);
    const lines=source.split('\n');
    let current={title:'Introduction',level:1,paragraphs:[],bullets:[]};
    const push=()=>{if(current.title||current.paragraphs.length||current.bullets.length)sections.push(current)};
    for(const rawLine of lines){
      const line=rawLine.trim(); if(!line) continue;
      const heading=line.match(/^(?:#{1,3}\s+|\d+(?:\.\d+)*[.)]?\s+)(.{3,120})$/);
      if(heading){ push(); const dots=(line.match(/^\d+(\.\d+)*/)?.[0]?.match(/\./g)||[]).length; current={title:titleCaseHeading(line),level:Math.min(3,dots+1),paragraphs:[],bullets:[]}; }
      else if(/^[-•]\s+/.test(line)) current.bullets.push(line.replace(/^[-•]\s+/,''));
      else current.paragraphs.push(line);
    }
    push();
  }

  const conclusion=textOnly(data.conclusion||'');
  if(conclusion && !sections.some(s=>/conclusion/i.test(s.title))) sections.push({title:'Conclusion',level:1,paragraphs:paragraphsFromText(conclusion),bullets:[]});

  let slides=Array.isArray(data.slides)?data.slides.map((slide,index)=>({
    title:textOnly(slide?.title)||`Slide ${index+1}`,
    subtitle:textOnly(slide?.subtitle||''),
    bullets:normalizeList(slide?.bullets||slide?.body||slide?.content),
    takeaway:textOnly(slide?.takeaway||slide?.key_message||''),
    speaker_notes:textOnly(slide?.speaker_notes||slide?.notes||''),
    source_note:textOnly(slide?.source_note||slide?.source||''),
    visual:slide?.visual||null
  })):[];

  if(!slides.length){
    slides=[
      {title,subtitle:'Academic presentation',bullets:[],takeaway:'',speaker_notes:'',source_note:''},
      ...sections.slice(0,10).map(s=>({title:s.title,subtitle:'',bullets:[...s.bullets,...s.paragraphs.map(p=>p.split(/(?<=[.!?])\s+/)[0])].filter(Boolean).slice(0,5),takeaway:'',speaker_notes:s.paragraphs.join('\n\n'),source_note:''})),
      {title:'Conclusions',subtitle:'',bullets:sections.filter(s=>/conclusion/i.test(s.title)).flatMap(s=>s.paragraphs).slice(0,4),takeaway:'Key findings and implications',speaker_notes:'',source_note:''},
      {title:'References',subtitle:'',bullets:references.slice(0,8),takeaway:'',speaker_notes:'',source_note:''}
    ].filter(s=>s.bullets.length||s.title===title||/conclusion|references/i.test(s.title));
  }

  const allText=[abstract,...sections.flatMap(s=>[...s.paragraphs,...s.bullets]),...references].join(' ');
  return {
    ...data,title,abstract,keywords,sections,references,slides,
    figures:Array.isArray(data.figures)?data.figures:[], tables:Array.isArray(data.tables)?data.tables:[], formulas:Array.isArray(data.formulas)?data.formulas:[],
    academic_note:textOnly(data.academic_note||''),
    word_count:wordCount(allText)
  };
}

function wRun(text,{bold=false,italic=false,size=22,color='1F2937'}={}){
  return `<w:r><w:rPr>${bold?'<w:b/>':''}${italic?'<w:i/>':''}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
}
function wPara(text,{style='',align='',before=0,after=120,line=276,keep=false,indent=0,bold=false,italic=false,size=22,color='1F2937'}={}){
  const pPr=`<w:pPr>${style?`<w:pStyle w:val="${style}"/>`:''}${align?`<w:jc w:val="${align}"/>`:''}${keep?'<w:keepNext/>':''}<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>${indent?`<w:ind w:left="${indent}"/>`:''}</w:pPr>`;
  return `<w:p>${pPr}${wRun(text,{bold,italic,size,color})}</w:p>`;
}
function wField(instr,display=''){
  return `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${x(instr)} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${display?wRun(display,{size:20,color:'64748B'}):''}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
}
function wPageBreak(){ return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }
function wInfoRow(label,value='____________________________'){
  return `<w:p><w:pPr><w:spacing w:after="100"/><w:tabs><w:tab w:val="left" w:pos="3100"/></w:tabs></w:pPr>${wRun(label,{bold:true,size:20,color:'475569'})}<w:r><w:tab/></w:r>${wRun(value,{size:20,color:'0F172A'})}</w:p>`;
}
function wBullet(text){
  return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="80" w:line="260" w:lineRule="auto"/></w:pPr>${wRun(text,{size:21})}</w:p>`;
}
function wTable(table){
  if(!table) return '';
  const headers=normalizeList(table.headers||table.columns);
  const rows=Array.isArray(table.rows)?table.rows:[];
  if(!headers.length && !rows.length) return '';
  const cell=(text,header=false)=>`<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:fill="${header?'EEF2FF':'FFFFFF'}"/></w:tcPr>${wPara(textOnly(text),{bold:header,size:18,after:50,line:230})}</w:tc>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:color="E2E8F0"/></w:tblBorders></w:tblPr>${headers.length?`<w:tr>${headers.map(h=>cell(h,true)).join('')}</w:tr>`:''}${rows.map(row=>`<w:tr>${(Array.isArray(row)?row:Object.values(row||{})).map(v=>cell(v,false)).join('')}</w:tr>`).join('')}</w:tbl>`;
}


function wCaption(label,text){return wPara(`${label}: ${textOnly(text)}`,{italic:true,size:18,color:'475569',before:100,after:70,keep:true});}
function wFormula(formula){
  if(!formula?.expression) return '';
  const symbols=normalizeList(formula.symbols);
  return `${wPara(textOnly(formula.expression),{align:'center',bold:false,size:23,color:'0F172A',before:140,after:90})}${symbols.map(v=>wPara(v,{size:18,color:'475569',indent:360,after:45})).join('')}${formula.explanation?wPara(textOnly(formula.explanation),{italic:true,size:18,color:'64748B',after:120}):''}`;
}
function wFigureSpec(fig,index){
  if(!fig?.title) return '';
  const labels=normalizeList(fig.labels), values=Array.isArray(fig.values)?fig.values:[];
  const max=Math.max(1,...values.map(Number).filter(Number.isFinite));
  const rows=labels.slice(0,10).map((label,i)=>[label,Number.isFinite(Number(values[i]))?String(values[i]):'—',Number.isFinite(Number(values[i]))?'█'.repeat(Math.max(1,Math.round(Number(values[i])/max*18))):'']).filter(Boolean);
  return `${wCaption(`Figure ${index+1}`,fig.title)}${rows.length?wTable({headers:['Category','Value','Relative magnitude'],rows}):wPara(textOnly(fig.interpretation||'Conceptual figure specification.'),{italic:true,size:18,color:'64748B'})}${fig.source_note?wPara(`Source: ${textOnly(fig.source_note)}`,{italic:true,size:16,color:'64748B',after:80}):''}${fig.interpretation?wPara(textOnly(fig.interpretation),{size:19,color:'334155',after:130}):''}`;
}

const DOC_STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="38"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="300" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="162B58"/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="168CFF"/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="90"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="334155"/><w:sz w:val="23"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style></w:styles>`;
const DOC_NUMBERING=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="360"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;

export function downloadDocx(title, raw, filename=title, options={}){
  const work=normalizeAcademicWork(raw,title);
  const template=options.template||work.template||'OnStood Minimal';
  const accent=template==='Research Classic'?'334155':template==='Modern Academic'?'5B5CF0':'168CFF';
  const cover=[
    wPara('OnStood',{bold:true,size:24,color:accent,after:120}),
    wPara('ACADEMIC WORK',{bold:true,size:18,color:'64748B',after:420}),
    wPara(work.title,{style:'Title',align:'left',after:420,line:320}),
    wPara(work.subtitle||'',{italic:true,size:22,color:'64748B',after:360}),
    wInfoRow('Student'),wInfoRow('University'),wInfoRow('Faculty / Department'),wInfoRow('Course'),wInfoRow('Professor / Lecturer'),wInfoRow('Academic year'),wInfoRow('Date'),
    wPara('Prepared with OnStood Academic Creator',{italic:true,size:17,color:'94A3B8',before:360,after:80}),
    wPara('Review, personalize and verify all course-specific requirements before submission.',{italic:true,size:16,color:'94A3B8',after:0}),
    wPageBreak()
  ].join('');

  const toc=`${wPara('Table of Contents',{style:'Heading1'})}<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>${wField('TOC \\o "1-3" \\h \\z \\u','Right-click and update field if Word does not refresh automatically.')}</w:p>${wPageBreak()}`;
  const abstract=work.abstract?`${wPara('Abstract',{style:'Heading1'})}${paragraphsFromText(work.abstract).map(p=>wPara(p,{align:'both'})).join('')}${work.keywords.length?wPara(`Keywords: ${work.keywords.join(', ')}`,{italic:true,size:20,color:'475569',after:220}):''}`:'';
  const body=work.sections.map((section,index)=>{
    const style=section.level===3?'Heading3':section.level===2?'Heading2':'Heading1';
    return `${wPara(section.title,{style})}${section.paragraphs.map(p=>wPara(p,{align:'both',after:130,line:285})).join('')}${section.bullets.map(wBullet).join('')}${section.table?.title?wCaption(`Table ${index+1}`,section.table.title):''}${wTable(section.table)}${section.table?.source_note?wPara(`Source: ${textOnly(section.table.source_note)}`,{italic:true,size:16,color:'64748B'}):''}${wFormula(section.formula)}`;
  }).join('') + (work.figures||[]).map(wFigureSpec).join('');
  const refs=work.references.length?`${wPara('References',{style:'Heading1'})}${work.references.map(ref=>wPara(ref,{after:100,line:250})).join('')}`:'';
  const qualityNote=`${wPageBreak()}${wPara('Academic readiness note',{style:'Heading2'})}${wPara(`Generated word count: ${work.word_count.toLocaleString()}. Target requested: ${options.pages||work.target_pages||'not specified'} pages.`,{size:18,color:'64748B'})}${work.academic_note?wPara(work.academic_note,{size:18,color:'64748B'}):''}`;
  const sect=`<w:sectPr><w:footerReference w:type="default" r:id="rId1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1276" w:right="1276" w:bottom="1276" w:left="1276" w:header="720" w:footer="720"/><w:cols w:space="708"/></w:sectPr>`;
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${cover}${toc}${abstract}${body}${refs}${qualityNote}${sect}</w:body></w:document>`;
  const footer=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${wRun('OnStood Academic Creator  •  ',{size:16,color:'94A3B8'})}${wField('PAGE','1')}</w:p></w:ftr>`;
  const files=[
    ['[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'],
    ['_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml',doc],['word/styles.xml',DOC_STYLES],['word/numbering.xml',DOC_NUMBERING],
    ['word/settings.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:updateFields w:val="true"/><w:compat/></w:settings>'],
    ['word/footer1.xml',footer],
    ['word/_rels/document.xml.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>']
  ];
  save(zipStore(files),`${safeName(filename)}.docx`);
}

function pText(text,{size=2000,bold=false,color='1F2937'}={}){return `<a:r><a:rPr lang="en-US" sz="${size}"${bold?' b="1"':''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${x(text)}</a:t></a:r>`;}
function pPara(text,opts={}){return `<a:p><a:pPr marL="0" indent="0"/><a:endParaRPr lang="en-US" sz="${opts.size||2000}"/>${pText(text,opts)}</a:p>`;}
function pVisual(visual,bodyColor='334155'){
  if(!visual || visual.type==='none') return '';
  const type=textOnly(visual.type).toLowerCase();
  if(type==='formula' && visual.expression) return `<p:sp><p:nvSpPr><p:cNvPr id="8" name="Formula"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="7600000" y="2150000"/><a:ext cx="3600000" cy="1500000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/>${pPara(textOnly(visual.expression),{size:1900,bold:true,color:'0F172A'})}</p:txBody></p:sp>`;
  if((type==='bar'||type==='line') && Array.isArray(visual.values)){
    const vals=visual.values.map(Number).slice(0,6), labels=normalizeList(visual.labels).slice(0,6), valid=vals.filter(Number.isFinite), max=Math.max(1,...valid);
    return vals.map((v,i)=>{if(!Number.isFinite(v))return '';const w=Math.round(2500000*v/max),y=2100000+i*430000;return `<p:sp><p:nvSpPr><p:cNvPr id="${20+i}" name="Data bar ${i+1}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="8200000" y="${y}"/><a:ext cx="${w}" cy="230000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="168CFF"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="${40+i}" name="Data label ${i+1}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="7600000" y="${y-30000}"/><a:ext cx="550000" cy="280000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${pPara((labels[i]||String(i+1)).slice(0,12),{size:1050,color:bodyColor})}</p:txBody></p:sp>`}).join('');
  }
  return '';
}
function slideXml(slide,index,total,template='OnStood Minimal'){
  const title=textOnly(slide.title||`Slide ${index+1}`);
  const bullets=normalizeList(slide.bullets||slide.body||slide.content).slice(0,6);
  const takeaway=textOnly(slide.takeaway||'');
  const source=textOnly(slide.source_note||'');
  const accent=template==='Research Classic'?'334155':template==='Modern Academic'?'635BFF':'168CFF';
  const dark=index===0?'0B1225':'FFFFFF';
  const titleColor=index===0?'FFFFFF':'0F172A';
  const bodyColor=index===0?'DDE7FF':'334155';
  const bulletParas=bullets.map(t=>`<a:p><a:pPr marL="360000" indent="-180000" lvl="0"><a:buChar char="•"/></a:pPr>${pText(t,{size:1900,color:bodyColor})}</a:p>`).join('');
  const bg=`<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${dark}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;
  const ribbon=`<p:sp><p:nvSpPr><p:cNvPr id="4" name="Accent"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="170000" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${accent}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
  const header=`<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="720000" y="540000"/><a:ext cx="10600000" cy="1050000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${pPara(title,{size:index===0?3200:2800,bold:true,color:titleColor})}</p:txBody></p:sp>`;
  const hasVisual=slide.visual && slide.visual.type && slide.visual.type!=='none';
  const content=`<p:sp><p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="860000" y="1800000"/><a:ext cx="${hasVisual?6500000:10100000}" cy="3650000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${bulletParas||pPara(slide.subtitle||'Academic presentation',{size:2100,color:bodyColor})}</p:txBody></p:sp>`;
  const takeawayBox=takeaway?`<p:sp><p:nvSpPr><p:cNvPr id="5" name="Takeaway"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="850000" y="5450000"/><a:ext cx="10100000" cy="650000"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="EEF2FF"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr lIns="150000" rIns="150000" tIns="90000" bIns="60000"/><a:lstStyle/>${pPara(`Key takeaway: ${takeaway}`,{size:1500,bold:true,color:'3730A3'})}</p:txBody></p:sp>`:'';
  const footerText=`${index+1} / ${total}${source?`  •  ${source.slice(0,110)}`:''}`;
  const footer=`<p:sp><p:nvSpPr><p:cNvPr id="6" name="Footer"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="850000" y="6250000"/><a:ext cx="10100000" cy="300000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${pPara(footerText,{size:1100,color:index===0?'94A3B8':'94A3B8'})}</p:txBody></p:sp>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld>${bg}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${ribbon}${header}${content}${pVisual(slide.visual,bodyColor)}${takeawayBox}${footer}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}
export function downloadPptx(title, rawSlides, filename=title, options={}){
  const work=normalizeAcademicWork({title,slides:rawSlides},title);
  let slides=work.slides.filter(Boolean).slice(0,40);
  if(!slides.length) slides=[{title,subtitle:'Academic presentation',bullets:[],takeaway:'',speaker_notes:'',source_note:''}];
  const template=options.template||'OnStood Minimal';
  const overrides=slides.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('');
  const ids=slides.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+1}"/>`).join('');
  const rels=slides.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`).join('');
  const files=[
    ['[Content_Types].xml',`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${overrides}</Types>`],
    ['_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>'],
    ['ppt/presentation.xml',`<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`],
    ['ppt/_rels/presentation.xml.rels',`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`],
    ...slides.map((s,i)=>[`ppt/slides/slide${i+1}.xml`,slideXml(s,i,slides.length,template)])
  ];
  save(zipStore(files),`${safeName(filename)}.pptx`);
}
export function downloadAcademicBriefDocx(item){
  const authors=(item.authors||[]).join(', '), institutions=(item.institutions||[]).join(', ');
  const work={title:item.title||'Academic record',abstract:item.abstract_text||'No indexed abstract is available for this reference.',keywords:[],sections:[{title:'Record details',paragraphs:[authors&&`Authors: ${authors}`,institutions&&`Institutions: ${institutions}`,item.publication_year&&`Year: ${item.publication_year}`,item.source_name&&`Source: ${item.source_name}`,item.doi&&`DOI: ${item.doi}`].filter(Boolean)}],references:[item.doi||item.source_url].filter(Boolean),academic_note:'This study brief is generated from academic record metadata available in OnStood Knowledge.'};
  downloadDocx(work.title,work,`OnStood - ${work.title}`);
}
export function parseCreatorJson(raw){
  if (raw && typeof raw === 'object') return normalizeAcademicWork(raw,'OnStood Academic Work');
  const source=String(raw||'').replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
  try { return normalizeAcademicWork(JSON.parse(source),'OnStood Academic Work'); }
  catch (error) { throw new Error('Academic AI returned an incomplete structured stage. Nothing was exported. Please retry this stage.'); }
}
export function creatorQualityReport(work,pages='8-10',slides='10-12'){
  const normalized=normalizeAcademicWork(work,work?.title||'OnStood Academic Work');
  const targetWords=pageTargetToWords(pages);
  const slideNums=String(slides||'').match(/\d+/g)?.map(Number)||[];
  const targetSlides=slideNums[0]||10;
  const issues=[];
  if(normalized.word_count < Math.max(900,targetWords*.72)) issues.push(`Document is too short (${normalized.word_count.toLocaleString()} words; target ≈ ${targetWords.toLocaleString()} words).`);
  if(normalized.sections.length<4) issues.push('Academic document needs more developed sections.');
  if(normalized.references.length<4) issues.push('Too few traceable references for a serious academic submission.');
  const prose=normalized.sections.flatMap(s=>s.paragraphs||[]).join(' ');
  if(normalized.references.length && !/(\([A-Z][^)]*,\s*(?:19|20)\d{2}|\[\d+\])/.test(prose)) issues.push('References exist, but in-text citation markers were not detected in the academic prose.');
  const tables=normalized.sections.filter(s=>s.table).length + (normalized.tables||[]).length;
  const formulas=normalized.sections.filter(s=>s.formula).length + (normalized.formulas||[]).length;
  if(/table|tabel/i.test(prose) && tables===0) issues.push('The prose refers to tabular analysis, but no renderable academic table was produced.');
  if(/equation|formula|identity|model/i.test(prose) && formulas===0) issues.push('The prose refers to equations/formulas, but no renderable formula block was produced.');
  if(normalized.slides.length < Math.max(6,targetSlides-2)) issues.push(`Presentation is too short (${normalized.slides.length} slides).`);
  if(normalized.slides.some(s=>normalizeList(s.bullets).length>7)) issues.push('Some slides are too dense for presentation delivery.');
  const rawLeak=JSON.stringify(normalized.sections).includes('\"sections\"') || normalized.sections.some(s=>(s.paragraphs||[]).some(p=>/[{[]\s*\"(?:title|sections|paragraphs|table|formula|abstract|keywords)\"\s*:/.test(String(p))));
  if(rawLeak) issues.push('Raw JSON/structured payload detected in academic prose; download is blocked until repaired.');
  if(normalized.references.some(r=>/SOURCE TO VERIFY/i.test(String(r)))) issues.push('One or more references still require verification.');
  // Quality Gate has two levels: hard export blockers vs academic warnings.
  // A completed draft must never become hostage after paid generation merely because
  // research evidence is thin; unsafe/truncated/raw payloads still remain blocked.
  const hardPatterns=[/too short/i,/needs more developed sections/i,/presentation is too short/i,/raw json|structured payload/i,/require verification/i];
  const blocking_issues=issues.filter(issue=>hardPatterns.some(rx=>rx.test(issue)));
  const warnings=issues.filter(issue=>!blocking_issues.includes(issue));
  return {ok:issues.length===0,export_safe:blocking_issues.length===0,issues,warnings,blocking_issues,word_count:normalized.word_count,target_words:targetWords,section_count:normalized.sections.length,reference_count:normalized.references.length,slide_count:normalized.slides.length};
}

// Robust Academic Creator stage parsers. Stages are intentionally Markdown, not giant JSON payloads.
export function parseAcademicStageMarkdown(raw){
  const src=textOnly(raw).replace(/```(?:markdown|md|text)?/gi,'').replace(/```/g,'').trim();
  if(!src || /\{\s*"(?:title|sections|paragraphs)"\s*:/.test(src)) throw new Error('Academic stage returned an unsafe structured payload.');
  const lines=src.split('\n');
  let title='',abstract='',keywords=[],references=[],sections=[],current=null,paragraph=[];
  const flushPara=()=>{const t=paragraph.join(' ').replace(/\s+/g,' ').trim();if(t&&current)current.paragraphs.push(t);paragraph=[]};
  const flushSection=()=>{flushPara();if(current&&(current.title||current.paragraphs.length||current.bullets.length))sections.push(current);current=null};
  const ensure=()=>{if(!current)current={title:'Introduction',level:1,paragraphs:[],bullets:[],table:null,formula:null};return current};
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(!line){flushPara();continue}
    if(/^Title:\s*/i.test(line)){title=line.replace(/^Title:\s*/i,'').trim();continue}
    if(/^Abstract:\s*/i.test(line)){abstract=line.replace(/^Abstract:\s*/i,'').trim();continue}
    if(/^Keywords:\s*/i.test(line)){keywords=line.replace(/^Keywords:\s*/i,'').split(/[,;]/).map(x=>x.trim()).filter(Boolean);continue}
    const h=line.match(/^(#{2,3})\s+(.+)$/);
    if(h){flushSection();const ht=h[2].trim();if(/^references\b/i.test(ht)){current={title:'References',level:1,paragraphs:[],bullets:[],table:null,formula:null};continue}current={title:titleCaseHeading(ht),level:h[1].length===3?2:1,paragraphs:[],bullets:[],table:null,formula:null};continue}
    if(current?.title==='References'){
      if(/^[-*•]\s+/.test(line)||/^\[?\d+\]?[.)]\s+/.test(line)) references.push(line.replace(/^[-*•]\s+/,'').replace(/^\[?\d+\]?[.)]\s+/,'').trim());
      else paragraph.push(line);
      continue;
    }
    if(/^[-*•]\s+/.test(line)){flushPara();ensure().bullets.push(line.replace(/^[-*•]\s+/,'').trim());continue}
    if(/^\|.+\|$/.test(line) && i+1<lines.length && /^\|?\s*:?-{3,}/.test(lines[i+1].trim())){
      flushPara(); const headers=line.split('|').slice(1,-1).map(x=>x.trim()); i+=1; const rows=[];
      while(i+1<lines.length && /^\|.+\|$/.test(lines[i+1].trim())){i++;rows.push(lines[i].trim().split('|').slice(1,-1).map(x=>x.trim()));}
      const sec=ensure(); sec.table={title:`Table — ${sec.title}`,headers,rows,source_note:''}; continue;
    }
    if(/^Source:\s*/i.test(line) && current?.table){current.table.source_note=line.replace(/^Source:\s*/i,'').trim();continue}
    if(line==='$$' && i+2<lines.length){flushPara();let expr='';i++;while(i<lines.length&&lines[i].trim()!=='$$'){expr+=(expr?' ':'')+lines[i].trim();i++;}const symbols=[];let explanation='';if(i+1<lines.length&&/^Symbols:/i.test(lines[i+1].trim())){i++;symbols.push(...lines[i].trim().replace(/^Symbols:\s*/i,'').split(/;\s*/).filter(Boolean));}if(i+1<lines.length&&/^Explanation:/i.test(lines[i+1].trim())){i++;explanation=lines[i].trim().replace(/^Explanation:\s*/i,'');}ensure().formula={expression:expr,symbols,explanation};continue}
    paragraph.push(line);
  }
  flushSection();
  if(sections.length&&sections[sections.length-1].title==='References'){const r=sections.pop();references.push(...r.paragraphs,...r.bullets)}
  const uniq=a=>[...new Map(a.filter(Boolean).map(v=>[String(v).toLowerCase(),v])).values()];
  return normalizeAcademicWork({title:title||'OnStood Academic Work',abstract,keywords,sections,references:uniq(references)},title||'OnStood Academic Work');
}

export function parsePresentationMarkdown(raw){
  const src=textOnly(raw).replace(/```(?:markdown|md|text)?/gi,'').replace(/```/g,'').trim();
  if(!src) throw new Error('Presentation stage was empty.');
  const lines=src.split('\n'); const slides=[]; let cur=null;
  const push=()=>{if(cur){cur.bullets=cur.bullets.filter(Boolean).slice(0,6);slides.push(cur)}cur=null};
  for(const rawLine of lines){const line=rawLine.trim();if(!line)continue;const h=line.match(/^##\s+Slide\s+\d+\s*[—:-]\s*(.+)$/i);if(h){push();cur={title:h[1].trim(),subtitle:'',bullets:[],takeaway:'',speaker_notes:'',source_note:'',visual:null};continue}if(!cur)continue;if(/^[-*•]\s+/.test(line)){cur.bullets.push(line.replace(/^[-*•]\s+/,'').trim());continue}if(/^Takeaway:\s*/i.test(line)){cur.takeaway=line.replace(/^Takeaway:\s*/i,'').trim();continue}if(/^Source:\s*/i.test(line)){cur.source_note=line.replace(/^Source:\s*/i,'').trim();continue}cur.speaker_notes+=(cur.speaker_notes?' ':'')+line;}push();return {title:slides[0]?.title||'Academic presentation',slides};
}
