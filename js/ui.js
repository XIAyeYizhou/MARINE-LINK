/* ============================================================
   字卡 · 玻璃信使 — UI 组件库（磨砂玻璃浮窗 / toast / 选择器）
   ============================================================ */
(function () {
  var S = Store;
  var esc = S.esc;

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }

  var zTop = 60;

  /* ---------- Toast ---------- */
  function toast(msg, icon, dur) {
    var box = document.getElementById('toasts');
    var t = el('<div class="toast glass-strong"><span class="toast-ic">' + (icon ? Icon(icon, 16) : '') + '</span><span>' + esc(msg) + '</span></div>');
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 400);
    }, dur || 2200);
  }

  /* ---------- 通用浮窗 ---------- */
  function popup(opts) {
    var sheets = document.getElementById('sheets');
    var root = el('<div class="pop-root">' +
      '<div class="pop-mask"></div>' +
      '<div class="sheet glass-strong ' + (opts.center ? 'sheet-center' : '') + (opts.height ? ' sheet-h' : '') + '">' +
      (opts.title ? '<div class="sheet-head"><span class="sheet-title">' + esc(opts.title) + '</span></div>' : '') +
      '<div class="sheet-body"></div>' +
      (opts.actions && opts.actions.length ? '<div class="sheet-actions"></div>' : '') +
      '</div></div>');
    if (opts.height) root.querySelector('.sheet').style.maxHeight = opts.height;
    sheets.appendChild(root);
    var mask = root.querySelector('.pop-mask');
    var sheetEl = root.querySelector('.sheet');
    var bodyEl = root.querySelector('.sheet-body');
    var actEl = root.querySelector('.sheet-actions');

    if (typeof opts.body === 'string') bodyEl.innerHTML = opts.body;
    else if (opts.body) bodyEl.appendChild(opts.body);

    if (opts.actions) {
      opts.actions.forEach(function (a) {
        if (a === '-') { actEl.appendChild(el('<div class="sheet-sep"></div>')); return; }
        var b = el('<button class="sheet-btn ' + (a.primary ? 'primary' : '') + (a.danger ? ' danger' : '') + '">' + (a.icon ? Icon(a.icon, 17) : '') + '<span>' + esc(a.label || '') + '</span></button>');
        b.addEventListener('click', function () {
          var r = a.onClick && a.onClick(api);
          if (r !== false) close();
        });
        actEl.appendChild(b);
      });
    }

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      root.classList.add('closing');
      if (opts.onClose) opts.onClose();
      setTimeout(function () { root.remove(); }, 260);
    }
    mask.addEventListener('click', function () {
      if (opts.dismiss !== false) close();
    });
    var api = { el: root, body: bodyEl, close: close };
    requestAnimationFrame(function () { root.classList.add('show'); });
    return api;
  }

  /* 列表式浮窗（更多菜单等） */
  function sheetList(opts) {
    var items = opts.items.map(function (it, i) {
      return '<button class="sheet-row" data-i="' + i + '">' +
        (it.icon ? '<span class="row-ic">' + Icon(it.icon, 19) + '</span>' : '') +
        '<span class="row-label">' + esc(it.label || '') + '</span>' +
        (it.sub ? '<span class="row-sub">' + esc(it.sub) + '</span>' : '') +
        Icon('chevronR', 16) + '</button>';
    }).join('');
    var api = popup({
      title: opts.title,
      body: '<div class="sheet-list">' + items + '</div>',
      dismiss: opts.dismiss !== false,
      onClose: opts.onClose
    });
    api.body.querySelectorAll('.sheet-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var it = opts.items[+row.dataset.i];
        var r = it.onClick && it.onClick(api);
        // 未显式返回 false 时自动关闭（如：新建联系人/群聊、发起通话等跳转型操作）
        if (r !== false) api.close();
      });
    });
    return api;
  }

  function confirm(title, msg, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      var api = popup({
        center: true,
        body: '<div class="confirm"><div class="confirm-title">' + esc(title) + '</div><div class="confirm-msg">' + esc(msg) + '</div></div>',
        actions: [
          { label: opts.cancelText || '取消', onClick: function () { res(false); } },
          { label: opts.okText || '确定', primary: true, danger: opts.danger, onClick: function () { res(true); } }
        ],
        onClose: function () { res(false); }
      });
    });
  }

  /* ---------- 文件选择 ---------- */
  function pickImage(opts) {
    opts = opts || {};
    return new Promise(function (res) {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      if (opts.camera) inp.capture = 'environment';
      inp.multiple = !!opts.multiple;
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.onchange = function () {
        var files = Array.prototype.slice.call(inp.files || []);
        var out = [], left = files.length;
        if (!left) { inp.remove(); res(out); return; }
        files.forEach(function (f) {
          var r = new FileReader();
          r.onload = function () {
            out.push(r.result);
            if (--left === 0) { inp.remove(); res(out); }
          };
          r.onerror = function () { if (--left === 0) { inp.remove(); res(out); } };
          r.readAsDataURL(f);
        });
      };
      inp.click();
    });
  }

  function pickFile(accept, multiple) {
    return new Promise(function (res) {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = accept;
      inp.multiple = !!multiple;
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.onchange = function () {
        var files = Array.prototype.slice.call(inp.files || []);
        inp.remove();
        res(files);
      };
      inp.click();
    });
  }

  /* ---------- 控件 ---------- */
  function slider(opts) {
    var v = opts.value != null ? opts.value : opts.min;
    var row = el('<div class="slider-row"><input type="range" class="slider" min="' + opts.min + '" max="' + opts.max + '" step="' + (opts.step || 1) + '" value="' + v + '"><span class="slider-val">' + v + '</span></div>');
    var inp = row.querySelector('input');
    var val = row.querySelector('.slider-val');
    inp.addEventListener('input', function () {
      val.textContent = inp.value + (opts.unit || '');
      if (opts.onInput) opts.onInput(+inp.value, row);
    });
    return row;
  }

  function switchEl(checked, onToggle) {
    var w = el('<div class="switch ' + (checked ? 'on' : '') + '"><div class="knob"></div></div>');
    w.addEventListener('click', function () {
      var nv = !w.classList.contains('on');
      w.classList.toggle('on', nv);
      if (onToggle) onToggle(nv, w);
    });
    return w;
  }

  /* ---------- 时间 ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtTime(ts) {
    var d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDay(ts) {
    var d = new Date(ts), now = new Date();
    var same = d.toDateString() === now.toDateString();
    var yest = new Date(now.getTime() - 86400e3).toDateString() === d.toDateString();
    if (same) return '今天';
    if (yest) return '昨天';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function fmtChatTime(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDur(sec) {
    sec = Math.max(0, Math.floor(sec));
    return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60);
  }

  /* ---------- 头像 ---------- */
  function avatarEl(src, size, cls) {
    return '<img class="avatar ' + (cls || '') + '" src="' + src + '" style="width:' + size + 'px;height:' + size + 'px" draggable="false">';
  }

  /* ---------- 状态浮窗（聊天页快捷查看） ---------- */
  function statusPop(st) {
    if (!st || (!st.text && !st.image)) return;
    var root = el('<div class="status-pop">' +
      (st.image ? '<div class="status-pop-img"><img src="' + st.image + '"></div>' : '') +
      (st.text ? '<div class="status-pop-text">' + esc(st.text) + '</div>' : '') +
      '</div>');
    root.addEventListener('click', function () { root.remove(); });
    document.getElementById('sheets').appendChild(root);
  }

  window.UI = {
    el: el, qs: qs, toast: toast, popup: popup, sheetList: sheetList,
    confirm: confirm, pickImage: pickImage, pickFile: pickFile,
    slider: slider, switchEl: switchEl,
    fmtTime: fmtTime, fmtDay: fmtDay, fmtChatTime: fmtChatTime, fmtDur: fmtDur,
    avatarEl: avatarEl, statusPop: statusPop
  };
})();
