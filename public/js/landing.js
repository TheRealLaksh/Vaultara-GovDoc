// Scroll reveal for the landing page. Content is visible without JS; this only
// adds a quiet entrance once the script has marked <html class="js">.
(() => {
    const items = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
})();

// Pause / play for the looping hero background (WCAG 2.2.2: moving content over 5s needs a control).
(() => {
    const btn = document.getElementById('motionToggle');
    const bg = document.querySelector('.hero-bg');
    if (!btn || !bg) return;
    btn.addEventListener('click', () => {
        const paused = bg.classList.toggle('paused');
        btn.setAttribute('aria-pressed', String(paused));
        btn.querySelector('span').textContent = paused ? 'Play background motion' : 'Pause background motion';
        btn.querySelector('i').className = `ph-bold ph-${paused ? 'play' : 'pause'}`;
    });
})();
