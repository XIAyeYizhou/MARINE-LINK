/* ============================================================
   字卡 · 玻璃信使 — 信息页面（搜索框 + 左滑置顶/屏蔽/删除）
   ============================================================ */
(function () {
  var S = Store, UI = window.UI, esc = S.esc;
  var SWIPE_W = 216;
  var pageEl = null;

  function rowHTML(item) {
    var info = S.convInfo(item.id);
    var msgs = item.kind === 'g' ? S.groupMsgs(item.id) : S.conv(item.id);
    var last = msgs[msgs.length - 1];
    var unread = item.kind === 'g' ? S.groupUnread(item.id) : S.unread(item.id);
    var preview = '';
    var who = '';
    if (item.kind === 'g' && last && last.from && last.from !== 'sys') {
      var c = S.getContact(last.from);
      who = (c ? c.name : '') + '：';
    }
    if (last && last.type === 'sys') preview = last.content;
    else preview = who + S.msgPreview(last);
    var time = last ? last.time : 0;
    var d = new Date(time), now = new Date();
    var tstr = '';
    if (d.toDateString() === now.toDateString()) tstr = UI.fmtTime(time);
    else if (new Date(now.getTime() - 86400e3).toDateString() === d.toDateString()) tstr = '昨天';
    else tstr = (d.getMonth() + 1) + '月' + d.getDate() + '日';

    var statusLine = '';
    var c2 = S.getContact(item.id);
    if (c2 && c2.status && c2.status.text) statusLine = '<div class="conv-status">' + esc(c2.status.text) + '</div>';

    return '<div class="conv-row" data-cid="' + item.id + '" data-kind="' + item.kind + '">' +
      '<div class="row-actions">' +
      '<button class="act-btn act-pin" data-act="pin">' + Icon(item.pinned ? 'check' : 'pin', 17) + '<span>' + (item.pinned ? '已置顶' : '置顶') + '</span></button>' +
      '<button class="act-btn act-mute" data-act="mute">' + Icon(item.muted ? 'speaker' : 'mute', 17) + '<span>' + (item.muted ? '取消屏蔽' : '屏蔽') + '</span></button>' +
      '<button class="act-btn act-del" data-act="del">' + Icon('trash', 17) + '<span>删除</span></button>' +
      '</div>' +
      '<div class="row-main glass-row">' +
      UI.avatarEl(info.avatar, 54) +
      '<div class="conv-info">' +
      '<div class="conv-top"><span class="conv-name">' + esc(info.name) + '</span><span class="conv-time">' + tstr + '</span></div>' +
      '<div class="conv-bottom">' + statusLine + '<span class="conv-preview">' + esc(preview) + '</span>' +
      (item.muted ? '<span class="conv-muted">' + Icon('mute', 14) + '</span>' : '') +
      (unread > 0 ? '<span class="conv-badge">' + (unread > 99 ? '99+' : unread) + '</span>' : '') +
      '</div></div></div></div>';
  }

  function render(el) {
    pageEl = el;
    el.innerHTML = '';
    var st = S.state;

    var head = document.createElement('div');
    head.className = 'msgs-head';
    head.innerHTML = '<div class="msgs-search">' + Icon('search', 17) + '<input id="msgs-q" placeholder="搜索" autocomplete="off"></div>';
    el.appendChild(head);

    var listEl = document.createElement('div');
    listEl.className = 'conv-list';
    el.appendChild(listEl);

    function draw(filter) {
      var items = S.convList();
      if (filter) {
        items = items.filter(function (it) {
          var info = S.convInfo(it.id);
          return info.name.indexOf(filter) !== -1 || (it.id + '').indexOf(filter) !== -1;
        });
      }
      if (!items.length) {
        listEl.innerHTML = '<div class="empty"><div class="empty-ic">' + Icon('chat', 34) + '</div><div class="empty-t">' + (filter ? '没有找到相关会话' : '还没有会话，去联系人页面找个人聊聊吧') + '</div></div>';
        return;
      }
      listEl.innerHTML = items.map(rowHTML).join('');
      bindRows(listEl);
    }

    function bindRows(container) {
      container.querySelectorAll('.conv-row').forEach(function (row) {
        var cid = row.dataset.cid, kind = row.dataset.kind;
        var main = row.querySelector('.row-main');
        var actions = row.querySelector('.row-actions');
        var open = false;

        actions.querySelectorAll('.act-btn').forEach(function (b) {
          b.addEventListener('click', function () {
            var act = b.dataset.act;
            var obj = kind === 'g' ? S.getGroup(cid) : S.getContact(cid);
            if (!obj) return;
            if (act === 'pin') obj.conv.pinned = !obj.conv.pinned;
            if (act === 'mute') obj.conv.muted = !obj.conv.muted;
            if (act === 'del') {
              obj.conv.deleted = true;
              obj.conv.lastAt = 0;
            }
            S.saveDebounced();
            draw(document.getElementById('msgs-q').value);
          });
        });

        main.addEventListener('click', function () {
          if (open) { close(); return; }
          Router.go('chat', { cid: cid });
        });

        // 触摸滑动
        var startX = 0, startY = 0, dx = 0, dragging = false, moved = false;
        main.addEventListener('pointerdown', function (e) {
          startX = e.clientX; startY = e.clientY; dx = 0; moved = false; dragging = true;
          main.setPointerCapture && main.setPointerCapture(e.pointerId);
        });
        main.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          dx = e.clientX - startX;
          var dy = e.clientY - startY;
          if (!moved && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (!moved) { moved = true; }
          if (Math.abs(dx) < Math.abs(dy)) return;
          e.preventDefault();
          var target = open ? -SWIPE_W + dx : dx;
          if (target > 0) target = 0;
          if (target < -SWIPE_W) target = -SWIPE_W;
          main.style.transform = 'translateX(' + target + 'px)';
          actions.style.transform = 'translateX(' + (target + SWIPE_W) + 'px)';
        });
        function end() {
          dragging = false;
          if (!moved) return;
          var shouldOpen = dx < -40 || open;
          main.style.transition = 'transform .25s ease';
          actions.style.transition = 'transform .25s ease';
          main.style.transform = shouldOpen ? 'translateX(-' + SWIPE_W + 'px)' : 'translateX(0)';
          actions.style.transform = shouldOpen ? 'translateX(0)' : 'translateX(' + SWIPE_W + 'px)';
          open = shouldOpen;
          setTimeout(function () {
            main.style.transition = '';
            actions.style.transition = '';
          }, 260);
        }
        main.addEventListener('pointerup', end);
        main.addEventListener('pointercancel', end);
        function close() {
          open = false;
          main.style.transition = 'transform .25s ease';
          actions.style.transition = 'transform .25s ease';
          main.style.transform = 'translateX(0)';
          actions.style.transform = 'translateX(' + SWIPE_W + 'px)';
          setTimeout(function () { main.style.transition = ''; actions.style.transition = ''; }, 260);
        }
        row._closeSwipe = close;
      });
    }

    var q = head.querySelector('#msgs-q');
    q.addEventListener('input', function () { draw(q.value.trim()); });
    draw('');

    // 关闭其它打开的滑动行
    document.addEventListener('pointerdown', function (e) {
      listEl.querySelectorAll('.conv-row').forEach(function (r) {
        if (!r.contains(e.target) && r._closeSwipe) r._closeSwipe();
      });
    });
  }

  Bus.on('conv', function (cid) {
    // 即使信息页在聊天页下层（隐藏），也要刷新，确保红点及时消失
    if (pageEl) render(pageEl);
  });

  Router.register('messages', function (el) {
    render(el);
  }, { nav: true });
})();
