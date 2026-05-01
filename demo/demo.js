(function () {
  'use strict';

  var fixedCosts = [
    { id: 'delivery',   amount: 1400, currency: 'EUR' },
    { id: 'warehouse',  amount: 200,  currency: 'BYN' },
    { id: 'epts',       amount: 70,   currency: 'BYN' },
    { id: 'autogarage', amount: 870,  currency: 'BYN' },
    { id: 'customsFee', amount: 120,  currency: 'BYN' },
  ];

  // ── Helpers ──────────────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }
  function fmt(n, d) {
    return n.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: d !== undefined ? d : 2,
    });
  }
  function setText(id, text) { var e = el(id); if (e) e.textContent = text; }
  function getRadio(name) {
    var node = document.querySelector('input[name="' + name + '"]:checked');
    return node ? node.value : '';
  }

  // ── Radio button UI ──────────────────────────────────────────────────
  document.querySelectorAll('.radios').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var label = e.target.closest('.rb');
      if (!label) return;
      var input = label.querySelector('input[type="radio"]');
      if (!input) return;
      group.querySelectorAll('.rb').forEach(function (lb) { lb.classList.remove('on'); });
      label.classList.add('on');
      input.checked = true;
      runDemo();
    });
  });

  // ── Inputs ──────────────────────────────────────────────────────────
  ['d-price', 'd-currency', 'd-volume', 'd-discount',
   'd-commission', 'd-usd', 'd-eur'].forEach(function (id) {
    var node = el(id);
    if (node) {
      node.addEventListener('change', runDemo);
      node.addEventListener('input', runDemo);
    }
  });

  // ── Token builders ───────────────────────────────────────────────────
  function kw(t)  { return '<span class="t-kw">'   + t + '</span>'; }
  function fn(t)  { return '<span class="t-fn">'   + t + '</span>'; }
  function key(t) { return '<span class="t-key">'  + t + '</span>'; }
  function str(t) { return '<span class="t-str">"' + t + '"</span>'; }
  function num(t) { return '<span class="t-num">'  + t + '</span>'; }
  function bl(t)  { return '<span class="t-bool">' + t + '</span>'; }
  function cm(t)  { return '<span class="t-cm">// ' + t + '</span>'; }

  // ── Code snippet builder ─────────────────────────────────────────────
  function buildSnippet(p, result) {
    var lines = [];
    lines.push(kw('const') + ' result = ' + fn('CustomsCalc') + '.calculate({');
    lines.push('  ' + key('age')        + ':        ' + str(p.age) + ',');
    lines.push('  ' + key('price')      + ':      '   + num(p.price) + ',');
    lines.push('  ' + key('currency')   + ':   '      + str(p.currency.toUpperCase()) + ',');
    lines.push('  ' + key('engineType') + ': '        + str(p.engineType) + ',');
    if (p.engineType !== 'electric') {
      lines.push('  ' + key('volume') + ':     ' + num(p.volume) + ',');
    }
    lines.push('  ' + key('face')       + ':       '  + str(p.face) + ',');
    lines.push('  ' + key('discount')   + ':   '      + bl(p.discount) + ',');
    if (p.commission) {
      lines.push('  ' + key('commission') + ': ' + num(p.commission) + ',');
    }
    lines.push('  ' + key('fixedCosts') + ': [');
    fixedCosts.forEach(function (item, i) {
      var comma = i < fixedCosts.length - 1 ? ',' : '';
      lines.push(
        '    { ' + key('id') + ': ' + str(item.id) + ', ' +
        key('amount') + ': ' + num(item.amount) + ', ' +
        key('currency') + ': ' + str(item.currency) + ' }' + comma
      );
    });
    lines.push('  ],');
    lines.push(
      '  ' + key('rates') + ':      { ' +
      key('usd') + ': ' + num(p.rates.usd) + ', ' +
      key('eur') + ': ' + num(p.rates.eur) + ' }'
    );
    lines.push('});');
    lines.push('');
    lines.push(cm('→ {'));
    lines.push(cm('  priceEur:      ' + result.priceEur.toFixed(2)));
    lines.push(cm('  priceUsd:      ' + result.priceUsd.toFixed(2)));
    lines.push(cm('  dutyEur:       ' + result.dutyEur.toFixed(2)));
    lines.push(cm('  dutyNote:      "' + result.dutyNote + '"'));
    lines.push(cm('  utilByn:       ' + result.utilByn.toFixed(2)));
    lines.push(cm('  commissionEur: ' + result.commissionEur.toFixed(2)));
    lines.push(cm('  totalEur:      ' + result.totalEur.toFixed(2)));
    lines.push(cm('  totalUsd:      ' + result.totalUsd.toFixed(2)));
    lines.push(cm('}'));
    return lines.join('\n');
  }

  // ── Plain-text snippet for clipboard ─────────────────────────────────
  function buildPlainSnippet(p, result) {
    var lines = [];
    lines.push('const result = CustomsCalc.calculate({');
    lines.push('  age:        "' + p.age + '",');
    lines.push('  price:      ' + p.price + ',');
    lines.push('  currency:   "' + p.currency.toUpperCase() + '",');
    lines.push('  engineType: "' + p.engineType + '",');
    if (p.engineType !== 'electric') lines.push('  volume:     ' + p.volume + ',');
    lines.push('  face:       "' + p.face + '",');
    lines.push('  discount:   ' + p.discount + ',');
    if (p.commission) lines.push('  commission: ' + p.commission + ',');
    lines.push('  fixedCosts: [');
    fixedCosts.forEach(function (item, i) {
      var comma = i < fixedCosts.length - 1 ? ',' : '';
      lines.push('    { id: "' + item.id + '", amount: ' + item.amount + ', currency: "' + item.currency + '" }' + comma);
    });
    lines.push('  ],');
    lines.push('  rates: { usd: ' + p.rates.usd + ', eur: ' + p.rates.eur + ' }');
    lines.push('});');
    lines.push('');
    lines.push('// → {');
    lines.push('//   priceEur:      ' + result.priceEur.toFixed(2));
    lines.push('//   priceUsd:      ' + result.priceUsd.toFixed(2));
    lines.push('//   dutyEur:       ' + result.dutyEur.toFixed(2));
    lines.push('//   dutyNote:      "' + result.dutyNote + '"');
    lines.push('//   utilByn:       ' + result.utilByn.toFixed(2));
    lines.push('//   commissionEur: ' + result.commissionEur.toFixed(2));
    lines.push('//   totalEur:      ' + result.totalEur.toFixed(2));
    lines.push('//   totalUsd:      ' + result.totalUsd.toFixed(2));
    lines.push('// }');
    return lines.join('\n');
  }

  // ── Main ─────────────────────────────────────────────────────────────
  var lastParams, lastResult;

  function runDemo() {
    var engineType = getRadio('d-engine');
    var volumeWrap = el('d-volume-wrap');
    if (volumeWrap) volumeWrap.style.display = engineType === 'electric' ? 'none' : '';

    var face = getRadio('d-face');
    var discountWrap = el('d-discount-wrap');
    if (discountWrap) discountWrap.style.display = face === 'legal' ? 'none' : '';

    var price  = parseFloat(el('d-price').value) || 0;
    var volume = parseFloat(el('d-volume').value) || 0;
    if (price <= 0) return;
    if (engineType === 'fuel' && volume <= 0) return;

    var params = {
      age:        getRadio('d-age'),
      price:      price,
      currency:   el('d-currency').value,
      engineType: engineType,
      volume:     volume,
      face:       face,
      discount:   face !== 'legal' && el('d-discount').checked,
      commission: parseFloat(el('d-commission').value) || 0,
      fixedCosts: fixedCosts,
      rates: {
        usd: parseFloat(el('d-usd').value) || 2.82,
        eur: parseFloat(el('d-eur').value) || 3.3,
      },
    };

    var result = CustomsCalc.calculate(params);
    lastParams = params;
    lastResult = result;

    // Update result panel
    var currUp = params.currency.toUpperCase();
    var sym = currUp === 'EUR' ? '€' : '$';
    var priceDisp = currUp === 'EUR' ? result.priceEur : result.priceUsd;

    setText('res-price', fmt(priceDisp) + ' ' + sym);
    setText('res-commission', fmt(result.commissionEur) + ' €');
    setText('res-duty', fmt(result.dutyEur) + ' €' + (result.dutyNote ? ' ' + result.dutyNote : ''));
    setText('res-util', fmt(result.utilByn) + ' руб.');
    setText('res-total-eur', Math.round(result.totalEur) + ' €');
    setText('res-total-usd', '≈ ' + Math.round(result.totalUsd) + ' $');

    // Update code snippet
    var codeEl = el('live-code');
    if (codeEl) codeEl.innerHTML = buildSnippet(params, result);
  }

  // ── Copy button ───────────────────────────────────────────────────────
  el('copy-btn').addEventListener('click', function () {
    if (!lastParams || !lastResult) return;
    var text = buildPlainSnippet(lastParams, lastResult);
    navigator.clipboard.writeText(text).then(function () {
      var btn = el('copy-btn');
      btn.textContent = 'copied!';
      btn.classList.add('done');
      setTimeout(function () {
        btn.textContent = 'copy';
        btn.classList.remove('done');
      }, 1800);
    });
  });

  // ── Init ─────────────────────────────────────────────────────────────
  runDemo();
}());
