const root = document.documentElement;
const themeToggle = document.querySelector('.theme-toggle');
const storedTheme = (() => { try { return localStorage.getItem('sks-theme'); } catch { return null; } })();
const preferredDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
if (storedTheme === 'dark' || (storedTheme !== 'light' && preferredDark)) root.dataset.theme = 'dark';
function updateThemeLabel(){
  const isDark = root.dataset.theme === 'dark';
  themeToggle?.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#14221f' : '#f6f5f1');
}
updateThemeLabel();
themeToggle?.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('sks-theme', root.dataset.theme); } catch {}
  updateThemeLabel();
});

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
function closeMenu(){menuToggle?.setAttribute('aria-expanded','false');menuToggle?.setAttribute('aria-label','Open menu');if(mobileNav) mobileNav.hidden=true;}
menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
  if(mobileNav) mobileNav.hidden = isOpen;
});
mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

if('IntersectionObserver' in window){
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);} }),{threshold:.08,rootMargin:'0px 0px -20px 0px'});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));}

const bibtex = `@article{PrakashSinha2024,
  author = {Shiroman Prakash and Shubham Kumar Sinha},
  title = {Emergent supersymmetry at large N},
  journal = {Journal of High Energy Physics},
  volume = {2024},
  pages = {25},
  year = {2024},
  doi = {10.1007/JHEP01(2024)025},
  eprint = {2307.06841},
  archivePrefix = {arXiv},
  primaryClass = {hep-th}
}`;
document.querySelector('.citation-button')?.addEventListener('click', async event => {
  const button=event.currentTarget;
  try{
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(bibtex);}
    else {const input=document.createElement('textarea');input.value=bibtex;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();const ok=document.execCommand('copy');input.remove();if(!ok)throw new Error('Copy unavailable');}
    button.textContent='Copied ✓';setTimeout(()=>{button.innerHTML='Copy BibTeX <span class="copy-icon" aria-hidden="true">⧉</span>';},2200);
  }catch{button.textContent='Unable to copy';setTimeout(()=>{button.textContent='Copy BibTeX';},2200);}
});
document.querySelector('#year').textContent=String(new Date().getFullYear());
