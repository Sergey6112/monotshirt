const NS='http://www.w3.org/2000/svg';
const state={side:'front',shirt:'#f7f7f5',selected:null,objects:{front:[],back:[]},drag:null,resize:null,editing:null};
const $=s=>document.querySelector(s);
const designLayer=$('#designLayer'), editPanel=$('#editPanel');
const printArea={x:215,y:285,w:270,h:270};

function uid(){return Math.random().toString(36).slice(2,10)}
function current(){return state.objects[state.side]}
function selectedObject(){return current().find(o=>o.id===state.selected)}
function refresh(){
  const isBlack=state.shirt==='#171717';
  const mockup = isBlack
    ? (state.side==='front' ? 'assets/tshirt-hanger-black.png' : 'assets/tshirt-hanger-black-back.png')
    : (state.side==='front' ? 'assets/tshirt-hanger-white.png' : 'assets/tshirt-hanger-white-back.png');
  $('#shirtMockup').setAttribute('href', mockup);
  designLayer.innerHTML='';
  current().forEach(o=>renderObject(o));
  const sel=selectedObject();
  editPanel.classList.toggle('disabled',!sel);
  const fontControl=$('#fontControl');
  const textStyleControl=$('#textStyleControl');
  const isText=!!(sel && sel.type==='text');
  fontControl.hidden=!isText;
  textStyleControl.hidden=!isText;
  if(sel){
    $('#scaleRange').value=Math.round(sel.scale*100);
    $('#scaleValue').textContent=Math.round(sel.scale*100)+'%';
    $('#rotateRange').value=sel.rotate;
    $('#rotateValue').textContent=Math.round(sel.rotate)+'°';
    if(sel.type==='text'){
      $('#fontSelect').value=sel.fontFamily || 'Montserrat';
      const color=sel.color || '#111111';
      document.querySelectorAll('.text-color-swatch').forEach(b=>b.classList.toggle('active',b.dataset.textColor.toLowerCase()===color.toLowerCase()));
      $('#trackingRange').value=sel.letterSpacing ?? 0;
      $('#trackingValue').textContent=formatTracking(sel.letterSpacing ?? 0);
    }
  }
  if(state.editing) startInlineEdit(state.editing,true);
}
function renderObject(o){
  const g=document.createElementNS(NS,'g');
  g.dataset.id=o.id;
  g.style.cursor='move';
  g.setAttribute('transform',`translate(${o.x} ${o.y}) rotate(${o.rotate}) scale(${o.scale})`);
  let el;
  if(o.type==='image'){
    el=document.createElementNS(NS,'image');
    el.setAttribute('href',o.src);el.setAttribute('x',-o.w/2);el.setAttribute('y',-o.h/2);el.setAttribute('width',o.w);el.setAttribute('height',o.h);el.setAttribute('preserveAspectRatio','xMidYMid meet');
  }else{
    el=document.createElementNS(NS,'text');
    el.classList.add('text-object');
    el.setAttribute('text-anchor','middle');el.setAttribute('dominant-baseline','middle');el.setAttribute('font-family',`${o.fontFamily || 'Montserrat'}, sans-serif`);el.setAttribute('font-weight','800');el.setAttribute('font-size',o.fontSize);el.setAttribute('fill',o.color || '#111111');el.setAttribute('letter-spacing',o.letterSpacing ?? 0);el.textContent=o.text;
  }
  g.appendChild(el);
  if(o.id===state.selected){
    g.classList.add('selected');
    if(o.type==='text'){
      g.classList.add('selected-text');
      addTextSelection(g,o);
    }
  }
  designLayer.appendChild(g);
}
function objectBox(o){
  if(o.type==='image') return {w:o.w,h:o.h};
  return {w:Math.max(70,o.text.length*o.fontSize*.60 + Math.max(0,o.text.length-1)*(o.letterSpacing||0)),h:o.fontSize*1.35};
}
function addTextSelection(g,o){
  const box=objectBox(o), pad=8;
  const rect=document.createElementNS(NS,'rect');
  rect.classList.add('text-selection-box');
  rect.setAttribute('x',-box.w/2-pad); rect.setAttribute('y',-box.h/2-pad);
  rect.setAttribute('width',box.w+pad*2); rect.setAttribute('height',box.h+pad*2);
  rect.setAttribute('rx','2'); rect.setAttribute('pointer-events','none');
  g.appendChild(rect);
  // One resize handle only: top-right corner.
  const cx=box.w/2+pad, cy=-box.h/2-pad;
  const c=document.createElementNS(NS,'circle');
  c.classList.add('text-resize-handle');
  c.dataset.action='resize';
  c.dataset.corner='top-right';
  c.setAttribute('cx',cx);c.setAttribute('cy',cy);c.setAttribute('r','4.5');
  c.style.cursor='nesw-resize';
  g.appendChild(c);
}
function select(id){state.selected=id;refresh()}
function addImage(src,img){
  const ratio=img.naturalWidth/img.naturalHeight||1; let w=150,h=150/ratio; if(h>210){h=210;w=h*ratio}
  const o={id:uid(),type:'image',src,w,h,x:350,y:415,scale:1,rotate:0}; current().push(o);state.selected=o.id;refresh();
}
$('#fileInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>addImage(reader.result,img);img.src=reader.result};reader.readAsDataURL(f);e.target.value=''});

$('#sideTabs').addEventListener('click',e=>{if(!e.target.dataset.side)return;finishInlineEdit(true);state.side=e.target.dataset.side;state.selected=null;document.querySelectorAll('#sideTabs button').forEach(b=>b.classList.toggle('active',b===e.target));$('#sideLabel').textContent=state.side==='front'?'Передняя сторона':'Задняя сторона';refresh()});
$('#swatches').addEventListener('click',e=>{const b=e.target.closest('.swatch:not([disabled])');if(!b)return;state.shirt=b.dataset.color;document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('active',x===b));refresh()});
$('#scaleRange').oninput=e=>{const o=selectedObject();if(!o)return;o.scale=e.target.value/100;$('#scaleValue').textContent=e.target.value+'%';refresh()};
$('#rotateRange').oninput=e=>{const o=selectedObject();if(!o)return;o.rotate=+e.target.value;$('#rotateValue').textContent=e.target.value+'°';refresh()};
$('#fontSelect').addEventListener('change',e=>{const o=selectedObject();if(!o || o.type!=='text')return;o.fontFamily=e.target.value;refresh()});
function formatTracking(v){const n=Number(v)||0;return (n>0?'+':'')+n+' px'}
function setTextColor(color){const o=selectedObject();if(!o || o.type!=='text')return;o.color=color;refresh()}
$('#textColorRow').addEventListener('click',e=>{const b=e.target.closest('.text-color-swatch');if(!b)return;setTextColor(b.dataset.textColor)});
$('#trackingRange').addEventListener('input',e=>{const o=selectedObject();if(!o || o.type!=='text')return;o.letterSpacing=Number(e.target.value);$('#trackingValue').textContent=formatTracking(o.letterSpacing);refresh()});
$('#centerBtn').onclick=()=>{const o=selectedObject();if(!o)return;o.x=350;o.y=420;refresh()};
$('#deleteBtn').onclick=()=>{finishInlineEdit(true);state.objects[state.side]=current().filter(x=>x.id!==state.selected);state.selected=null;refresh()};
$('#resetBtn').onclick=()=>{if(confirm('Сбросить все элементы макета?')){finishInlineEdit(true);state.objects={front:[],back:[]};state.selected=null;refresh()}};

const dlg=$('#textDialog');
$('#addTextBtn').onclick=()=>{dlg.showModal();setTimeout(()=>$('#textInput').focus(),50)};
$('#textOk').onclick=e=>{const text=$('#textInput').value.trim();if(!text){e.preventDefault();return}const o={id:uid(),type:'text',text,fontSize:34,fontFamily:'Montserrat',color:state.shirt==='#171717'?'#ffffff':'#111111',letterSpacing:0,x:350,y:415,scale:1,rotate:0};current().push(o);state.selected=o.id;$('#textInput').value='';refresh()};

function svgPoint(evt){const svg=$('#shirtSvg'),pt=svg.createSVGPoint();pt.x=evt.clientX;pt.y=evt.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

let lastTextPress={id:null,time:0};
designLayer.addEventListener('pointerdown',e=>{
  const g=e.target.closest('g[data-id]');if(!g)return;
  const id=g.dataset.id;
  const pressed=current().find(x=>x.id===id);
  const now=performance.now();
  const isTextDoublePress=!!(pressed && pressed.type==='text' && lastTextPress.id===id && now-lastTextPress.time<420);
  if(pressed && pressed.type==='text'){lastTextPress={id,time:now}}else{lastTextPress={id:null,time:0}}
  if(isTextDoublePress){
    state.drag=null;state.resize=null;state.selected=id;
    startInlineEdit(id,false);
    e.preventDefault();e.stopPropagation();return;
  }
  if(state.selected!==id){state.selected=id;refresh();return;}
  const o=selectedObject();if(!o)return;
  const p=svgPoint(e);
  if(e.target.dataset.action==='resize' && o.type==='text'){
    const center={x:o.x,y:o.y};
    state.resize={id:o.id,startDist:Math.max(1,distance(p,center)),startScale:o.scale};
    designLayer.setPointerCapture?.(e.pointerId);e.preventDefault();e.stopPropagation();return;
  }
  if(state.editing===o.id)return;
  state.drag={dx:p.x-o.x,dy:p.y-o.y};designLayer.setPointerCapture?.(e.pointerId);e.preventDefault();
});
window.addEventListener('pointermove',e=>{
  if(state.resize){
    const o=current().find(x=>x.id===state.resize.id);if(!o)return;
    const p=svgPoint(e), center={x:o.x,y:o.y};
    const ratio=distance(p,center)/state.resize.startDist;
    o.scale=Math.max(.2,Math.min(2.2,state.resize.startScale*ratio));
    $('#scaleRange').value=Math.round(o.scale*100);$('#scaleValue').textContent=Math.round(o.scale*100)+'%';
    refresh();return;
  }
  if(!state.drag)return;const o=selectedObject();if(!o)return;const p=svgPoint(e);o.x=Math.max(printArea.x,Math.min(printArea.x+printArea.w,p.x-state.drag.dx));o.y=Math.max(printArea.y,Math.min(printArea.y+printArea.h,p.y-state.drag.dy));refresh();
});
window.addEventListener('pointerup',()=>{state.drag=null;state.resize=null});
$('#shirtSvg').addEventListener('pointerdown',e=>{if(!e.target.closest('g[data-id]') && !e.target.closest('.inline-text-editor')){finishInlineEdit(true);state.selected=null;refresh()}});

designLayer.addEventListener('dblclick',e=>{
  const g=e.target.closest('g[data-id]');if(!g)return;
  const o=current().find(x=>x.id===g.dataset.id);if(!o || o.type!=='text')return;
  state.selected=o.id;startInlineEdit(o.id,false);e.preventDefault();e.stopPropagation();
});

function startInlineEdit(id,restoreFocus){
  const o=current().find(x=>x.id===id);if(!o||o.type!=='text')return;
  state.editing=id;
  const old=$('.inline-text-editor');if(old)old.remove();
  const box=objectBox(o);
  const fo=document.createElementNS(NS,'foreignObject');
  fo.classList.add('inline-text-editor');fo.dataset.id=id;
  const width=Math.max(120,Math.min(250,box.w*o.scale+34));
  const height=48;
  fo.setAttribute('x',Math.max(printArea.x,o.x-width/2));
  fo.setAttribute('y',o.y-height/2);
  fo.setAttribute('width',Math.min(width,printArea.x+printArea.w-Math.max(printArea.x,o.x-width/2)));
  fo.setAttribute('height',height);
  const input=document.createElement('input');
  input.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
  input.className='inline-text-input';input.value=o.text;input.maxLength=40;
  input.style.fontFamily=`${o.fontFamily || 'Montserrat'}, sans-serif`;
  input.style.fontWeight='800';
  input.style.color=o.color || '#111111';
  input.style.letterSpacing=(o.letterSpacing||0)+'px';
  input.addEventListener('input',()=>{o.text=input.value;});
  input.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'){ev.preventDefault();finishInlineEdit(true)}
    if(ev.key==='Escape'){ev.preventDefault();finishInlineEdit(false)}
  });
  input.addEventListener('blur',()=>setTimeout(()=>{if(state.editing===id)finishInlineEdit(true)},0));
  fo.appendChild(input);$('#shirtSvg').appendChild(fo);
  const textNode=designLayer.querySelector(`g[data-id="${id}"] .text-object`);if(textNode)textNode.setAttribute('opacity','.18');
  if(!restoreFocus){requestAnimationFrame(()=>{input.focus();input.select()})}else{requestAnimationFrame(()=>input.focus())}
}
function finishInlineEdit(commit){
  if(!state.editing)return;
  const id=state.editing,o=current().find(x=>x.id===id),input=$('.inline-text-input');
  if(o && input && commit){const v=input.value.trim();if(v)o.text=v;}
  state.editing=null;const fo=$('.inline-text-editor');if(fo)fo.remove();refresh();
}

async function assetToDataUrl(src){
  if(!src || src.startsWith('data:')) return src;
  const response=await fetch(src);
  if(!response.ok) throw new Error('Не удалось загрузить мокап футболки');
  const blob=await response.blob();
  return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
}
async function exportSvg(){
  finishInlineEdit(true);
  const btn=$('#downloadBtn');const oldText=btn.textContent;btn.disabled=true;btn.textContent='Подготовка...';
  try{
    const clone=$('#shirtSvg').cloneNode(true);
    clone.querySelector('#printArea')?.remove();clone.querySelector('#areaText')?.remove();
    clone.querySelectorAll('.text-selection-box,.text-resize-handle,.inline-text-editor').forEach(x=>x.remove());
    clone.querySelectorAll('#designLayer .text-object').forEach(t=>t.setAttribute('opacity','1'));
    const mockup=clone.querySelector('#shirtMockup');
    if(mockup){const href=mockup.getAttribute('href')||mockup.getAttributeNS('http://www.w3.org/1999/xlink','href');mockup.setAttribute('href',await assetToDataUrl(href));}
    clone.setAttribute('width','1400');clone.setAttribute('height','1668');
    const xml=new XMLSerializer().serializeToString(clone);
    const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
    const c=document.createElement('canvas');c.width=1400;c.height=1668;const ctx=c.getContext('2d');
    ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    const png=await new Promise(resolve=>c.toBlob(resolve,'image/png',1));
    if(!png) throw new Error('Не удалось сформировать PNG');
    const a=document.createElement('a');a.href=URL.createObjectURL(png);a.download=`monoprint-tshirt-mockup-${state.shirt==='#171717'?'black':'white'}-${state.side}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }catch(err){console.error(err);alert('Не удалось скачать мокап. Запустите конструктор через localhost и попробуйте ещё раз.');}
  finally{btn.disabled=false;btn.textContent=oldText;}
}
$('#downloadBtn').onclick=exportSvg;
refresh();
