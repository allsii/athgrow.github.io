/* Load synchronously in <head> before the stylesheets to avoid a theme flash. */
(() => {
  'use strict';

  const storageKey = 'garden-grow-theme';
  const root = document.documentElement;
  let storedTheme = null;
  try {
    const value = window.localStorage.getItem(storageKey);
    if (value === 'light' || value === 'dark') storedTheme = value;
  } catch (_) {
    // Browsing modes that deny storage can still switch themes for this page.
  }

  let systemPreference = null;
  try {
    if (typeof window.matchMedia === 'function') {
      systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
    }
  } catch (_) {
    // Fall back to light when the system preference cannot be queried.
  }

  const systemTheme = () => systemPreference && systemPreference.matches ? 'dark' : 'light';
  let hasUserChoice = storedTheme !== null;
  let currentTheme = storedTheme || systemTheme();
  root.setAttribute('data-theme', currentTheme);

  function updateControl() {
    const button = document.querySelector('button.theme-toggle');
    if (!button) return;

    let icon = button.querySelector('.theme-toggle__icon, .theme-icon, .theme-toggle-icon');
    let label = button.querySelector('.theme-toggle__label, .theme-label, .theme-toggle-label');
    // Also support a bare button when the layout supplies no inner markup.
    if (!icon && !label) button.textContent = '';
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'theme-toggle__icon';
      button.prepend(icon);
    }
    if (!label) {
      label = document.createElement('span');
      label.className = 'theme-toggle__label';
      button.append(label);
    }
    const isDark = currentTheme === 'dark';
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark
      ? '다크 모드 켜짐, 라이트 모드로 전환'
      : '다크 모드 꺼짐, 다크 모드로 전환');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = isDark ? '☾' : '☀';
    label.textContent = isDark ? '다크 모드' : '라이트 모드';
  }

  function setTheme(theme, notify) {
    currentTheme = theme;
    root.setAttribute('data-theme', theme);
    updateControl();
    if (notify) {
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }
  }

  function initializeControl() {
    const button = document.querySelector('button.theme-toggle');
    if (!button) return;
    updateControl();
    button.addEventListener('click', () => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      hasUserChoice = true;
      try {
        window.localStorage.setItem(storageKey, nextTheme);
      } catch (_) {
        // The choice remains effective until this page is left.
      }
      setTheme(nextTheme, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeControl, { once: true });
  } else {
    initializeControl();
  }

  // Until the visitor makes a choice, track changes to the OS preference too.
  if (systemPreference) {
    const onSystemChange = () => {
      if (!hasUserChoice) {
        const nextTheme = systemTheme();
        if (nextTheme !== currentTheme) setTheme(nextTheme, true);
      }
    };
    if (typeof systemPreference.addEventListener === 'function') {
      systemPreference.addEventListener('change', onSystemChange);
    } else if (typeof systemPreference.addListener === 'function') {
      systemPreference.addListener(onSystemChange);
    }
  }

  // Keep open tabs in agreement if another page changes or clears the choice.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    const nextStored = event.key === storageKey && (event.newValue === 'dark' || event.newValue === 'light')
      ? event.newValue : null;
    hasUserChoice = nextStored !== null;
    const nextTheme = nextStored || systemTheme();
    if (nextTheme !== currentTheme) setTheme(nextTheme, true);
  });
})();
