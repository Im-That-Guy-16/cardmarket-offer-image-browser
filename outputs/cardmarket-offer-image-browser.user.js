// ==UserScript==
// @name         Cardmarket Offer Image Browser
// @namespace    local.cardmarket.offer-image-browser
// @version      1.2.0
// @description  Adds a full-page cached carousel modal with card images and offer details to Cardmarket seller offer pages.
// @author       You
// @match        https://www.cardmarket.com/*/Magic/Users/*/Offers/Singles*
// @downloadURL  https://gitlab.com/Prism_16/cardmarket-offer-image-browser/-/raw/main/outputs/cardmarket-offer-image-browser.user.js
// @updateURL    https://gitlab.com/Prism_16/cardmarket-offer-image-browser/-/raw/main/outputs/cardmarket-offer-image-browser.user.js
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    browserImageWidth: 330,
  };

  const state = {
    cards: [],
    selectedIndex: 0,
    ui: null,
    observer: null,
    refreshTimer: null,
    cacheKey: null,
    allPagesLoaded: false,
    loading: false,
    loadingPromise: null,
  };

  GM_addStyle(`
    .cmib-open-browser {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 99999;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 14px;
      border: 1px solid rgba(147, 197, 253, 0.7);
      border-radius: 6px;
      color: #e5e7eb;
      background: rgba(17, 24, 39, 0.96);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.38);
      font: 700 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .cmib-open-browser:hover {
      background: rgba(30, 41, 59, 0.98);
    }

    .cmib-modal {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(3, 7, 18, 0.68);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .cmib-modal.cmib-open {
      display: flex;
    }

    .cmib-loader {
      position: fixed;
      inset: 0;
      z-index: 100001;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(3, 7, 18, 0.78);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .cmib-loader.cmib-open {
      display: flex;
    }

    .cmib-loader-box {
      display: flex;
      width: min(360px, calc(100vw - 40px));
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 22px;
      border: 1px solid rgba(148, 163, 184, 0.38);
      border-radius: 8px;
      color: #e5e7eb;
      background: rgba(17, 24, 39, 0.98);
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.48);
      text-align: center;
    }

    .cmib-spinner {
      width: 42px;
      height: 42px;
      border: 4px solid rgba(147, 197, 253, 0.22);
      border-top-color: #93c5fd;
      border-radius: 50%;
      animation: cmib-spin 0.8s linear infinite;
    }

    .cmib-loader-title {
      font-size: 14px;
      font-weight: 800;
    }

    .cmib-loader-progress {
      color: #aab4c4;
      font-size: 13px;
    }

    @keyframes cmib-spin {
      to {
        transform: rotate(360deg);
      }
    }

    .cmib-dialog {
      width: min(1120px, calc(100vw - 36px));
      max-height: calc(100vh - 36px);
      color: #e5e7eb;
      background: rgba(17, 24, 39, 0.98);
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 8px;
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.48);
      overflow: hidden;
    }

    .cmib-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.28);
    }

    .cmib-title {
      min-width: 0;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cmib-title span {
      color: #aab4c4;
      font-weight: 500;
    }

    .cmib-btn {
      width: 32px;
      height: 32px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 6px;
      color: #e5e7eb;
      background: rgba(31, 41, 55, 0.9);
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
    }

    .cmib-btn:hover {
      background: rgba(55, 65, 81, 0.95);
    }

    .cmib-body {
      display: grid;
      grid-template-columns: minmax(260px, 390px) minmax(260px, 1fr) minmax(220px, 280px);
      gap: 14px;
      max-height: calc(100vh - 96px);
      padding: 14px;
      overflow: auto;
    }

    .cmib-stage {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 455px;
      background: rgba(3, 7, 18, 0.35);
      border-radius: 6px;
      overflow: hidden;
    }

    .cmib-stage img {
      width: ${CONFIG.browserImageWidth}px;
      max-width: 100%;
      max-height: 455px;
      object-fit: contain;
    }

    .cmib-stage-text {
      padding: 22px;
      color: #aab4c4;
      font-size: 13px;
      text-align: center;
    }

    .cmib-controls {
      display: grid;
      grid-template-columns: 38px 1fr 38px;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }

    .cmib-card-name {
      min-width: 0;
      color: #dbeafe;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cmib-meta {
      margin-top: 8px;
      color: #aab4c4;
      font-size: 12px;
      text-align: center;
    }

    .cmib-details {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 10px;
    }

    .cmib-card-heading {
      margin: 0;
      color: #dbeafe;
      font-size: 24px;
      line-height: 1.15;
      letter-spacing: 0;
    }

    .cmib-detail-grid {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr);
      gap: 8px 12px;
      padding: 12px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.48);
      font-size: 13px;
    }

    .cmib-label {
      color: #94a3b8;
      font-weight: 700;
    }

    .cmib-value {
      min-width: 0;
      color: #e5e7eb;
      overflow-wrap: anywhere;
    }

    .cmib-product-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      width: fit-content;
      padding: 0 12px;
      border: 1px solid rgba(147, 197, 253, 0.65);
      border-radius: 6px;
      color: #bfdbfe;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }

    .cmib-product-link:hover {
      color: #dbeafe;
      background: rgba(30, 41, 59, 0.9);
    }

    .cmib-basket {
      display: grid;
      grid-template-columns: minmax(72px, 110px) minmax(120px, 1fr);
      gap: 8px;
      align-items: center;
      padding: 12px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.48);
    }

    .cmib-qty {
      min-height: 36px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 6px;
      color: #e5e7eb;
      background: rgba(31, 41, 55, 0.96);
      font: 700 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .cmib-add {
      min-height: 36px;
      border: 1px solid rgba(74, 222, 128, 0.58);
      border-radius: 6px;
      color: #dcfce7;
      background: rgba(22, 101, 52, 0.86);
      font: 800 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .cmib-add:hover {
      background: rgba(21, 128, 61, 0.95);
    }

    .cmib-basket-status {
      grid-column: 1 / -1;
      min-height: 16px;
      color: #aab4c4;
      font-size: 12px;
    }

    .cmib-list-wrap {
      display: flex;
      min-width: 0;
      min-height: 0;
      flex-direction: column;
      gap: 8px;
    }

    .cmib-list-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 800;
    }

    .cmib-card-list {
      display: flex;
      min-height: 260px;
      max-height: 560px;
      flex-direction: column;
      gap: 4px;
      overflow: auto;
      padding: 6px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.48);
    }

    .cmib-list-item {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 8px;
      width: 100%;
      min-height: 42px;
      padding: 6px 8px;
      border: 1px solid transparent;
      border-radius: 6px;
      color: #e5e7eb;
      background: transparent;
      text-align: left;
      cursor: pointer;
    }

    .cmib-list-item:hover,
    .cmib-list-item.cmib-selected {
      border-color: rgba(147, 197, 253, 0.58);
      background: rgba(30, 41, 59, 0.9);
    }

    .cmib-list-index {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.35;
    }

    .cmib-list-name {
      min-width: 0;
      overflow: hidden;
      color: #dbeafe;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cmib-list-meta {
      min-width: 0;
      overflow: hidden;
      color: #aab4c4;
      font-size: 11px;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 900px) {
      .cmib-body {
        grid-template-columns: 1fr;
      }

      .cmib-stage {
        min-height: 280px;
      }

      .cmib-stage img {
        max-height: 280px;
      }

      .cmib-detail-grid {
        grid-template-columns: 96px minmax(0, 1fr);
      }
    }
  `);

  function absoluteUrl(url) {
    try {
      return new URL(url, location.origin).href;
    } catch {
      return null;
    }
  }

  function absoluteUrlFrom(url, baseUrl) {
    try {
      return new URL(url, baseUrl || location.origin).href;
    } catch {
      return null;
    }
  }

  function currentCacheKey() {
    const url = new URL(location.href);
    url.searchParams.delete('site');
    return `${url.pathname}?${url.searchParams.toString()}`;
  }

  function getCurrentPageNumber() {
    const value = new URL(location.href).searchParams.get('site');
    const page = Number.parseInt(value || '1', 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  function pageUrl(pageNumber) {
    const url = new URL(location.href);
    url.searchParams.set('site', String(pageNumber));
    return url.href;
  }

  function totalPagesFrom(root) {
    const text = cleanText(root.body?.textContent || root.textContent);
    const pageMatch = text.match(/Page\s+\d+\s+of\s+(\d+)/i);
    if (pageMatch) return Number.parseInt(pageMatch[1], 10);

    const sites = [...root.querySelectorAll('a[href*="site="]')]
      .map((link) => {
        try {
          return Number.parseInt(new URL(link.getAttribute('href'), location.origin).searchParams.get('site') || '', 10);
        } catch {
          return NaN;
        }
      })
      .filter(Number.isFinite);

    return sites.length ? Math.max(...sites) : 1;
  }

  function rowNameLink(row) {
    const preferred = row.querySelector('.col-seller a[href*="/Products/Singles/"]');
    if (preferred) return preferred;

    const links = [...row.querySelectorAll('a[href]')];
    return links.find((link) => /\/Products\/Singles\//.test(link.getAttribute('href') || '')) || null;
  }

  function cardNameFromLink(link) {
    return link.textContent.replace(/\s+/g, ' ').trim();
  }

  function cleanText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function existingImageFromRow(row) {
    const values = [];
    row.querySelectorAll('[data-bs-title], [data-original-title], [data-bs-original-title], [title], img[src]').forEach((node) => {
      if (node.tagName === 'IMG') values.push(node.getAttribute('src'));
      values.push(node.getAttribute('data-bs-title'));
      values.push(node.getAttribute('data-original-title'));
      values.push(node.getAttribute('data-bs-original-title'));
      values.push(node.getAttribute('title'));
    });

    for (const value of values.filter(Boolean)) {
      const decoded = decodeHtml(value);
      const match = decoded.match(/https?:\/\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s<>]*)?/i)
        || decoded.match(/(?:\/\/|\/)[^"'\s<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s<>]*)?/i);
      if (match) return absoluteUrl(match[0].replace(/^\/\//, `${location.protocol}//`));
    }

    return null;
  }

  function decodeHtml(html) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }

  function titleFrom(node) {
    return cleanText(
      node?.getAttribute('aria-label')
      || node?.getAttribute('data-bs-original-title')
      || node?.getAttribute('data-original-title')
      || node?.getAttribute('title')
      || node?.textContent
    );
  }

  function rowDetailText(row, selector) {
    return cleanText(row.querySelector(selector)?.textContent);
  }

  function collectCardDetails(row) {
    const expansionNode = row.querySelector('.expansion-symbol');
    const rarityNode = row.querySelector('.product-attributes svg[aria-label]');
    const conditionNode = row.querySelector('.article-condition');
    const languageNode = [...row.querySelectorAll('.product-attributes [aria-label], .product-attributes [data-original-title], .product-attributes [data-bs-original-title]')]
      .find((node) => /English|German|French|Spanish|Italian|Portuguese|Japanese|Korean|Russian|Chinese|Dutch|Polish|Czech|Hungarian/i.test(titleFrom(node)));
    const foilNode = [...row.querySelectorAll('.product-attributes [aria-label], .product-attributes [data-original-title], .product-attributes [data-bs-original-title], .product-attributes .icon')]
      .find((node) => /foil/i.test(titleFrom(node) || cleanText(node.textContent)));

    return {
      expansion: titleFrom(expansionNode),
      rarity: titleFrom(rarityNode),
      condition: titleFrom(conditionNode),
      language: titleFrom(languageNode),
      finish: foilNode ? titleFrom(foilNode) || 'Foil' : 'Non-foil',
      price: rowDetailText(row, '.price-container .color-primary') || rowDetailText(row, '.mobile-offer-container .color-primary'),
      available: rowDetailText(row, '.amount-container .item-count'),
    };
  }

  function articleIdFromRow(row) {
    const rowMatch = row.id?.match(/stockRow(\d+)/);
    if (rowMatch) return rowMatch[1];

    const inputName = row.querySelector('input[name^="idArticle["]')?.name || '';
    const inputMatch = inputName.match(/idArticle\[(\d+)\]/);
    return inputMatch ? inputMatch[1] : '';
  }

  function collectCartInfo(row, articleId) {
    const amountOptions = [...row.querySelectorAll(`select[name="amount[${articleId}]"] option, #amount${articleId} option`)]
      .map((option) => Number.parseInt(option.value || option.textContent || '', 10))
      .filter(Number.isFinite);
    const available = Number.parseInt(rowDetailText(row, '.amount-container .item-count') || '1', 10);
    const maxAmount = amountOptions.length ? Math.max(...amountOptions) : Math.max(1, available || 1);

    return {
      articleId,
      maxAmount,
      modalUrl: absoluteUrl(row.querySelector('[data-modal]')?.getAttribute('data-modal')),
    };
  }

  function bindRow(card) {
    if (card.row.dataset.cmibBound === 'true') return;

    const openFromRow = (event) => {
      event.preventDefault();
      event.stopPropagation();
      loadAllPagesAndOpen(card.articleId || card.productUrl);
    };

    card.row.querySelector('.thumbnail-icon, .cmib-thumb')?.addEventListener('click', openFromRow);
    card.row.querySelector('.col-thumbnail')?.addEventListener('click', openFromRow);
    card.row.dataset.cmibBound = 'true';
  }

  function collectCardsFromRoot(root, pageNumber, baseUrl) {
    const rows = [...root.querySelectorAll('#UserOffersTable [id^="stockRow"], #UserOffersTable .article-row')];
    const cards = [];
    const seen = new Set();

    for (const row of rows) {
      const link = rowNameLink(row);
      if (!link) continue;

      const articleId = articleIdFromRow(row) || row.id || row.querySelector('input[name^="idArticle"]')?.name || link.getAttribute('href');
      const productUrl = absoluteUrlFrom(link.getAttribute('href'), baseUrl);
      const name = cardNameFromLink(link);
      if (!productUrl || !name || seen.has(articleId)) continue;

      seen.add(articleId);
      cards.push({
        articleId,
        row,
        link,
        name,
        pageNumber,
        productUrl,
        imageUrl: existingImageFromRow(row),
        details: collectCardDetails(row),
        cart: collectCartInfo(row, articleId),
      });
    }

    return cards;
  }

  function collectCards() {
    return collectCardsFromRoot(document, getCurrentPageNumber(), location.href);
  }

  function showLoader(message, progress) {
    if (!state.ui) return;
    state.loading = true;
    state.ui.loader.classList.add('cmib-open');
    state.ui.loaderTitle.textContent = message || 'Loading cards';
    state.ui.loaderProgress.textContent = progress || '';
    state.ui.openButton.disabled = true;
  }

  function hideLoader() {
    if (!state.ui) return;
    state.loading = false;
    state.ui.loader.classList.remove('cmib-open');
    state.ui.openButton.disabled = false;
  }

  function requestText(url) {
    if (typeof window.fetch === 'function') {
      return window.fetch(url, { credentials: 'include' }).then(async (response) => {
        const text = await response.text();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return text;
      });
    }

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.withCredentials = true;
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          resolve(request.responseText || '');
        } else {
          reject(new Error(`HTTP ${request.status}`));
        }
      };
      request.onerror = () => reject(new Error('Network request failed'));
      request.send();
    });
  }

  async function fetchPageCards(pageNumber, totalPages) {
    const url = pageUrl(pageNumber);
    showLoader('Caching Cardmarket offer pages', `Page ${pageNumber} of ${totalPages}`);

    const html = await requestText(url).catch((error) => {
      throw new Error(`Page ${pageNumber} failed: ${error.message}`);
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = collectCardsFromRoot(doc, pageNumber, url);
    if (!rows.length && /Just a moment|Attention Required|Cloudflare/i.test(doc.title || html)) {
      throw new Error(`Page ${pageNumber} was blocked by Cardmarket's protection page`);
    }

    return rows;
  }

  async function loadAllPages() {
    const key = currentCacheKey();
    if (state.allPagesLoaded && state.cacheKey === key && state.cards.length) return;
    if (state.loadingPromise) return state.loadingPromise;

    const totalPages = Math.max(1, totalPagesFrom(document));
    const allCards = [];

    state.loadingPromise = (async () => {
      try {
      for (let page = 1; page <= totalPages; page += 1) {
        const pageCards = await fetchPageCards(page, totalPages);
        allCards.push(...pageCards);
      }

      state.cards = allCards;
      state.cacheKey = key;
      state.allPagesLoaded = true;
      state.selectedIndex = Math.min(state.selectedIndex, Math.max(0, state.cards.length - 1));
      renderBrowser();
      renderCardList();
      } finally {
        hideLoader();
        state.loadingPromise = null;
      }
    })();

    return state.loadingPromise;
  }

  async function loadAllPagesAndOpen(preferredArticleId) {
    try {
      await loadAllPages();
      const preferredIndex = preferredArticleId
        ? state.cards.findIndex((card) => card.articleId === preferredArticleId || card.productUrl === preferredArticleId)
        : state.selectedIndex;
      openModal(preferredIndex >= 0 ? preferredIndex : state.selectedIndex, false);
    } catch (error) {
      hideLoader();
      openModal(0, false);
      state.ui.stage.innerHTML = `<div class="cmib-stage-text">${error.message || 'Could not cache every page.'}</div>`;
    }
  }

  function buildModal() {
    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'cmib-open-browser';
    openButton.textContent = 'Card images';
    openButton.addEventListener('click', () => loadAllPagesAndOpen());

    const modal = document.createElement('section');
    modal.className = 'cmib-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="cmib-dialog" role="dialog" aria-modal="true" aria-label="Card image browser">
      <div class="cmib-bar">
          <div class="cmib-title">Card images <span></span></div>
          <button type="button" class="cmib-btn cmib-close" title="Close">×</button>
      </div>
      <div class="cmib-body">
          <div>
            <div class="cmib-stage"><div class="cmib-stage-text">Select a card row</div></div>
            <div class="cmib-controls">
              <button type="button" class="cmib-btn cmib-prev" title="Previous card">‹</button>
              <div class="cmib-card-name"></div>
              <button type="button" class="cmib-btn cmib-next" title="Next card">›</button>
            </div>
            <div class="cmib-meta"></div>
          </div>
          <div class="cmib-details">
            <h2 class="cmib-card-heading"></h2>
            <div class="cmib-detail-grid"></div>
            <div class="cmib-basket">
              <select class="cmib-qty" title="Quantity"></select>
              <button type="button" class="cmib-add">Add to basket</button>
              <div class="cmib-basket-status"></div>
            </div>
            <a class="cmib-product-link" target="_blank" rel="noopener">Open Cardmarket product</a>
          </div>
          <div class="cmib-list-wrap">
            <div class="cmib-list-title">
              <span>All cached cards</span>
              <span class="cmib-list-count"></span>
            </div>
            <div class="cmib-card-list"></div>
          </div>
        </div>
      </div>
    `;

    const loader = document.createElement('section');
    loader.className = 'cmib-loader';
    loader.innerHTML = `
      <div class="cmib-loader-box" role="status" aria-live="polite">
        <div class="cmib-spinner"></div>
        <div class="cmib-loader-title">Loading cards</div>
        <div class="cmib-loader-progress"></div>
      </div>
    `;

    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    modal.querySelector('.cmib-close').addEventListener('click', closeModal);
    modal.querySelector('.cmib-prev').addEventListener('click', () => move(-1));
    modal.querySelector('.cmib-next').addEventListener('click', () => move(1));
    modal.querySelector('.cmib-add').addEventListener('click', addSelectedToBasket);

    document.body.append(openButton, modal, loader);
    state.ui = {
      openButton,
      modal,
      loader,
      loaderTitle: loader.querySelector('.cmib-loader-title'),
      loaderProgress: loader.querySelector('.cmib-loader-progress'),
      titleCount: modal.querySelector('.cmib-title span'),
      stage: modal.querySelector('.cmib-stage'),
      name: modal.querySelector('.cmib-card-name'),
      meta: modal.querySelector('.cmib-meta'),
      heading: modal.querySelector('.cmib-card-heading'),
      detailGrid: modal.querySelector('.cmib-detail-grid'),
      qty: modal.querySelector('.cmib-qty'),
      addButton: modal.querySelector('.cmib-add'),
      basketStatus: modal.querySelector('.cmib-basket-status'),
      productLink: modal.querySelector('.cmib-product-link'),
      listCount: modal.querySelector('.cmib-list-count'),
      cardList: modal.querySelector('.cmib-card-list'),
    };
  }

  function openModal(index, scroll) {
    if (!state.cards.length || !state.ui) return;
    state.ui.modal.classList.add('cmib-open');
    state.ui.modal.setAttribute('aria-hidden', 'false');
    selectCard(index, scroll);
  }

  function closeModal() {
    if (!state.ui) return;
    state.ui.modal.classList.remove('cmib-open');
    state.ui.modal.setAttribute('aria-hidden', 'true');
  }

  function selectCard(index, scroll) {
    if (!state.cards.length) return;
    const nextIndex = ((index % state.cards.length) + state.cards.length) % state.cards.length;
    state.selectedIndex = nextIndex;
    const card = state.cards[state.selectedIndex];
    if (scroll && card.row?.isConnected) card.row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    renderBrowser();
    updateCardListSelection();
  }

  function move(direction) {
    selectCard(state.selectedIndex + direction, true);
  }

  function renderBrowser() {
    if (!state.ui) return;
    const card = state.cards[state.selectedIndex];
    state.ui.stage.textContent = '';

    if (!card) {
      state.ui.stage.innerHTML = '<div class="cmib-stage-text">No cards found on this page</div>';
      state.ui.name.textContent = '';
      state.ui.meta.textContent = '';
      state.ui.heading.textContent = '';
      state.ui.detailGrid.textContent = '';
      return;
    }

    state.ui.titleCount.textContent = `${state.selectedIndex + 1} of ${state.cards.length}`;
    state.ui.name.textContent = card.name;
    state.ui.meta.textContent = `${state.selectedIndex + 1} of ${state.cards.length}`;
    state.ui.heading.textContent = card.name;
    state.ui.productLink.href = card.productUrl;
    renderDetails(card);
    renderBasket(card);

    if (card.imageUrl) {
      const img = document.createElement('img');
      img.src = card.imageUrl;
      img.alt = card.name;
      state.ui.stage.append(img);
      return;
    }

    const text = document.createElement('div');
    text.className = 'cmib-stage-text';
    text.textContent = 'No image found in this row';
    state.ui.stage.append(text);
  }

  function renderBasket(card) {
    state.ui.qty.textContent = '';
    const maxAmount = Math.max(1, card.cart?.maxAmount || Number.parseInt(card.details.available || '1', 10) || 1);
    for (let amount = 1; amount <= maxAmount; amount += 1) {
      const option = document.createElement('option');
      option.value = String(amount);
      option.textContent = String(amount);
      state.ui.qty.append(option);
    }
    state.ui.addButton.disabled = !card.cart?.articleId;
    state.ui.basketStatus.textContent = card.cart?.articleId ? '' : 'No article id found for this card.';
  }

  function addDetail(label, value) {
    if (!value) return;

    const labelNode = document.createElement('div');
    labelNode.className = 'cmib-label';
    labelNode.textContent = label;

    const valueNode = document.createElement('div');
    valueNode.className = 'cmib-value';
    valueNode.textContent = value;

    state.ui.detailGrid.append(labelNode, valueNode);
  }

  function renderDetails(card) {
    state.ui.detailGrid.textContent = '';
    addDetail('Page', card.pageNumber ? String(card.pageNumber) : '');
    addDetail('Expansion', card.details.expansion);
    addDetail('Rarity', card.details.rarity);
    addDetail('Condition', card.details.condition);
    addDetail('Language', card.details.language);
    addDetail('Finish', card.details.finish);
    addDetail('Price', card.details.price);
    addDetail('Available', card.details.available);
  }

  function setBasketStatus(message) {
    if (!state.ui?.basketStatus) return;
    state.ui.basketStatus.textContent = message;
  }

  function addSelectedToBasket() {
    const card = state.cards[state.selectedIndex];
    const articleId = card?.cart?.articleId;
    if (!card || !articleId) {
      setBasketStatus('Could not find the Cardmarket article id for this card.');
      return;
    }

    const amount = Math.max(1, Number.parseInt(state.ui.qty.value || '1', 10) || 1);
    setBasketStatus(`Adding ${amount} to basket...`);

    const liveButton = card.row?.isConnected
      ? card.row.querySelector(`button[data-id-amount="${articleId}"], button[aria-label="Put in shopping cart"]`)
      : null;

    if (liveButton) {
      const liveSelect = card.row.querySelector(`#amount${articleId}, select[name="amount[${articleId}]"]`);
      if (liveSelect) {
        liveSelect.value = String(amount);
        liveSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      liveButton.click();
      setBasketStatus(`Asked Cardmarket to add ${amount} to basket.`);
      return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.dataset.ajaxAction = 'ShoppingCart_Add_AddArticlesFromUserOffers';
    form.dataset.ajaxLoader = 'UserOffersTable';
    form.dataset.ajaxCallback = 'Offers.addArticlesCB';
    form.style.display = 'none';
    form.innerHTML = `
      <input type="hidden" name="__cmtkn" autocomplete="off">
      <button type="submit" data-id-amount="${articleId}" aria-label="Put in shopping cart"></button>
      <input type="hidden" name="idArticle[${articleId}]" value="">
      <input type="hidden" name="amount[${articleId}]" value="${amount}">
    `;

    document.body.append(form);
    form.querySelector('button').click();
    window.setTimeout(() => form.remove(), 5000);
    setBasketStatus(`Asked Cardmarket to add ${amount} to basket.`);
  }

  function renderCardList() {
    if (!state.ui?.cardList) return;

    state.ui.listCount.textContent = `${state.cards.length}`;
    state.ui.cardList.textContent = '';

    const fragment = document.createDocumentFragment();
    state.cards.forEach((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cmib-list-item';
      button.dataset.index = String(index);
      button.innerHTML = `
        <span class="cmib-list-index">${index + 1}</span>
        <span>
          <span class="cmib-list-name"></span>
          <span class="cmib-list-meta"></span>
        </span>
      `;
      button.querySelector('.cmib-list-name').textContent = card.name;
      button.querySelector('.cmib-list-meta').textContent = [
        card.details.price,
        card.details.available ? `${card.details.available} available` : '',
        card.details.finish,
        card.pageNumber ? `page ${card.pageNumber}` : '',
      ].filter(Boolean).join(' • ');
      button.addEventListener('click', () => selectCard(index, false));
      fragment.append(button);
    });

    state.ui.cardList.append(fragment);
    updateCardListSelection();
  }

  function updateCardListSelection() {
    if (!state.ui?.cardList) return;

    state.ui.cardList.querySelectorAll('.cmib-list-item').forEach((item) => {
      item.classList.toggle('cmib-selected', Number.parseInt(item.dataset.index || '-1', 10) === state.selectedIndex);
    });

    state.ui.cardList.querySelector('.cmib-list-item.cmib-selected')?.scrollIntoView({
      block: 'nearest',
    });
  }

  function refreshCards() {
    const oldSelectedUrl = state.cards[state.selectedIndex]?.productUrl;
    const key = currentCacheKey();
    if (state.cacheKey && state.cacheKey !== key) {
      state.cacheKey = null;
      state.allPagesLoaded = false;
    }

    if (state.allPagesLoaded && state.cacheKey === key) {
      collectCards().forEach(bindRow);
      renderBrowser();
      renderCardList();
      return;
    }

    state.cards = collectCards();

    for (const card of state.cards) {
      bindRow(card);
    }

    const preservedIndex = state.cards.findIndex((card) => card.productUrl === oldSelectedUrl);
    state.selectedIndex = Math.max(0, preservedIndex);
    renderBrowser();
    renderCardList();
  }

  function start() {
    if (!/\/Users\/.+\/Offers\/Singles/.test(location.pathname)) return;

    buildModal();
    refreshCards();

    const table = document.querySelector('#UserOffersTable');
    if (table) {
      state.observer = new MutationObserver(() => {
        window.clearTimeout(state.refreshTimer);
        state.refreshTimer = window.setTimeout(refreshCards, 100);
      });
      state.observer.observe(table, { childList: true });
    }

    document.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (event.key === 'Escape') closeModal();
      if (!state.ui?.modal.classList.contains('cmib-open')) return;
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    });
  }

  start();
})();
