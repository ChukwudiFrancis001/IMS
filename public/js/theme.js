(function () {
  const STORAGE_KEY = 'ims-theme';

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
  }

  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(getPreferredTheme());

  window.imsTheme = {
    get: getPreferredTheme,
    set(theme) {
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(theme);
    }
  };
})();
