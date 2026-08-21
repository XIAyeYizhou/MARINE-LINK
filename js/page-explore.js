/* ============================================================
   字卡 · 玻璃信使 — 探索页面（朋友圈 / 信箱 / 音乐播放器 / 打卡）
   ============================================================ */
(function () {
  var S = Store, UI = window.UI, esc = S.esc;
  var momentsDraw = null, mailboxDraw = null, musicDraw = null, checkinDraw = null;

  /* ================= 探索主页 ================= */
  Router.register('explore', function (el) {
    el.innerHTML = '<div class="ex-body">' +
      '<div class="ex-title">探索</div>' +
      '<div class="ex-grid">' +
      '<button class="ex-card glass-row" data-p="moments"><span class="ex-ic" style="background:linear-gradient(135deg,#8f9cff,#5b6cff)">' + Icon('flag', 26) + '</span><span class="ex-lb">朋友圈</span><span class="ex-sub">看看大家在做什么</span></button>' +
      '<button class="ex-card glass-row" data-p="mailbox"><span class="ex-ic" style="background:linear-gradient(135deg,#7fd0c4,#3aa89a)">' + Icon('mail', 26) + '</span><span class="ex-lb">信箱</span><span class="ex-sub">写一封信，慢慢等回音</span></button>' +
      '<button class="ex-card glass-row" data-p="music"><span class="ex-ic" style="background:linear-gradient(135deg,#f0a6c8,#e06aa8)">' + Icon('music', 26) + '</span><span class="ex-lb">音乐播放器</span><span class="ex-sub">一起听歌吧</span></button>' +
      '<button class="ex-card glass-row" data-p="checkin"><span class="ex-ic" style="background:linear-gradient(135deg,#f5c76a,#e8a33c)">' + Icon('calendar', 26) + '</span><span class="ex-lb">打卡</span><span class="ex-sub">记录每一天</span></button>' +
      '</div></div>';
    el.querySelectorAll('.ex-card').forEach(function (c) {
      c.addEventListener('click', function () { Router.go(c.dataset.p); });
    });
  }, { nav: true });

  /* ================= 朋友圈 ================= */
  Router.register('moments', function (el) {
    function draw() {
      var bg = S.state.me.momentsBg;
      var moments = S.state.moments.slice().sort(function (a, b) { return b.time - a.time; });
      el.innerHTML = '<div class="page-head light">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
        '<div class="ph-title">朋友圈</div>' +
        '<button class="mo-add" id="mo-add">' + Icon('plus', 22) + '</button></div>' +
        '<div class="mo-bg" style="' + (bg ? 'background-image:url(' + bg + ')' : '') + '">' +
        '<div class="mo-bg-mask"></div>' +
        '<button class="cm-bg-btn" id="mo-bgbtn">' + Icon('palette', 15) + ' 更换背景</button></div>' +
        '<div class="mo-list" id="mo-list"></div>';
      var listEl = el.querySelector('#mo-list');
      if (!moments.length) listEl.innerHTML = '<div class="empty"><div class="empty-ic">' + Icon('flag', 34) + '</div><div class="empty-t">还没有动态，点击右上角发布第一条吧</div></div>';
      moments.forEach(function (m) {
        var isMe = m.author === 'me';
        var who = isMe ? S.state.me : S.getContact(m.author);
        if (!who) return;
        var name = isMe ? S.state.me.name : (who.remark || who.name);
        var liked = m.likes.some(function (l) { return l.who === 'me'; });
        var disliked = m.dislikes.some(function (d) { return d.who === 'me'; });
        var h = '<div class="mo-card glass-row" data-id="' + m.id + '">' +
          '<div class="mo-head">' + UI.avatarEl(who.avatar, 42) +
          '<div class="mo-who"><div class="mo-name">' + esc(name) + '</div><div class="mo-time">' + UI.fmtChatTime(m.time) + '</div></div>' +
          (isMe ? '<button class="mo-del" data-del="' + m.id + '">' + Icon('trash', 15) + '</button>' : '') +
          '</div>';
        if (m.text) h += '<div class="mo-text">' + esc(m.text) + '</div>';
        if (m.images && m.images.length) {
          h += '<div class="mo-imgs' + (m.images.length === 1 ? ' one' : '') + '">' + m.images.map(function (im) { return '<img src="' + im + '" data-big="1">'; }).join('') + '</div>';
        }
        var reacts = '';
        if (m.likes.length) reacts += '<div class="mo-reacts"><span class="mo-like-row">' + Icon('like', 13) + ' ' + m.likes.map(function (l) { return whoName(l.who); }).join('，') + '</span></div>';
        if (m.comments.length) {
          reacts += '<div class="mo-comments">' + m.comments.map(function (cm, ci) {
            return '<div class="mo-cmt" data-cmt="' + m.id + '" data-ci="' + ci + '"><span class="mo-cmt-who">' + esc(whoName(cm.who)) + '</span>' + (cm.replyTo ? ' 回复 <span class="mo-cmt-rp">' + esc(cm.replyTo) + '</span>' : '') + '：' + esc(cm.text) + '</div>';
          }).join('') + '</div>';
        }
        // 操作按钮在前，评论（含回复）显示在点赞/点踩等按钮下方
        h += '<div class="mo-actions">' +
          '<button class="mo-act' + (liked ? ' on' : '') + '" data-like="' + m.id + '">' + Icon('like', 17) + '<span>' + (m.likes.length || '') + '</span></button>' +
          '<button class="mo-act' + (disliked ? ' on' : '') + '" data-dislike="' + m.id + '">' + Icon('dislike', 17) + '<span>' + (m.dislikes.length || '') + '</span></button>' +
          '<button class="mo-act" data-comment="' + m.id + '">' + Icon('comment', 17) + '<span>' + (m.comments.length || '') + '</span></button>' +
          '</div>';
        if (reacts) h += '<div class="mo-reactbox">' + reacts + '</div>';
        h += '</div>';
        listEl.innerHTML += h;
      });
      function whoName(w) {
        if (w === 'me') return '我';
        var cc = S.getContact(w);
        return cc ? (cc.remark || cc.name) : w;
      }
      bindEvents(listEl);
      el.querySelector('#mo-add').addEventListener('click', compose);
      el.querySelector('#mo-bgbtn').addEventListener('click', async function () {
        var api = UI.sheetList({
          title: '更换朋友圈背景',
          items: [
            { icon: 'image', label: '从本地选取', onClick: function () { api.close(); doPick(false); } },
            { icon: 'camera', label: '拍照', onClick: function () { api.close(); doPick(true); } }
          ]
        });
        async function doPick(camera) {
          var imgs = await UI.pickImage({ camera: camera });
          if (imgs.length) { S.state.me.momentsBg = imgs[0]; S.saveDebounced(); draw(); }
        }
      });
    }

    function bindEvents(listEl) {
      listEl.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          S.state.moments = S.state.moments.filter(function (x) { return x.id !== b.dataset.del; });
          S.saveDebounced(); momentsDraw();
        });
      });
      listEl.querySelectorAll('[data-like]').forEach(function (b) {
        b.addEventListener('click', function () { toggleReact(b.dataset.like, 'like'); });
      });
      listEl.querySelectorAll('[data-dislike]').forEach(function (b) {
        b.addEventListener('click', function () { toggleReact(b.dataset.dislike, 'dislike'); });
      });
      listEl.querySelectorAll('[data-comment]').forEach(function (b) {
        b.addEventListener('click', function () { commentOn(b.dataset.comment); });
      });
      // 点击评论可回复
      listEl.querySelectorAll('[data-cmt]').forEach(function (cm) {
        cm.addEventListener('click', function () { replyComment(cm.dataset.cmt, +cm.dataset.ci); });
      });
      listEl.querySelectorAll('[data-big]').forEach(function (img) {
        img.addEventListener('click', function () {
          var v = UI.el('<div class="img-viewer"><img src="' + this.src + '"><div class="iv-close">' + Icon('close', 20) + '</div></div>');
          v.addEventListener('click', function () { v.remove(); });
          document.getElementById('sheets').appendChild(v);
        });
      });
    }

    function toggleReact(id, kind) {
      var m = S.state.moments.find(function (x) { return x.id === id; });
      if (!m) return;
      if (kind === 'like') {
        var li = m.likes.findIndex(function (l) { return l.who === 'me'; });
        if (li > -1) m.likes.splice(li, 1);
        else {
          m.likes.push({ who: 'me', time: Date.now() });
          m.dislikes = m.dislikes.filter(function (d) { return d.who !== 'me'; });
        }
      } else {
        var di = m.dislikes.findIndex(function (d) { return d.who === 'me'; });
        if (di > -1) m.dislikes.splice(di, 1);
        else {
          m.dislikes.push({ who: 'me', time: Date.now() });
          m.likes = m.likes.filter(function (l) { return l.who !== 'me'; });
        }
      }
      S.saveDebounced(); momentsDraw();
    }

    function commentOn(id) {
      var m = S.state.moments.find(function (x) { return x.id === id; });
      if (!m) return;
      var api = UI.popup({
        title: '评论',
        body: '<input class="pop-input" id="mo-cmt-inp" maxlength="80" placeholder="友善评论">',
        actions: [
          { label: '取消' },
          { label: '发送', primary: true, onClick: function () {
            var v = document.getElementById('mo-cmt-inp').value.trim();
            if (!v) return;
            m.comments.push({ who: 'me', text: v, time: Date.now() });
            S.saveDebounced(); momentsDraw();
            // 若动态是联系人的→对方回一条；若是自己的→已评论的联系人各回一条
            AI.momentCommented(m.id);
          } }
        ]
      });
    }

    /* 回复某条评论（显示「回复某人」，对方有概率回一条字卡） */
    function replyComment(id, ci) {
      var m = S.state.moments.find(function (x) { return x.id === id; });
      if (!m) return;
      var cm = m.comments[ci];
      if (!cm || cm.who === 'me') return;
      var whoName = cm.who === 'me' ? '我' : (S.getContact(cm.who) ? (S.getContact(cm.who).remark || S.getContact(cm.who).name) : '对方');
      var api = UI.popup({
        title: '回复 ' + whoName,
        body: '<input class="pop-input" id="mo-rp-inp" maxlength="80" placeholder="回复 ' + whoName + '…">',
        actions: [
          { label: '取消' },
          { label: '发送', primary: true, onClick: function () {
            var v = document.getElementById('mo-rp-inp').value.trim();
            if (!v) return;
            m.comments.push({ who: 'me', text: v, replyTo: whoName, time: Date.now() });
            S.saveDebounced(); momentsDraw();
            // 被回复者可能回一条字卡（轮流回复，不会无限）
            AI.momentCommentedReply(m.id, cm.who);
          } }
        ]
      });
    }

    function compose() {
      var images = [];
      var api = UI.popup({
        title: '发布朋友圈',
        body: '<div class="mo-compose">' +
          '<textarea id="mo-ta" rows="4" maxlength="500" placeholder="这一刻的想法…"></textarea>' +
          '<div class="mo-comp-imgs" id="mo-comp-imgs"></div>' +
          '<div class="mo-comp-tools">' +
          '<button class="glass-btn sm" id="mc-img">' + Icon('image', 15) + ' 本地图片</button>' +
          '<button class="glass-btn sm" id="mc-cam">' + Icon('camera', 15) + ' 拍摄</button>' +
          '<button class="glass-btn sm" id="mc-stk">' + Icon('sticker', 15) + ' 表情包</button>' +
          '</div></div>',
        actions: [
          { label: '取消' },
          { label: '发布', primary: true, onClick: function () {
            var txt = document.getElementById('mo-ta').value.trim();
            if (!txt && !images.length) { UI.toast('写点什么或选张图片吧', 'info'); return false; }
            S.state.moments.unshift({ id: S.uid('mo'), author: 'me', text: txt, images: images.slice(), time: Date.now(), likes: [], dislikes: [], comments: [] });
            S.saveDebounced();
            UI.toast('已发布', 'check');
            momentsDraw();
          } }
        ]
      });
      var imgsEl = api.body.querySelector('#mo-comp-imgs');
      function showImgs() {
        imgsEl.innerHTML = images.map(function (im, i) {
          return '<div class="mci"><img src="' + im + '"><span data-i="' + i + '">' + Icon('close', 12) + '</span></div>';
        }).join('');
        imgsEl.querySelectorAll('span').forEach(function (sp) {
          sp.addEventListener('click', function () { images.splice(+sp.dataset.i, 1); showImgs(); });
        });
      }
      api.body.querySelector('#mc-img').addEventListener('click', async function () {
        var imgs = await UI.pickImage({ multiple: true });
        images = images.concat(imgs).slice(0, 9); showImgs();
      });
      api.body.querySelector('#mc-cam').addEventListener('click', async function () {
        var imgs = await UI.pickImage({ camera: true });
        images = images.concat(imgs).slice(0, 9); showImgs();
      });
      api.body.querySelector('#mc-stk').addEventListener('click', function () {
        var pool = [];
        var meSt = S.state.me.stickers || [];
        pool = pool.concat(meSt);
        S.state.contacts.forEach(function (c) { pool = pool.concat(c.stickers); });
        if (!pool.length) { UI.toast('还没有表情包，去聊天表情包里添加', 'info'); return; }
        var g = '<div class="stk-grid">' + pool.map(function (s, i) { return '<img class="stk-cell" data-i="' + i + '" src="' + s + '">'; }).join('') + '</div>';
        var ap2 = UI.popup({ title: '选择表情包', body: g });
        ap2.body.querySelectorAll('.stk-cell').forEach(function (img) {
          img.addEventListener('click', function () {
            images.push(pool[+img.dataset.i]); showImgs(); ap2.close();
          });
        });
      });
    }

    momentsDraw = draw;
    draw();
  });

  /* ================= 信箱 ================= */
  Router.register('mailbox', function (el) {
    function draw() {
      var letters = S.state.letters.slice().sort(function (a, b) { return b.time - a.time; });
      el.innerHTML = '<div class="page-head">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
        '<div class="ph-title">信箱</div>' +
        '<button class="mo-add" id="mb-add">' + Icon('plus', 22) + '</button></div>' +
        '<div class="mb-list" id="mb-list"></div>';
      var listEl = el.querySelector('#mb-list');
      if (!letters.length) listEl.innerHTML = '<div class="empty"><div class="empty-ic">' + Icon('mail', 34) + '</div><div class="empty-t">信箱空空如也，给对方写一封信吧</div></div>';
      letters.forEach(function (l) {
        var incoming = l.to === 'me';
        var who = incoming ? S.getContact(l.from) : null;
        var name = incoming ? (who ? who.name : '陌生人') : '我 → ' + (S.getContact(l.to) ? S.getContact(l.to).name : '');
        listEl.innerHTML += '<div class="mb-card glass-row' + (incoming && !l.read ? ' unread' : '') + '" data-id="' + l.id + '">' +
          '<div class="mb-head"><span class="mb-from">' + esc(name) + '</span><span class="mb-time">' + UI.fmtChatTime(l.time) + '</span></div>' +
          '<div class="mb-content">' + esc(l.content) + '</div></div>';
      });
      listEl.querySelectorAll('.mb-card').forEach(function (card) {
        card.addEventListener('click', function () {
          var l = S.state.letters.find(function (x) { return x.id === card.dataset.id; });
          if (!l) return;
          if (l.to === 'me') { l.read = true; S.saveDebounced(); }
          UI.popup({ title: '信件', body: '<div class="mb-detail">' + esc(l.content) + '</div>' });
          draw();
        });
      });
      el.querySelector('#mb-add').addEventListener('click', compose);
    }

    function compose() {
      var contacts = S.state.contacts;
      var draft = S.state.draftLetter || { to: '', content: '' };
      var api = UI.popup({
        title: '写信',
        body: '<div class="mb-compose">' +
          '<div class="nc-field"><label>收件人</label><select id="mb-to">' +
          '<option value="">选择联系人…</option>' + contacts.map(function (c) {
            return '<option value="' + c.id + '"' + (draft.to === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
          }).join('') + '</select></div>' +
          '<textarea id="mb-ta" rows="8" maxlength="999" placeholder="写信（不超过 999 字）…">' + esc(draft.content || '') + '</textarea>' +
          '<div class="mb-count"><span id="mb-count">' + (draft.content ? draft.content.length : 0) + '</span> / 999</div>' +
          '</div>',
        actions: [
          { label: '存草稿', onClick: function () {
            S.state.draftLetter = { to: document.getElementById('mb-to').value, content: document.getElementById('mb-ta').value };
            S.saveDebounced();
            UI.toast('草稿已保存', 'check');
          } },
          { label: '发送', primary: true, onClick: function () {
            var to = document.getElementById('mb-to').value;
            var content = document.getElementById('mb-ta').value.trim();
            if (!to) { UI.toast('请选择收件人', 'info'); return false; }
            if (!content) { UI.toast('信里写点什么吧', 'info'); return false; }
            if (content.length > 999) { UI.toast('信件不能超过 999 字', 'info'); return false; }
            S.state.letters.unshift({ id: S.uid('l'), from: 'me', to: to, content: content, time: Date.now(), read: true, replied: false, replyAt: S.simNow() + S.rand(3, 48) * 3600e3 });
            var c = S.getContact(to);
            if (c) { c.lastLetterAt = S.simNow(); c.timers.nextLetterAt = S.simNow() + S.rand(1, 30) * 86400e3; }
            S.state.draftLetter = null;
            S.saveDebounced();
            UI.toast('信已寄出，等待回音…', 'mail');
            mailboxDraw();
          } }
        ]
      });
      var ta = api.body.querySelector('#mb-ta');
      ta.addEventListener('input', function () {
        api.body.querySelector('#mb-count').textContent = ta.value.length;
      });
    }

    mailboxDraw = draw;
    draw();
  });

  /* ================= 音乐播放器 ================= */
  var progressIv = null;
  function startProgress() {
    if (progressIv) return;
    progressIv = setInterval(function () {
      if (Router.currentId() !== 'music') return;
      var ms = Store.state.musicState;
      var bar = document.getElementById('mu-prog');
      if (bar && ms.playing) {
        var song = Store.state.music[ms.idx];
        if (song && song.src && AudioX.Music.audio && AudioX.Music.audio.duration) {
          bar.style.width = (AudioX.Music.audio.currentTime / AudioX.Music.audio.duration * 100) + '%';
        } else {
          var w = parseFloat(bar.style.width || 0);
          w = (w + 0.22) % 100;
          bar.style.width = w + '%';
        }
      }
      // 一起听时长
      var tEl = document.getElementById('mu-coli-time');
      if (tEl && ms.colisten && ms.colistenStartAt) {
        tEl.textContent = UI.fmtDur((Date.now() - ms.colistenStartAt) / 1000);
      }
    }, 200);
  }

  Router.register('music', function (el) {
    var st = S.state;
    startProgress();

    function draw() {
      var ms = st.musicState;
      var song = st.music[ms.idx] || null;
      var colisten = ms.colisten ? S.getContact(ms.colisten) : null;
      function coliTime() {
        if (!ms.colistenStartAt) return '00:00';
        return UI.fmtDur((Date.now() - ms.colistenStartAt) / 1000);
      }
      el.innerHTML = '<div class="page-head">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
        '<div class="ph-title">音乐播放器</div>' +
        '<button class="chat-more" id="mu-more">' + Icon('more', 22) + '</button></div>' +
        '<div class="mu-body">' +
        '<div class="mu-coli' + (colisten ? ' show' : '') + '" id="mu-coli" title="点击解除一起听">' +
        (colisten ? UI.avatarEl(S.state.me.avatar, 34) + Icon('music', 14) + UI.avatarEl(colisten.avatar, 34) +
          '<span class="mu-coli-txt">一起听 <b id="mu-coli-time">' + coliTime() + '</b></span>' : '') +
        '</div>' +
        '<div class="mu-disc' + (ms.playing ? ' spin' : '') + '" style="background:radial-gradient(circle at 30% 30%, ' + (song ? song.color : '#d8d2c8') + ', #fff)">' +
        '<div class="mu-disc-inner">' + Icon('music', 40) + '</div></div>' +
        '<div class="mu-name">' + esc(song ? song.name : '暂无歌曲') + '</div>' +
        '<div class="mu-artist">' + esc(song ? song.artist : '') + '</div>' +
        (song ? '<div class="mu-progress"><div class="mu-prog-inner" id="mu-prog"></div></div>' : '<div class="mu-none">点击右上角「添加音乐」导入本地 MP3 即可播放</div>') +
        '<div class="mu-controls">' +
        '<button id="mu-prev">' + Icon('prev', 26) + '</button>' +
        '<button class="mu-play" id="mu-play">' + Icon(ms.playing ? 'pause' : 'play', 30) + '</button>' +
        '<button id="mu-next">' + Icon('next', 26) + '</button>' +
        '</div>' +
        '<div class="mu-tools">' +
        '<button data-t="list">' + Icon('list', 19) + '<span>播放列表</span></button>' +
        '<button data-t="mode">' + Icon('gear', 19) + '<span>歌曲设置</span></button>' +
        '<button data-t="invite">' + Icon('persons', 19) + '<span>邀请一起听</span></button>' +
        '<button data-t="float">' + Icon('float', 19) + '<span>浮窗</span></button>' +
        '</div></div>';

      el.querySelector('#mu-prev').addEventListener('click', function () { AudioX.Music.prev(); });
      el.querySelector('#mu-next').addEventListener('click', function () { AudioX.Music.next(); });
      el.querySelector('#mu-play').addEventListener('click', function () { AudioX.Music.toggle(); });
      el.querySelector('#mu-more').addEventListener('click', moreMenu);
      var coliEl = el.querySelector('#mu-coli');
      if (coliEl) coliEl.addEventListener('click', function () {
        if (!st.musicState.colisten) return;
        st.musicState.colisten = null;
        delete st.musicState.colistenStartAt;
        S.saveDebounced();
        draw();
        UI.toast('已解除一起听', 'persons');
      });
      el.querySelectorAll('.mu-tools button').forEach(function (b) {
        b.addEventListener('click', function () {
          var t = b.dataset.t;
          if (t === 'list') playlistPop();
          else if (t === 'mode') modePop();
          else if (t === 'invite') invitePop();
          else if (t === 'float') floatBubble();
        });
      });
    }

    function playlistPop() {
      var items = st.music.map(function (s, i) {
        return { icon: 'music', label: s.name + ' — ' + s.artist, sub: i === st.musicState.idx ? '播放中' : '', onClick: function () { AudioX.Music.playSong(i); } };
      });
      if (!items.length) items.push({ icon: 'music', label: '暂无歌曲，点击右上角添加', onClick: function () { } });
      UI.sheetList({ title: '播放列表', items: items });
    }

    function modePop() {
      var m = st.musicState.mode;
      var modes = [['single', '单曲循环'], ['list', '列表循环'], ['shuffle', '随机播放']];
      var api = UI.popup({
        title: '歌曲设置',
        body: '<div class="mode-list">' + modes.map(function (mm) {
          return '<button class="mode-row' + (m === mm[0] ? ' on' : '') + '" data-m="' + mm[0] + '">' + Icon(m === mm[0] ? 'check' : 'dot', 15) + '<span>' + mm[1] + '</span></button>';
        }).join('') + '</div>',
        actions: [{ label: '完成', primary: true }]
      });
      api.body.querySelectorAll('.mode-row').forEach(function (b) {
        b.addEventListener('click', function () {
          st.musicState.mode = b.dataset.m;
          S.saveDebounced();
          api.body.querySelectorAll('.mode-row').forEach(function (x) { x.classList.remove('on'); x.querySelector('svg').outerHTML = Icon('dot', 15); });
          b.classList.add('on');
          b.querySelector('svg').outerHTML = Icon('check', 15);
        });
      });
    }

    function invitePop() {
      UI.sheetList({
        title: '邀请一起听',
        items: S.state.contacts.map(function (c) {
          return {
            icon: 'person', label: c.name,
            onClick: function () {
              if (Math.random() < 0.55) {
                st.musicState.colisten = c.id;
                st.musicState.colistenStartAt = Date.now();
                S.saveDebounced();
                UI.toast(c.name + ' 接受了邀请，一起听', 'persons');
                musicDraw();
                setTimeout(function () {
                  if (st.musicState.colisten === c.id && Math.random() < 0.6) {
                    var act = S.pick([0, 1, 2]);
                    if (act === 0) { AudioX.Music.toggle(); UI.toast(c.name + ' 暂停了歌曲', 'pause'); }
                    else if (act === 1) { AudioX.Music.next(); UI.toast(c.name + ' 切到了下一首', 'next'); }
                    else { AudioX.Music.prev(); UI.toast(c.name + ' 切到了上一首', 'prev'); }
                    musicDraw();
                  }
                }, 8000 + Math.random() * 10000);
              } else {
                UI.toast(c.name + ' 拒绝了邀请', 'info');
              }
            }
          };
        })
      });
    }

    function floatBubble() {
      if (musicFloat) { UI.toast('浮窗已开启', 'float'); Router.go('explore'); return; }
      var b = UI.el('<div class="mu-float glass-strong">' + Icon('music', 20) + '<span class="mf-close">' + Icon('close', 10) + '</span></div>');
      document.getElementById('sheets').appendChild(b);
      musicFloat = b;
      makeFloat(b);
      b.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.mf-close')) {
          b.remove();
          musicFloat = null;
          UI.toast('浮窗已关闭', 'float');
          return;
        }
        // 点击浮窗 → 恢复播放器（进入音乐页后浮窗自动隐藏，返回时再出现）
        Router.go('music', {}, { force: true });
      });
      UI.toast('已开启浮窗模式', 'float');
      Router.go('explore');
    }
    function makeFloat(b) {
      var sx, sy, ox, oy, drag = false;
      b.addEventListener('pointerdown', function (e) {
        drag = true; sx = e.clientX; sy = e.clientY; ox = b.offsetLeft; oy = b.offsetTop;
      });
      b.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var ph = document.getElementById('phone');
        b.style.left = Math.max(4, Math.min(ph.clientWidth - b.offsetWidth - 4, ox + e.clientX - sx)) + 'px';
        b.style.top = Math.max(60, Math.min(ph.clientHeight - b.offsetHeight - 4, oy + e.clientY - sy)) + 'px';
      });
      b.addEventListener('pointerup', function () { drag = false; });
      b.addEventListener('pointercancel', function () { drag = false; });
    }

    function moreMenu() {
      UI.sheetList({
        title: '音乐',
        items: [
          { icon: 'upload', label: '添加音乐（本地 MP3）', onClick: function () { addMusic(); } },
          { icon: 'trash', label: '删除音乐', danger: true, onClick: function () { delMusic(); } },
          { icon: 'share', label: '分享给联系人', onClick: function () { shareMusic(); } }
        ]
      });
    }
    async function addMusic() {
      var files = await UI.pickFile('audio/mp3,audio/*', true);
      files.forEach(function (f) {
        var r = new FileReader();
        r.onload = function () {
          st.music.push({ id: S.uid('mu'), name: f.name.replace(/\.[^.]+$/, ''), artist: '本地导入', color: 'hsl(' + S.randInt(0, 360) + ',60%,70%)', src: r.result });
          S.saveDebounced();
          musicDraw();
        };
        r.readAsDataURL(f);
      });
      if (files.length) UI.toast('已添加 ' + files.length + ' 首', 'check');
    }
    function delMusic() {
      if (!st.music.length) { UI.toast('没有可删除的歌曲', 'info'); return; }
      UI.sheetList({
        title: '选择要删除的歌曲',
        items: st.music.map(function (s, i) {
          return { icon: 'music', label: s.name, danger: true, onClick: function () { st.music.splice(i, 1); S.saveDebounced(); if (st.musicState.idx >= st.music.length) st.musicState.idx = 0; musicDraw(); return false; } };
        })
      });
    }
    function shareMusic() {
      var song = st.music[st.musicState.idx];
      if (!song) { UI.toast('暂无歌曲', 'info'); return; }
      UI.sheetList({
        title: '分享「' + song.name + '」给',
        items: S.state.contacts.map(function (c) {
          return {
            icon: 'person', label: c.name,
            onClick: function () {
              S.pushMsg(c.id, { from: 'me', type: 'text', content: '给你分享一首歌：《' + song.name + '》 - ' + song.artist, meta: {} });
              UI.toast('已分享给 ' + c.name, 'check');
            }
          };
        })
      });
    }

    musicDraw = draw;
    draw();
  });

  /* ================= 打卡 ================= */
  Router.register('checkin', function (el) {
    var tab = 'calendar';
    function draw() {
      el.innerHTML = '<div class="page-head">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
        '<div class="ph-title">打卡</div></div>' +
        '<div class="ck-tabs">' +
        '<button class="ck-tab' + (tab === 'calendar' ? ' on' : '') + '" data-t="calendar">日历打卡</button>' +
        '<button class="ck-tab' + (tab === 'timeline' ? ' on' : '') + '" data-t="timeline">时间轴打卡</button>' +
        '</div><div class="ck-body" id="ck-body"></div>';
      el.querySelectorAll('.ck-tab').forEach(function (b) {
        b.addEventListener('click', function () { tab = b.dataset.t; draw(); });
      });
      if (tab === 'calendar') drawCalendar(el.querySelector('#ck-body'));
      else drawTimeline(el.querySelector('#ck-body'));
    }

    function drawCalendar(body) {
      var cal = S.state.checkins.calendar;
      var today = new Date();
      var y = today.getFullYear(), m = today.getMonth();
      var startWeek = new Date(y, m, 1).getDay();
      var days = new Date(y, m + 1, 0).getDate();
      var cells = '';
      for (var i = 0; i < startWeek; i++) cells += '<div class="ck-cell"></div>';
      for (var d = 1; d <= days; d++) {
        var key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        var entries = cal[key] || [];
        cells += '<div class="ck-cell' + (d === today.getDate() ? ' today' : '') + '" data-k="' + key + '">' + d +
          (entries.length ? '<span class="ck-dots">' + entries.slice(0, 3).map(function () { return '<i></i>'; }).join('') + '</span>' : '') +
          '</div>';
      }
      body.innerHTML = '<div class="ck-cal-head">' + (m + 1) + ' 月 ' + y + ' 年</div>' +
        '<div class="ck-week">' + ['日', '一', '二', '三', '四', '五', '六'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="ck-grid">' + cells + '</div>' +
        '<div class="ck-tip">记录每个联系人或你每天的状态（当天没有状态则不记录）</div>';
      body.querySelectorAll('.ck-cell[data-k]').forEach(function (cell) {
        cell.addEventListener('click', function () {
          var entries = cal[cell.dataset.k] || [];
          if (!entries.length) { UI.toast('这一天没有状态记录', 'info'); return; }
          UI.popup({
            title: cell.dataset.k,
            body: entries.map(function (e) {
              var name = e.who === 'me' ? S.state.me.name : (S.getContact(e.who) ? S.getContact(e.who).name : e.who);
              return '<div class="ck-entry"><span class="ck-entry-name">' + esc(name) + '</span><span class="ck-entry-txt">' + esc(e.text) + '</span></div>';
            }).join('')
          });
        });
      });
    }

    function drawTimeline(body) {
      var tl = S.state.checkins.timeline.slice().sort(function (a, b) { return a.time - b.time; });
      var h = '<button class="glass-btn primary big" id="ck-add">' + Icon('plus', 16) + ' 自定义打卡</button>' +
        '<div class="ck-tl">';
      tl.forEach(function (e) {
        var name = e.who === 'me' ? S.state.me.name : (S.getContact(e.who) ? S.getContact(e.who).name : '成员');
        var ava = e.avatar || (e.who === 'me' ? S.state.me.avatar : '');
        h += '<div class="ck-tl-item">' +
          '<div class="ck-tl-line"></div>' +
          UI.avatarEl(ava, 38) +
          '<div class="ck-tl-card glass-row"><div class="ck-tl-head"><span>' + esc(name) + '</span><span class="ck-tl-time">' + UI.fmtChatTime(e.time) + '</span></div>' +
          '<div class="ck-tl-txt">' + esc(e.content) + '</div></div></div>';
      });
      h += '</div>';
      body.innerHTML = h;
      body.querySelector('#ck-add').addEventListener('click', function () {
        var api = UI.popup({
          title: '自定义打卡',
          body: '<input class="pop-input" id="ck-inp" maxlength="60" placeholder="记录此刻…">',
          actions: [
            { label: '取消' },
            { label: '打卡', primary: true, onClick: function () {
              var v = document.getElementById('ck-inp').value.trim();
              if (!v) return;
              S.state.checkins.timeline.unshift({ who: 'me', time: Date.now(), content: v, avatar: S.state.me.avatar });
              S.saveDebounced();
              checkinDraw();
            } }
          ]
        });
      });
    }

    checkinDraw = draw;
    draw();
  });

  /* 模块级刷新 */
  var musicFloat = null;
  Bus.on('route', function (id) {
    if (musicFloat) musicFloat.style.display = (id === 'music') ? 'none' : 'flex';
  });
  Bus.on('moments', function () { if (Router.currentId() === 'moments' && momentsDraw) momentsDraw(); });
  Bus.on('letters', function () { if (Router.currentId() === 'mailbox' && mailboxDraw) mailboxDraw(); });
  Bus.on('music', function () { if (Router.currentId() === 'music' && musicDraw) musicDraw(); });
  Bus.on('checkin', function () { if (Router.currentId() === 'checkin' && checkinDraw) checkinDraw(); });
})();
