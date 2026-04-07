import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GeoJsonGeometryModule from 'three-geojson-geometry';
const GeoJsonGeometry = GeoJsonGeometryModule.default || GeoJsonGeometryModule;

// ============ SCENE SETUP ============
const canvas = document.getElementById('globe');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ============ CONTROLS ============
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.4;
controls.zoomSpeed = 0.6;
controls.minDistance = 1.5;
controls.maxDistance = 6;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;
controls.enablePan = false;  // prevents accidental panning
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE  // right-click also rotates instead of panning
};

// ============ GLOBE — black sphere ============
const globeRadius = 1;
const globeGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
const globeMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
const globeMesh = new THREE.Mesh(globeGeo, globeMat);
scene.add(globeMesh);

// Atmosphere glow (back-face rendered sphere)
const atmosGeo = new THREE.SphereGeometry(globeRadius * 1.12, 64, 64);
const atmosMat = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      gl_FragColor = vec4(0.8, 0.1, 0.1, 1.0) * intensity;
    }
  `,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
});
scene.add(new THREE.Mesh(atmosGeo, atmosMat));

// ============ COUNTRY OUTLINES FROM GEOJSON ============
const GEOJSON_URL = 'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson';

async function loadCountries() {
  const res = await fetch(GEOJSON_URL);
  const data = await res.json();
  const lineGroup = new THREE.Group();

  data.features.forEach(feature => {
    if (feature.properties.ISO_A2 === 'AQ') return;
    try {
      const geo = new GeoJsonGeometry(feature.geometry, globeRadius * 1.001, 2);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
      });
      const line = new THREE.LineSegments(geo, mat);
      lineGroup.add(line);
    } catch (e) { /* skip invalid geometries */ }
  });

  scene.add(lineGroup);
}
loadCountries();

// ============ CONFLICT ZONES ============
const zones = [
  {
    id: 'ukraine', name: 'Ukraine', lat: 48.4, lng: 31.2, threat: 'CRITICAL',
    severity: 98, intelImg: '/ukraine-intel.png',
    summary: 'Day 1504. Russia claims full control of Luhansk. Ukraine strikes Russian warship & oil rig in Black Sea. 1.3M+ Russian casualties. Spring offensive underway with 10,000+ drones deployed daily. Iran war deflects global attention.',
    players: ['Russia', 'Ukraine', 'NATO', 'USA'],
    news: [
      { img: '', t: 'Apr 6', text: 'Ukraine strikes Russian warship and oil rig in Black Sea port of Novorossiysk',
        url: 'https://www.aljazeera.com/news/2026/4/6/ukraine-strikes-russian-black-sea-energy-hub-novorossiysk' },
      { img: '', t: 'Apr 5', text: 'Ukraine confirms strikes on Russian oil infrastructure, defying calls to ease attacks',
        url: 'https://kyivindependent.com/ukraine-war-latest-ukraine-confirms-strikes-on-russian-oil-infrastructure-defying-calls-to-ease-attacks-amid-soaring-fuel-prices/' },
      { img: '', t: 'Apr 1', text: 'Russia claims full control of Luhansk region as spring offensive gains momentum',
        url: 'https://www.aljazeera.com/news/2026/4/1/russia-claims-to-take-full-control-of-ukraines-luhansk-region' },
    ],
  },
  {
    id: 'gaza', name: 'Gaza', lat: 31.4, lng: 34.4, threat: 'CRITICAL',
    severity: 96, intelImg: '/israel-intel.png',
    summary: '72,000+ killed, 172,000 wounded since Oct 2023. 716 killed since ceasefire began. Israel continues strikes while waging Iran war. Aid entry dropped 80% since Iran conflict started. 150+ settler attacks in West Bank. $70B reconstruction needed.',
    players: ['Israel', 'Palestine', 'Iran', 'USA'],
    news: [
      { img: '', t: 'Apr 5', text: 'Israel continues deadly attacks on Gaza while simultaneously striking Iran and Lebanon',
        url: 'https://www.aljazeera.com/video/newsfeed/2026/4/5/israel-continues-deadly-attacks-on-gaza-while-striking-iran-lebanon' },
      { img: '', t: 'Apr 6', text: 'Israel expands Lebanon invasion, applies "Gaza model" of destruction in south',
        url: 'https://www.democracynow.org/2026/4/6/lebanon_evacuation_orders' },
      { img: '', t: 'Apr 1', text: 'Aid trucks into Gaza dropped 80% since start of Iran war — prices of staples surge',
        url: 'https://www.aljazeera.com/news/2026/3/26/details-revealed-of-board-of-peace-plan-for-gaza-disarmament' },
    ],
  },
  {
    id: 'iran', name: 'Iran–Hormuz', lat: 27.0, lng: 56.5, threat: 'CRITICAL',
    severity: 99, intelImg: '/iran-hormuz-intel.png',
    summary: 'Day 38 of US-Israeli war. Trump sets Tuesday midnight deadline — threatens to destroy every bridge and power plant. Iran rejects 45-day ceasefire. Israel strikes South Pars petrochemical complex. IRGC intel chief assassinated. 220 children killed. Strait of Hormuz closed.',
    players: ['Iran', 'USA', 'Israel', 'Saudi Arabia'],
    news: [
      { img: '', t: 'Apr 7', text: 'Day 38: Trump deadline tonight — threatens to destroy Iran\'s bridges and power plants',
        url: 'https://www.cnn.com/2026/04/07/world/live-news/iran-war-trump-us-israel' },
      { img: '', t: 'Apr 6', text: 'Iran rejects 45-day ceasefire, pushes for permanent end to war',
        url: 'https://www.npr.org/2026/04/06/nx-s1-5775383/iran-war-updates' },
      { img: '', t: 'Apr 6', text: 'Trump warns Iran could be "taken out in one night" as deadline looms',
        url: 'https://www.cnn.com/2026/04/05/middleeast/iran-us-israel-war-what-we-know-week-6-intl-hnk' },
    ],
  },
  {
    id: 'taiwan', name: 'Taiwan', lat: 23.7, lng: 121.0, threat: 'HIGH',
    severity: 78, intelImg: '/taiwan-intel.png',
    summary: 'Justice Mission 2025 drills (Dec 29-30) were largest PLA exercises since 2022. 130 aircraft, 14 warships, 27 missiles fired near contiguous zone. China practiced full maritime blockade of ports. Coast guard preparing for blockade scenarios. US strategic ambiguity under pressure.',
    players: ['China', 'Taiwan', 'USA', 'Japan'],
    news: [
      { img: '', t: 'Mar 16', text: 'Taiwan coast guard prepares to counter Chinese blockade rehearsals',
        url: 'https://www.japantimes.co.jp/news/2026/03/16/asia-pacific/politics/taiwan-coast-guard-china-blockade/' },
      { img: '', t: 'Jan 3', text: 'Justice Mission 2025 crossed new line — PLA vessels enter Taiwan contiguous zone',
        url: 'https://thediplomat.com/2026/01/chinas-taiwan-drills-are-crossing-a-new-line/' },
      { img: '', t: 'Jan 1', text: 'US State Dept calls China military exercises near Taiwan "unnecessary" escalation',
        url: 'https://www.cbsnews.com/news/china-military-activities-near-taiwan-unnecessarily-raise-tensions-us-says/' },
    ],
  },
  {
    id: 'korea', name: 'N. Korea', lat: 39.9, lng: 127.0, threat: 'HIGH',
    severity: 72, intelImg: '/northkorea-intel.png',
    summary: 'Hwasong-20 "most powerful nuclear strategic weapon" unveiled Oct 2025. Hwasong-19 tested Oct 2024 — world\'s largest road-mobile ICBM, 86-min flight, 7,687km altitude. SSBN construction revealed. 8,000 troops deployed to Russia. Kim pursuing "rapid expansion of nuclearization."',
    players: ['North Korea', 'South Korea', 'USA', 'China'],
    news: [
      { img: '', t: 'Jan 15', text: 'New Hwasong-20 ICBM revealed — fewer launches but more advanced weapons in 2025',
        url: 'https://www.38north.org/2026/01/new-missiles-but-fewer-launches-a-missile-sub-reveal-and-a-nuclear-armed-air-force/' },
      { img: '', t: 'Jan 4', text: 'North Korea fires multiple ballistic missiles toward Sea of Japan',
        url: 'https://en.wikipedia.org/wiki/List_of_North_Korean_missile_tests' },
      { img: '', t: 'Oct 31', text: 'Hwasong-19 ICBM tested — largest road-mobile ICBM in the world, 86-min flight',
        url: 'https://www.cbsnews.com/news/north-korea-icbm-test-mainland-us-more-agile/' },
    ],
  },
  {
    id: 'yemen', name: 'Yemen', lat: 15.4, lng: 44.2, threat: 'HIGH',
    severity: 82, intelImg: '/yemen-intel.png',
    summary: 'Houthis officially entered Iran war Mar 28. Joint attack with Iran and Hezbollah on Israel. Threatening to close Bab al-Mandeb strait — would cut 10% of global trade. If both Hormuz and Mandeb close, Gulf-to-Europe energy route breaks entirely.',
    players: ['Houthis', 'Saudi Arabia', 'Iran', 'USA'],
    news: [
      { img: '', t: 'Apr 6', text: 'Houthis, Iran and Hezbollah claim joint long-range attack targeting Israel',
        url: 'https://www.aljazeera.com/news/2026/4/5/iran-war-what-is-happening-on-day-37-of-us-israeli-attacks' },
      { img: '', t: 'Apr 5', text: 'Iran adviser warns Bab al-Mandeb strait could become next target',
        url: 'https://www.npr.org/2026/04/06/nx-s1-5775383/iran-war-updates' },
      { img: '', t: 'Mar 28', text: 'Houthis launch ballistic missiles at Israel — first strikes since Iran war began',
        url: 'https://www.aljazeera.com/news/2026/3/28/yemens-houthis-claim-responsibility-for-a-missile-attack-on-israel-2' },
    ],
  },
  {
    id: 'sudan', name: 'Sudan', lat: 15.6, lng: 32.5, threat: 'HIGH',
    severity: 74, intelImg: '/sudan-intel.png',
    summary: 'Day 1,000+ of civil war. 150,000+ killed, 12M displaced — world\'s largest displacement crisis. Famine confirmed in El Fasher, Kadugli, Um Baru, Kernoi. 33.7M need humanitarian aid. RSF accused of genocide in Darfur after El Fasher fell Oct 2025. Daily drone strikes in Kordofan.',
    players: ['SAF', 'RSF', 'UAE', 'Egypt'],
    news: [
      { img: '', t: 'Mar 13', text: 'The specter of genocide returns to Darfur as El Fasher atrocities mount',
        url: 'https://www.cfr.org/global-conflict-tracker/conflict/power-struggle-sudan' },
      { img: '', t: 'Feb 19', text: 'UN warns "no corner of Sudan is safe" — famine spreading, atrocities escalating',
        url: 'https://news.un.org/en/story/2026/02/1167003' },
      { img: '', t: 'Feb 5', text: 'Famine thresholds surpassed in Darfur — 53% of children acutely malnourished',
        url: 'https://www.aljazeera.com/news/2026/2/5/famine-conditions-spread-to-more-towns-in-sudans-darfur-experts-warn' },
    ],
  },
];

// ============ HELPERS ============
function latLngToVec3(lat, lng, radius) {
  try {
    const pointGeo = new GeoJsonGeometry({
      type: 'Point',
      coordinates: [lng, lat]
    }, radius);
    const pos = pointGeo.getAttribute('position');
    return new THREE.Vector3(pos.getX(0), pos.getY(0), pos.getZ(0));
  } catch (e) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -(radius) * Math.sin(phi) * Math.cos(theta),
      (radius) * Math.cos(phi),
      (radius) * Math.sin(phi) * Math.sin(theta)
    );
  }
}

// ============ HOTSPOTS + HEATMAP RINGS ============
const hotspotGroup = new THREE.Group();
let hotspotMeshes = [];
const heatRings = [];

function buildHotspots() {
  while (hotspotGroup.children.length) {
    hotspotGroup.remove(hotspotGroup.children[0]);
  }
  hotspotMeshes = [];
  heatRings.length = 0;

  zones.forEach(z => {
    const pos = latLngToVec3(z.lat, z.lng, globeRadius * 1.005);
    const isCrit = z.threat === 'CRITICAL';

    // ---- Invisible click target ----
    const clickGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const clickMat = new THREE.MeshBasicMaterial({ visible: false });
    const clickTarget = new THREE.Mesh(clickGeo, clickMat);
    clickTarget.position.copy(pos);
    clickTarget.userData = { zoneId: z.id };
    hotspotGroup.add(clickTarget);
    hotspotMeshes.push(clickTarget);

    // ---- Small white center dot ----
    const markerPos = latLngToVec3(z.lat, z.lng, globeRadius * 1.003);
    const dotGeo = new THREE.SphereGeometry(0.005, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(markerPos);
    hotspotGroup.add(dot);

    // ---- Soft glow disc ----
    const glowGeo = new THREE.CircleGeometry(isCrit ? 0.016 : 0.011, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: isCrit ? 0xff1a2e : 0xff6600,
      transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(markerPos);
    glow.lookAt(0, 0, 0);
    hotspotGroup.add(glow);

    // ---- HEATMAP: Pulsing concentric rings ----
    const ringCount = isCrit ? 4 : 3;
    const baseColor = isCrit ? new THREE.Color(0xff1a2e) : new THREE.Color(0xff6600);
    for (let i = 1; i <= ringCount; i++) {
      const innerR = 0.03 * i + 0.01;
      const outerR = innerR + 0.006;
      const hGeo = new THREE.RingGeometry(innerR, outerR, 48);
      const hMat = new THREE.MeshBasicMaterial({
        color: baseColor, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
      });
      const hRing = new THREE.Mesh(hGeo, hMat);
      hRing.position.copy(pos);
      hRing.lookAt(0, 0, 0);
      hRing.userData = { ringIndex: i, ringCount, isCrit, phaseOffset: i * 0.7 };
      hotspotGroup.add(hRing);
      heatRings.push(hRing);
    }

    // ---- Frosted glass pill label ----
    const labelCanvas = document.createElement('canvas');
    const dpr = 2;
    const cw = 320 * dpr;
    const ch = 64 * dpr;
    labelCanvas.width = cw;
    labelCanvas.height = ch;
    const ctx = labelCanvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.font = '600 11px -apple-system, "Helvetica Neue", sans-serif';
    const tw = ctx.measureText(z.name.toUpperCase()).width;
    const dotSize = 5;
    const padX = 14;
    const padY = 7;
    const tagW = tw + padX * 2 + dotSize + 8;
    const tagH = 14 + padY * 2;
    const tagX = (320 - tagW) / 2;
    const tagY = (64 - tagH) / 2;
    const cr = tagH / 2;

    // Pill background
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tagX + cr, tagY);
    ctx.lineTo(tagX + tagW - cr, tagY);
    ctx.arcTo(tagX + tagW, tagY, tagX + tagW, tagY + cr, cr);
    ctx.lineTo(tagX + tagW, tagY + tagH - cr);
    ctx.arcTo(tagX + tagW, tagY + tagH, tagX + tagW - cr, tagY + tagH, cr);
    ctx.lineTo(tagX + cr, tagY + tagH);
    ctx.arcTo(tagX, tagY + tagH, tagX, tagY + tagH - cr, cr);
    ctx.lineTo(tagX, tagY + cr);
    ctx.arcTo(tagX, tagY, tagX + cr, tagY, cr);
    ctx.closePath();
    ctx.fillStyle = 'rgba(8, 8, 12, 0.65)';
    ctx.fill();
    const grad = ctx.createLinearGradient(tagX, tagY, tagX, tagY + tagH);
    grad.addColorStop(0, 'rgba(255,255,255,0.06)');
    grad.addColorStop(1, 'rgba(255,255,255,0.01)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = isCrit ? 'rgba(230,25,44,0.25)' : 'rgba(255,136,0,0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();

    // Status dot
    const dotX = tagX + padX + dotSize / 2;
    const dotY = 32;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotSize / 2 + 2, 0, Math.PI * 2);
    ctx.fillStyle = isCrit ? 'rgba(255,34,64,0.2)' : 'rgba(255,136,0,0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = isCrit ? '#ff2240' : '#ff8800';
    ctx.fill();

    // Label text
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 11px -apple-system, "Helvetica Neue", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(z.name.toUpperCase(), dotX + dotSize / 2 + 6, 32);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.minFilter = THREE.LinearFilter;
    const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthTest: false });
    const label = new THREE.Sprite(labelMat);
    const labelPos = latLngToVec3(z.lat, z.lng, globeRadius * 1.05);
    label.position.copy(labelPos);
    label.scale.set(0.22, 0.038, 1);
    label.userData = { zoneId: z.id };
    hotspotGroup.add(label);
    hotspotMeshes.push(label);
  });
}

buildHotspots();
scene.add(hotspotGroup);

function rebuildHotspots() {
  buildHotspots();
  buildIntelFeed();
  buildLeaderboard();
}

// ============ RAYCASTING FOR CLICKS ============
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let activeZone = null;

// Drag detection — prevent click from firing after a drag
let pointerDownPos = { x: 0, y: 0 };
let isDragging = false;

canvas.addEventListener('pointerdown', (e) => {
  pointerDownPos.x = e.clientX;
  pointerDownPos.y = e.clientY;
  isDragging = false;
});

canvas.addEventListener('pointermove', (e) => {
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging = true;

  if (currentTab !== 'globe') return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(hotspotMeshes);
  canvas.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
});

canvas.addEventListener('click', (e) => {
  if (currentTab !== 'globe') return;
  if (isDragging) return; // ignore clicks after dragging

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(hotspotMeshes);
  if (hits.length > 0) {
    const zoneId = hits[0].object.userData.zoneId;
    const zone = zones.find(z => z.id === zoneId);
    if (zone) openPopup(zone);
  } else {
    closePopup();
  }
});

// ============ POPUP WITH ZOOM ============
let zoomAnimId = null;

function openPopup(zone) {
  activeZone = zone;
  controls.autoRotate = false;

  // Smooth zoom to zone
  const camPos = latLngToVec3(zone.lat, zone.lng, 2.2); // closer zoom
  const target = latLngToVec3(zone.lat, zone.lng, 0);
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = Date.now();
  const duration = 900;

  if (zoomAnimId) cancelAnimationFrame(zoomAnimId);

  function animateCamera() {
    const t = Math.min((Date.now() - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(startPos, camPos, ease);
    controls.target.lerpVectors(startTarget, target, ease);
    if (t < 1) zoomAnimId = requestAnimationFrame(animateCamera);
  }
  animateCamera();

  const tc = zone.threat === 'CRITICAL' ? 'critical' : 'high';
  const popup = document.getElementById('popup');
  popup.innerHTML = `
    <div class="popup-inner">
      <button class="popup-close" onclick="document.dispatchEvent(new Event('closePopup'))">✕</button>
      <span class="popup-badge ${tc}">${zone.threat}</span>
      <h2 class="popup-name">${zone.name}</h2>
      <p class="popup-summary">${zone.summary}</p>
      <div class="popup-tags">${zone.players.map(p => `<span class="popup-tag">${p}</span>`).join('')}</div>
      <div class="popup-divider"></div>
      <div class="popup-news-title">Latest Reports</div>
      ${zone.news.map(n => `
        <a href="${n.url}" target="_blank" class="popup-article">
          <div class="popup-article-body">
            <span class="popup-article-time">${n.t}</span>
            <span class="popup-article-text">${n.text}</span>
          </div>
          <span class="popup-article-arrow">→</span>
        </a>
      `).join('')}
    </div>
  `;
  popup.classList.add('open');
}

function closePopup() {
  const popup = document.getElementById('popup');
  popup.classList.remove('open');
  activeZone = null;
  controls.autoRotate = true;

  // Smooth zoom back out
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endTarget = new THREE.Vector3(0, 0, 0);
  // Calculate a natural pullback position
  const dir = startPos.clone().normalize();
  const endPos = dir.multiplyScalar(3);
  const startTime = Date.now();
  const duration = 800;

  if (zoomAnimId) cancelAnimationFrame(zoomAnimId);

  function animateOut() {
    const t = Math.min((Date.now() - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    if (t < 1) zoomAnimId = requestAnimationFrame(animateOut);
  }
  animateOut();
}

document.addEventListener('closePopup', closePopup);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePopup(); });

// ============ STARFIELD ============
function createStarfield() {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 3000; i++) {
    const r = 50 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true });
  scene.add(new THREE.Points(geo, mat));
}
createStarfield();

// ============ TAB SYSTEM ============
let currentTab = 'globe';

const tabBtns = document.querySelectorAll('.tab-btn');
const panels = {
  intel: document.getElementById('panel-intel'),
  leaderboard: document.getElementById('panel-leaderboard'),
};

function switchTab(tabId) {
  closePopup();
  currentTab = tabId;

  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  Object.entries(panels).forEach(([key, panel]) => {
    if (panel) panel.classList.toggle('active', key === tabId);
  });

  // Globe visibility & doomsday widget
  const doomWidget = document.getElementById('doomWidget');
  if (tabId === 'globe') {
    canvas.style.opacity = '1';
    controls.autoRotate = true;
    if (doomWidget) doomWidget.style.display = '';
  } else {
    canvas.style.opacity = '0.15';
    controls.autoRotate = false;
    if (doomWidget) doomWidget.style.display = 'none';
    // Close doomsday panel when switching tabs
    const doomPanel = document.getElementById('doomPanel');
    if (doomPanel) doomPanel.classList.remove('open');
  }
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ============ POPULATE INTEL FEED — INFINITE MARQUEE ============
function buildIntelFeed() {
  const feed = document.getElementById('intel-feed');
  const sorted = [...zones].sort((a, b) => b.severity - a.severity);

  feed.innerHTML = sorted.map((z, zi) => {
    const tc = z.threat === 'CRITICAL' ? 'critical' : 'high';
    const zoneImg = z.intelImg || '';

    // Build card HTML for one set
    const cardSetHtml = z.news.map((n, ni) => {
      let source = '';
      try { source = new URL(n.url).hostname.replace('www.', ''); } catch(e) {}
      return `
        <a href="${n.url}" target="_blank" class="intel-card">
          <div class="intel-card-img-wrap">
            ${zoneImg ? `<img class="intel-card-img" src="${zoneImg}" alt="${z.name}" />` : ''}
            <span class="img-fallback">${z.threat}</span>
          </div>
          <div class="intel-card-body">
            <div class="intel-card-meta">
              <span class="intel-card-time">${n.t}</span>
            </div>
            <div class="intel-card-text">${n.text}</div>
            <span class="intel-card-source">${source} →</span>
          </div>
        </a>
      `;
    }).join('');

    // Duplicate cards 4x for seamless infinite loop (no gaps)
    const duplicated = cardSetHtml + cardSetHtml + cardSetHtml + cardSetHtml;

    // Vary speed per zone
    const speed = 35 + zi * 5;

    return `
      <div class="intel-zone-section" style="animation-delay: ${zi * 0.1}s">
        <div class="intel-zone-header">
          <span class="intel-zone-badge ${tc}">${z.threat}</span>
          <span class="intel-zone-name">${z.name}</span>
        </div>
        <div class="intel-marquee-wrap">
          <div class="intel-marquee-track" style="animation-duration: ${speed}s">
            ${duplicated}
          </div>
        </div>
      </div>
    `;
  }).join('');
}
try { buildIntelFeed(); } catch(e) { console.warn('Intel feed init error:', e); }

// ============ COUNTRY PROFILES ============
const countryProfiles = [
  {
    id: 'usa', name: 'United States', flag: '🇺🇸', region: 'North America',
    scores: { nuclear: 10, ai: 10, military: 10, conflict: 7, economic: 9 },
    summary: 'Global military hegemon with the largest defense budget ($886B), 5,044 nuclear warheads, and dominant AI ecosystem. Currently waging war on Iran alongside Israel. Involved in 6 of 7 tracked conflict zones.',
    ai: [
      { name: 'GPT-5.4 / GPT-5-Thinking', org: 'OpenAI', desc: 'Benchmark for general reasoning, creative writing, and advanced coding.' },
      { name: 'Gemini 3.1 Pro / 2.5 Pro', org: 'Google DeepMind', desc: 'Top model for general intelligence and multimodal tasks. Massive context windows.' },
      { name: 'Claude Opus 4.6 / Sonnet 4.6', org: 'Anthropic', desc: 'High-level reasoning and safety. Preferred for complex agentic coding tasks.' },
      { name: 'Llama 4 Maverick', org: 'Meta AI', desc: 'Leading open-source/open-weights model with massive context capability.' },
      { name: 'Grok 4 / 4.1', org: 'xAI', desc: 'Real-time data integration with the X platform.' },
    ],
    military: ['5,044 nuclear warheads', '$886B defense budget (2024)', '11 aircraft carriers', '750+ overseas bases', 'Active in Iran, Yemen, Taiwan Strait, Korea'],
    keyStats: { warheads: '5,044', budget: '$886B', activeConflicts: 6, aiModels: '5 frontier' },
  },
  {
    id: 'china', name: 'China', flag: '🇨🇳', region: 'East Asia',
    scores: { nuclear: 8, ai: 9, military: 9, conflict: 4, economic: 9 },
    summary: 'Rapidly expanding nuclear arsenal (500+ warheads, projected 1,500 by 2035). World\'s 2nd largest defense budget. Conducting unprecedented military drills around Taiwan. AI ecosystem rivaling the US with DeepSeek and Qwen.',
    ai: [
      { name: 'DeepSeek-R1 / V3 / V4', org: 'DeepSeek', desc: 'Cost-effective performance matching American frontier models, especially in reasoning and math.' },
      { name: 'Qwen 3 / 2.5 Max', org: 'Alibaba Cloud', desc: 'Highly competitive open-weight models excelling in multilingual and Asian language tasks.' },
      { name: 'Ernie-5.0 / 4.0', org: 'Baidu', desc: 'Leading Chinese industrial model for Chinese language, math reasoning, and enterprise search.' },
      { name: 'GLM-4 / 5', org: 'Zhipu AI', desc: 'Bridging academic research and industrial application.' },
      { name: 'Kling AI', org: 'Kuaishou', desc: 'Major competitor in video generation.' },
    ],
    military: ['500+ nuclear warheads (expanding)', '$296B defense budget', '3 aircraft carriers', 'Largest navy by ship count', 'Taiwan blockade rehearsals ongoing'],
    keyStats: { warheads: '500+', budget: '$296B', activeConflicts: 1, aiModels: '5 frontier' },
  },
  {
    id: 'russia', name: 'Russia', flag: '🇷🇺', region: 'Eurasia',
    scores: { nuclear: 10, ai: 4, military: 7, conflict: 8, economic: 5 },
    summary: 'Largest nuclear arsenal in the world (5,580 warheads). Day 1,504 of Ukraine invasion with 1.3M+ casualties. Economy under heavy sanctions but sustained by energy exports. AI sector underdeveloped relative to military ambition.',
    ai: [
      { name: 'YandexGPT 4', org: 'Yandex', desc: 'Russia\'s leading LLM, primarily for Russian-language tasks and search.' },
      { name: 'GigaChat', org: 'Sber', desc: 'State-backed conversational AI focused on Russian enterprise market.' },
    ],
    military: ['5,580 nuclear warheads (world\'s largest)', '$109B defense budget', 'Hypersonic missile capability', '8,000 North Korean troops deployed', 'Active war in Ukraine — Day 1,504'],
    keyStats: { warheads: '5,580', budget: '$109B', activeConflicts: 1, aiModels: '2 domestic' },
  },
  {
    id: 'iran', name: 'Iran', flag: '🇮🇷', region: 'Middle East',
    scores: { nuclear: 5, ai: 2, military: 6, conflict: 9, economic: 4 },
    summary: 'Under active US-Israeli bombardment (Day 38). Near-threshold nuclear state — 60% enriched uranium stockpile. Strait of Hormuz closed, disrupting 20% of global oil transit. Proxy network spanning Yemen, Lebanon, Iraq, and Syria.',
    ai: [
      { name: 'Dorna', org: 'PartAI', desc: 'Persian-language LLM for domestic use. Limited by sanctions on compute hardware.' },
    ],
    military: ['Near-threshold nuclear (60% enrichment)', 'Shahab/Emad ballistic missiles', 'Strait of Hormuz control', 'Proxy network: Houthis, Hezbollah, PMF', 'Under active bombardment — Day 38'],
    keyStats: { warheads: '0 (threshold)', budget: '$10B', activeConflicts: 3, aiModels: '1 domestic' },
  },
  {
    id: 'israel', name: 'Israel', flag: '🇮🇱', region: 'Middle East',
    scores: { nuclear: 7, ai: 7, military: 8, conflict: 9, economic: 6 },
    summary: 'Undeclared nuclear arsenal (estimated 90 warheads). Simultaneously waging war in Gaza (72,000+ killed), Lebanon, and Iran. Iron Dome and Arrow defense systems among the most advanced in the world. Strong AI/ML defense sector.',
    ai: [
      { name: 'AI21 Jamba 2', org: 'AI21 Labs', desc: 'Hybrid SSM-Transformer architecture for enterprise reasoning.' },
      { name: 'Mobileye AI', org: 'Mobileye/Intel', desc: 'World-leading autonomous driving AI.' },
      { name: 'Military AI', org: 'IDF/Unit 8200', desc: 'AI-powered targeting systems — "Gospel" and "Lavender" used in Gaza.' },
    ],
    military: ['~90 nuclear warheads (undeclared)', '$23.4B defense budget + $3.8B US aid', 'Iron Dome / Arrow / David\'s Sling', 'Active wars: Gaza, Lebanon, Iran', 'AI-assisted targeting systems deployed'],
    keyStats: { warheads: '~90', budget: '$27B', activeConflicts: 3, aiModels: '3 notable' },
  },
  {
    id: 'nkorea', name: 'North Korea', flag: '🇰🇵', region: 'East Asia',
    scores: { nuclear: 7, ai: 1, military: 6, conflict: 3, economic: 1 },
    summary: 'Hwasong-20 "most powerful nuclear strategic weapon" unveiled. World\'s largest road-mobile ICBM tested (86-min flight). SSBN construction revealed. 8,000 troops deployed to Russia. No meaningful AI sector but advanced cyber warfare capability.',
    ai: [
      { name: 'Cyber Operations', org: 'Lazarus Group / RGB', desc: 'State-sponsored hacking — $1.7B in crypto theft (2023). No known frontier AI models.' },
    ],
    military: ['50+ nuclear warheads (estimated)', 'Hwasong-19/20 ICBMs — can reach US mainland', 'SSBN submarine program', '1.3M active troops', '8,000 troops deployed to Russia'],
    keyStats: { warheads: '50+', budget: '$4B (est.)', activeConflicts: 1, aiModels: '0 (cyber only)' },
  },
  {
    id: 'europe', name: 'Europe (NATO)', flag: '🇪🇺', region: 'Europe',
    scores: { nuclear: 7, ai: 6, military: 8, conflict: 4, economic: 8 },
    summary: 'UK and France hold 500+ combined nuclear warheads. NATO\'s European members rapidly rearming post-Ukraine. Mistral AI leading European AI sovereignty push. EU defense spending surged to $380B in 2025.',
    ai: [
      { name: 'Mistral Large 3', org: 'Mistral AI (France)', desc: 'Leading European AI firm — high-efficiency open-source models rivaling US. GDPR compliant.' },
      { name: 'Flux 2 Max', org: 'Black Forest Labs (Germany)', desc: 'Gaining ground in text-to-image for photorealism.' },
    ],
    military: ['515 nuclear warheads (UK + France)', '$380B combined defense spending', 'NATO Article 5 collective defense', 'Rapid rearmament post-Ukraine', 'Arms shipments to Ukraine ongoing'],
    keyStats: { warheads: '515', budget: '$380B', activeConflicts: 1, aiModels: '2 frontier' },
  },
  {
    id: 'uae', name: 'UAE', flag: '🇦🇪', region: 'Middle East',
    scores: { nuclear: 1, ai: 5, military: 4, conflict: 3, economic: 7 },
    summary: 'Major arms buyer and proxy conflict financier. Backing RSF in Sudan\'s civil war. Investing heavily in AI through TII\'s Falcon models and massive data center buildouts. Strategic position in Gulf energy markets.',
    ai: [
      { name: 'Falcon 2', org: 'TII (Technology Innovation Institute)', desc: 'Powerful open-source model focused on Arabic language and open research.' },
    ],
    military: ['No nuclear weapons', '$23B defense budget', 'Advanced drone fleet', 'Backing RSF in Sudan', 'Strategic Gulf positioning'],
    keyStats: { warheads: '0', budget: '$23B', activeConflicts: 1, aiModels: '1 frontier' },
  },
];

// Compute overall score for each country
countryProfiles.forEach(c => {
  const s = c.scores;
  c.overallScore = Math.round(((s.nuclear + s.ai + s.military + s.conflict + s.economic) / 50) * 100);
});

// Sort by overall score
countryProfiles.sort((a, b) => b.overallScore - a.overallScore);

// ============ POPULATE LEADERBOARD ============
function buildLeaderboard() {
  const list = document.getElementById('leaderboard-list');

  list.innerHTML = countryProfiles.map((c, i) => {
    const s = c.scores;
    const maxCat = Object.entries(s).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0]);
    const catLabels = { nuclear: 'NUCLEAR', ai: 'AI', military: 'MILITARY', conflict: 'CONFLICT', economic: 'ECONOMIC' };
    const topCategory = catLabels[maxCat[0]] || '';
    const tc = c.overallScore >= 85 ? 'critical' : c.overallScore >= 60 ? 'high' : 'elevated';

    // Mini bar chart for the 5 scores
    const barSegments = Object.entries(s).map(([key, val]) => {
      const color = key === 'nuclear' ? '#ff2240' : key === 'ai' ? '#00aaff' : key === 'military' ? '#ff8800' : key === 'conflict' ? '#ff4466' : '#22aa44';
      return `<div class="lb-mini-bar" style="width:${val * 10}%; background:${color};" title="${catLabels[key]}: ${val}/10"></div>`;
    }).join('');

    return `
      <div class="lb-item" data-country="${c.id}" style="animation-delay: ${i * 0.06}s">
        <span class="lb-rank">${String(i + 1).padStart(2, '0')}</span>
        <span class="lb-flag">${c.flag}</span>
        <div class="lb-info">
          <div class="lb-name">${c.name}</div>
          <div class="lb-detail">${c.region} · ${topCategory} DOMINANT · ${c.keyStats.activeConflicts} conflict${c.keyStats.activeConflicts !== 1 ? 's' : ''}</div>
        </div>
        <div class="lb-scores-mini">
          ${barSegments}
        </div>
        <div class="lb-overall">
          <span class="lb-overall-num">${c.overallScore}</span>
          <span class="lb-overall-label">THREAT</span>
        </div>
        <span class="lb-expand">→</span>
      </div>
    `;
  }).join('');

  // Click handler
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.lb-item');
    if (!item) return;
    const profile = countryProfiles.find(c => c.id === item.dataset.country);
    if (profile) openCountryProfile(profile);
  });
}

function openCountryProfile(c) {
  const modal = document.getElementById('countryModal');
  const inner = document.getElementById('countryModalInner');
  const s = c.scores;
  const catLabels = { nuclear: 'NUCLEAR', ai: 'AI CAPABILITY', military: 'MILITARY POWER', conflict: 'CONFLICT INVOLVEMENT', economic: 'ECONOMIC LEVERAGE' };
  const catColors = { nuclear: '#ff2240', ai: '#00aaff', military: '#ff8800', conflict: '#ff4466', economic: '#22aa44' };

  const scoreRows = Object.entries(s).map(([key, val]) => {
    const pct = val * 10;
    const color = catColors[key];
    return `
      <div class="cp-score-row">
        <span class="cp-score-label">${catLabels[key]}</span>
        <div class="cp-score-bar-wrap">
          <div class="cp-score-bar" style="width:${pct}%; background:${color};"></div>
        </div>
        <span class="cp-score-val" style="color:${color}">${val}<span class="cp-score-max">/10</span></span>
      </div>
    `;
  }).join('');

  const aiCards = c.ai.map(m => `
    <div class="cp-ai-card">
      <div class="cp-ai-name">${m.name}</div>
      <div class="cp-ai-org">${m.org}</div>
      <div class="cp-ai-desc">${m.desc}</div>
    </div>
  `).join('');

  const milItems = c.military.map(m => `<div class="cp-mil-item">${m}</div>`).join('');

  inner.innerHTML = `
    <button class="cp-close" id="cpClose">✕</button>
    <div class="cp-header">
      <span class="cp-flag">${c.flag}</span>
      <div>
        <h2 class="cp-name">${c.name}</h2>
        <span class="cp-region">${c.region}</span>
      </div>
      <div class="cp-overall-big">
        <span class="cp-overall-num">${c.overallScore}</span>
        <span class="cp-overall-label">THREAT<br>INDEX</span>
      </div>
    </div>
    <p class="cp-summary">${c.summary}</p>

    <div class="cp-section-title">THREAT ASSESSMENT</div>
    <div class="cp-scores">${scoreRows}</div>

    <div class="cp-section-title">AI CAPABILITY</div>
    <div class="cp-ai-grid">${aiCards}</div>

    <div class="cp-section-title">MILITARY PROFILE</div>
    <div class="cp-mil-list">${milItems}</div>

    <div class="cp-key-stats">
      <div class="cp-stat"><span class="cp-stat-val">${c.keyStats.warheads}</span><span class="cp-stat-label">WARHEADS</span></div>
      <div class="cp-stat"><span class="cp-stat-val">${c.keyStats.budget}</span><span class="cp-stat-label">DEFENSE BUDGET</span></div>
      <div class="cp-stat"><span class="cp-stat-val">${c.keyStats.activeConflicts}</span><span class="cp-stat-label">ACTIVE CONFLICTS</span></div>
      <div class="cp-stat"><span class="cp-stat-val">${c.keyStats.aiModels}</span><span class="cp-stat-label">AI MODELS</span></div>
    </div>
  `;

  modal.classList.add('open');

  document.getElementById('cpClose').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
}
try { buildLeaderboard(); } catch(e) { console.warn('Leaderboard init error:', e); }

// ============ DOOMSDAY CLOCK WIDGET ============
const clockHistory = [
  { year: 1947, mins: 7, summary: 'The Doomsday Clock debuts on the cover of the Bulletin of the Atomic Scientists.' },
  { year: 1949, mins: 3, summary: 'Soviet Union detonates its first nuclear device. The arms race begins.' },
  { year: 1953, mins: 2, summary: 'US and USSR test thermonuclear devices. Humanity enters the hydrogen bomb era.' },
  { year: 1960, mins: 7, summary: 'Pugwash Conferences foster US-Soviet scientific cooperation.' },
  { year: 1963, mins: 12, summary: 'Partial Test Ban Treaty signed after Cuban Missile Crisis.' },
  { year: 1968, mins: 7, summary: 'France and China acquire nuclear weapons. Vietnam War escalates.' },
  { year: 1969, mins: 10, summary: 'US Senate ratifies the Nuclear Non-Proliferation Treaty.' },
  { year: 1972, mins: 12, summary: 'SALT I and ABM Treaty signed. First real limits on arsenals.' },
  { year: 1974, mins: 9, summary: 'India tests nuclear device. Arms control progress stalls.' },
  { year: 1980, mins: 7, summary: 'Soviet invasion of Afghanistan. US-Soviet dialogue freezes.' },
  { year: 1981, mins: 4, summary: 'Nuclear arms race accelerates on both sides.' },
  { year: 1984, mins: 3, summary: 'US-Soviet dialogue stops. 60,000+ nuclear warheads worldwide.' },
  { year: 1988, mins: 6, summary: 'INF Treaty signed. First treaty to actually reduce nuclear arsenals.' },
  { year: 1990, mins: 10, summary: 'Berlin Wall falls. Cold War ending. Eastern Europe democratizes.' },
  { year: 1991, mins: 17, summary: 'SAFEST EVER. Cold War ends. START Treaty signed for deep arsenal cuts.' },
  { year: 1995, mins: 14, summary: 'Post-Soviet nuclear concerns. Russian nuclear infrastructure deteriorates.' },
  { year: 1998, mins: 9, summary: 'India and Pakistan conduct nuclear tests.' },
  { year: 2002, mins: 7, summary: 'Post-9/11. US withdraws from ABM Treaty. Nuclear terrorism fears grow.' },
  { year: 2007, mins: 5, summary: 'North Korea tests first nuke. Climate change added as existential threat.' },
  { year: 2010, mins: 6, summary: 'New START Treaty. Brief moment of renewed cooperation.' },
  { year: 2012, mins: 5, summary: 'Fukushima. Nuclear modernization accelerates. Climate action stalls.' },
  { year: 2015, mins: 3, summary: 'Multiple existential threats compound. Nuclear modernization unchecked.' },
  { year: 2017, mins: 2.5, summary: 'Rise of nationalism. Nuclear rhetoric escalates worldwide.' },
  { year: 2018, mins: 2, summary: 'Nuclear postures aggressive. Information warfare undermines democracies.' },
  { year: 2020, mins: 100/60, summary: 'COVID-19. Nuclear agreements collapse. Climate crisis intensifies.' },
  { year: 2023, mins: 90/60, summary: 'Russia invades Ukraine. Nuclear escalation risk spikes.' },
  { year: 2025, mins: 89/60, summary: 'AI weapons deployed without frameworks. No arms control talks.' },
  { year: 2026, mins: 85/60, summary: 'US-Israel war on Iran. Strait of Hormuz closed. 7 active conflict zones. Closest ever.' },
];

function buildDoomWidget() {
  const ticksG = document.getElementById('doomClockTicks');
  const clockHand = document.getElementById('doomClockHand');
  const numEl = document.getElementById('doomClockNum');
  const unitEl = document.getElementById('doomClockUnit');
  const yearEl = document.getElementById('doomClockYear');
  const summaryEl = document.getElementById('doomClockSummary');
  const badgeEl = document.getElementById('doomClockBadge');
  const yearList = document.getElementById('doomYearList');
  const toggle = document.getElementById('doomToggle');
  const panel = document.getElementById('doomPanel');
  const closeBtn = document.getElementById('doomPanelClose');

  if (!ticksG) return;

  // Build ticks
  let t = '';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * 360;
    const major = i % 5 === 0;
    const r1 = major ? 122 : 128;
    const r2 = 133;
    const rad = (a - 90) * Math.PI / 180;
    t += `<line x1="${150 + r1*Math.cos(rad)}" y1="${150 + r1*Math.sin(rad)}" x2="${150 + r2*Math.cos(rad)}" y2="${150 + r2*Math.sin(rad)}" stroke="rgba(255,255,255,${major?.08:.03})" stroke-width="${major?1.5:.7}"/>`;
  }
  ticksG.innerHTML = t;

  // Build year buttons
  yearList.innerHTML = clockHistory.map((entry, i) => {
    const isActive = i === clockHistory.length - 1;
    const isCritical = entry.mins <= 2;
    return `<button class="doom-year-btn${isActive ? ' active' : ''}${isCritical ? ' critical-year' : ''}" data-idx="${i}">${entry.year}</button>`;
  }).join('');

  // Number animation helper (must be defined before selectYear)
  let animFrame = null;
  function animateNum(el, target) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const start = parseFloat(el.textContent) || 0;
    const t0 = performance.now();
    const dur = 600;
    function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * ease);
      if (p < 1) animFrame = requestAnimationFrame(tick);
    }
    animFrame = requestAnimationFrame(tick);
  }

  function selectYear(idx) {
    const entry = clockHistory[idx];
    const totalSec = entry.mins * 60;
    const displayAsMin = totalSec >= 120;
    const displayNum = displayAsMin ? Math.round(totalSec / 60) : Math.round(totalSec);

    // Animate number
    animateNum(numEl, displayNum);
    unitEl.textContent = displayAsMin ? 'MINUTES TO MIDNIGHT' : 'SECONDS TO MIDNIGHT';
    yearEl.textContent = entry.year;
    summaryEl.textContent = entry.summary;

    // Update widget toggle label
    const secsEl = document.getElementById('doomWidgetSecs');
    if (secsEl) secsEl.textContent = (displayAsMin ? displayNum + 'm' : displayNum + 's');

    // Badge
    if (entry.mins <= 2) {
      badgeEl.textContent = idx === clockHistory.length - 1 ? 'CLOSEST EVER' : 'CRITICAL';
      badgeEl.className = 'doomsday-badge critical';
    } else if (entry.mins <= 7) {
      badgeEl.textContent = 'ELEVATED';
      badgeEl.className = 'doomsday-badge critical';
    } else {
      badgeEl.textContent = 'REDUCED';
      badgeEl.className = 'doomsday-badge safe';
    }

    // Clock hand rotation
    const degrees = -((entry.mins / 60) * 360);
    if (clockHand) clockHand.style.transform = `rotate(${360 + degrees}deg)`;

    // Active button state
    yearList.querySelectorAll('.doom-year-btn').forEach((btn, bi) => {
      btn.classList.toggle('active', bi === idx);
    });
  }

  // Year button clicks
  yearList.addEventListener('click', (e) => {
    const btn = e.target.closest('.doom-year-btn');
    if (!btn) return;
    selectYear(parseInt(btn.dataset.idx));
  });

  // Toggle panel
  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
  });
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') panel.classList.remove('open');
  });

  // Init with current year (2026)
  selectYear(clockHistory.length - 1);
}
try { buildDoomWidget(); } catch(e) { console.warn('Doom widget init error:', e); }


// ============ ANIMATION LOOP ============
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  controls.update();

  heatRings.forEach(ring => {
    const { ringIndex, ringCount, isCrit, phaseOffset } = ring.userData;
    const wave = Math.sin(time * 2 - phaseOffset);
    const normalizedWave = (wave + 1) / 2;
    const distanceFade = 1 - (ringIndex / (ringCount + 1));
    const opacity = normalizedWave * distanceFade * (isCrit ? 0.25 : 0.18);
    ring.material.opacity = Math.max(0, opacity);
    const scale = 1 + normalizedWave * 0.15;
    ring.scale.setScalar(scale);
  });

  renderer.render(scene, camera);
}
animate();

// ============ RESIZE ============
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============ CLOCK ============
setInterval(() => {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toUTCString().slice(17, 25) + ' UTC';
}, 1000);

// ============ GITHUB MODAL ============
const ghModal = document.getElementById('ghModal');
const openGh = document.getElementById('openGithub');
const closeGh = document.getElementById('closeGithub');

if (openGh && ghModal) {
  openGh.addEventListener('click', () => ghModal.classList.add('open'));
  closeGh.addEventListener('click', () => ghModal.classList.remove('open'));
  ghModal.addEventListener('click', (e) => {
    if (e.target === ghModal) ghModal.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ghModal.classList.remove('open');
  });
}
