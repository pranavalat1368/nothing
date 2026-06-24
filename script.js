// ── NAV SCROLL ──
window.addEventListener('scroll',()=>{
  const navbar = document.getElementById('navbar');
  if(navbar) navbar.classList.toggle('solid',window.scrollY>60);
});

const apiBase=window.location.origin==='null'?'http://localhost:3000':window.location.origin;

// ── MENU LOADING, RENDERING & FILTERING ──
let menuItems = [];
let activeCategory = 'all';
let searchQuery = '';

async function initDynamicMenu() {
  const menuGrid = document.getElementById('menuGrid');
  if (!menuGrid) return; // Only run on pages that have the menu grid

  const menuSearch = document.getElementById('menuSearch');

  try {
    const response = await fetch(`${apiBase}/api/menu`);
    if (!response.ok) throw new Error('Failed to load menu data');
    const data = await response.json();
    menuItems = data.items || [];
    renderMenuItems();

    if (menuSearch) {
      menuSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderMenuItems();
      });
    }

    // Set up tabs dynamically
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        activeCategory = btn.dataset.cat;
        renderMenuItems();
      });
    });
  } catch (error) {
    console.error('Menu load error:', error);
    menuGrid.innerHTML = `<p class="empty-state" style="grid-column: span 3; text-align: center; color: var(--muted); padding: 3rem 0; font-style: italic;">Unable to load the menu. Please check your connection.</p>`;
  }
}

function renderMenuItems() {
  const menuGrid = document.getElementById('menuGrid');
  if (!menuGrid) return;

  // Filter items
  const filtered = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery) ||
      item.description.toLowerCase().includes(searchQuery) ||
      (item.tag && item.tag.toLowerCase().includes(searchQuery)) ||
      (item.dietary && item.dietary.some(d => d.toLowerCase().includes(searchQuery)));
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    menuGrid.innerHTML = `<p class="empty-state" style="grid-column: span 3; text-align: center; color: var(--muted); padding: 4rem 0; font-style: italic;">No dishes match your criteria.</p>`;
    return;
  }

  menuGrid.innerHTML = filtered.map(item => {
    const tagsHtml = [];
    if (item.tag) {
      tagsHtml.push(`<span class="mtag">${item.tag}</span>`);
    }
    if (item.dietary && item.dietary.length) {
      tagsHtml.push(`<span class="mtag dietary-tag" style="border-color:rgba(46, 204, 113, 0.35); color:#2ecc71;">${item.dietary.join(', ')}</span>`);
    }
    
    return `
      <div class="mcard" data-cat="${item.category}">
        <div class="mcard-top">
          <h4>${item.name}</h4>
          <span class="price">${item.price}</span>
        </div>
        <p>${item.description}</p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.3rem;">
          ${tagsHtml.join('')}
        </div>
      </div>
    `;
  }).join('');

  // Re-attach 3D Tilt hover effect
  attachTiltEffect();
}

function attachTiltEffect() {
  document.querySelectorAll('.mcard').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-5px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) rotateY(0) rotateX(0)';
    });
  });
}

// Initialize Menu
document.addEventListener('DOMContentLoaded', initDynamicMenu);

// ── MOBILE NAV ──
const menuToggle=document.getElementById('menuToggle');
if(menuToggle){
  menuToggle.addEventListener('click',()=>{
    const navLinks = document.getElementById('navLinks');
    if(navLinks) navLinks.classList.toggle('open');
  });
}
document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click',()=>{
    const navLinks = document.getElementById('navLinks');
    if(navLinks) navLinks.classList.remove('open');
  });
});

function ensureReservationPopup(){
  let popup=document.getElementById('reservationPopup');
  if(popup) return popup;

  popup=document.createElement('div');
  popup.className='popup-backdrop';
  popup.id='reservationPopup';
  popup.innerHTML=`
    <div class="popup-card" role="dialog" aria-modal="true" aria-labelledby="reservationPopupTitle">
      <h3 id="reservationPopupTitle">Reservation Request</h3>
      <p id="reservationPopupMessage"></p>
      <button type="button" class="popup-close" id="reservationPopupClose">Close</button>
    </div>
  `;
  document.body.appendChild(popup);

  popup.querySelector('#reservationPopupClose').addEventListener('click',()=>{
    popup.classList.remove('show');
  });

  popup.addEventListener('click',event=>{
    if(event.target===popup){
      popup.classList.remove('show');
    }
  });

  return popup;
}

function openReservationPopup(title,message){
  const popup=ensureReservationPopup();
  popup.querySelector('#reservationPopupTitle').textContent=title;
  popup.querySelector('#reservationPopupMessage').textContent=message;
  popup.classList.add('show');
}

// ══════════════════════════════════════
// THREE.JS — BACKGROUND PARTICLE FIELD
// ══════════════════════════════════════
(function(){
  const canvas=document.getElementById('bg-canvas');
  if (!canvas) return; // Prevent errors on pages without canvas
  
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(window.innerWidth,window.innerHeight);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,200);
  camera.position.z=30;

  const count=800;
  const geo=new THREE.BufferGeometry();
  const pos=new Float32Array(count*3);
  const sizes=new Float32Array(count);
  for(let i=0;i<count;i++){
    pos[i*3]=(Math.random()-0.5)*120;
    pos[i*3+1]=(Math.random()-0.5)*120;
    pos[i*3+2]=(Math.random()-0.5)*60;
    sizes[i]=Math.random()*2+0.5;
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('size',new THREE.BufferAttribute(sizes,1));

  const mat=new THREE.PointsMaterial({
    color:0xC9A84C,size:0.18,transparent:true,opacity:0.35,
    blending:THREE.AdditiveBlending,depthWrite:false,
    sizeAttenuation:true
  });
  const particles=new THREE.Points(geo,mat);
  scene.add(particles);

  const ringGeo=new THREE.TorusGeometry(18,0.15,8,120);
  const ringMat=new THREE.MeshBasicMaterial({color:0x8B0000,transparent:true,opacity:0.18,wireframe:true});
  const ring=new THREE.Mesh(ringGeo,ringMat);
  ring.rotation.x=Math.PI/3;
  scene.add(ring);

  const ring2Geo=new THREE.TorusGeometry(12,0.08,6,80);
  const ring2=new THREE.Mesh(ring2Geo,new THREE.MeshBasicMaterial({color:0xC9A84C,transparent:true,opacity:0.1,wireframe:true}));
  ring2.rotation.x=Math.PI/4;ring2.rotation.y=Math.PI/6;
  scene.add(ring2);

  let scrollY=0,targetY=0;
  window.addEventListener('scroll',()=>{scrollY=window.scrollY;});

  let mx=0,my=0;
  window.addEventListener('mousemove',e=>{mx=(e.clientX/window.innerWidth-0.5)*2;my=(e.clientY/window.innerHeight-0.5)*2;});

  window.addEventListener('resize',()=>{
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
  });

  let t=0;
  function animate(){
    requestAnimationFrame(animate);
    t+=0.008;
    targetY+=(scrollY*0.012-targetY)*0.05;
    particles.rotation.y=t*0.05+mx*0.04;
    particles.rotation.x=targetY*0.002+my*0.03;
    ring.rotation.z=t*0.03;ring.rotation.y=t*0.02;
    ring2.rotation.z=-t*0.025;ring2.rotation.x=Math.PI/4+t*0.01;
    renderer.render(scene,camera);
  }
  animate();
})();

// ── LOADER ──
window.addEventListener('load',()=>{
  const loader = document.getElementById('loader');
  if(loader) {
    setTimeout(()=>{
      loader.classList.add('hidden');
    },2700);
  }
});

// ── AUDIO TOGGLE ──
let audioPlaying=false;
let audioCtx,oscillator,gainNode,gain2;
function toggleAudio(){
  const icon=document.getElementById('audioIcon');
  if(!icon) return;

  if(!audioPlaying){
    if(!audioCtx){
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      oscillator=audioCtx.createOscillator();
      const osc2=audioCtx.createOscillator();
      gainNode=audioCtx.createGain();
      gain2=audioCtx.createGain();
      oscillator.type='sine';oscillator.frequency.value=110;
      osc2.type='sine';osc2.frequency.value=165;
      gainNode.gain.value=0;gain2.gain.value=0;
      oscillator.connect(gainNode).connect(audioCtx.destination);
      osc2.connect(gain2).connect(audioCtx.destination);
      oscillator.start();osc2.start();
      gainNode.gain.linearRampToValueAtTime(0.03,audioCtx.currentTime+1);
      gain2.gain.linearRampToValueAtTime(0.02,audioCtx.currentTime+1);
    }else if(audioCtx.state==='suspended'){
      audioCtx.resume();
    }
    icon.textContent='🎵';
    audioPlaying=true;
  }else{
    if(gainNode) gainNode.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.5);
    if(gain2) gain2.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.5);
    icon.textContent='🔇';
    audioPlaying=false;
  }
}

const audioToggle=document.getElementById('audioToggle');
if(audioToggle){
  audioToggle.addEventListener('click',toggleAudio);
}

const reservationForm=document.getElementById('reservationForm');
if(reservationForm){
  reservationForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const submitButton=reservationForm.querySelector('button[type="submit"]');
    const originalLabel=submitButton.textContent;
    const formData=new FormData(reservationForm);
    const payload=Object.fromEntries(formData.entries());

    submitButton.disabled=true;
    submitButton.textContent='Sending...';

    try{
      const response=await fetch(`${apiBase}/api/reservations`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const result=await response.json();

      if(!response.ok){
        throw new Error(result.message||'Reservation request failed.');
      }

      reservationForm.reset();
      openReservationPopup('Reservation received',`${result.message} Your confirmation reference is ${result.reservation.id}.`);
    }catch(error){
      openReservationPopup('Reservation unavailable',error.message||'Please try again.');
    }finally{
      submitButton.disabled=false;
      submitButton.textContent=originalLabel;
    }
  });
}

// ── EASTER EGG: KONAMI CODE FOR SPECIAL MENU ──
let konamiCode=[];
const konamiSequence=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
document.addEventListener('keydown',e=>{
  konamiCode.push(e.key);
  konamiCode=konamiCode.slice(-10);
  if(konamiCode.join(',')===konamiSequence.join(',')){
    document.body.style.filter='hue-rotate(180deg)';
    setTimeout(()=>{document.body.style.filter='';},3000);
  }
});
