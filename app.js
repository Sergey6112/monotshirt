const NS='http://www.w3.org/2000/svg';
const state={product:'tshirt',side:'front',shirt:'#f7f7f5',selected:null,objects:{tshirt:{front:[],back:[]},hoodie:{front:[],back:[]},shopper:{front:[],back:[]}},drag:null,resize:null,editing:null};
const $=s=>document.querySelector(s);
const designLayer=$('#designLayer'), editPanel=$('#editPanel');
const printArea={x:215,y:285,w:270,h:270};
const productPrintAreas={
  tshirt:{x:215,y:285,w:270,h:270},
  hoodie:{x:215,y:277,w:270,h:270},
  shopper:{x:230,y:438,w:240,h:240}
};
function applyPrintArea(){
  const a=productPrintAreas[state.product]||productPrintAreas.tshirt;
  Object.assign(printArea,a);
  const clipRect=document.querySelector('#printClip rect');
  const border=document.querySelector('#printArea');
  [clipRect,border].forEach(el=>{
    if(!el)return;
    el.setAttribute('x',a.x);el.setAttribute('y',a.y);
    el.setAttribute('width',a.w);el.setAttribute('height',a.h);
  });
}

function uid(){return Math.random().toString(36).slice(2,10)}
function current(){return state.objects[state.product][state.side]}
function selectedObject(){return current().find(o=>o.id===state.selected)}
function resolvedTextColor(o){
  if(o && o.colorMode==='auto') return state.shirt==='#171717' ? '#ffffff' : '#111111';
  return (o && o.color) || '#111111';
}
function refresh(){
  const isBlack=state.shirt==='#171717';
  let mockup;
  if(state.product==='hoodie'){
    mockup=isBlack
      ? (state.side==='front' ? 'assets/hoodie-black-front.png' : 'assets/hoodie-black-back.png')
      : (state.side==='front' ? 'assets/hoodie-white-front.png' : 'assets/hoodie-white-back.png');
  }else if(state.product==='shopper'){
    mockup=isBlack ? 'assets/shopper-black.png' : 'assets/shopper-white.png';
  }else{
    mockup=isBlack
      ? (state.side==='front' ? 'assets/tshirt-hanger-black.png' : 'assets/tshirt-hanger-black-back.png')
      : (state.side==='front' ? 'assets/tshirt-hanger-white.png' : 'assets/tshirt-hanger-white-back.png');
  }
  $('#shirtMockup').setAttribute('href', mockup);
  $('#shirtMockup').setAttribute('preserveAspectRatio',state.product==='shopper'?'xMidYMid meet':'xMidYMid slice');
  applyPrintArea();
  const strings=$('#hoodieStringsOverlay');
  if(strings){
    const show=state.product==='hoodie' && state.side==='front';
    strings.style.display=show?'':'none';
    strings.setAttribute('href',isBlack?'assets/hoodie-strings-black.png':'assets/hoodie-strings-white.png');
  }
  const adaptiveSwatch=document.querySelector('.auto-text-color');
  if(adaptiveSwatch){
    const adaptive=state.shirt==='#171717' ? '#ffffff' : '#111111';
    adaptiveSwatch.style.setProperty('--tc',adaptive);
    adaptiveSwatch.setAttribute('aria-label',state.shirt==='#171717'?'Белый':'Чёрный');
    adaptiveSwatch.title=state.shirt==='#171717'?'Белый':'Чёрный';
  }
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
      const autoSwatch=document.querySelector('.auto-text-color');
      if(autoSwatch){
        const adaptive=state.shirt==='#171717' ? '#ffffff' : '#111111';
        autoSwatch.style.setProperty('--tc',adaptive);
        autoSwatch.setAttribute('aria-label',state.shirt==='#171717'?'Белый':'Чёрный');
        autoSwatch.title=state.shirt==='#171717'?'Белый':'Чёрный';
      }
      const color=resolvedTextColor(sel);
      document.querySelectorAll('.text-color-swatch').forEach(b=>{
        const active=b.dataset.textColor==='auto' ? sel.colorMode==='auto' : (sel.colorMode!=='auto' && b.dataset.textColor.toLowerCase()===color.toLowerCase());
        b.classList.toggle('active',active);
      });
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
    el.setAttribute('text-anchor','middle');el.setAttribute('dominant-baseline','middle');el.setAttribute('font-family',`${o.fontFamily || 'Montserrat'}, sans-serif`);el.setAttribute('font-weight','800');el.setAttribute('font-size',o.fontSize);el.setAttribute('fill',resolvedTextColor(o));el.setAttribute('letter-spacing',o.letterSpacing ?? 0);el.textContent=o.text;
  }
  g.appendChild(el);
  if(o.id===state.selected){
    g.classList.add('selected');
    if(o.type==='text'){
      g.classList.add('selected-text');
      addTextSelection(g,o);
    }else if(o.type==='image'){
      addImageResizeHandle(g,o);
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
function addImageResizeHandle(g,o){
  const pad=8;
  const c=document.createElementNS(NS,'circle');
  c.classList.add('image-resize-handle');
  c.dataset.action='resize';
  c.dataset.corner='top-right';
  c.setAttribute('cx',o.w/2+pad);
  c.setAttribute('cy',-o.h/2-pad);
  c.setAttribute('r','4.5');
  c.style.cursor='nesw-resize';
  g.appendChild(c);
}
function select(id){state.selected=id;refresh()}
function addImage(src,img){
  const ratio=img.naturalWidth/img.naturalHeight||1; let w=150,h=150/ratio; if(h>210){h=210;w=h*ratio}
  const o={id:uid(),type:'image',src,w,h,x:350,y:415,scale:1,rotate:0}; current().push(o);state.selected=o.id;refresh();
}
$('#fileInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>addImage(reader.result,img);img.src=reader.result};reader.readAsDataURL(f);e.target.value=''});

const productNames={tshirt:'футболки',hoodie:'худи',shopper:'шоппера'};
$('#productTabs').addEventListener('click',e=>{
  const b=e.target.closest('.product-tab');if(!b)return;
  finishInlineEdit(true);state.product=b.dataset.product;state.selected=null;
  document.querySelectorAll('.product-tab').forEach(x=>x.classList.toggle('active',x===b));
  $('#sideStepTitle').textContent='Сторона '+productNames[state.product];
  $('#colorStepTitle').textContent='Цвет '+productNames[state.product];
  refresh();
});
$('#sideTabs').addEventListener('click',e=>{if(!e.target.dataset.side)return;finishInlineEdit(true);state.side=e.target.dataset.side;state.selected=null;document.querySelectorAll('#sideTabs button').forEach(b=>b.classList.toggle('active',b===e.target));$('#sideLabel').textContent=state.side==='front'?'Передняя сторона':'Задняя сторона';refresh()});
$('#swatches').addEventListener('click',e=>{const b=e.target.closest('.swatch:not([disabled])');if(!b)return;state.shirt=b.dataset.color;document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('active',x===b));refresh()});
$('#scaleRange').oninput=e=>{const o=selectedObject();if(!o)return;o.scale=e.target.value/100;$('#scaleValue').textContent=e.target.value+'%';refresh()};
$('#rotateRange').oninput=e=>{const o=selectedObject();if(!o)return;o.rotate=+e.target.value;$('#rotateValue').textContent=e.target.value+'°';refresh()};
$('#rotateValue').addEventListener('click',()=>{
  const o=selectedObject();if(!o)return;
  const entered=prompt('Введите угол поворота от -180° до 180°:',Math.round(o.rotate||0));
  if(entered===null)return;
  const normalized=String(entered).replace(',','.').replace('°','').trim();
  let angle=Number(normalized);
  if(!Number.isFinite(angle))return;
  angle=Math.max(-180,Math.min(180,angle));
  o.rotate=angle;
  $('#rotateRange').value=angle;
  $('#rotateValue').textContent=(Number.isInteger(angle)?angle:angle.toFixed(1))+'°';
  refresh();
});
$('#fontSelect').addEventListener('change',e=>{const o=selectedObject();if(!o || o.type!=='text')return;o.fontFamily=e.target.value;refresh()});
function formatTracking(v){const n=Number(v)||0;return (n>0?'+':'')+n+' px'}
function setTextColor(color){
  const o=selectedObject();if(!o || o.type!=='text')return;
  if(color==='auto'){o.colorMode='auto';o.color=resolvedTextColor(o)}
  else{o.colorMode='fixed';o.color=color}
  refresh();
}
$('#textColorRow').addEventListener('click',e=>{const b=e.target.closest('.text-color-swatch');if(!b)return;setTextColor(b.dataset.textColor)});
$('#trackingRange').addEventListener('input',e=>{const o=selectedObject();if(!o || o.type!=='text')return;o.letterSpacing=Number(e.target.value);$('#trackingValue').textContent=formatTracking(o.letterSpacing);refresh()});
$('#centerBtn').onclick=()=>{const o=selectedObject();if(!o)return;o.x=350;o.y=420;refresh()};
$('#deleteBtn').onclick=()=>{finishInlineEdit(true);state.objects[state.side]=current().filter(x=>x.id!==state.selected);state.selected=null;refresh()};
$('#resetBtn').onclick=()=>{if(confirm('Сбросить все элементы макета?')){finishInlineEdit(true);state.objects={tshirt:{front:[],back:[]},hoodie:{front:[],back:[]},shopper:{front:[],back:[]}};state.selected=null;refresh()}};

const dlg=$('#textDialog');
$('#addTextBtn').onclick=()=>{dlg.showModal();setTimeout(()=>$('#textInput').focus(),50)};
$('#textOk').onclick=e=>{const text=$('#textInput').value.trim();if(!text){e.preventDefault();return}const o={id:uid(),type:'text',text,fontSize:34,fontFamily:'Montserrat',color:state.shirt==='#171717'?'#ffffff':'#111111',colorMode:'auto',letterSpacing:0,x:350,y:415,scale:1,rotate:0};current().push(o);state.selected=o.id;$('#textInput').value='';refresh()};

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
  if(e.target.dataset.action==='resize' && (o.type==='text' || o.type==='image')){
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
  input.style.color=resolvedTextColor(o);
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

function loadImageForExport(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Не удалось загрузить изображение для экспорта'));
    img.src=src;
  });
}
function canvasToBlob(canvas){
  return new Promise((resolve,reject)=>{
    if(canvas.toBlob){
      canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error('Не удалось создать PNG')),'image/png',1);
      return;
    }
    try{
      const data=canvas.toDataURL('image/png');
      const bin=atob(data.split(',')[1]);
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
      resolve(new Blob([bytes],{type:'image/png'}));
    }catch(err){reject(err)}
  });
}
function isMobileDevice(){
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints>1 && window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
}
async function saveCanvasPng(canvas,filename){
  // On phones/tablets use the system Share sheet.
  // iPhone/iPad: choose "Save Image" / "Сохранить изображение".
  // Android: the image can be sent to Photos/Gallery or another compatible app.
  if(isMobileDevice() && navigator.share){
    try{
      const blob=await canvasToBlob(canvas);
      const file=new File([blob],filename,{type:'image/png'});
      if(!navigator.canShare || navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:'Макет МОНОПРИНТ'});
        return;
      }
    }catch(err){
      // User cancelling the Share sheet is not an export failure.
      if(err && err.name==='AbortError') return;
      console.warn('Mobile share unavailable, using download fallback',err);
    }
  }

  // Desktop / unsupported mobile browser fallback.
  const data=canvas.toDataURL('image/png');
  const a=document.createElement('a');
  a.href=data;
  a.download=filename;
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
async function exportSvg(){
  finishInlineEdit(true);
  const btn=$('#downloadBtn'),oldText=btn.textContent;
  btn.disabled=true;btn.textContent='Подготовка...';
  try{
    // Build the PNG directly on canvas. This avoids the SVG -> Blob -> Image path
    // that produces transparent/empty images in a number of mobile browsers.
    const svg=$('#shirtSvg');
    const vb=svg.viewBox.baseVal;
    const W=1400,H=Math.round(W*(vb.height/vb.width));
    const sx=W/vb.width, sy=H/vb.height;
    const canvas=document.createElement('canvas');
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);

    const mockEl=$('#shirtMockup');
    const mockHref=mockEl.getAttribute('href')||mockEl.getAttributeNS('http://www.w3.org/1999/xlink','href');
    const shirtImg=await loadImageForExport(mockHref);
    const mx=+(mockEl.getAttribute('x')||0), my=+(mockEl.getAttribute('y')||0);
    const mw=+(mockEl.getAttribute('width')||vb.width), mh=+(mockEl.getAttribute('height')||vb.height);

    // Match the SVG preview: shoppers use "meet" (fit inside), garments use "slice".
    const preserve=mockEl.getAttribute('preserveAspectRatio')||'xMidYMid slice';
    const srcRatio=shirtImg.naturalWidth/shirtImg.naturalHeight;
    const boxRatio=mw/mh;
    if(preserve.includes('meet')){
      let dw=mw,dh=mh,dx=mx,dy=my;
      if(srcRatio>boxRatio){
        dh=mw/srcRatio;dy=my+(mh-dh)/2;
      }else{
        dw=mh*srcRatio;dx=mx+(mw-dw)/2;
      }
      ctx.drawImage(shirtImg,dx*sx,dy*sy,dw*sx,dh*sy);
    }else{
      // Center-crop to fill, matching xMidYMid slice.
      let sw=shirtImg.naturalWidth,sh=shirtImg.naturalHeight,sx0=0,sy0=0;
      if(srcRatio>boxRatio){
        sw=sh*boxRatio;sx0=(shirtImg.naturalWidth-sw)/2;
      }else{
        sh=sw/boxRatio;sy0=(shirtImg.naturalHeight-sh)/2;
      }
      ctx.drawImage(shirtImg,sx0,sy0,sw,sh,mx*sx,my*sy,mw*sx,mh*sy);
    }

    // Clip the exported artwork strictly to the 40×40 cm print area.
    // Objects may be moved/scaled freely in the editor, but pixels outside this area
    // must never appear on the downloaded mockup.
    ctx.save();
    ctx.beginPath();
    ctx.rect(printArea.x*sx,printArea.y*sy,printArea.w*sx,printArea.h*sy);
    ctx.clip();

    // Draw current design objects separately, so mobile browsers never need to rasterize
    // the complete SVG tree. Selection frames and editing controls are therefore omitted.
    for(const o of current()){
      ctx.save();
      ctx.translate(o.x*sx,o.y*sy);
      ctx.rotate((o.rotate||0)*Math.PI/180);
      ctx.scale((o.scale||1)*sx,(o.scale||1)*sy);
      if(o.type==='image'){
        const designImg=await loadImageForExport(o.src);
        ctx.drawImage(designImg,-o.w/2,-o.h/2,o.w,o.h);
      }else if(o.type==='text'){
        const family=o.fontFamily||'Montserrat, Arial, sans-serif';
        ctx.font=`${o.fontSize}px ${family}`;
        ctx.fillStyle=resolvedTextColor(o);
        ctx.textAlign='center';ctx.textBaseline='middle';
        const spacing=+(o.letterSpacing||0);
        if(!spacing){
          ctx.fillText(o.text||'',0,0);
        }else{
          const chars=Array.from(o.text||'');
          const widths=chars.map(ch=>ctx.measureText(ch).width);
          const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*spacing;
          let x=-total/2;
          chars.forEach((ch,i)=>{ctx.textAlign='left';ctx.fillText(ch,x,0);x+=widths[i]+spacing});
        }
      }
      ctx.restore();
    }
    ctx.restore(); // end print-area clipping

    // Real hoodie drawstring PNG is drawn above the user's design.
    if(state.product==='hoodie' && state.side==='front'){
      const stringsImg=await loadImageForExport(state.shirt==='#171717'?'assets/hoodie-strings-black.png':'assets/hoodie-strings-white.png');
      ctx.drawImage(stringsImg,270*sx,215*sy,160*sx,225*sy);
    }

    const filename=`monoprint-${state.product}-mockup-${state.shirt==='#171717'?'black':'white'}-${state.side}.png`;
    await saveCanvasPng(canvas,filename);
  }catch(err){
    console.error(err);
    alert('Не удалось сохранить мокап: '+(err && err.message ? err.message : err));
  }finally{
    btn.disabled=false;btn.textContent=oldText;
  }
}

const editPanelHome={
  parent:editPanel.parentNode,
  next:editPanel.nextSibling
};
function placeEditPanelForViewport(){
  const slot=$('#mobileEditPanelSlot');
  if(!slot)return;
  const mobile=window.matchMedia('(max-width: 760px)').matches;
  if(mobile){
    if(editPanel.parentNode!==slot) slot.appendChild(editPanel);
  }else if(editPanel.parentNode!==editPanelHome.parent){
    editPanelHome.parent.insertBefore(editPanel,editPanelHome.next);
  }
}
window.addEventListener('resize',placeEditPanelForViewport);
placeEditPanelForViewport();

$('#downloadBtn').onclick=exportSvg;
refresh();
