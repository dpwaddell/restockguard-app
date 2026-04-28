(function () {
  'use strict';

  var cfg = window.restockguardConfig;
  if (!cfg || !cfg.appUrl || !cfg.shopDomain) return;

  var WIDGET_ID = 'rg-widget';
  var currentVariantId = String(cfg.variantId || '');
  var widgetEl = null;
  var isPreorder = false;

  var FONT_SIZES = { Small: 13, Medium: 15, Large: 17 };

  // -------------------------------------------------------------------------
  // Fetch shop config (styling + messages + preorder) from app
  // -------------------------------------------------------------------------
  function fetchShopConfig(cb) {
    fetch(cfg.appUrl + '/api/widget-config?shop=' + encodeURIComponent(cfg.shopDomain))
      .then(function (r) { return r.json(); })
      .then(function (data) { cb(data); })
      .catch(function () { cb({}); });
  }

  // -------------------------------------------------------------------------
  // Build the widget DOM once and insert it
  // -------------------------------------------------------------------------
  function buildWidget() {
    if (document.getElementById(WIDGET_ID)) return;

    var s = cfg.styling || {};
    var m = cfg.messages || {};

    var btnBg = s.buttonBg || '#111827';
    var btnColor = s.buttonText || '#ffffff';

    var rawRadius = s.borderRadius;
    var radius = (typeof rawRadius === 'number' ? rawRadius : parseInt(rawRadius || '6', 10)) + 'px';

    var rawFontSize = s.fontSize;
    var fsPx = (typeof rawFontSize === 'string' && FONT_SIZES[rawFontSize])
      ? FONT_SIZES[rawFontSize]
      : (typeof rawFontSize === 'number' ? rawFontSize : 14);
    var fontSize = fsPx + 'px';

    var headingText = isPreorder
      ? (cfg.preorderMessage || 'Available for preorder')
      : (m.buttonText || cfg.buttonText || 'Notify me when back in stock');

    var btnText = isPreorder
      ? (m.preorderButtonText || 'Reserve yours now')
      : 'Notify me';

    var successText = isPreorder
      ? "You're reserved! We'll be in touch soon."
      : (m.successMessage || cfg.successText || "Thanks! We'll email you when it's back.");

    var placeholder = m.emailPlaceholder || cfg.emailPlaceholder || 'your@email.com';

    var shipsBy = isPreorder && cfg.preorderShipsBy
      ? '<p style="font-size:' + fontSize + ';color:#6d7175;margin:0 0 10px">' +
          'Ships by: ' + escHtml(cfg.preorderShipsBy) +
        '</p>'
      : '';

    var div = document.createElement('div');
    div.id = WIDGET_ID;
    div.style.cssText = 'margin-top:16px;display:none';
    div.innerHTML =
      '<p style="font-size:' + fontSize + ';font-weight:600;margin:0 0 10px">' +
        escHtml(headingText) +
      '</p>' +
      shipsBy +
      '<form id="rg-form" style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<input id="rg-email" type="email" required placeholder="' + escHtml(placeholder) + '" ' +
          'style="flex:1;min-width:180px;padding:10px 14px;border:1px solid #d1d5db;' +
          'border-radius:' + radius + ';font-size:' + fontSize + ';outline:none"/>' +
        '<button type="submit" ' +
          'style="background:' + btnBg + ';color:' + btnColor + ';border:none;' +
          'border-radius:' + radius + ';padding:10px 20px;font-size:' + fontSize + ';' +
          'font-weight:600;cursor:pointer;white-space:nowrap">' +
          escHtml(btnText) +
        '</button>' +
      '</form>' +
      '<p id="rg-success" style="display:none;font-size:' + fontSize + ';color:#15803d;margin:8px 0 0">' +
        escHtml(successText) +
      '</p>' +
      '<p id="rg-error" style="display:none;font-size:' + fontSize + ';color:#dc2626;margin:8px 0 0"></p>';

    var anchor =
      document.querySelector('[name="add"]') ||
      document.querySelector('[type="submit"][data-add-to-cart]') ||
      document.querySelector('form[action*="/cart"]') ||
      document.querySelector('main');

    if (anchor) {
      anchor.parentNode && anchor.nodeType === 1 && anchor.tagName === 'FORM'
        ? anchor.parentNode.insertBefore(div, anchor.nextSibling)
        : anchor.appendChild(div);
    }

    widgetEl = div;

    document.getElementById('rg-form').addEventListener('submit', handleSubmit);
  }

  // -------------------------------------------------------------------------
  // Show or hide the widget
  // -------------------------------------------------------------------------
  function setVisible(visible) {
    if (!widgetEl) return;
    widgetEl.style.display = visible ? 'block' : 'none';
  }

  // -------------------------------------------------------------------------
  // Fetch fresh availability for a given variantId
  // -------------------------------------------------------------------------
  function fetchAvailability(variantId, cb) {
    if (!cfg.productHandle) { cb(false); return; }
    fetch('/products/' + cfg.productHandle + '.js')
      .then(function (r) { return r.json(); })
      .then(function (product) {
        var v = product.variants.find(function (v) {
          return String(v.id) === String(variantId);
        });
        cb(v ? !v.available : false);
      })
      .catch(function () { cb(false); });
  }

  // -------------------------------------------------------------------------
  // Handle form submission
  // -------------------------------------------------------------------------
  function handleSubmit(e) {
    e.preventDefault();
    var email = document.getElementById('rg-email').value.trim();
    var errEl = document.getElementById('rg-error');
    var successEl = document.getElementById('rg-success');

    errEl.style.display = 'none';

    fetch(cfg.appUrl + '/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopDomain: cfg.shopDomain,
        email: email,
        productId: String(cfg.productId),
        variantId: currentVariantId || null,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          document.getElementById('rg-form').style.display = 'none';
          successEl.style.display = 'block';
        } else {
          errEl.textContent = data.error || 'Something went wrong. Please try again.';
          errEl.style.display = 'block';
        }
      })
      .catch(function () {
        errEl.textContent = 'Something went wrong. Please try again.';
        errEl.style.display = 'block';
      });
  }

  // -------------------------------------------------------------------------
  // Watch for variant selection changes
  // -------------------------------------------------------------------------
  function onVariantChange(newVariantId) {
    if (String(newVariantId) === currentVariantId) return;
    currentVariantId = String(newVariantId);

    var form = document.getElementById('rg-form');
    var successEl = document.getElementById('rg-success');
    if (form) form.style.display = 'flex';
    if (successEl) successEl.style.display = 'none';

    if (isPreorder) return; // preorder widget stays visible regardless

    fetchAvailability(currentVariantId, function (outOfStock) {
      setVisible(outOfStock);
    });
  }

  function getUrlVariant() {
    return new URLSearchParams(window.location.search).get('variant');
  }

  function watchVariants() {
    var lastVariant = getUrlVariant();

    function checkUrl() {
      var v = getUrlVariant();
      if (v && v !== lastVariant) {
        lastVariant = v;
        onVariantChange(v);
      }
    }

    window.addEventListener('popstate', checkUrl);

    var origPush = history.pushState.bind(history);
    history.pushState = function () {
      origPush.apply(history, arguments);
      setTimeout(checkUrl, 50);
    };

    document.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'id') {
        onVariantChange(e.target.value);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // -------------------------------------------------------------------------
  // Init — fetch shop config first, then build
  // -------------------------------------------------------------------------
  function init() {
    fetchShopConfig(function (shopConfig) {
      // Merge styling: API values override block defaults
      if (shopConfig.styling && Object.keys(shopConfig.styling).length) {
        cfg.styling = Object.assign({}, cfg.styling || {}, shopConfig.styling);
      }

      // Messages from app settings
      if (shopConfig.messages) {
        cfg.messages = shopConfig.messages;
      }

      // Check if preorder mode is enabled for this product
      var preorderConfig =
        shopConfig.preorderConfigs && shopConfig.preorderConfigs[String(cfg.productId)];
      if (preorderConfig && preorderConfig.enabled) {
        isPreorder = true;
        cfg.preorderMessage = preorderConfig.preorderMessage || '';
        cfg.preorderShipsBy = preorderConfig.shipsBy || '';
      }

      buildWidget();
      watchVariants();

      if (isPreorder) {
        // Preorder widget is always visible regardless of stock status
        setVisible(true);
      } else {
        // cfg.available is passed from Liquid and is authoritative for initial load
        var initialOos = cfg.available === false || cfg.available === 'false';
        setVisible(initialOos);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
