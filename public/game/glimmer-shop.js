// Glimmer's ledger keeps comparisons in view rather than covering the wares.
(() => {
  const oldRender=renderVendor;
  let selectedKey='';
  renderVendor=function(){
    oldRender();
    if(activeVendor!=='workshop')return;
    if(gearHoverTooltip)gearHoverTooltip.hidden=true;
    const list=el.menuBody.querySelector('.shop-scroll-region');
    if(!list)return;
    const workspace=document.createElement('div');workspace.className='glimmer-shop-workspace';
    list.before(workspace);workspace.append(list);
    const overview=document.createElement('aside');overview.className='glimmer-shop-overview';overview.setAttribute('aria-label','Item overview');workspace.append(overview);
    const rows=[...list.querySelectorAll('.shop-row')];
    function key(row){return row.querySelector('strong')?.textContent.trim()||'';}
    function inspect(row){
      if(row.classList.contains('is-inspected'))return;
      rows.forEach(item=>item.classList.toggle('is-inspected',item===row));
      selectedKey=key(row);
      const context=gearHoverRegistry[Number(row.dataset.gearHover)];
      const icon=row.querySelector('.shop-icon')?.outerHTML||'';
      const details=context?gearHoverPopupHtml(context).replace(/Hovered item/g,'Selected item').replace(/Hovered/g,'Selected'):row.querySelector(':scope > div')?.innerHTML||'';
      overview.innerHTML=`<header><small>GLIMMER’S WORKBENCH</small><h3>Item overview</h3></header><div class="glimmer-overview-icon">${icon}</div>${details}`;
      overview.scrollTop=0;
    }
    rows.forEach(row=>{
      row.tabIndex=0;row.setAttribute('aria-label','Inspect '+key(row));
      row.addEventListener('pointerenter',()=>inspect(row));
      row.addEventListener('focusin',()=>inspect(row));
      row.addEventListener('click',()=>inspect(row));
      row.addEventListener('keydown',event=>{if(event.target===row&&['Enter',' '].includes(event.key)){event.preventDefault();inspect(row);}});
    });
    const first=rows.find(row=>key(row)===selectedKey)||rows[0];
    if(first)inspect(first);else overview.innerHTML='<header><h3>Item overview</h3></header><p>No items available in this section.</p>';
  };
})();
