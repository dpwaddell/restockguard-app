(function () {
  'use strict';

  var cfg = window.restockguardConfig;
  if (!cfg || !cfg.appUrl || !cfg.shopDomain) return;

  var WIDGET_ID = 'rg-widget';
  var currentVariantId = String(cfg.variantId || '');
  var widgetEl = null;

  // -------------------------------------------------------------------------
  // Build the widget DOM once and insert it
  // -------------------------------------------------------------------------
  function buildWidget() {
    if (document.getElementById(WIDGET_ID)) return;

    var s = cfg.styling || {};
    var btnBg = s.buttonBg || '#111827';
    var btnColor = s.buttonText || '#ffffff';
    var radius = s.borderRadius || '6px';
    var fontSize = s.fontSize || '14px';

    var div = document.createElement('div');
    div.id = WIDGET_ID;
    div.style.cssText = 'margin-top:16px;display:none';
    div.innerHTML =
      '<p style="font-size:' + fontSize + ';font-weight:600;margin:0 0 10px">' +
        escHtml(cfg.buttonText || 'Notify me when back in stock') +
      '</p>' +
      '<form id="rg-form" style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<input id="rg-email" type="email" required placeholder="your@email.com" ' +
          'style="flex:1;min-width:180px;padding:10px 14px;border:1px solid #d1d5db;' +
          'border-radius:' + radius + ';font-size:' + fontSize + ';outline:none"/>' +
        '<button type="submit" ' +
          'style="background:' + btnBg + ';color:' + btnColor + ';border:none;' +
          'border-radius:' + radius + ';padding:10px 20px;font-size:' + fontSize + ';' +
          'font-weight:600;cursor:pointer;white-space:nowrap">' +
          'Notify me' +
        '</button>' +
      '</form>' +
      '<p id="rg-success" style="display:none;font-size:' + fontSize + ';color:#15803d;margin:8px 0 0">' +
        escHtml(cfg.successText || "Thanks! We'll email you when it's back.") +
      '</p>' +
      '<p id="rg-error" style="display:none;font-size:' + fontSize + ';color:#dc2626;margin:8px 0 0"></p>';

    // Insert after the first element with an add-to-cart button, or after the
    // form[action*="/cart"], or at the end of <main> as a last resort.
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
  // Show or hide the widget depending on availability
  // -------------------------------------------------------------------------
  function setVisible(visible) {
    if (!widgetEl) return;
    widgetEl.style.display = visible ? 'block' : 'none';
  }

  // -------------------------------------------------------------------------
  // Fetch fresh availability for a given variantId
  // -------------------------------------------------------------------------
  function fetchAvailability(variantId, cb) {
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
  // Watch for variant selection changes (URL ?variant= param)
  // -------------------------------------------------------------------------
  function onVariantChange(newVariantId) {
    if (String(newVariantId) === currentVariantId) return;
    currentVariantId = String(newVariantId);

    // Reset form state
    var form = document.getElementById('rg-form');
    var successEl = document.getElementById('rg-success');
    if (form) form.style.display = 'flex';
    if (successEl) successEl.style.display = 'none';

    fetchAvailability(currentVariantId, function (outOfStock) {
      setVisible(outOfStock);
    });
  }

  function getUrlVariant() {
    return new URLSearchParams(window.location.search).get('variant');
  }

  function watchVariants() {
    // Listen for URL changes (popstate + pushState monkey-patch)
    var lastVariant = getUrlVariant();

    function checkUrl() {
      var v = getUrlVariant();
      if (v && v !== lastVariant) {
        lastVariant = v;
        onVariantChange(v);
      }
    }

    window.addEventListener('popstate', checkUrl);

    // Intercept pushState for SPAs / theme JS that updates the URL without reload
    var origPush = history.pushState.bind(history);
    history.pushState = function () {
      origPush.apply(history, arguments);
      setTimeout(checkUrl, 50);
    };

    // Also listen to native variant form changes (radio/select with name="id")
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
  // Init
  // -------------------------------------------------------------------------
  function init() {
    buildWidget();
    watchVariants();

    // Show immediately if initial variant is OOS
    var initialOos = cfg.available === false || cfg.available === 'false';
    if (initialOos) {
      setVisible(true);
    } else if (currentVariantId) {
      fetchAvailability(currentVariantId, function (oos) {
        setVisible(oos);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
