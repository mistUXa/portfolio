const introOverlay = document.getElementById('introOverlay');
const logoWrap = document.getElementById('logoWrap');
const logoImg = document.getElementById('logoImg');
const navPanel = document.getElementById('navPanel');
const navItems = document.querySelectorAll('.navItem');
const pageContainer = document.getElementById('pageContainer');
const sideNavLinks = document.querySelectorAll('.sideNavCard');
const sideNavPanel = document.getElementById('sideNavPanel');

let activePageId = null;
let introsDone = false;
let busy = false;
let scrambleController = null;
let targetScrollTop = 0;
let currentScrollTop = 0;
let isMoving = false;
let raf = null;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function scrollTick() {
  const maxScroll = pageContainer.scrollHeight - pageContainer.clientHeight;
  targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop));
  
  currentScrollTop += (targetScrollTop - currentScrollTop) * 0.12;
  
  if (Math.abs(targetScrollTop - currentScrollTop) < 0.1) {
    currentScrollTop = targetScrollTop;
    pageContainer.scrollTop = currentScrollTop;
    updateSideNav();
    raf = null;
    isMoving = false;
    return;
  }
  
  pageContainer.scrollTop = currentScrollTop;
  updateSideNav();
  raf = requestAnimationFrame(scrollTick);
}

window.addEventListener('wheel', e => {
  if (activePageId !== 'projects') return;
  
  let delta = e.deltaY;
  if (e.deltaMode === 1) delta *= 32;
  else if (e.deltaMode === 2) delta *= pageContainer.clientHeight;
  
  if (!isMoving) {
    currentScrollTop = pageContainer.scrollTop;
    targetScrollTop = currentScrollTop;
    isMoving = true;
  }
  
  targetScrollTop += delta * 0.65;
  
  if (!raf) raf = requestAnimationFrame(scrollTick);
}, { passive: true });

function killScroll() {
  isMoving = false;
  if (raf) { 
    cancelAnimationFrame(raf); 
    raf = null; 
  }
}

function updateSideNav() {
  if (activePageId !== 'projects') return;
  const pcRect = pageContainer.getBoundingClientRect();
  const cards = document.querySelectorAll('.scrollTarget');
  let bestId = null;
  let minDistance = Infinity;
  
  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.top - pcRect.top);
    if (distance < minDistance) { 
      minDistance = distance; 
      bestId = card.id; 
    }
  });
  
  sideNavLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href').substring(1) === bestId);
  });
}

pageContainer.addEventListener('scroll', () => {
  if (!isMoving) {
    currentScrollTop = pageContainer.scrollTop;
    targetScrollTop = currentScrollTop;
    updateSideNav();
  }
});

sideNavLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.getElementById(this.getAttribute('href').substring(1));
    if (!target) return;
    killScroll();
    const pcRect = pageContainer.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    targetScrollTop = pageContainer.scrollTop + (tRect.top - pcRect.top);
    currentScrollTop = pageContainer.scrollTop;
    isMoving = true;
    raf = requestAnimationFrame(scrollTick);
  });
});

async function runIntro() {
  await wait(400);
  logoWrap.classList.add('visible');
  await wait(1000);
  logoWrap.classList.remove('visible');
  logoWrap.style.opacity = '1';
  void logoWrap.offsetWidth;
  logoWrap.classList.add('moveUp');
  navPanel.classList.add('visible');
  await wait(110);
  navItems.forEach((item, i) => {
    setTimeout(() => item.classList.add('revealed'), i * 235);
  });
  await wait(navItems.length * 80 + 250);
  introOverlay.classList.add('fadeOut');
  await wait(500);
  logoImg.classList.add('swimming');
  await wait(100);
  introOverlay.style.display = 'none';
  navPanel.classList.add('interactive');
  introsDone = true;
}

function stopScramble() {
  if (scrambleController) { 
    scrambleController.cancelled = true; 
    scrambleController = null; 
  }
}

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

function scrambleReveal(el, controller) {
  if (!el.hasAttribute('dataOrig')) el.setAttribute('dataOrig', el.innerHTML);
  const nodes = Array.from(el.childNodes);
  el.innerHTML = '';
  const letters = [];
  
  function processNode(node, parentEl) {
    if (node.nodeType === 3) {
      for (const ch of node.textContent) {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = ch;
        parentEl.appendChild(span);
        letters.push(span);
      }
    } else if (node.nodeType === 1) {
      const clone = node.cloneNode(false);
      parentEl.appendChild(clone);
      Array.from(node.childNodes).forEach(child => processNode(child, clone));
    }
  }
  
  nodes.forEach(n => processNode(n, el));
  const pool = [];
  
  letters.forEach((span, i) => {
    if (span.textContent.trim() === '') span.classList.add('lit');
    else pool.push(i);
  });
  
  const revealPerTick = Math.max(3, Math.ceil(pool.length / 16));
  
  return new Promise(resolve => {
    const remaining = [...pool];
    const iv = setInterval(() => {
      if (controller.cancelled) { 
        clearInterval(iv); 
        letters.forEach(l => l.classList.add('lit')); 
        resolve(); 
        return; 
      }
      if (!remaining.length) { 
        clearInterval(iv); 
        resolve(); 
        return; 
      }
      for (let t = 0; t < revealPerTick && remaining.length; t++) {
        letters[remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]].classList.add('lit');
      }
    }, 16);
  });
}

function hardResetPage(page) {
  stopScramble();
  page.querySelectorAll('.aboutLine').forEach(line => {
    if (line.hasAttribute('dataOrig')) line.innerHTML = line.getAttribute('dataOrig');
  });
  page.querySelectorAll('.skillItem').forEach(s => {
    s.classList.remove('revealed');
    s.style.cssText = 'visibility:hidden;opacity:0;transform:translateY(12px);';
  });
  page.classList.remove('animateIn', 'animateOut', 'active');
  page.style.cssText = 'display:none;';
}

async function runAboutAnimations(page, ctrl) {
  await wait(60);
  const lines = page.querySelectorAll('.aboutLine');
  for (const line of lines) {
    if (ctrl.cancelled) return;
    await scrambleReveal(line, ctrl);
    await wait(15);
  }
  if (ctrl.cancelled) return;
  await wait(60);
  page.querySelectorAll('.skillItem').forEach((s, i) => {
    setTimeout(() => { 
      if (!ctrl.cancelled) { 
        s.style.cssText = ''; 
        s.classList.add('revealed'); 
      } 
    }, i * 55);
  });
}

function showPage(page) {
  page.style.cssText = '';
  page.classList.add('active');
  void page.offsetWidth;
  page.classList.add('animateIn');
  pageContainer.style.pointerEvents = 'all';
}

function resetScroll() {
  killScroll();
  pageContainer.scrollTop = 0;
  currentScrollTop = 0;
  targetScrollTop = 0;
}

async function openFromIdle(pageId) {
  const page = document.getElementById('page' + pageId[0].toUpperCase() + pageId.slice(1));
  if (!page) return;
  logoWrap.classList.remove('moveUp', 'returnCenter');
  void logoWrap.offsetWidth;
  logoWrap.classList.add('hideAway');
  navPanel.classList.remove('toCenter', 'visible');
  void navPanel.offsetWidth;
  navPanel.classList.add('toTop');
  await wait(300);
  resetScroll();
  pageContainer.style.overflowY = pageId === 'projects' ? 'auto' : 'hidden';
  showPage(page);
  
  if (pageId === 'projects') { 
    sideNavPanel.classList.add('showNav'); 
    requestAnimationFrame(updateSideNav); 
  }
  
  if (pageId === 'about') { 
    scrambleController = { cancelled: false }; 
    runAboutAnimations(page, scrambleController).catch(() => {}); 
  }
}

async function switchTo(fromId, toId) {
  const fromPage = document.getElementById('page' + fromId[0].toUpperCase() + fromId.slice(1));
  const toPage = document.getElementById('page' + toId[0].toUpperCase() + toId.slice(1));
  if (!fromPage || !toPage) return;
  stopScramble();
  fromPage.classList.remove('animateIn');
  void fromPage.offsetWidth;
  fromPage.classList.add('animateOut');
  await wait(300);
  hardResetPage(fromPage);
  resetScroll();
  pageContainer.style.overflowY = toId === 'projects' ? 'auto' : 'hidden';
  showPage(toPage);
  
  if (toId === 'projects') { 
    sideNavPanel.classList.add('showNav'); 
    requestAnimationFrame(updateSideNav); 
  } else {
    sideNavPanel.classList.remove('showNav');
  }
  
  if (toId === 'about') { 
    scrambleController = { cancelled: false }; 
    runAboutAnimations(toPage, scrambleController).catch(() => {}); 
  }
}

async function closeToIdle(pageId) {
  const page = document.getElementById('page' + pageId[0].toUpperCase() + pageId.slice(1));
  if (!page) return;
  stopScramble();
  pageContainer.style.pointerEvents = 'none';
  page.classList.remove('animateIn');
  void page.offsetWidth;
  page.classList.add('animateOut');
  logoWrap.classList.remove('hideAway');
  void logoWrap.offsetWidth;
  logoWrap.classList.add('returnCenter');
  navPanel.classList.remove('toTop');
  void navPanel.offsetWidth;
  navPanel.classList.add('toCenter');
  sideNavPanel.classList.remove('showNav');
  await wait(300);
  hardResetPage(page);
  page.style.cssText = 'display:none;';
}

navItems.forEach(item => {
  item.addEventListener('click', async () => {
    if (!introsDone || busy) return;
    const pageId = item.dataset.page;
    if (!pageId) return;
    busy = true;
    
    if (activePageId === pageId) {
      item.classList.remove('active');
      const closingId = activePageId;
      activePageId = null;
      await closeToIdle(closingId);
    } else if (activePageId) {
      document.querySelector(`.navItem[data-page="${activePageId}"]`)?.classList.remove('active');
      item.classList.add('active');
      const prevId = activePageId;
      activePageId = pageId;
      await switchTo(prevId, pageId);
    } else {
      item.classList.add('active');
      activePageId = pageId;
      await openFromIdle(pageId);
    }
    busy = false;
  });
});

runIntro();