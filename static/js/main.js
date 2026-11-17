// 顶栏：滚动后加细边框
(function () {
  var header = document.getElementById('siteHeader');
  if (!header) return;
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// 入场动效
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });
})();

// 移动端菜单：点链接后自动收起
(function () {
  var toggle = document.getElementById('navToggle');
  if (!toggle) return;
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { toggle.checked = false; });
  });
})();

// 证书大图弹窗（Lightbox）
var lightbox = document.getElementById('lightbox');
if (lightbox) {
  var lbImg = document.getElementById('lightboxImg');
  var lbTitle = document.getElementById('lightboxTitle');
  var lbMeta = document.getElementById('lightboxMeta');
  var lbPeople = document.getElementById('lightboxPeople');
  var lbInfo = document.getElementById('lightboxInfo');

  function openLightbox(card) {
    lbImg.src = card.getAttribute('data-full');
    lbImg.alt = card.getAttribute('data-title') || '';
    lbTitle.textContent = card.getAttribute('data-title') || '';
    lbMeta.textContent = card.getAttribute('data-meta') || '';
    lbPeople.textContent = card.getAttribute('data-people') || '';
    lbInfo.textContent = card.getAttribute('data-info') || '';
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.hidden = true;
    lbImg.src = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-lightbox]').forEach(function (card) {
    card.addEventListener('click', function () { openLightbox(card); });
  });
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
}
