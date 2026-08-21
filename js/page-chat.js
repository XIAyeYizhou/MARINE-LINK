/* ============================================================
   字卡 · 玻璃信使 — 对话页面（气泡/长按/表情包/红包/通话/戳一戳/视奸/骰子/更多）
   ============================================================ */
(function () {
  var S = Store, UI = window.UI, esc = S.esc;
  var chatCid = null;
  var pageEl = null;

  function isChatOpen(cid) { return Router.currentId() === 'chat' && chatCid === cid; }

  /* ================= 对话页面 ================= */
  Router.register('chat', function (el, args) {
    var cid = args.cid;
    var info = S.convInfo(cid);
    chatCid = cid;
    pageEl = el;
    S.markRead(cid);
    el.innerHTML = '';
    el.className = 'page chat-page';

    var c = S.getContact(cid);
    var isGroup = !!info.group;

    var bgStyle = c && c.settings.chatBg ? 'background-image:url(' + c.settings.chatBg + ')' : '';
    var head = document.createElement('div');
    head.className = 'chat-head';
    head.innerHTML = '<div class="chat-bg" style="' + bgStyle + '"></div>' +
      '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
      '<div class="chat-title">' +
      '<div class="chat-name">' + esc(info.name) + '</div>' +
      (c && c.status && c.status.text ? '<div class="chat-status" id="chat-status">' + esc(c.status.text) + '</div>' : '') +
      '</div>' +
      '<div class="chat-right">' +
      '<button class="chat-more" id="chat-more">' + Icon('more', 22) + '</button>' +
      '</div>';
    el.appendChild(head);

    var msgsEl = document.createElement('div');
    msgsEl.className = 'chat-msgs';
    msgsEl.id = 'chat-msgs';
    el.appendChild(msgsEl);

    var typingEl = document.createElement('div');
    typingEl.className = 'chat-typing';
    typingEl.id = 'chat-typing';
    typingEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-t">对方正在输入…</span>';
    el.appendChild(typingEl);

    var foot = document.createElement('div');
    foot.className = 'chat-foot glass';
    var tools = isGroup
      ? ['sticker', 'redpacket', 'call', 'dice']
      : ['sticker', 'redpacket', 'call', 'poke', 'stalk', 'dice'];
    var toolIcons = {
      sticker: ['sticker', '表情包'], redpacket: ['redpacket', '红包'], call: ['video', '视频/语音通话'],
      poke: ['poke', '戳一戳'], stalk: ['eye', '视奸'], dice: ['dice', '扔骰子']
    };
    foot.innerHTML =
      '<div class="ci-row1">' +
      '<input id="chat-text" class="ci-input" placeholder="输入消息…" autocomplete="off">' +
      '<button class="ci-img" id="chat-img" title="发送图片">' + Icon('image', 21) + '</button>' +
      '</div>' +
      '<div class="ci-row2">' + tools.map(function (t) {
        var ic = toolIcons[t];
        return '<button data-f="' + t + '" title="' + ic[1] + '">' + Icon(ic[0], 20) + '</button>';
      }).join('') + '</div>';
    el.appendChild(foot);

    var input = foot.querySelector('#chat-text');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { sendText(); }
    });
    foot.querySelector('#chat-img').addEventListener('click', async function () {
      var imgs = await UI.pickImage({ multiple: false });
      imgs.forEach(function (im) { sendMsg('image', '', { image: im }); });
    });
    foot.querySelectorAll('.ci-row2 button').forEach(function (b) {
      b.addEventListener('click', function () { openTool(b.dataset.f, cid, isGroup, c); });
    });
    head.querySelector('#chat-more').addEventListener('click', function () { openMore(cid, c); });
    var st = head.querySelector('#chat-status');
    if (st) st.addEventListener('click', function (e) { e.stopPropagation(); UI.statusPop(c.status); });

    drawMsgs(args.focusMsg);

    function drawMsgs(focusId) {
      var arr = info.group ? S.groupMsgs(cid) : S.conv(cid);
      var wasNearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 120;
      var h = '';
      var lastDay = '';
      arr.forEach(function (m) {
        var dk = new Date(m.time).toDateString();
        if (dk !== lastDay) {
          lastDay = dk;
          h += '<div class="msg-date">' + UI.fmtChatTime(m.time).slice(0, -5) + '</div>';
        }
        h += msgHTML(m, cid, info.group);
      });
      msgsEl.innerHTML = h;
      bindBubbles(msgsEl, cid, info.group);
      if (focusId) {
        var target = msgsEl.querySelector('[data-id="' + focusId + '"]');
        if (target) {
          if (target.scrollIntoView) target.scrollIntoView({ block: 'center' });
          else msgsEl.scrollTop = msgsEl.scrollHeight;
          target.classList.add('flash');
          setTimeout(function () { target.classList.remove('flash'); }, 2400);
        } else msgsEl.scrollTop = msgsEl.scrollHeight;
      } else if (wasNearBottom) {
        msgsEl.scrollTop = msgsEl.scrollHeight;
      }
    }

    function sendText() {
      var v = input.value.trim();
      if (!v) return;
      var quote = input._quote;
      input._quote = null;
      input.placeholder = '输入消息…';
      input.value = '';
      sendMsg('text', v, quote ? { quote: S.msgPreview(quote).slice(0, 60) } : null);
    }
    function sendMsg(type, content, meta) {
      var msg = { from: 'me', type: type, content: content, meta: meta || {} };
      if (info.group) S.pushGroupMsg(cid, msg);
      else S.pushMsg(cid, msg);
      AudioX.sendSound();
      AI.onUserMsg(cid);
      drawMsgs();
    }
    window.__chatSend = sendMsg;

    // 输入框聚焦时若消息更新不抢焦点
    input.addEventListener('focus', function () { });
  });

  /* 模块级实时刷新 */
  Bus.on('conv', function (cid) {
    if (isChatOpen(cid)) {
      // 仅在确有未读时标记已读，避免 markRead 的 conv 事件造成循环
      if (S.unread(cid) > 0 || S.groupUnread(cid) > 0) S.markRead(cid);
      redrawCurrent();
    }
  });
  Bus.on('status', function (cid) {
    if (isChatOpen(cid)) redrawHead();
  });
  Bus.on('typing', function (cid) {
    if (!isChatOpen(cid)) return;
    var el = document.getElementById('chat-typing');
    if (!el) return;
    var meta = S.convMeta(cid);
    var c3 = meta.group ? null : S.getContact(cid);
    el.classList.toggle('show', !!(c3 && c3.typing));
  });

  function redrawHead() {
    if (!pageEl || !pageEl.parentNode) return;
    var cid = chatCid;
    var c2 = S.getContact(cid);
    var info2 = S.convInfo(cid);
    var title = pageEl.querySelector('.chat-title');
    if (title) {
      title.innerHTML = '<div class="chat-name">' + esc(info2.name) + '</div>' +
        (c2 && c2.status && c2.status.text ? '<div class="chat-status" id="chat-status">' + esc(c2.status.text) + '</div>' : '');
      var st2 = title.querySelector('#chat-status');
      if (st2) st2.addEventListener('click', function (e) { e.stopPropagation(); UI.statusPop(c2.status); });
    }
  }

  /* ================= 气泡渲染 ================= */
  function msgHTML(m, cid, isGroup) {
    if (m.type === 'sys') return '<div class="msg-sys">' + esc(m.content) + '</div>';
    var mine = m.from === 'me';
    var who = null, whoName = '';
    if (!mine && isGroup) {
      who = S.getContact(m.from);
      whoName = who ? (who.remark || who.name) : '未知成员';
    }
    var avaSrc = mine ? S.state.me.avatar : (who ? who.avatar : (S.convInfo(cid).avatar));
    var bubble = '';
    var mmeta = m.meta || {};

    if (m.type === 'text') {
      var quote = mmeta.quote ? '<div class="bq">' + esc(mmeta.quote) + '</div>' : '';
      bubble = '<div class="bubble">' + quote + '<span class="b-text">' + esc(m.content) + '</span>' +
        (mmeta.fav ? '<span class="b-fav">' + Icon('star', 13) + '</span>' : '') + '</div>';
    } else if (m.type === 'sticker') {
      // 表情包：无聊天气泡框，仅图片
      var stImg = mmeta.image || mmeta.src || '';
      bubble = '<img class="stk-sent" src="' + stImg + '" alt="表情">';
    } else if (m.type === 'image') {
      var img = mmeta.image || mmeta.src || '';
      bubble = '<div class="bubble bubble-img' + (mmeta.sticker ? ' sticker' : '') + '"><img src="' + img + '" alt="">' +
        (mmeta.recommend ? '<div class="b-rec">' + Icon('check', 13) + ' 对方推荐的头像</div>' : '') +
        (mmeta.fav ? '<span class="b-fav">' + Icon('star', 13) + '</span>' : '') + '</div>';
    } else if (m.type === 'redpacket') {
      bubble = redPacketHTML(m);
    } else if (m.type === 'voice') {
      bubble = '<div class="bubble bubble-voice" data-voice="1">' +
        '<span class="v-play">' + Icon('play', 18) + '</span>' +
        '<span class="v-bars"><i></i><i></i><i></i><i></i><i></i></span>' +
        '<span class="v-text">' + esc(mmeta.text || m.content || '语音消息') + '</span>' +
        '<span class="v-dur">' + UI.fmtDur(mmeta.dur || 6) + '</span></div>';
    }
    var row = '<div class="msg-row ' + (mine ? 'mine' : 'theirs') + '" data-id="' + m.id + '" data-mine="' + (mine ? 1 : 0) + '" data-voice="' + (m.type === 'voice' ? 1 : 0) + '"' + (isGroup && !mine && who ? ' data-from="' + who.id + '"' : '') + '>' +
      '<div class="msg-ava" data-ava="1">' + (mine ? UI.avatarEl(S.state.me.avatar, 38) : UI.avatarEl(avaSrc, 38)) + '</div>' +
      '<div class="msg-col">' +
      (isGroup && !mine && whoName ? '<div class="msg-who">' + esc(whoName) + '</div>' : '') +
      bubble + '</div>' +
      '</div>';
    return row;
  }

  function redPacketHTML(m) {
    var meta = m.meta || {};
    var opened = meta.status === 'opened';
    var refunded = meta.status === 'refunded';
    var statusTxt = refunded ? '已退还' : (opened ? '已领取' : '等待领取');
    if (meta.fromAi) statusTxt = refunded ? '已退还' : (opened ? '已拆开' : '点击拆开');
    return '<div class="bubble bubble-rp' + (refunded ? ' rp-refund' : '') + '" data-rp="1">' +
      (meta.cover ? '<img class="rp-cover" src="' + meta.cover + '">' : '') +
      '<div class="rp-knot"></div>' +
      '<div class="rp-title">' + esc(meta.note || '恭喜发财，大吉大利') + '</div>' +
      '<div class="rp-amt">' + (opened ? '¥ ' + meta.amount : (refunded ? '红包已退还' : '红包')) + '</div>' +
      '<div class="rp-status">' + statusTxt + '</div></div>';
  }

  /* ================= 气泡交互（长按/点按/双击头像） ================= */
  function bindBubbles(root, cid, isGroup) {
    var info = S.convInfo(cid);
    var c = S.getContact(cid);

    root.querySelectorAll('.msg-row').forEach(function (row) {
      var id = row.dataset.id;
      var mine = row.dataset.mine === '1';
      var bubble = row.querySelector('.bubble');
      if (!bubble) return;

      // 长按 → 引用 / 删除 / 收藏
      var pressTimer = null, pressMoved = false, sx = 0, sy = 0;
      bubble.addEventListener('pointerdown', function (e) {
        sx = e.clientX; sy = e.clientY; pressMoved = false;
        pressTimer = setTimeout(function () { showMsgMenu(id, cid, mine, bubble, e); }, 480);
      });
      bubble.addEventListener('pointermove', function (e) {
        if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) pressMoved = true;
        if (pressMoved && pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      });
      function up() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }
      bubble.addEventListener('pointerup', up);
      bubble.addEventListener('pointercancel', up);
      bubble.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showMsgMenu(id, cid, mine, bubble, e);
      });

      // 红包点开
      if (bubble.dataset.rp) {
        bubble.addEventListener('click', function () { openRedPacket(id, cid); });
      }
      // 语音播放
      if (bubble.dataset.voice) {
        bubble.addEventListener('click', function () { playVoice(row, c); });
      }
      // 图片预览
      if (bubble.classList.contains('bubble-img')) {
        bubble.querySelector('img').addEventListener('click', function (e) {
          e.stopPropagation();
          var v = el('<div class="img-viewer"><img src="' + this.src + '"><div class="iv-close">' + Icon('close', 20) + '</div></div>');
          v.addEventListener('click', function () { v.remove(); });
          document.getElementById('sheets').appendChild(v);
        });
      }
    });

    // 头像：单击 → 对方/我的页面；双击对方头像 → 拍一拍
    root.querySelectorAll('.msg-ava[data-ava="1"]').forEach(function (ava) {
      var clickTimer = null;
      ava.addEventListener('click', function () {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
        clickTimer = setTimeout(function () {
          clickTimer = null;
          var row = ava.closest('.msg-row');
          if (row && row.dataset.mine === '1') { Router.go('user-profile'); return; }
          var from = row ? (row.dataset.from || cid) : cid;
          Router.go('contact-profile', { cid: from });
        }, 260);
      });
      ava.addEventListener('dblclick', function () {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        var row = ava.closest('.msg-row');
        if (row && row.dataset.mine === '1') return;   // 自己的头像不拍一拍
        var from = row ? (row.dataset.from || cid) : cid;
        var tc = S.getContact(from) || c;
        doPat(cid, tc);
      });
    });
  }

  /* 拍一拍 */
  function doPat(cid, c) {
    var name = c ? c.name : '对方';
    var isGroup = !!S.getGroup(cid);
    if (isGroup) S.pushGroupMsg(cid, { from: 'sys', type: 'sys', content: '你拍了拍「' + name + '」' });
    else S.pushMsg(cid, { from: 'sys', type: 'sys', content: '你拍了拍「' + name + '」' });
    showPokeAnim(name, true);
    AudioX.pokeSound();
    if (c) {
      setTimeout(function () {
        // 对方拍一拍与用户一致：系统提示 + 拍一拍动效，不使用聊天气泡框
        if (isGroup) S.pushGroupMsg(cid, { from: 'sys', type: 'sys', content: name + ' 拍了拍你' });
        else S.pushMsg(cid, { from: 'sys', type: 'sys', content: name + ' 拍了拍你' });
        Bus.emit('poke', cid);
        if (Math.random() < 0.5) {
          var st = S.state;
          if (!st.pokeBack) st.pokeBack = {};
          st.pokeBack[c.id] = { at: Date.now() + 3000 + Math.random() * 7000, cid: c.id };
        }
      }, 2000 + Math.random() * 3000);
    }
  }

  function showPokeAnim(name, mine) {
    var root = el('<div class="poke-anim"><div class="poke-hand">' + Icon('poke', 44) + '</div><div class="poke-txt">' + (mine ? '你戳了戳「' + esc(name) + '」' : esc(name) + ' 戳了戳你') + '</div></div>');
    document.getElementById('sheets').appendChild(root);
    setTimeout(function () { root.classList.add('out'); setTimeout(function () { root.remove(); }, 400); }, 1400);
  }

  /* 长按菜单 */
  function showMsgMenu(id, cid, mine, bubble, e) {
    var arr = S.convMeta(cid).group ? S.groupMsgs(cid) : S.conv(cid);
    var m = arr.find(function (x) { return x.id === id; });
    if (!m) return;
    UI.sheetList({
      title: '消息操作',
      items: [
        { icon: 'reply', label: '引用', onClick: function () { startQuote(m); } },
        { icon: 'trash', label: '删除', danger: true, onClick: async function () {
          var ok = await UI.confirm('删除消息', '确定删除这条消息吗？', { danger: true, okText: '删除' });
          if (ok) {
            var idx = arr.findIndex(function (x) { return x.id === id; });
            if (idx > -1) { arr.splice(idx, 1); S.saveDebounced(); redrawCurrent(); }
          }
        } },
        { icon: 'star', label: m.meta && m.meta.fav ? '取消收藏' : '收藏', onClick: function () {
          m.meta = m.meta || {};
          m.meta.fav = !m.meta.fav;
          S.saveDebounced();
          redrawCurrent();
        } }
      ]
    });
  }

  function startQuote(m) {
    var inp = document.getElementById('chat-text');
    if (!inp) return;
    inp.value = '';
    inp.placeholder = '引用：' + (S.msgPreview(m) || '消息').slice(0, 24);
    inp.focus();
    var send = window.__chatSend;
    var oldKey = inp.onkeydown;
    // 下次发送带上引用
    inp._quote = m;
    UI.toast('已引用，输入内容后发送', 'reply');
  }

  /* 红包 */
  function openRedPacket(id, cid) {
    var arr = S.convMeta(cid).group ? S.groupMsgs(cid) : S.conv(cid);
    var m = arr.find(function (x) { return x.id === id; });
    if (!m || m.type !== 'redpacket') return;
    var meta = m.meta;
    var isMine = m.from === 'me';
    if (isMine) {
      var txt = meta.status === 'opened' ? '对方已领取 ¥' + meta.amount : (meta.status === 'refunded' ? '红包已退还' : '红包已发出 ¥' + meta.amount + '，等待对方领取');
      UI.popup({ center: true, title: '我的红包', body: '<div class="rp-open mine"><div class="rp-open-amt">¥ ' + meta.amount + '</div><div class="rp-open-txt">' + txt + '</div></div>' });
      return;
    }
    if (meta.status === 'refunded') { UI.toast('红包已退还', 'redpacket'); return; }
    if (meta.status === 'opened') {
      UI.popup({ center: true, title: '红包详情', body: '<div class="rp-open"><div class="rp-open-amt">¥ ' + meta.amount + '</div><div class="rp-open-txt">来自 ' + (S.convInfo(cid).name) + '</div></div>' });
      return;
    }
    // 未拆
    if (S.simNow() - m.time >= 24 * 3600e3) {
      meta.status = 'refunded';
      S.pushMsg(cid, { from: 'sys', type: 'sys', content: '红包已退还（24 小时未领取）' });
      S.saveDebounced(); redrawCurrent();
      return;
    }
    meta.status = 'opened';
    S.saveDebounced();
    AudioX.openPacket();
    var ov = el('<div class="rp-open-overlay"><div class="rp-open-card">' +
      (meta.cover ? '<img src="' + meta.cover + '">' : '') +
      '<div class="rp-open-amt">¥ ' + meta.amount + '</div>' +
      '<div class="rp-open-txt">' + esc(meta.note || '恭喜发财') + '</div>' +
      '<div class="rp-open-by">来自 ' + esc(S.convInfo(cid).name) + '</div></div></div>');
    ov.addEventListener('click', function () { ov.remove(); redrawCurrent(); });
    document.getElementById('sheets').appendChild(ov);
    setTimeout(function () { ov.classList.add('show'); }, 30);
  }

  /* 语音播放 */
  function playVoice(row, c) {
    var bars = row.querySelectorAll('.v-bars i');
    var playing = row.classList.toggle('playing');
    if (playing) {
      bars.forEach(function (b, i) { b.style.animationDelay = (i * 0.12) + 's'; });
      AudioX.voiceLike(3);
      setTimeout(function () { if (row) row.classList.remove('playing'); }, 3200);
    }
  }

  function redrawCurrent() {
    var el = pageEl;
    if (!el) return;
    var msgsEl = el.querySelector('#chat-msgs');
    if (!msgsEl) return;
    var info = S.convInfo(chatCid);
    var arr = info.group ? S.groupMsgs(chatCid) : S.conv(chatCid);
    var h = '';
    var lastDay = '';
    arr.forEach(function (m) {
      var dk = new Date(m.time).toDateString();
      if (dk !== lastDay) { lastDay = dk; h += '<div class="msg-date">' + UI.fmtChatTime(m.time).slice(0, -5) + '</div>'; }
      h += msgHTML(m, chatCid, info.group);
    });
    var near = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 140;
    msgsEl.innerHTML = h;
    bindBubbles(msgsEl, chatCid, info.group);
    if (near) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  /* ================= 输入栏工具 ================= */
  function openTool(f, cid, isGroup, c) {
    if (f === 'sticker') openStickers(cid, c);
    else if (f === 'redpacket') openRedPacketSend(cid, isGroup);
    else if (f === 'call') openCallPicker(cid, c, isGroup);
    else if (f === 'poke') openPoke(cid, c, isGroup);
    else if (f === 'stalk') openStalk(cid, c, isGroup);
    else if (f === 'dice') openDice();
  }

  function openStickers(cid, c) {
    var me = S.state.me;
    if (!me.stickers) me.stickers = [];
    var stickers = me.stickers;
    function gridHtml() {
      return stickers.length ? stickers.map(function (s, i) {
        return '<img class="stk-cell" data-i="' + i + '" src="' + s + '">';
      }).join('') : '<div class="empty"><div class="empty-ic">' + Icon('sticker', 34) + '</div><div class="empty-t">还没有表情包<br>点击上方「添加表情包」上传</div></div>';
    }
    var body = '<div class="stk-tools"><button class="glass-btn sm primary" id="stk-add">' + Icon('plus', 15) + ' 添加表情包</button>' +
      '<span class="stk-hint">这是我自己的表情包；对方发来的是他在联系人页面添加的表情包</span></div>' +
      '<div class="stk-grid" id="stk-grid">' + gridHtml() + '</div>';
    var api = UI.popup({ title: '表情包', body: body });
    api.body.querySelector('#stk-add').addEventListener('click', async function () {
      var imgs = await UI.pickImage({ multiple: true });
      imgs.forEach(function (im) { stickers.push(im); });
      S.saveDebounced();
      api.body.querySelector('#stk-grid').innerHTML = gridHtml();
      bindCells();
      UI.toast('已添加 ' + imgs.length + ' 张', 'check');
    });
    function bindCells() {
      api.body.querySelectorAll('.stk-cell').forEach(function (img) {
        img.addEventListener('click', function () {
          var s = stickers[+img.dataset.i];
          if (!s) return;
          sendSticker(cid, s);
          api.close();
        });
      });
    }
    bindCells();
  }
  function sendSticker(cid, src) {
    var info = S.convInfo(cid);
    var msg = { from: 'me', type: 'sticker', content: '', meta: { sticker: true, image: src } };
    if (info.group) S.pushGroupMsg(cid, msg); else S.pushMsg(cid, msg);
    AudioX.sendSound();
    AI.onUserMsg(cid);
    redrawCurrent();
  }

  function openRedPacketSend(cid, isGroup) {
    var cover = null;
    var body = '<div class="rp-send">' +
      '<div class="rp-cover" id="rp-cover">' + Icon('image', 26) + '<span>自定义封面</span></div>' +
      '<div class="rp-field"><label>金额</label><input id="rp-amt" type="number" min="0.01" step="0.01" placeholder="0.00"></div>' +
      '<div class="rp-field"><label>备注</label><input id="rp-note" maxlength="40" placeholder="恭喜发财（可选）"></div>' +
      '</div>';
    var api = UI.popup({
      title: '发红包',
      body: body,
      actions: [
        { label: '取消' },
        { label: '塞钱进红包', primary: true, onClick: function () {
          var amt = parseFloat(document.getElementById('rp-amt').value);
          if (!amt || amt <= 0) { UI.toast('请输入金额', 'info'); return false; }
          var note = document.getElementById('rp-note').value.trim();
          var msg = {
            from: 'me', type: 'redpacket', content: '',
            meta: { amount: Math.round(amt * 100) / 100, note: note, cover: cover, status: 'unopened', fromMe: true }
          };
          var info = S.convInfo(cid);
          var pushed = info.group ? S.pushGroupMsg(cid, msg) : S.pushMsg(cid, msg);
          var st = S.state;
          if (!st.pendingPackets) st.pendingPackets = {};
          st.pendingPackets[msg.id] = { cid: cid, openAt: Date.now() + 6000 + Math.random() * 34000, never: Math.random() < 0.12 };
          S.saveDebounced();
          AudioX.sendSound();
          redrawCurrent();
        } }
      ]
    });
    var coverEl = api.body.querySelector('#rp-cover');
    coverEl.addEventListener('click', async function () {
      var ap2 = UI.sheetList({
        title: '选择红包封面',
        items: [
          { icon: 'sticker', label: '从表情包选择', onClick: function () { ap2.close(); pickFrom(function (im) { cover = im; coverEl.style.backgroundImage = 'url(' + im + ')'; coverEl.innerHTML = ''; }); } },
          { icon: 'flag', label: '从我的朋友圈图片选择', onClick: function () { ap2.close(); pickFrom2(function (im) { cover = im; coverEl.style.backgroundImage = 'url(' + im + ')'; coverEl.innerHTML = ''; }); } },
          { icon: 'persons', label: '从头像库选择', onClick: function () { ap2.close(); pickFrom3(function (im) { cover = im; coverEl.style.backgroundImage = 'url(' + im + ')'; coverEl.innerHTML = ''; }); } },
          { icon: 'image', label: '从本地选择', onClick: function () { ap2.close(); pickLocalCover(); } }
        ]
      });
    });
    function pickFrom(cb) { var me = S.state.me; if (!me.stickers) me.stickers = []; if (me.stickers.length) cb(S.pick(me.stickers)); else UI.toast('你还没有自己的表情包，去聊天表情包里添加', 'info'); }
    function pickFrom2(cb) { var imgs = AI.userMomentsImages(); if (imgs.length) cb(S.pick(imgs)); else UI.toast('你还没有发过朋友圈图片', 'info'); }
    function pickFrom3(cb) { var lib = S.state.me.avatarLib; if (lib.length) cb(S.pick(lib)); else UI.toast('头像库为空', 'info'); }
    async function pickLocalCover() { var imgs = await UI.pickImage({}); if (imgs.length) { cover = imgs[0]; coverEl.style.backgroundImage = 'url(' + cover + ')'; coverEl.innerHTML = ''; } }
  }

  function openCallPicker(cid, c, isGroup) {
    var name = isGroup ? (S.getGroup(cid) ? S.getGroup(cid).name : '群聊') : (c ? c.name : '对方');
    UI.sheetList({
      title: '呼叫 ' + name,
      items: [
        { icon: 'video', label: '视频通话', onClick: function () { startCall(cid, 'video', c); } },
        { icon: 'call', label: '语音通话', onClick: function () { startCall(cid, 'voice', c); } }
      ]
    });
  }

  function openPoke(cid, c, isGroup) {
    var target = c;
    if (isGroup && cid) {
      var g = S.getGroup(cid);
      if (g && g.members.length) target = S.getContact(S.pick(g.members));
    }
    doPat(cid, target || c);
  }

  function openStalk(cid, c, isGroup) {
    var target = c;
    if (isGroup) {
      var g = S.getGroup(cid);
      if (g && g.members.length) target = S.getContact(S.pick(g.members));
    }
    if (!target) target = c;
    var api = UI.popup({
      center: true,
      title: '视奸',
      body: '<div class="stalk"><div class="stalk-loading">' + Icon('eye', 30) + '<div class="stalk-t">正在偷偷查看 TA 在做什么…</div></div></div>',
      dismiss: false
    });
    setTimeout(function () {
      var discovered = Math.random() < 0.3;
      var act = (target.status && target.status.text) ? target.status.text : S.pick(target.cards.daily || []) || '发呆中';
      if (discovered) {
        api.body.innerHTML = '<div class="stalk"><div class="stalk-found">' + Icon('eye', 26) + '<div class="stalk-t">被发现啦！对方察觉到了你在视奸</div></div>' +
          '<div class="stalk-result">TA 正在「' + esc(act) + '」</div></div>';
        UI.toast('你被发现了！', 'eye');
      } else {
        api.body.innerHTML = '<div class="stalk"><div class="stalk-result ok">TA 正在「' + esc(act) + '」</div><div class="stalk-t">（没被发现，好险）</div></div>';
      }
      api.el.querySelector('.pop-mask').addEventListener('click', function () { api.close(); });
      api.el.classList.add('dismissable');
      setTimeout(function () { api.close(); }, 5000);
    }, 2400);
  }

  function openDice() {
    var api = UI.popup({
      title: '扔骰子',
      body: '<div class="dice">' +
        '<div class="dice-q"><label>问题</label><input id="dice-q" maxlength="30" placeholder="输入你的问题"></div>' +
        '<div class="dice-ans">' + [1, 2, 3, 4, 5, 6].map(function (n) {
          return '<div class="dice-ans-row"><span>' + n + '</span><input data-n="' + n + '" maxlength="20" placeholder="第 ' + n + ' 点的回答"></div>';
        }).join('') + '</div>' +
        '<button class="glass-btn primary big" id="dice-go">' + Icon('dice', 17) + ' 开始扔骰子</button>' +
        '<div class="dice-result" id="dice-result"></div>' +
        '</div>',
      dismiss: true
    });
    api.body.querySelector('#dice-go').addEventListener('click', function () {
      var q = api.body.querySelector('#dice-q').value.trim();
      var ans = [];
      for (var n = 1; n <= 6; n++) {
        var inp = api.body.querySelector('[data-n="' + n + '"]');
        ans.push(inp ? inp.value.trim() : '');
      }
      if (!q) { UI.toast('请输入问题', 'info'); return; }
      var face = S.randInt(1, 6);
      var res = api.body.querySelector('#dice-result');
      res.classList.remove('show');
      AudioX.diceSound();
      var roll = 0;
      var iv = setInterval(function () {
        roll = S.randInt(1, 6);
        res.innerHTML = '<div class="dice-rolling">' + Icon('dice', 46) + '<span>' + roll + '</span></div>';
      }, 120);
      setTimeout(function () {
        clearInterval(iv);
        res.innerHTML = '<div class="dice-done"><div class="dice-face">' + Icon('dice', 46) + '<span>' + face + '</span></div>' +
          '<div class="dice-q-txt">' + esc(q) + '</div>' +
          '<div class="dice-a-txt">' + (ans[face - 1] || ('第 ' + face + ' 点')) + '</div></div>';
        res.classList.add('show');
      }, 1400);
    });
  }

  /* ================= 更多菜单（单人 / 群聊为不同界面） ================= */
  function openMore(cid, c) {
    var isGroup = !!S.getGroup(cid);
    var items;
    if (isGroup) {
      // 群聊更多：仅保留 4 项；打开设置类浮窗时本浮窗保留在下方
      items = [
        { icon: 'palette', label: '设置聊天背景', onClick: function () { setBg('chatBg', '聊天背景'); return false; } },
        { icon: 'search', label: '搜索聊天记录', onClick: function () { Router.go('search-history', { cid: cid }); } },
        { icon: 'download', label: '备份 / 导入聊天记录', onClick: function () { backupPop(cid); return false; } },
        { icon: 'trash', label: '删除聊天记录', danger: true, onClick: function () { delChat(cid); } }
      ];
    } else {
      items = [
        { icon: 'palette', label: '设置聊天背景', onClick: function () { setBg('chatBg', '聊天背景'); return false; } },
        { icon: 'video', label: '设置视频背景', onClick: function () { setBg('videoBg', '视频背景'); return false; } },
        { icon: 'call', label: '设置通话背景', onClick: function () { setBg('callBg', '通话背景'); return false; } },
        { icon: 'send', label: '设置自动发送消息', onClick: function () { autoSendPop(c); return false; } },
        { icon: 'card', label: '设置回复字卡数量', onClick: function () { replyCountPop(c); return false; } },
        { icon: 'clock', label: '设置回复聊天时间间隙', onClick: function () { gapPop(c); return false; } },
        { icon: 'chat', label: '设置是否合并字卡回复', onClick: function () { mergePop(c); return false; } },
        { icon: 'search', label: '搜索聊天记录', onClick: function () { Router.go('search-history', { cid: cid }); } },
        { icon: 'download', label: '备份 / 导入聊天记录', onClick: function () { backupPop(cid); return false; } },
        { icon: 'trash', label: '删除聊天记录', danger: true, onClick: function () { delChat(cid); } }
      ];
    }
    UI.sheetList({ title: '更多', items: items });
  }

  function setBg(key, label) {
    UI.sheetList({
      title: label,
      items: [
        { icon: 'image', label: '从本地选取', onClick: function (api) { api.close(); doPick(false); } },
        { icon: 'camera', label: '拍照', onClick: function (api) { api.close(); doPick(true); } }
      ]
    });
    async function doPick(camera) {
      var imgs = await UI.pickImage({ camera: camera });
      if (!imgs.length) return;
      var c = S.getContact(chatCid);
      if (c) { c.settings[key] = imgs[0]; S.saveDebounced(); }
      if (key === 'chatBg') {
        var bg = pageEl && pageEl.querySelector('.chat-bg');
        if (bg) bg.style.backgroundImage = 'url(' + imgs[0] + ')';
      }
      UI.toast(label + '已更新', 'check');
    }
  }

  function autoSendPop(c) {
    if (!c) return;
    var row = UI.switchEl(c.settings.autoSend, function (v) { c.settings.autoSend = v; S.saveDebounced(); });
    UI.popup({
      title: '自动发送消息',
      body: '<div class="pop-row"><span>开启后对方会不定期自动发送消息</span></div>',
      actions: [{ label: '完成', primary: true }]
    }).body.querySelector('.pop-row').appendChild(row);
  }
  function replyCountPop(c) {
    if (!c) return;
    UI.popup({
      title: '回复字卡数量',
      body: '',
      actions: [{ label: '完成', primary: true }]
    }).body.appendChild(UI.slider({
      min: 1, max: 6, step: 1, value: c.settings.replyCount, unit: ' 张',
      onInput: function (v) { c.settings.replyCount = v; S.saveDebounced(); }
    }));
  }
  function gapPop(c) {
    if (!c) return;
    UI.popup({
      title: '回复聊天时间间隙',
      body: '<div class="pop-tip">你发送消息后，对方回复所需时间</div>',
      actions: [{ label: '完成', primary: true }]
    }).body.appendChild(UI.slider({
      min: 6, max: 180, step: 1, value: c.settings.gapSec, unit: ' 秒',
      onInput: function (v) { c.settings.gapSec = v; S.saveDebounced(); }
    }));
  }
  function mergePop(c) {
    if (!c) return;
    var row = UI.switchEl(c.settings.merge, function (v) { c.settings.merge = v; S.saveDebounced(); });
    UI.popup({
      title: '合并字卡回复',
      body: '<div class="pop-tip">开启后多条字卡合并为一条回复；关闭后每条字卡单独一个气泡</div>',
      actions: [{ label: '完成', primary: true }]
    }).body.querySelector('.pop-tip').after(row);
  }

  function backupPop(cid) {
    UI.popup({
      title: '备份 / 导入聊天记录',
      body: '<div class="pop-tip">备份将聊天记录保存为本地文件；导入可从本地文件恢复。</div>',
      actions: [
        { icon: 'download', label: '备份聊天记录', onClick: function () {
          var arr = S.convMeta(cid).group ? S.groupMsgs(cid) : S.conv(cid);
          var blob = new Blob([JSON.stringify({ cid: cid, messages: arr }, null, 2)], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = '字卡聊天记录_' + cid + '_' + Date.now() + '.json';
          a.click();
          UI.toast('已备份', 'check');
        } },
        { icon: 'upload', label: '导入聊天记录', onClick: async function () {
          var files = await UI.pickFile('.json,application/json', false);
          if (!files.length) return;
          var r = new FileReader();
          r.onload = function () {
            try {
              var j = JSON.parse(r.result);
              if (j && Array.isArray(j.messages)) {
                var arr = S.convMeta(cid).group ? S.groupMsgs(cid) : S.conv(cid);
                arr.length = 0;
                j.messages.forEach(function (m) { arr.push(m); });
                S.saveDebounced();
                redrawCurrent();
                UI.toast('导入成功，共 ' + j.messages.length + ' 条', 'check');
              } else UI.toast('文件格式不正确', 'info');
            } catch (e) { UI.toast('文件格式不正确', 'info'); }
          };
          r.readAsText(files[0]);
        } }
      ]
    });
  }

  function delChat(cid) {
    UI.confirm('删除聊天记录', '确定删除你和对方的所有聊天记录吗？此操作不可恢复。', { danger: true, okText: '删除' }).then(function (ok) {
      if (!ok) return;
      if (S.convMeta(cid).group) { S.groupMsgs(cid).length = 0; }
      else { S.conv(cid).length = 0; }
      S.saveDebounced();
      redrawCurrent();
      UI.toast('聊天记录已删除', 'check');
    });
  }

  /* ================= 搜索聊天记录 ================= */
  Router.register('search-history', function (el, args) {
    var cid = args.cid;
    var info = S.convInfo(cid);
    var arr = info.group ? S.groupMsgs(cid) : S.conv(cid);
    el.innerHTML = '<div class="page-head">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
      '<div class="ph-title">搜索聊天记录</div></div>' +
      '<div class="msgs-search sh-search">' + Icon('search', 17) + '<input id="sh-q" placeholder="搜索聊天内容" autocomplete="off"></div>' +
      '<div class="sh-list" id="sh-list"></div>';
    var listEl = el.querySelector('#sh-list');
    function draw(q) {
      if (!q) { listEl.innerHTML = '<div class="empty"><div class="empty-ic">' + Icon('search', 34) + '</div><div class="empty-t">输入关键词搜索聊天记录</div></div>'; return; }
      var hits = arr.filter(function (m) {
        if (m.type === 'sys') return false;
        return (m.content || '').indexOf(q) !== -1 || ((m.meta && m.meta.text) || '').indexOf(q) !== -1;
      });
      if (!hits.length) { listEl.innerHTML = '<div class="empty"><div class="empty-t">未找到相关记录</div></div>'; return; }
      var h = '';
      var lastDay = '';
      hits.forEach(function (m) {
        var dk = new Date(m.time).toDateString();
        if (dk !== lastDay) { lastDay = dk; h += '<div class="msg-date">' + UI.fmtDay(m.time) + '</div>'; }
        var who = m.from === 'me' ? '我' : (info.group ? (S.getContact(m.from) ? S.getContact(m.from).name : '成员') : info.name);
        var txt = m.type === 'voice' ? '[语音] ' + ((m.meta && m.meta.text) || '') : (m.content || (m.type === 'image' ? '[图片]' : ''));
        h += '<div class="sh-row" data-id="' + m.id + '"><div class="sh-who">' + esc(who) + ' · ' + UI.fmtTime(m.time) + '</div><div class="sh-txt">' + esc(txt) + '</div></div>';
      });
      listEl.innerHTML = h;
      listEl.querySelectorAll('.sh-row').forEach(function (row) {
        row.addEventListener('click', function () {
          Router.go('chat', { cid: cid, focusMsg: row.dataset.id });
        });
      });
    }
    el.querySelector('#sh-q').addEventListener('input', function () { draw(this.value.trim()); });
    draw('');
  });

  /* ================= 通话系统 ================= */
  var callState = null;

  function startCall(cid, type, c) {
    if (callState) { UI.toast('当前已有通话进行中', 'info'); return; }
    var g = S.getGroup(cid);
    var isGroup = !!g;
    var name = isGroup ? g.name : (c ? c.name : '对方');
    var avatar = isGroup ? g.avatar : (c ? c.avatar : S.state.me.avatar);
    var members = isGroup ? g.members.map(function (m) { return S.getContact(m); }).filter(Boolean) : null;
    var bg = c && c.settings[(type === 'video' ? 'videoBg' : 'callBg')];
    callState = { type: type, dir: 'out', cid: cid, name: name, avatar: avatar, bg: bg, group: isGroup, members: members, phase: 'calling', startAt: 0, timerIv: null, voiceIv: null };
    renderCallWin();
    // 对方应答（群聊：至少一半成员接通）
    setTimeout(function () {
      if (!callState || callState.cid !== cid) return;
      var joined = isGroup ? (Math.random() < 0.85 && members && members.length ? 1 + Math.floor(Math.random() * Math.max(1, members.length - 1)) : 0) : (Math.random() < 0.82 ? 1 : 0);
      if (joined > 0) {
        callState.joined = joined;
        callState.phase = 'connected';
        callState.startAt = Date.now();
        updateCallUI();
        startCallTimer();
        startCallVoice();
      } else {
        endCall(true, isGroup ? '群聊无人接听' : '对方拒绝了通话');
      }
    }, 2000 + Math.random() * 3000);
  }

  function showIncoming(ev) {
    if (callState) {
      var info = S.convInfo(ev.cid);
      S.pushMsg(ev.cid, { from: 'sys', type: 'sys', content: info.name + ' 拨打了' + (ev.type === 'video' ? '视频' : '语音') + '通话（未接通）' });
      return;
    }
    var c = S.getContact(ev.cid);
    if (!c) return;
    callState = { type: ev.type, dir: 'in', cid: ev.cid, name: c.name, avatar: c.avatar, bg: c.settings[(ev.type === 'video' ? 'videoBg' : 'callBg')], phase: 'ringing', startAt: 0, timerIv: null, voiceIv: null, timeoutIv: null };
    renderCallWin();
    AudioX.ringTone();
    // 45s 无人接听 → 未接
    callState.timeoutIv = setTimeout(function () {
      if (callState && callState.phase === 'ringing') {
        endCall(true, '未接来电');
      }
    }, 45000);
  }

  function renderCallWin() {
    var cs = callState;
    var bgStyle = cs.bg ? 'background-image:url(' + cs.bg + ')' : '';
    var isIn = cs.dir === 'in' && cs.phase === 'ringing';
    // 群聊：显示群友头像（参考微信）
    var avas = '';
    if (cs.group && cs.members) {
      var shown = cs.members.slice(0, 5);
      avas = '<div class="call-avas">' + shown.map(function (m) {
        return '<div class="call-ava-sm"><img src="' + m.avatar + '"><span class="ca-dot"></span></div>';
      }).join('') + (cs.members.length > 5 ? '<div class="call-ava-sm more">+' + (cs.members.length - 5) + '</div>' : '') + '</div>';
    } else {
      avas = '<div class="call-ava">' + UI.avatarEl(cs.avatar, 84) + '</div>';
    }
    var w = el('<div class="call-win ' + cs.type + '" data-phase="' + cs.phase + '">' +
      '<div class="call-bg" style="' + bgStyle + '"></div>' +
      '<div class="call-head">' +
      '<button class="call-collapse" title="收纳成悬浮图标">' + Icon('float', 16) + '</button>' +
      '<span class="call-name">' + esc(cs.name) + '</span>' +
      '</div>' +
      '<div class="call-body">' +
      avas +
      '<div class="call-state" id="call-state">' + (isIn ? '邀请你' + (cs.type === 'video' ? '视频' : '语音') + '通话…' : (cs.phase === 'calling' ? (cs.group ? '正在呼叫群聊…' : '正在呼叫…') : '00:00')) + '</div>' +
      (cs.type === 'video' ? '<div class="call-video-shimmer"></div>' : '<div class="call-wave" id="call-wave"></div>') +
      '</div>' +
      '<div class="call-foot">' +
      (isIn ? '' : '<button class="call-hang" id="call-hang">' + Icon('hangup', 26) + '</button>') +
      '</div>' +
      (isIn ? '<div class="call-slides">' +
        '<div class="slide-track accept" id="slide-a"><span class="slide-label">滑动接听</span><span class="slide-knob" id="knob-a">' + Icon('call', 20) + '</span></div>' +
        '<div class="slide-track reject" id="slide-r"><span class="slide-label">滑动拒接</span><span class="slide-knob" id="knob-r">' + Icon('hangup', 20) + '</span></div>' +
        '</div>' : '') +
      '<div class="call-resize"></div>' +
      '</div>');
    document.getElementById('sheets').appendChild(w);
    cs.el = w;

    if (isIn) {
      bindSlide(w.querySelector('#knob-a'), w.querySelector('#slide-a'), 'right', function () { acceptCall(); });
      bindSlide(w.querySelector('#knob-r'), w.querySelector('#slide-r'), 'left', function () {
        endCall(true, '已拒接');
        setTimeout(function () {
          var c = S.getContact(cs.cid);
          if (c && Math.random() < 0.6) S.pushMsg(cs.cid, { from: 'them', type: 'text', content: '好吧，那下次再聊', read: false });
        }, 1500);
      });
    } else {
      w.querySelector('#call-hang').addEventListener('click', function () { endCall(false); });
    }
    w.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.call-collapse')) collapseCall();
    });
    makeDraggable(w, w.querySelector('.call-head'));
    makeResizable(w, w.querySelector('.call-resize'));
    requestAnimationFrame(function () { w.classList.add('show'); });
  }

  /* 滑动接听/拒接：拖动滑块（圆形按钮）沿轨道滑动，滑到底触发 */
  function bindSlide(knob, track, dir, onDone) {
    var startX = 0, dragging = false, done = false;
    knob.addEventListener('pointerdown', function (e) {
      dragging = true; done = false;
      startX = e.clientX;
      knob.setPointerCapture && knob.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    knob.addEventListener('pointermove', function (e) {
      if (!dragging || done) return;
      var maxW = track.clientWidth - knob.offsetWidth - 6;
      var dx = e.clientX - startX;
      var v = dir === 'right' ? Math.max(0, Math.min(maxW, dx)) : Math.min(0, Math.max(-maxW, dx));
      knob.style.transform = 'translateX(' + v + 'px)';
      track.style.setProperty('--slide-progress', (Math.abs(v) / maxW * 100) + '%');
      if ((dir === 'right' && v >= maxW * 0.72) || (dir === 'left' && v <= -maxW * 0.72)) {
        done = true; dragging = false;
        var end = dir === 'right' ? maxW : -maxW;
        knob.style.transform = 'translateX(' + end + 'px)';
        knob.style.transition = 'transform .18s ease';
        onDone();
      }
    });
    function reset() {
      if (!dragging || done) return;
      dragging = false;
      knob.style.transition = 'transform .3s cubic-bezier(.32,.72,0,1)';
      knob.style.transform = '';
      track.style.setProperty('--slide-progress', '0%');
      setTimeout(function () { knob.style.transition = ''; }, 320);
    }
    knob.addEventListener('pointerup', reset);
    knob.addEventListener('pointercancel', reset);
  }

  function acceptCall() {
    if (!callState) return;
    clearTimeout(callState.timeoutIv);
    callState.phase = 'connected';
    callState.startAt = Date.now();
    var slides = callState.el.querySelector('.call-slides');
    if (slides) slides.remove();
    callState.el.dataset.phase = 'connected';
    updateCallUI();
    startCallTimer();
    startCallVoice();
  }

  function updateCallUI() {
    if (!callState || !callState.el) return;
    var st = callState.el.querySelector('#call-state');
    if (st) st.textContent = UI.fmtDur((Date.now() - callState.startAt) / 1000);
    callState.el.querySelector('.call-collapse').style.display = 'flex';
  }
  function startCallTimer() {
    callState.timerIv = setInterval(function () {
      if (callState && callState.phase === 'connected') updateCallUI();
    }, 1000);
  }
  function startCallVoice() {
    // 接通后，对方会随机选择语音文件播放（群聊：随机一名成员）
    var c = S.getContact(callState.cid);
    var voiceContact = c;
    if (callState.group && callState.members && callState.members.length) {
      voiceContact = S.pick(callState.members);
    }
    var lib = (voiceContact && voiceContact.cards.voice) || [];
    var pick = lib.length ? S.pick(lib) : null;
    var info = callState.el.querySelector('#call-state');
    function play() {
      if (!callState || callState.phase !== 'connected') return;
      var tip = document.createElement('div');
      tip.className = 'call-voice-tip';
      tip.innerHTML = Icon('mic', 13) + ' 对方正在播放' + (pick ? '语音：' + esc(pick.name) : '语音文件…');
      if (info) { info.parentNode.appendChild(tip); setTimeout(function () { tip.remove(); }, 3200); }
      AudioX.voiceLike(3);
    }
    play();
    callState.voiceIv = setInterval(function () {
      if (Math.random() < 0.65) play();
    }, 5000);
  }

  function endCall(byOther, reason) {
    if (!callState) return;
    var cs = callState;
    var dur = cs.phase === 'connected' ? Math.round((Date.now() - cs.startAt) / 1000) : 0;
    var typeName = cs.type === 'video' ? '视频通话' : '语音通话';
    var endedTxt = reason || (dur ? typeName + ' 已结束 · ' + UI.fmtDur(dur) : (cs.dir === 'out' ? '通话已取消' : typeName + ' 已结束'));
    if (cs.el) { cs.el.classList.add('close'); setTimeout(function () { if (cs.el) cs.el.remove(); }, 300); }
    clearInterval(cs.timerIv);
    clearInterval(cs.voiceIv);
    clearTimeout(cs.timeoutIv);
    if (cs.bubble) { cs.bubble.remove(); }
    // 通话记录
    if (cs.cid) {
      var meta = S.convMeta(cs.cid);
      if (meta.group) S.pushGroupMsg(cs.cid, { from: 'sys', type: 'sys', content: endedTxt });
      else {
        S.pushMsg(cs.cid, { from: 'sys', type: 'sys', content: endedTxt });
        if (dur > 0) {
          var c = S.getContact(cs.cid);
          if (c && Math.random() < 0.35) {
            setTimeout(function () {
              var t = S.pick(c.cards.chat && c.cards.chat.length ? c.cards.chat[0].items : null) || '聊得很开心';
              S.pushMsg(cs.cid, { from: 'them', type: 'text', content: t, read: false });
            }, 2000);
          }
        }
      }
    }
    callState = null;
  }

  function collapseCall() {
    if (!callState || !callState.el) return;
    callState.el.classList.add('hidden');
    var c = callState;
    var b = el('<div class="call-bubble glass-strong" title="点击恢复">' + UI.avatarEl(c.avatar, 56) +
      '<div class="cb-dot"></div></div>');
    document.getElementById('sheets').appendChild(b);
    makeDraggable(b, b);
    b.addEventListener('click', function () {
      if (c.el) { c.el.classList.remove('hidden'); c.el.classList.add('show'); }
      b.remove();
    });
    callState.bubble = b;
  }

  function makeDraggable(el, handle) {
    var sx, sy, ox, oy, dragging = false;
    handle.addEventListener('pointerdown', function (e) {
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = el.offsetLeft; oy = el.offsetTop;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var phone = document.getElementById('phone');
      var pw = phone.clientWidth, ph = phone.clientHeight;
      var x = ox + (e.clientX - sx), y = oy + (e.clientY - sy);
      x = Math.max(8, Math.min(pw - el.offsetWidth - 8, x));
      y = Math.max(60, Math.min(ph - el.offsetHeight - 8, y));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    });
    handle.addEventListener('pointerup', function () { dragging = false; });
    handle.addEventListener('pointercancel', function () { dragging = false; });
  }

  function makeResizable(el, handle) {
    var sx, sy, ow, oh, dragging = false;
    handle.addEventListener('pointerdown', function (e) {
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ow = el.offsetWidth; oh = el.offsetHeight;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var phone = document.getElementById('phone');
      var w = ow + (e.clientX - sx), h = oh + (e.clientY - sy);
      w = Math.max(220, Math.min(phone.clientWidth - 16, w));
      h = Math.max(300, Math.min(phone.clientHeight - 60, h));
      el.style.width = w + 'px';
      el.style.height = h + 'px';
    });
    handle.addEventListener('pointerup', function () { dragging = false; });
    handle.addEventListener('pointercancel', function () { dragging = false; });
  }

  Bus.on('incoming-call', function (ev) { showIncoming(ev); });
  Bus.on('poke', function (cid) {
    if (isChatOpen(cid)) {
      var c = S.getContact(cid);
      showPokeAnim(c ? c.name : '对方', false);
    }
  });

  /* ================= 对方页面 ================= */
  Router.register('contact-profile', function (el, args) {
    var c = S.getContact(args.cid);
    if (!c) { Router.back(); return; }
    var hasStatus = !!(c.status && c.status.text);

    function draw() {
      if (!hasStatus) {
        // 无状态页面：头像居中，姓名 30px 下
        el.innerHTML = '<div class="page-head light">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button></div>' +
          '<div class="cp-nostatus">' + UI.avatarEl(c.avatar, 92) +
          '<div class="cp-name">' + esc(c.remark || c.name) + '</div>' +
          '<button class="glass-btn cp-moments" id="cp-mom">' + Icon('flag', 16) + ' 朋友圈</button>' +
          '</div>';
        el.querySelector('#cp-mom').addEventListener('click', function () { Router.go('contact-moments', { cid: c.id }); });
      } else {
        // 有状态页面（参考微信）：状态图与顶端 UI 对齐，返回键/头像浮于图上
        el.innerHTML = '<div class="cp-status-page">' +
          '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
          '<div class="cp-ava">' + UI.avatarEl(c.avatar, 64) + '</div>' +
          '<div class="cp-img">' +
          (c.status.image ? '<img class="cp-img-main" src="' + c.status.image + '">' : '') +
          '<div class="cp-img-mask"></div>' +
          '<div class="cp-status-txt">' + esc(c.status.text) + '</div>' +
          '<div class="cp-actions">' +
          '<button class="cp-act" id="cp-like">' + Icon('like', 18) + '</button>' +
          '<button class="cp-act" id="cp-dislike">' + Icon('dislike', 18) + '</button>' +
          '<button class="cp-act" id="cp-comment">' + Icon('comment', 18) + '</button>' +
          '</div>' +
          '</div>' +
          (c.status.comments && c.status.comments.length ? '<div class="cp-comments">' + c.status.comments.map(function (cm, ci) {
            return '<div class="cp-cmt" data-ci="' + ci + '"><span class="cp-cmt-who">' + (cm.who === 'me' ? '我' : esc(c.name)) + '</span>' + (cm.replyTo ? ' 回复 <span class="cp-cmt-rp">' + esc(cm.replyTo) + '</span>' : '') + '：' + esc(cm.text) + '</div>';
          }).join('') + '</div>' : '') +
          '<button class="glass-btn cp-moments" id="cp-mom2">' + Icon('flag', 16) + ' 朋友圈</button>' +
          '</div>';
        bindActions();
      }
    }

    function bindActions() {
      var likeOn = (c.status.likes || []).indexOf('me') !== -1;
      var dislikeOn = (c.status.dislikes || []).indexOf('me') !== -1;
      function sync() {
        el.querySelector('#cp-like').classList.toggle('on', !!likeOn);
        el.querySelector('#cp-dislike').classList.toggle('on', !!dislikeOn);
      }
      sync();
      el.querySelector('#cp-like').addEventListener('click', function () {
        if (likeOn) { likeOn = false; } else { likeOn = true; dislikeOn = false; }
        sync(); saveReacts();
      });
      el.querySelector('#cp-dislike').addEventListener('click', function () {
        if (dislikeOn) { dislikeOn = false; } else { dislikeOn = true; likeOn = false; }
        sync(); saveReacts();
      });
      el.querySelector('#cp-comment').addEventListener('click', function () {
        var api = UI.popup({
          title: '评论 TA 的状态',
          body: '<input class="pop-input" id="cp-cmt-inp" maxlength="60" placeholder="写下你的评论">',
          actions: [
            { label: '取消' },
            { label: '发送', primary: true, onClick: function () {
              var v = document.getElementById('cp-cmt-inp').value.trim();
              if (!v) return;
              c.status.comments = c.status.comments || [];
              c.status.comments.push({ who: 'me', text: v, time: Date.now() });
              S.saveDebounced(); draw();
              // 对方有一定概率回一条字卡（用户每评论一次最多回一条；回复显示在状态页内）
              setTimeout(function () {
                if (Math.random() < 0.7) {
                  var cards = AI.flatChat(c);
                  var t = S.pick(cards);
                  if (!t) return;
                  c.status.comments.push({ who: 'them', text: t, replyTo: '我', time: Date.now() });
                  S.saveDebounced();
                  if (Router.currentId() === 'contact-profile') draw();
                }
              }, 4000 + Math.random() * 5000);
            } }
          ]
        });
      });
      // 点击评论可回复（显示「回复某人」，回复仅留在状态页内）
      el.querySelectorAll('.cp-cmt[data-ci]').forEach(function (cmEl) {
        cmEl.addEventListener('click', function () {
          var cm = c.status.comments[+cmEl.dataset.ci];
          if (!cm || cm.who === 'me') return;
          var api = UI.popup({
            title: '回复 ' + c.name,
            body: '<input class="pop-input" id="cp-rp-inp" maxlength="60" placeholder="回复 ' + c.name + '…">',
            actions: [
              { label: '取消' },
              { label: '发送', primary: true, onClick: function () {
                var v = document.getElementById('cp-rp-inp').value.trim();
                if (!v) return;
                c.status.comments.push({ who: 'me', text: v, replyTo: c.name, time: Date.now() });
                S.saveDebounced(); draw();
                setTimeout(function () {
                  if (Math.random() < 0.6) {
                    var cards = AI.flatChat(c);
                    var t = S.pick(cards);
                    if (!t) return;
                    c.status.comments.push({ who: 'them', text: t, replyTo: '我', time: Date.now() });
                    S.saveDebounced();
                    if (Router.currentId() === 'contact-profile') draw();
                  }
                }, 4000 + Math.random() * 5000);
              } }
            ]
          });
        });
      });
      el.querySelector('#cp-mom2').addEventListener('click', function () { Router.go('contact-moments', { cid: c.id }); });
    }

    function saveReacts() {
      var likeOn = el.querySelector('#cp-like').classList.contains('on');
      var dislikeOn = el.querySelector('#cp-dislike').classList.contains('on');
      c.status.likes = likeOn ? ['me'] : [];
      c.status.dislikes = dislikeOn ? ['me'] : [];
      S.saveDebounced();
    }

    draw();
  });

  /* ================= 用户页面 ================= */
  Router.register('user-profile', function (el, args) {
    var me = S.state.me;
    var hasStatus = !!(me.status && me.status.text);

    function draw() {
      if (!hasStatus) {
        el.innerHTML = '<div class="page-head light">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button></div>' +
          '<div class="cp-nostatus">' + UI.avatarEl(me.avatar, 92) +
          '<div class="cp-name">' + esc(me.name) + '</div>' +
          '<button class="glass-btn cp-moments" id="up-mom">' + Icon('flag', 16) + ' 朋友圈</button>' +
          '</div>';
        el.querySelector('#up-mom').addEventListener('click', function () { Router.go('moments'); });
      } else {
        el.innerHTML = '<div class="cp-status-page">' +
          '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
          '<div class="cp-ava">' + UI.avatarEl(me.avatar, 64) + '</div>' +
          '<div class="cp-img">' +
          (me.status.image ? '<img class="cp-img-main" src="' + me.status.image + '">' : '') +
          '<div class="cp-img-mask"></div>' +
          '<div class="cp-status-txt">' + esc(me.status.text) + '</div>' +
          '<div class="cp-actions">' +
          '<button class="cp-act" id="up-like">' + Icon('like', 18) + '</button>' +
          '<button class="cp-act" id="up-dislike">' + Icon('dislike', 18) + '</button>' +
          '<button class="cp-act" id="up-comment">' + Icon('comment', 18) + '</button>' +
          '</div></div>' +
          (me.status.comments && me.status.comments.length ? '<div class="cp-comments">' + me.status.comments.map(function (cm, ci) {
            return '<div class="cp-cmt" data-ci="' + ci + '"><span class="cp-cmt-who">' + (cm.who === 'me' ? '我' : esc(S.getContact(cm.who) ? S.getContact(cm.who).name : '对方')) + '</span>' + (cm.replyTo ? ' 回复 <span class="cp-cmt-rp">' + esc(cm.replyTo) + '</span>' : '') + '：' + esc(cm.text) + '</div>';
          }).join('') + '</div>' : '') +
          '<button class="glass-btn cp-moments" id="up-mom2">' + Icon('flag', 16) + ' 朋友圈</button>' +
          '</div>';
        el.querySelector('#up-mom2').addEventListener('click', function () { Router.go('moments'); });
        bindActions();
        // 好友互动：每位联系人每个状态只互动一次（点赞/点踩/评论三选一），评论仅一条字卡
        setTimeout(function () {
          if (Router.currentId() !== 'user-profile') return;
          if (!me.status || !me.status.text) return;
          var who = S.pick(S.state.contacts);
          if (!who) return;
          me.status.reacts = me.status.reacts || {};
          if (me.status.reacts[who.id]) return;
          me.status.comments = me.status.comments || [];
          var r = Math.random();
          if (r < 0.3) {
            me.status.reacts[who.id] = 'comment';
            var cards = AI.flatChat(who);
            var t = S.pick(cards);
            if (t) {
              me.status.comments.push({ who: who.id, text: t, time: Date.now() });
              UI.toast(who.name + ' 评论了你的状态：' + t, 'comment');
            }
          } else if (r < 0.7) {
            me.status.reacts[who.id] = 'like';
            UI.toast(who.name + ' 点赞了你的状态', 'like');
          } else {
            me.status.reacts[who.id] = 'dislike';
            UI.toast(who.name + ' 点踩了你的状态', 'dislike');
          }
          S.saveDebounced();
          draw();
        }, 3500 + Math.random() * 4000);
      }
    }

    /* 自己的状态：点赞/点踩/评论可点击 */
    function bindActions() {
      var likeOn = (me.status.likes || []).indexOf('me') !== -1;
      var dislikeOn = (me.status.dislikes || []).indexOf('me') !== -1;
      function sync() {
        var l = el.querySelector('#up-like'), d = el.querySelector('#up-dislike');
        if (l) l.classList.toggle('on', !!likeOn);
        if (d) d.classList.toggle('on', !!dislikeOn);
      }
      sync();
      el.querySelector('#up-like').addEventListener('click', function () {
        if (likeOn) { likeOn = false; } else { likeOn = true; dislikeOn = false; }
        sync(); saveReacts();
      });
      el.querySelector('#up-dislike').addEventListener('click', function () {
        if (dislikeOn) { dislikeOn = false; } else { dislikeOn = true; likeOn = false; }
        sync(); saveReacts();
      });
      el.querySelector('#up-comment').addEventListener('click', function () {
        var api = UI.popup({
          title: '评论我的状态',
          body: '<input class="pop-input" id="up-cmt-inp" maxlength="60" placeholder="写下评论">',
          actions: [
            { label: '取消' },
            { label: '发送', primary: true, onClick: function () {
              var v = document.getElementById('up-cmt-inp').value.trim();
              if (!v) return;
              me.status.comments = me.status.comments || [];
              me.status.comments.push({ who: 'me', text: v, time: Date.now() });
              S.saveDebounced(); draw();
              // 已评论过的联系人可能各回一条（轮流回复）
              var seen = {};
              me.status.comments.forEach(function (cm2) {
                if (cm2.who === 'me' || seen[cm2.who]) return;
                seen[cm2.who] = true;
                var whoC = S.getContact(cm2.who);
                if (!whoC) return;
                setTimeout(function () {
                  if (Math.random() < 0.6) {
                    var cards = AI.flatChat(whoC);
                    var t = S.pick(cards);
                    if (t) {
                      me.status.comments.push({ who: whoC.id, text: t, replyTo: '我', time: Date.now() });
                      S.saveDebounced();
                      if (Router.currentId() === 'user-profile') draw();
                    }
                  }
                }, 4000 + Math.random() * 5000);
              });
            } }
          ]
        });
      });
      // 回复对方评论（显示「回复某人」；对方可能不回复）
      el.querySelectorAll('.cp-cmt[data-ci]').forEach(function (cmEl) {
        cmEl.addEventListener('click', function () {
          var cm = me.status.comments[+cmEl.dataset.ci];
          if (!cm || cm.who === 'me') return;
          var whoC = S.getContact(cm.who);
          var whoName = whoC ? (whoC.remark || whoC.name) : '对方';
          var api = UI.popup({
            title: '回复 ' + whoName,
            body: '<input class="pop-input" id="up-reply" maxlength="60" placeholder="回复 ' + whoName + '…">',
            actions: [
              { label: '取消' },
              { label: '发送', primary: true, onClick: function () {
                var v = document.getElementById('up-reply').value.trim();
                if (!v) return;
                me.status.comments = me.status.comments || [];
                me.status.comments.push({ who: 'me', text: v, replyTo: whoName, time: Date.now() });
                S.saveDebounced(); draw();
                setTimeout(function () {
                  if (Math.random() < 0.6) {
                    var cards = AI.flatChat(whoC);
                    var t = S.pick(cards);
                    if (t) {
                      me.status.comments.push({ who: whoC.id, text: t, replyTo: '我', time: Date.now() });
                      S.saveDebounced();
                      if (Router.currentId() === 'user-profile') draw();
                    }
                  }
                }, 4000 + Math.random() * 5000);
              } }
            ]
          });
        });
      });
    }

    function saveReacts() {
      var likeOn = el.querySelector('#up-like').classList.contains('on');
      var dislikeOn = el.querySelector('#up-dislike').classList.contains('on');
      me.status.likes = likeOn ? ['me'] : [];
      me.status.dislikes = dislikeOn ? ['me'] : [];
      S.saveDebounced();
    }
    draw();
  });

  /* 挂载到全局便于调试 */
  window.ChatPage = { redrawCurrent: redrawCurrent, startCall: startCall };
})();
