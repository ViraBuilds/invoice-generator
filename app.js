// Invoice Generator — free, in-browser. No backend, no accounts.
// Drafts are saved to localStorage only and never leave the device.
(function () {
  'use strict';

  var STORAGE_KEY = 'vira-invoice-generator-draft-v1';

  var CURRENCIES = {
    GBP: { symbol: '£', locale: 'en-GB' },
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'de-DE' }
  };

  // ---------- Element helpers ----------
  function $(id) { return document.getElementById(id); }

  var els = {
    bizName: $('bizName'), bizEmail: $('bizEmail'), bizAddress: $('bizAddress'),
    clientName: $('clientName'), clientEmail: $('clientEmail'), clientAddress: $('clientAddress'),
    invoiceNumber: $('invoiceNumber'), issueDate: $('issueDate'), dueDate: $('dueDate'),
    currency: $('currency'), taxRate: $('taxRate'),
    discountType: $('discountType'), discountValue: $('discountValue'),
    paymentDetails: $('paymentDetails'), notes: $('notes'),
    itemsBody: $('itemsBody'),
    logoBadge: $('logoBadge'),
    pvBizName: $('pvBizName'), pvBizEmail: $('pvBizEmail'), pvBizAddress: $('pvBizAddress'),
    pvClientName: $('pvClientName'), pvClientEmail: $('pvClientEmail'), pvClientAddress: $('pvClientAddress'),
    pvInvoiceNumber: $('pvInvoiceNumber'), pvIssueDate: $('pvIssueDate'), pvDueDate: $('pvDueDate'),
    pvItemsBody: $('pvItemsBody'),
    pvSubtotal: $('pvSubtotal'), pvDiscountRow: $('pvDiscountRow'),
    pvDiscountLabel: $('pvDiscountLabel'), pvDiscount: $('pvDiscount'),
    pvTaxRate: $('pvTaxRate'), pvTax: $('pvTax'), pvGrandTotal: $('pvGrandTotal'),
    pvNotes: $('pvNotes'), pvPaymentDetails: $('pvPaymentDetails'),
    qrCode: $('qrCode')
  };

  // ---------- Money ----------
  function currencySymbol() {
    var c = CURRENCIES[els.currency.value] || CURRENCIES.GBP;
    return c.symbol;
  }

  function fmt(amount) {
    var n = Number(amount);
    if (!isFinite(n)) n = 0;
    return currencySymbol() + n.toFixed(2);
  }

  function num(value) {
    var n = parseFloat(value);
    return isFinite(n) && n >= 0 ? n : 0;
  }

  // ---------- Calculation ----------
  // Order: discount is applied to the subtotal first, then tax is charged
  // on the discounted amount. Grand total = (subtotal - discount) + tax.
  function calculate(items) {
    var subtotal = 0;
    items.forEach(function (it) {
      subtotal += num(it.qty) * num(it.price);
    });
    subtotal = round2(subtotal);

    var discount = 0;
    var dv = num(els.discountValue.value);
    if (els.discountType.value === 'percent') {
      discount = round2(subtotal * Math.min(dv, 100) / 100);
    } else {
      discount = round2(Math.min(dv, subtotal));
    }

    var taxable = round2(subtotal - discount);
    var tax = round2(taxable * Math.min(num(els.taxRate.value), 100) / 100);
    var total = round2(taxable + tax);

    return { subtotal: subtotal, discount: discount, taxable: taxable, tax: tax, total: total };
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // ---------- Line items ----------
  function readItems() {
    var items = [];
    var rows = els.itemsBody.querySelectorAll('tr');
    rows.forEach(function (row) {
      items.push({
        desc: row.querySelector('.item-desc').value,
        qty: row.querySelector('.item-qty').value,
        price: row.querySelector('.item-price').value
      });
    });
    return items;
  }

  function addItemRow(item) {
    item = item || {};
    item = {
      desc: item.desc != null ? item.desc : '',
      qty: item.qty != null && item.qty !== '' ? item.qty : 1,
      price: item.price != null && item.price !== '' ? item.price : 0
    };
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" class="item-desc" placeholder="Service or product" value=""></td>' +
      '<td><input type="number" class="item-qty qty" min="0" step="any" value="1"></td>' +
      '<td><input type="number" class="item-price price" min="0" step="0.01" value="0"></td>' +
      '<td class="amount"></td>' +
      '<td><button type="button" class="row-remove" aria-label="Remove line item" title="Remove line item">&times;</button></td>';
    tr.querySelector('.item-desc').value = item.desc;
    tr.querySelector('.item-qty').value = item.qty;
    tr.querySelector('.item-price').value = item.price;
    tr.querySelector('.row-remove').addEventListener('click', function () {
      tr.remove();
      render();
    });
    els.itemsBody.appendChild(tr);
    return tr;
  }

  // ---------- Logo badge (business initials) ----------
  function initials(name) {
    var words = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '—';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  // ---------- QR code (optional, needs the CDN library) ----------
  function renderQr(link) {
    els.qrCode.innerHTML = '';
    if (!link || !/^https?:\/\//i.test(link.trim())) return;
    if (typeof window.qrcode !== 'function') return; // CDN unreachable: skip silently
    try {
      var qr = window.qrcode(0, 'M');
      qr.addData(link.trim());
      qr.make();
      els.qrCode.innerHTML = qr.createImgTag(4, 0);
    } catch (e) {
      els.qrCode.innerHTML = '';
    }
  }

  // ---------- Render preview ----------
  function render() {
    var items = readItems();
    var totals = calculate(items);

    // Business / client
    els.pvBizName.textContent = els.bizName.value.trim() || 'Your Business';
    els.pvBizEmail.textContent = els.bizEmail.value.trim();
    els.pvBizAddress.textContent = els.bizAddress.value.trim();
    els.pvClientName.textContent = els.clientName.value.trim() || 'Client';
    els.pvClientEmail.textContent = els.clientEmail.value.trim();
    els.pvClientAddress.textContent = els.clientAddress.value.trim();
    els.logoBadge.textContent = initials(els.bizName.value);

    // Meta
    els.pvInvoiceNumber.textContent = els.invoiceNumber.value.trim() || '—';
    els.pvIssueDate.textContent = els.issueDate.value || '—';
    els.pvDueDate.textContent = els.dueDate.value || '—';

    // Items: per-line amounts in the editor, preview rows
    var rows = els.itemsBody.querySelectorAll('tr');
    els.pvItemsBody.innerHTML = '';
    rows.forEach(function (row, i) {
      var amount = round2(num(items[i].qty) * num(items[i].price));
      row.querySelector('.amount').textContent = fmt(amount);
      var tr = document.createElement('tr');
      var cells = [
        items[i].desc.trim() || 'Item',
        String(num(items[i].qty)),
        fmt(items[i].price),
        fmt(amount)
      ];
      cells.forEach(function (text, j) {
        var td = document.createElement('td');
        if (j > 0) td.className = 'num';
        td.textContent = text;
        tr.appendChild(td);
      });
      els.pvItemsBody.appendChild(tr);
    });

    // Totals
    els.pvSubtotal.textContent = fmt(totals.subtotal);
    if (totals.discount > 0) {
      els.pvDiscountRow.style.display = '';
      els.pvDiscountLabel.textContent = els.discountType.value === 'percent'
        ? 'Discount (' + num(els.discountValue.value) + '%)'
        : 'Discount';
      els.pvDiscount.textContent = '−' + fmt(totals.discount);
    } else {
      els.pvDiscountRow.style.display = 'none';
    }
    els.pvTaxRate.textContent = String(num(els.taxRate.value));
    els.pvTax.textContent = fmt(totals.tax);
    els.pvGrandTotal.textContent = fmt(totals.total);

    // Notes / payment
    els.pvNotes.textContent = els.notes.value.trim();
    els.pvPaymentDetails.textContent = els.paymentDetails.value.trim();
    renderQr(els.paymentDetails.value);

    saveDraft();
  }

  // ---------- Draft persistence (localStorage only) ----------
  var saveTimer = null;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        var data = {
          bizName: els.bizName.value, bizEmail: els.bizEmail.value, bizAddress: els.bizAddress.value,
          clientName: els.clientName.value, clientEmail: els.clientEmail.value, clientAddress: els.clientAddress.value,
          invoiceNumber: els.invoiceNumber.value, issueDate: els.issueDate.value, dueDate: els.dueDate.value,
          currency: els.currency.value, taxRate: els.taxRate.value,
          discountType: els.discountType.value, discountValue: els.discountValue.value,
          paymentDetails: els.paymentDetails.value, notes: els.notes.value,
          items: readItems()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) { /* storage unavailable (e.g. private mode) — tool still works */ }
    }, 300);
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      els.bizName.value = data.bizName || '';
      els.bizEmail.value = data.bizEmail || '';
      els.bizAddress.value = data.bizAddress || '';
      els.clientName.value = data.clientName || '';
      els.clientEmail.value = data.clientEmail || '';
      els.clientAddress.value = data.clientAddress || '';
      els.invoiceNumber.value = data.invoiceNumber || '';
      els.issueDate.value = data.issueDate || '';
      els.dueDate.value = data.dueDate || '';
      els.currency.value = data.currency || 'GBP';
      els.taxRate.value = data.taxRate != null ? data.taxRate : 0;
      els.discountType.value = data.discountType || 'percent';
      els.discountValue.value = data.discountValue != null ? data.discountValue : 0;
      els.paymentDetails.value = data.paymentDetails || '';
      els.notes.value = data.notes || '';
      els.itemsBody.innerHTML = '';
      var items = Array.isArray(data.items) && data.items.length ? data.items : [{}];
      items.forEach(function (it) { addItemRow(it); });
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- Sample invoice (fictional data, clearly a sample) ----------
  function loadSample() {
    els.bizName.value = 'Studio North';
    els.bizEmail.value = 'hello@studionorth.example';
    els.bizAddress.value = '12 High Street\nBristol BS1 4QA, United Kingdom';
    els.clientName.value = 'Brightwood Café';
    els.clientEmail.value = 'accounts@brightwood.example';
    els.clientAddress.value = '8 Market Square\nBath BA1 5HX, United Kingdom';
    els.invoiceNumber.value = 'INV-2026-001';
    els.issueDate.value = '2026-11-27';
    els.dueDate.value = '2026-12-11';
    els.currency.value = 'GBP';
    els.taxRate.value = 20;
    els.discountType.value = 'percent';
    els.discountValue.value = 0;
    els.paymentDetails.value = 'https://pay.example.com/inv-2026-001';
    els.notes.value = 'Thank you for your business. Payment due within 14 days.\nBank transfer: Sort code 04-06-05 · Account 12345678';
    els.itemsBody.innerHTML = '';
    addItemRow({ desc: 'Logo design — main mark and two variants', qty: 1, price: 450 });
    addItemRow({ desc: 'Menu layout design (A4, print-ready)', qty: 2, price: 120 });
    addItemRow({ desc: 'Social media templates (set of 6)', qty: 1, price: 180 });
    render();
  }

  function clearAll() {
    if (!window.confirm('Clear the whole invoice and start over? Your saved draft will be removed.')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    els.bizName.value = ''; els.bizEmail.value = ''; els.bizAddress.value = '';
    els.clientName.value = ''; els.clientEmail.value = ''; els.clientAddress.value = '';
    els.invoiceNumber.value = nextInvoiceNumber();
    els.issueDate.value = todayIso();
    els.dueDate.value = '';
    els.currency.value = 'GBP';
    els.taxRate.value = 0;
    els.discountType.value = 'percent';
    els.discountValue.value = 0;
    els.paymentDetails.value = '';
    els.notes.value = '';
    els.itemsBody.innerHTML = '';
    addItemRow();
    render();
  }

  // ---------- Defaults ----------
  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function nextInvoiceNumber() {
    var d = new Date();
    return 'INV-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '01';
  }

  // ---------- Wire up ----------
  document.addEventListener('input', render);
  document.addEventListener('change', render);
  $('addItemBtn').addEventListener('click', function () { addItemRow(); render(); });
  $('printBtn').addEventListener('click', function () { window.print(); });
  $('sampleBtn').addEventListener('click', loadSample);
  $('clearBtn').addEventListener('click', clearAll);

  // ---------- Init ----------
  if (!loadDraft()) {
    els.invoiceNumber.value = nextInvoiceNumber();
    els.issueDate.value = todayIso();
    addItemRow();
  }
  render();
})();
