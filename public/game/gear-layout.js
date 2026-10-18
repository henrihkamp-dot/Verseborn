// Desktop equipment is a three-column workspace; native controls stay attached.
(()=>{
 const original=renderMenu;
 renderMenu=function(...args){const result=original(...args);if(menuTab!=='gear'||innerWidth<=700)return result;
 const workspace=el.menuBody.querySelector('.equip-workspace'),body=workspace?.querySelector('.equip-body');if(!body)return result;
 const slots=document.createElement('section');slots.className='equip-slot-list';slots.setAttribute('aria-label','Equipped slots');
 const title=document.createElement('h3');title.textContent='Equipped';slots.appendChild(title);
 body.querySelectorAll('.equip-body-slot').forEach(n=>slots.appendChild(n));body.after(slots);workspace.classList.add('equip-desktop-workspace');return result;};
})();
