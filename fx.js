/* ==========================================================================
   FLIPPY v4 — STUDIO INTERACTION & THEME CONTROLLER
   Inspector accordions · Math drawer · Darkroom / Paper theme · Shortcuts
   ========================================================================== */

(function () {
  'use strict';

  // ---- 1. Inspector Module Accordions & Fold/Expand All ----
  const modules = Array.from(document.querySelectorAll('.module[data-module]'));
  const collapseAllBtn = document.getElementById('collapseAllBtn');

  function syncCollapseAllLabel() {
    if (!collapseAllBtn) return;
    const labelSpan = collapseAllBtn.querySelector('span');
    if (!labelSpan) return;
    const anyOpen = modules.some(m => m.classList.contains('open'));
    labelSpan.textContent = anyOpen ? 'Fold All' : 'Expand All';
  }

  modules.forEach((mod) => {
    const head = mod.querySelector('.module-head');
    if (!head) return;
    head.addEventListener('click', () => {
      const willOpen = !mod.classList.contains('open');
      mod.classList.toggle('open', willOpen);
      head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      syncCollapseAllLabel();
    });
  });

  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      const anyOpen = modules.some(m => m.classList.contains('open'));
      const targetState = !anyOpen;
      modules.forEach((mod) => {
        mod.classList.toggle('open', targetState);
        const head = mod.querySelector('.module-head');
        if (head) head.setAttribute('aria-expanded', targetState ? 'true' : 'false');
      });
      syncCollapseAllLabel();
    });
  }

  // On compact mobile screens, fold secondary modules (04, 05) initially so Setup stays scannable
  if (window.innerWidth <= 860 && modules.length >= 5) {
    [3, 4].forEach((idx) => {
      const mod = modules[idx];
      if (!mod) return;
      mod.classList.remove('open');
      const head = mod.querySelector('.module-head');
      if (head) head.setAttribute('aria-expanded', 'false');
    });
    syncCollapseAllLabel();
  }

  // Prevent focused number inputs inside the left Inspector from hijacking mouse-wheel scrolling
  const controlsBody = document.querySelector('.controls-body');
  if (controlsBody) {
    controlsBody.addEventListener('wheel', (e) => {
      const active = document.activeElement;
      if (active && active.tagName === 'INPUT' && active.type === 'number' && controlsBody.contains(active)) {
        active.blur();
      }
    }, { passive: true });
  }

  // ---- 2. Slice Math & Coordinates Collapsible Drawer ----
  const formulasCard = document.getElementById('formulasCard');
  const formulasToggleBtn = document.getElementById('formulasToggleBtn');

  if (formulasCard && formulasToggleBtn) {
    // Collapse math breakdown by default on mobile so Canvas + Transport fit above the fold
    if (window.innerWidth <= 860) {
      formulasCard.classList.add('collapsed');
      formulasToggleBtn.setAttribute('aria-expanded', 'false');
    }

    formulasToggleBtn.addEventListener('click', () => {
      const isCollapsed = formulasCard.classList.toggle('collapsed');
      formulasToggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    });
  }

  // ---- 3. Darkroom / Paper Theme Controller ----
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const mobileThemeToggleBtn = document.getElementById('mobileThemeToggleBtn');
  const metaThemeColor = document.getElementById('metaThemeColor');

  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', next === 'light' ? '#f2eee5' : '#0d0d0c');
    }
    try {
      localStorage.setItem('flippy_v4_theme', next);
    } catch (e) {}

    // Sync embedded Bezier Curve editors
    ['graphIframe', 'graphIframe2'].forEach((id) => {
      const frame = document.getElementById(id);
      if (frame && frame.contentWindow) {
        try {
          frame.contentWindow.postMessage({ type: 'SET_THEME', theme: next }, '*');
        } catch (e) {}
      }
    });

    window.dispatchEvent(new CustomEvent('flippy:themechange', { detail: { theme: next } }));
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (mobileThemeToggleBtn) mobileThemeToggleBtn.addEventListener('click', toggleTheme);

  // Sync theme to iframes once they finish loading
  ['graphIframe', 'graphIframe2'].forEach((id) => {
    const frame = document.getElementById(id);
    if (frame) {
      frame.addEventListener('load', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        try {
          frame.contentWindow.postMessage({ type: 'SET_THEME', theme: cur }, '*');
        } catch (e) {}
      });
    }
  });

  // ---- 4. Studio Keyboard Shortcuts (Escape closes modals, Space toggles play) ----
  window.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('locked')) return;

    if (e.key === 'Escape') {
      ['graphModal', 'pasteXmlModal', 'importSettingsModal'].forEach((id) => {
        const modal = document.getElementById(id);
        if (modal && modal.style.display !== 'none') {
          modal.style.display = 'none';
        }
      });
      return;
    }

    if (e.code === 'Space') {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || (e.target && e.target.isContentEditable)) {
        return;
      }
      // Do not hijack Space if a modal is open
      const anyModalOpen = ['graphModal', 'pasteXmlModal', 'importSettingsModal'].some((id) => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none';
      });
      if (anyModalOpen) return;

      const hollowPanel = document.getElementById('hollowboxPanel');
      const mobileHbTab = document.getElementById('mobileTabHollowBox');
      const hbVisible = (hollowPanel && hollowPanel.offsetParent !== null) || (mobileHbTab && mobileHbTab.classList.contains('active'));
      if (hbVisible) {
        const hbPlay = document.getElementById('hbPlayBtn');
        if (hbPlay) {
          e.preventDefault();
          hbPlay.click();
        }
        return;
      }

      const previewPanel = document.getElementById('preview-panel');
      const mobilePrevTab = document.getElementById('mobileTabPreview');
      const studioVisible = (previewPanel && previewPanel.offsetParent !== null) || (mobilePrevTab && mobilePrevTab.classList.contains('active'));
      if (studioVisible) {
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
          e.preventDefault();
          playBtn.click();
        }
      }
    }
  });
})();
