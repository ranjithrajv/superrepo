/* Page behaviour for the SuperRepo site (site/index.html).
 *
 * Every unit below owns exactly one job and looks up the markup it needs, so a
 * unit whose markup is absent simply does nothing. Nothing here is required for
 * the page to render or to be read: the markup is the document, this only wires
 * it up.
 */

// A stored theme is applied before first paint by the inline snippet in
// index.html's <head>; this half owns the switch and keeps aria-pressed honest.
(function theme() {
  const key = document.documentElement.dataset.themeStorageKey;
  const buttons = document.querySelectorAll('[data-theme-set]');
  if (!key || !buttons.length) return;

  const stored = () => {
    try { return localStorage.getItem(key) || 'system'; } catch (e) { return 'system'; }
  };

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    buttons.forEach((button) => {
      const on = button.dataset.themeSet === theme;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', String(on));
    });
  }

  buttons.forEach((button) => button.addEventListener('click', () => {
    try { localStorage.setItem(key, button.dataset.themeSet); } catch (e) { /* private mode */ }
    apply(button.dataset.themeSet);
  }));

  apply(stored());
})();

// The mobile menu is a full-screen modal: while it is open the page behind it
// must not scroll, must not be reachable by Tab, and must hand focus back to
// the button that opened it when it closes.
(function mobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const openButton = document.getElementById('menuBtn');
  const closeButton = document.getElementById('menuClose');
  if (!menu || !openButton || !closeButton) return;

  // the parts of the page a modal takes out of play while it is up
  const background = ['nav', 'main', 'footer']
    .map((tag) => document.querySelector(tag))
    .filter(Boolean);

  const stops = () =>
    [...menu.querySelectorAll('a[href], button:not([disabled])')]
      .filter((el) => el.offsetParent !== null);

  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    openButton.setAttribute('aria-expanded', String(open));
    for (const el of background) el.inert = open;

    if (open) {
      (stops()[0] || menu).focus();
    } else {
      // the button is the only way in, so it is always the right place to land
      openButton.focus();
    }
  };

  openButton.addEventListener('click', () => setOpen(true));
  closeButton.addEventListener('click', () => setOpen(false));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));

  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;

    // Tab cycles inside the dialog instead of walking into the page behind it
    const items = stops();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();

// Sections fade in once, the first time they are scrolled to. The per-element
// stagger is a class (see .reveal.d1…d5), not something this has to know about.
(function scrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  targets.forEach((target) => observer.observe(target));
})();

// The tagline is split into words so each can fade in on its own.
(function tagline() {
  const element = document.getElementById('tagline');
  if (!element || !('IntersectionObserver' in window)) return;

  element.innerHTML = element.textContent.trim()
    .split(/\s+/)
    .map((word) => `<span class="word">${word}</span>`)
    .join(' ');

  const words = element.querySelectorAll('.word');
  const observer = new IntersectionObserver((entries, self) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      words.forEach((word, i) => setTimeout(() => word.classList.add('on'), i * 120));
      self.disconnect();
    });
  }, { threshold: 0.4 });

  observer.observe(element);
})();

// Release notes: validate in the page. There is no backend to post to yet.
(function releaseNotes() {
  const form = document.getElementById('waitForm');
  if (!form) return;

  const email = document.getElementById('waitEmail');
  const message = document.getElementById('waitMsg');
  const valid = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const ok = valid();
    message.className = 'form-msg ' + (ok ? 'ok' : 'err');
    message.textContent = ok
      ? 'Thanks. Release notes are not wired to a backend yet; this form validates only.'
      : 'Please enter a valid email address.';
    if (!ok) email.focus();
  });
})();
