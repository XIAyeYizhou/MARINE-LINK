/* ============================================================
   字卡 · 玻璃信使 — 联系人页面（新建联系人/群聊、资料、字卡编辑等）
   ============================================================ */
(function () {
  var S = Store, UI = window.UI, esc = S.esc;

  /* ================= 主页面 ================= */
  Router.register('contacts', function (el) {
    el.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'msgs-head';
    head.innerHTML = '<div class="msgs-search">' + Icon('search', 17) + '<input id="ct-q" placeholder="搜索" autocomplete="off"></div>' +
      '<button class="ct-add" id="ct-add">' + Icon('plus', 22) + '</button>';
    el.appendChild(head);

    var body = document.createElement('div');
    body.className = 'ct-body';
    el.appendChild(body);

    function draw(filter) {
      var cs = S.state.contacts.filter(function (c) { return !filter || c.name.indexOf(filter) !== -1 || (c.account || '').indexOf(filter) !== -1; });
      var gs = S.state.groups.filter(function (g) { return !filter || g.name.indexOf(filter) !== -1; });
      var h = '';
      if (cs.length) {
        h += '<div class="ct-sec">联系人</div>';
        cs.forEach(function (c) {
          h += '<div class="ct-row" data-id="' + c.id + '">' + UI.avatarEl(c.avatar, 46) +
            '<div class="ct-info"><div class="ct-name">' + esc(c.remark || c.name) + '</div>' +
            '<div class="ct-sub">' + esc(c.signature || ('ID：' + c.account)) + '</div></div>' +
            Icon('chevronR', 15) + '</div>';
        });
      }
      if (gs.length) {
        h += '<div class="ct-sec">群聊</div>';
        gs.forEach(function (g) {
          h += '<div class="ct-row" data-gid="' + g.id + '">' + UI.avatarEl(g.avatar, 46) +
            '<div class="ct-info"><div class="ct-name">' + esc(g.name) + '</div>' +
            '<div class="ct-sub">' + (g.members.length + 1) + ' 人</div></div>' +
            Icon('chevronR', 15) + '</div>';
        });
      }
      if (!h) h = '<div class="empty"><div class="empty-ic">' + Icon('person', 34) + '</div><div class="empty-t">' + (filter ? '没有找到相关联系人' : '点击右上角新建联系人 / 群聊') + '</div></div>';
      body.innerHTML = h;
      body.querySelectorAll('.ct-row').forEach(function (r) {
        r.addEventListener('click', function () {
          if (r.dataset.id) Router.go('contact-info', { cid: r.dataset.id });
          else Router.go('group-info', { gid: r.dataset.gid });
        });
      });
    }
    draw('');
    head.querySelector('#ct-q').addEventListener('input', function () { draw(this.value.trim()); });

    head.querySelector('#ct-add').addEventListener('click', function () {
      UI.sheetList({
        title: '新建',
        items: [
          { icon: 'person', label: '新建联系人', onClick: function () { Router.go('new-contact'); } },
          { icon: 'persons', label: '新建群聊', onClick: function () { Router.go('new-group'); } }
        ]
      });
    });
  }, { nav: true });

  /* ================= 新建联系人 ================= */
  Router.register('new-contact', function (el) {
    var avatar = S.genAvatar('新', 200);
    el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">新建联系人</div></div>' +
      '<div class="nc-body">' +
      '<div class="nc-avatar" id="nc-ava">' + UI.avatarEl(avatar, 92) + '<div class="nc-ava-edit">' + Icon('camera', 16) + '</div></div>' +
      '<div class="nc-field"><label>ID</label><input id="nc-id" placeholder="输入对方 ID" maxlength="24"></div>' +
      '<div class="nc-field"><label>姓名</label><input id="nc-name" placeholder="输入姓名" maxlength="16"></div>' +
      '<div class="nc-field"><label>备注</label><input id="nc-rmk" placeholder="输入备注（可选）" maxlength="16"></div>' +
      '<button class="glass-btn primary big" id="nc-save">创建</button>' +
      '</div>';

    el.querySelector('#nc-ava').addEventListener('click', async function () {
      var api = UI.sheetList({
        title: '选择头像',
        items: [
          { icon: 'image', label: '从本地选取', onClick: function () { api.close(); pickLocal(); } },
          { icon: 'camera', label: '拍照', onClick: function () { api.close(); pickCamera(); } }
        ]
      });
    });
    async function pickLocal() {
      var imgs = await UI.pickImage({ multiple: false });
      if (imgs.length) { avatar = imgs[0]; el.querySelector('#nc-ava img').src = avatar; }
    }
    async function pickCamera() {
      var imgs = await UI.pickImage({ camera: true });
      if (imgs.length) { avatar = imgs[0]; el.querySelector('#nc-ava img').src = avatar; }
    }

    el.querySelector('#nc-save').addEventListener('click', function () {
      var name = el.querySelector('#nc-name').value.trim();
      var id = el.querySelector('#nc-id').value.trim();
      var rmk = el.querySelector('#nc-rmk').value.trim();
      if (!name) { UI.toast('请填写姓名', 'info'); return; }
      var cid = S.uid('c');
      var c = {
        id: cid, name: name, account: id || ('user_' + S.randInt(1000, 9999)), remark: rmk,
        signature: '这个人很懒，什么都没写', avatar: avatar,
        status: { text: '', image: null }, statusChangedAt: 0,
        avatarLib: [], stickers: [],
        cards: {
          chat: [{ g: '日常', items: ['在吗', '你好呀', '最近怎么样', '哈哈哈', '我很好', '下次聊'] }],
          pat: ['拍了拍你', '戳了戳你'],
          status: ['发呆中', '忙碌中', '休息中'],
          daily: ['打卡', '忙里偷闲'],
          voice: [], emoji: ['好', '嗯嗯'], kaomoji: ['(^-^)', '(・ω・)']
        },
        posts: [], conv: { pinned: false, muted: false, deleted: false },
        settings: { autoSend: true, replyCount: 2, gapSec: 8, merge: false, chatBg: null, videoBg: null, callBg: null },
        timers: {}, lastLetterAt: 0, created: Date.now(), momentsBg: null, momentsBgUserSet: false
      };
      var now = S.simNow();
      c.timers = {
        nextStatusAt: now + S.rand(2, 8) * 3600e3, nextAvatarAt: now + S.rand(3, 20) * 3600e3,
        nextPostAt: now + S.rand(2, 10) * 3600e3, nextCheckinAt: now + S.rand(1, 3) * 3600e3,
        nextLetterAt: now + S.rand(2, 10) * 3600e3, nextRedPacketAt: now + S.rand(1, 6) * 3600e3,
        nextRecommendAt: now + S.rand(6, 48) * 3600e3, nextCallAt: now + S.rand(2, 10) * 3600e3,
        nextPokeAt: now + S.rand(2, 8) * 3600e3, nextSigAt: now + S.rand(1, 5) * 3600e3,
        nextMomentsBgAt: 0, lastAiMsgAt: 0
      };
      // 首次状态尽快出现：75% 立即设置，其余 30~90 秒内
      if (Math.random() < 0.75) {
        var stxt = S.pick(c.cards.status) || '';
        c.status = { text: stxt, image: S.pick(c.stickers) || null, expiresAt: Date.now() + 24 * 3600e3 };
        c.timers.nextStatusAt = now + S.rand(2, 30) * 86400e3;
      } else {
        c.timers.nextStatusAt = now + S.rand(30, 90) * 1000;
      }
      S.state.contacts.push(c);
      S.pushMsg(cid, { from: 'them', type: 'text', content: '你好，我是' + name + '，请多指教', read: false });
      S.saveDebounced();
      UI.toast('联系人已创建', 'check');
      Router.go('chat', { cid: cid });
    });
  });

  /* ================= 新建群聊 ================= */
  Router.register('new-group', function (el) {
    el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">新建群聊</div></div>' +
      '<div class="ng-body"><div class="nc-field"><label>群名称</label><input id="ng-name" placeholder="输入群聊名称" maxlength="16"></div>' +
      '<div class="ct-sec">选择成员（至少 1 人，加上你共 2 人）</div><div class="ng-members" id="ng-members"></div>' +
      '<button class="glass-btn primary big" id="ng-save">创建群聊</button></div>';
    var listEl = el.querySelector('#ng-members');
    var chosen = {};
    S.state.contacts.forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'ct-row';
      row.innerHTML = UI.avatarEl(c.avatar, 44) + '<div class="ct-info"><div class="ct-name">' + esc(c.name) + '</div></div>' + '<span class="ng-check"></span>';
      row.addEventListener('click', function () {
        chosen[c.id] = !chosen[c.id];
        row.classList.toggle('on', !!chosen[c.id]);
      });
      listEl.appendChild(row);
    });
    el.querySelector('#ng-save').addEventListener('click', function () {
      var name = el.querySelector('#ng-name').value.trim() || '未命名群聊';
      var members = Object.keys(chosen).filter(function (k) { return chosen[k]; });
      if (members.length < 1) { UI.toast('群聊至少需要 2 人（含你）', 'info'); return; }
      var gid = S.uid('g');
      S.state.groups.push({
        id: gid, name: name, avatar: S.genAvatar('群', S.randInt(0, 360)), members: members,
        settings: { autoSend: true, mutualAt: true, muteAll: false, muteMembers: [] },
        conv: { pinned: false, muted: false, deleted: false }, created: Date.now()
      });
      S.pushGroupMsg(gid, { from: 'sys', type: 'sys', content: '群聊创建成功，快来聊天吧' });
      S.saveDebounced();
      UI.toast('群聊已创建', 'check');
      Router.go('chat', { cid: gid });
    });
  });

  /* ================= 联系人资料 ================= */
  Router.register('contact-info', function (el, args) {
    var c = S.getContact(args.cid);
    if (!c) { Router.back(); return; }
    el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">联系人信息</div></div>' +
      '<div class="ci-top">' + UI.avatarEl(c.avatar, 84) +
      '<div class="ci-name" id="ci-name">' + esc(c.remark || c.name) + '</div>' +
      '<div class="ci-id" id="ci-id">ID：' + esc(c.account || '') + '</div>' +
      '<div class="ci-sig">' + esc(c.signature || '') + '</div></div>' +
      '<div class="ci-btns">' +
      '<button class="ci-btn" data-a="chat">' + Icon('chat', 22) + '<span>发送消息</span></button>' +
      '<button class="ci-btn" data-a="moments">' + Icon('flag', 22) + '<span>朋友圈</span></button>' +
      '<button class="ci-btn" data-a="cards">' + Icon('card', 22) + '<span>字卡</span></button>' +
      '<button class="ci-btn" data-a="stickers">' + Icon('sticker', 22) + '<span>表情包</span></button>' +
      '<button class="ci-btn" data-a="avatarlib">' + Icon('persons', 22) + '<span>头像库</span></button>' +
      '<button class="ci-btn danger" data-a="del">' + Icon('trash', 22) + '<span>删除联系人</span></button>' +
      '</div>';
    // 点击头像更换联系人头像
    var avaEl = el.querySelector('.ci-top img');
    avaEl.style.cursor = 'pointer';
    avaEl.addEventListener('click', async function () {
      var ap = UI.sheetList({
        title: '更换 ' + (c.remark || c.name) + ' 的头像',
        items: [
          { icon: 'image', label: '从本地选取', onClick: function () { ap.close(); doPick(false); } },
          { icon: 'camera', label: '拍照', onClick: function () { ap.close(); doPick(true); } }
        ]
      });
      async function doPick(camera) {
        var imgs = await UI.pickImage({ camera: camera });
        if (imgs.length) {
          c.avatar = imgs[0];
          S.saveDebounced();
          avaEl.src = c.avatar;
          UI.toast('头像已更换', 'check');
        }
      }
    });

    // 直接点击名字（备注）/ ID 即可修改
    el.querySelector('#ci-name').addEventListener('click', function () {
      var api = UI.popup({
        title: '修改备注',
        body: '<input class="pop-input" id="ci-name-inp" maxlength="16" placeholder="备注（显示名）" value="' + esc(c.remark || '') + '">',
        actions: [
          { label: '取消' },
          { label: '保存', primary: true, onClick: function () {
            c.remark = document.getElementById('ci-name-inp').value.trim();
            S.saveDebounced();
            UI.toast('备注已更新', 'check');
            Router.go('contact-info', { cid: c.id });
          } }
        ]
      });
    });
    el.querySelector('#ci-id').addEventListener('click', function () {
      var api = UI.popup({
        title: '修改 ID',
        body: '<input class="pop-input" id="ci-id-inp" maxlength="24" placeholder="对方 ID" value="' + esc(c.account || '') + '">',
        actions: [
          { label: '取消' },
          { label: '保存', primary: true, onClick: function () {
            c.account = document.getElementById('ci-id-inp').value.trim();
            S.saveDebounced();
            UI.toast('ID 已更新', 'check');
            Router.go('contact-info', { cid: c.id });
          } }
        ]
      });
    });
    el.querySelectorAll('.ci-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.dataset.a;
        if (a === 'chat') Router.go('chat', { cid: c.id });
        else if (a === 'moments') Router.go('contact-moments', { cid: c.id });
        else if (a === 'cards') Router.go('card-editor', { cid: c.id, tab: 'chat' });
        else if (a === 'stickers') Router.go('sticker-editor', { cid: c.id });
        else if (a === 'avatarlib') Router.go('avatar-lib-contact', { cid: c.id });
        else if (a === 'del') deleteContact(c.id);
      });
    });

    async function deleteContact(cid) {
      var ok = await UI.confirm('删除联系人', '确定删除该联系人吗？删除后将清空与此联系人的所有数据。', { danger: true, okText: '删除' });
      if (!ok) return;
      var idx = S.state.contacts.findIndex(function (x) { return x.id === cid; });
      if (idx > -1) S.state.contacts.splice(idx, 1);
      delete S.state.convs[cid];
      S.state.groups.forEach(function (g) { g.members = g.members.filter(function (m) { return m !== cid; }); });
      S.state.moments = S.state.moments.filter(function (m) { return m.author !== cid; });
      S.state.moments.forEach(function (m) {
        m.likes = m.likes.filter(function (l) { return l.who !== cid; });
        m.dislikes = m.dislikes.filter(function (d) { return d.who !== cid; });
        m.comments = m.comments.filter(function (cm) { return cm.who !== cid; });
      });
      S.state.letters = S.state.letters.filter(function (l) { return l.from !== cid && l.to !== cid; });
      S.saveDebounced();
      UI.toast('联系人已删除', 'check');
      Router.back();
    }
  });

  /* ================= 对方朋友圈（仅对方） ================= */
  Router.register('contact-moments', function (el, args) {
    var c = S.getContact(args.cid);
    if (!c) { Router.back(); return; }
    var moments = S.state.moments.filter(function (m) { return m.author === c.id; }).sort(function (a, b) { return b.time - a.time; });
    var bg = c.momentsBg || null;
    function draw() {
      el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">TA 的朋友圈</div></div>' +
        '<div class="cm-bg" style="' + (bg ? 'background-image:url(' + bg + ')' : '') + '">' +
        '<div class="cm-bg-mask"></div>' +
        '<button class="cm-bg-btn" id="cm-bg">' + Icon('palette', 15) + ' 修改背景</button></div>' +
        '<div class="cm-list"></div>';
      var listEl = el.querySelector('.cm-list');
      if (!moments.length) listEl.innerHTML = '<div class="empty"><div class="empty-ic">' + Icon('flag', 34) + '</div><div class="empty-t">TA 还没有发过朋友圈</div></div>';
      moments.forEach(function (m) {
        var h = '<div class="mo-card glass-row"><div class="mo-head">' + UI.avatarEl(c.avatar, 40) +
          '<div class="mo-who"><div class="mo-name">' + esc(c.remark || c.name) + '</div><div class="mo-time">' + UI.fmtChatTime(m.time) + '</div></div></div>';
        if (m.text) h += '<div class="mo-text">' + esc(m.text) + '</div>';
        if (m.images && m.images.length) {
          h += '<div class="mo-imgs' + (m.images.length === 1 ? ' one' : '') + '">' + m.images.map(function (im) { return '<img src="' + im + '">'; }).join('') + '</div>';
        }
        h += '</div>';
        listEl.innerHTML += h;
      });
      el.querySelector('#cm-bg').addEventListener('click', async function () {
        var api = UI.sheetList({
          title: '修改 TA 的朋友圈背景',
          items: [
            { icon: 'image', label: '从本地选取', onClick: function () { api.close(); setBg(false); } },
            { icon: 'camera', label: '拍照', onClick: function () { api.close(); setBg(true); } }
          ]
        });
      });
      async function setBg(camera) {
        var imgs = await UI.pickImage({ camera: camera });
        if (!imgs.length) return;
        c.momentsBg = imgs[0];
        c.momentsBgUserSet = true;
        c.timers.nextMomentsBgAt = S.simNow() + S.rand(2, 30) * 86400e3;
        S.saveDebounced();
        bg = c.momentsBg;
        draw();
        UI.toast('背景已修改', 'check');
      }
    }
    draw();
  });

  /* ================= 字卡编辑器 ================= */
  var CARD_TABS = [
    { id: 'chat', label: '交流字卡' }, { id: 'pat', label: '拍一拍' }, { id: 'status', label: '状态' },
    { id: 'daily', label: '日常' }, { id: 'voice', label: '语音' }, { id: 'emoji', label: 'emoji' }, { id: 'kaomoji', label: '颜文字' }
  ];

  Router.register('card-editor', function (el, args) {
    var c = S.getContact(args.cid);
    if (!c) { Router.back(); return; }
    var curTab = args.tab || 'chat';

    function draw() {
      el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">字卡 · ' + esc(c.name) + '</div></div>' +
        '<div class="ce-tabs">' + CARD_TABS.map(function (t) {
          return '<button class="ce-tab' + (t.id === curTab ? ' on' : '') + '" data-t="' + t.id + '">' + t.label + '</button>';
        }).join('') + '</div><div class="ce-body"></div>';
      el.querySelectorAll('.ce-tab').forEach(function (t) {
        t.addEventListener('click', function () { curTab = t.dataset.t; draw(); });
      });
      var body = el.querySelector('.ce-body');
      if (curTab === 'chat') drawChatTab(body);
      else if (curTab === 'voice') drawVoiceTab(body);
      else drawSimpleTab(body, curTab);
    }

    /* 交流字卡（分组） */
    function drawChatTab(body) {
      var groups = c.cards.chat || (c.cards.chat = []);
      var h = '<div class="ce-tip">交流字卡支持分组管理，对方回复时会随机抽取</div>';
      groups.forEach(function (g, gi) {
        h += '<div class="ce-group"><div class="ce-group-head"><input class="ce-group-name" value="' + esc(g.g) + '" data-gi="' + gi + '">' +
          '<button class="ce-mini" data-gdel="' + gi + '">' + Icon('trash', 15) + '</button></div>' +
          '<div class="ce-items">' + (g.items || []).map(function (it, ii) {
            return '<div class="ce-item" data-gi="' + gi + '" data-ii="' + ii + '"><span class="ce-item-t">' + esc(it) + '</span>' +
              '<span class="ce-item-x" data-x="1">' + Icon('close', 14) + '</span></div>';
          }).join('') + '</div>' +
          '<div class="ce-addrow"><input class="ce-add" data-gi="' + gi + '" placeholder="添加字卡，回车确认"><button class="ce-mini ok" data-gadd="' + gi + '">' + Icon('plus', 15) + '</button></div></div>';
      });
      h += '<div class="ce-tools">' +
        '<button class="glass-btn sm" data-tool="group">' + Icon('plus', 15) + ' 新建分组</button>' +
        '<button class="glass-btn sm" data-tool="batch">' + Icon('edit', 15) + ' 批量添加</button>' +
        '<button class="glass-btn sm" data-tool="import">' + Icon('upload', 15) + ' 导入字卡</button>' +
        '<button class="glass-btn sm" data-tool="export">' + Icon('download', 15) + ' 导出字卡</button>' +
        '<button class="glass-btn sm" data-tool="dedupe">' + Icon('refresh', 15) + ' 去重</button>' +
        '</div>';
      body.innerHTML = h;

      // 分组重命名
      body.querySelectorAll('.ce-group-name').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var gi = +inp.dataset.gi;
          if (groups[gi]) groups[gi].g = inp.value.trim() || '分组';
          S.saveDebounced();
        });
      });
      // 删除分组
      body.querySelectorAll('[data-gdel]').forEach(function (b) {
        b.addEventListener('click', function () {
          var gi = +b.dataset.gdel;
          groups.splice(gi, 1);
          S.saveDebounced(); draw();
        });
      });
      // 单条删除 / 编辑
      body.querySelectorAll('.ce-item').forEach(function (it) {
        it.addEventListener('click', function (e) {
          if (e.target.closest('[data-x]')) {
            var gi = +it.dataset.gi, ii = +it.dataset.ii;
            groups[gi].items.splice(ii, 1);
            S.saveDebounced(); draw(); return;
          }
          var gi = +it.dataset.gi, ii = +it.dataset.ii;
          editCard(groups[gi].items, ii);
        });
      });
      // 添加
      body.querySelectorAll('.ce-add').forEach(function (inp) {
        function add() {
          var v = inp.value.trim();
          if (!v) return;
          var gi = +inp.dataset.gi;
          if (!groups[gi]) return;
          groups[gi].items.push(v);
          inp.value = '';
          S.saveDebounced(); draw();
        }
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
      });
      body.querySelectorAll('[data-gadd]').forEach(function (b) {
        b.addEventListener('click', function () {
          var gi = +b.dataset.gadd;
          var inp = body.querySelector('.ce-add[data-gi="' + gi + '"]');
          if (inp) { var v = inp.value.trim(); if (v) { groups[gi].items.push(v); inp.value = ''; S.saveDebounced(); draw(); } }
        });
      });
      // 工具
      body.querySelector('[data-tool="group"]').addEventListener('click', function () {
        groups.push({ g: '新分组', items: [] });
        S.saveDebounced(); draw();
      });
      body.querySelector('[data-tool="batch"]').addEventListener('click', function () {
        batchPopup(function (lines) {
          var g0 = groups[0] || (groups.push({ g: '默认', items: [] }), groups[0]);
          lines.forEach(function (l) { if (l) g0.items.push(l); });
          S.saveDebounced(); draw();
        });
      });
      body.querySelector('[data-tool="import"]').addEventListener('click', function () { importCards(function (lines) { addToGroup(lines); }); });
      body.querySelector('[data-tool="export"]').addEventListener('click', exportCards);
      body.querySelector('[data-tool="dedupe"]').addEventListener('click', function () {
        groups.forEach(function (g) { g.items = dedupe(g.items); });
        S.saveDebounced(); draw(); UI.toast('已去重', 'check');
      });
      function addToGroup(lines) {
        var g0 = groups[0] || (groups.push({ g: '默认', items: [] }), groups[0]);
        lines.forEach(function (l) { if (l) g0.items.push(l); });
        S.saveDebounced(); draw();
      }
    }

    /* 简单列表（拍一拍/状态/日常/emoji/颜文字） */
    function drawSimpleTab(body, tab) {
      var list = c.cards[tab] || (c.cards[tab] = []);
      var tips = { pat: '对方戳一戳时会随机使用', status: '对方会随机挑选一条作为状态展示（每次仅限一个）', daily: '对方会每隔 2~8 小时随机挑选一张进行打卡', emoji: '聊天中会随机使用', kaomoji: '聊天中会随机使用' };
      var h = '<div class="ce-tip">' + (tips[tab] || '') + '</div><div class="ce-items">' +
        list.map(function (it, ii) {
          return '<div class="ce-item" data-ii="' + ii + '"><span class="ce-item-t">' + esc(it) + '</span><span class="ce-item-x" data-x="1">' + Icon('close', 14) + '</span></div>';
        }).join('') + '</div>' +
        '<div class="ce-addrow"><input class="ce-add" placeholder="添加一条，回车确认"><button class="ce-mini ok" id="ce-add1">' + Icon('plus', 15) + '</button></div>' +
        '<div class="ce-tools">' +
        '<button class="glass-btn sm" data-tool="batch">' + Icon('edit', 15) + ' 批量添加</button>' +
        '<button class="glass-btn sm" data-tool="import">' + Icon('upload', 15) + ' 导入字卡</button>' +
        '<button class="glass-btn sm" data-tool="export">' + Icon('download', 15) + ' 导出字卡</button>' +
        '<button class="glass-btn sm" data-tool="dedupe">' + Icon('refresh', 15) + ' 去重</button>' +
        '<button class="glass-btn sm danger" data-tool="clear">' + Icon('trash', 15) + ' 清空</button>' +
        '</div>';
      body.innerHTML = h;
      var addInp = body.querySelector('.ce-add');
      function addOne() {
        var v = addInp.value.trim();
        if (v) { list.push(v); addInp.value = ''; S.saveDebounced(); draw(); }
      }
      addInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') addOne(); });
      body.querySelector('#ce-add1').addEventListener('click', addOne);
      body.querySelectorAll('.ce-item').forEach(function (it) {
        it.addEventListener('click', function (e) {
          if (e.target.closest('[data-x]')) {
            list.splice(+it.dataset.ii, 1); S.saveDebounced(); draw(); return;
          }
          editCard(list, +it.dataset.ii);
        });
      });
      body.querySelector('[data-tool="batch"]').addEventListener('click', function () {
        batchPopup(function (lines) { lines.forEach(function (l) { if (l) list.push(l); }); S.saveDebounced(); draw(); });
      });
      body.querySelector('[data-tool="import"]').addEventListener('click', function () { importCards(function (lines) { lines.forEach(function (l) { if (l) list.push(l); }); S.saveDebounced(); draw(); }); });
      body.querySelector('[data-tool="export"]').addEventListener('click', exportCards);
      body.querySelector('[data-tool="dedupe"]').addEventListener('click', function () {
        c.cards[tab] = dedupe(list);
        S.saveDebounced(); draw(); UI.toast('已去重', 'check');
      });
      body.querySelector('[data-tool="clear"]').addEventListener('click', async function () {
        var ok = await UI.confirm('清空', '确定清空该分类下的所有字卡吗？', { danger: true, okText: '清空' });
        if (ok) { c.cards[tab] = []; S.saveDebounced(); draw(); }
      });
    }

    /* 语音标签 */
    function drawVoiceTab(body) {
      var list = c.cards.voice || (c.cards.voice = []);
      var h = '<div class="ce-tip">语音支持 m4a 格式，一个文件为一条语音；名称将作为聊天中「语音转文字」内容</div>' +
        '<button class="glass-btn primary" id="vo-import">' + Icon('upload', 16) + ' 导入语音文件（m4a）</button>' +
        '<button class="glass-btn sm" id="vo-page">' + Icon('chevronR', 14) + ' 前往语音导入页面</button>' +
        '<div class="ce-items vo-list">' + list.map(function (v, ii) {
          return '<div class="ce-item" data-ii="' + ii + '"><span class="ce-item-t">' + Icon('mic', 15) + ' ' + esc(v.name) + '</span>' +
            '<span class="ce-item-x" data-edit="1">' + Icon('edit', 13) + '</span><span class="ce-item-x" data-x="1">' + Icon('close', 14) + '</span></div>';
        }).join('') + '</div>';
      body.innerHTML = h;
      body.querySelector('#vo-import').addEventListener('click', async function () {
        var files = await UI.pickFile('audio/m4a,.m4a,audio/*', true);
        files.forEach(function (f) {
          var r = new FileReader();
          r.onload = function () {
            var name = f.name.replace(/\.[^.]+$/, '');
            list.push({ name: name, src: r.result, dur: 5 + Math.random() * 8 });
            S.saveDebounced(); draw();
          };
          r.readAsDataURL(f);
        });
      });
      body.querySelector('#vo-page').addEventListener('click', function () { Router.go('voice-import', { cid: c.id }); });
      body.querySelectorAll('.ce-item').forEach(function (it) {
        it.querySelector('[data-x]').addEventListener('click', function () {
          list.splice(+it.dataset.ii, 1); S.saveDebounced(); draw();
        });
        it.querySelector('[data-edit]').addEventListener('click', function () {
          editCard(list, +it.dataset.ii, true);
        });
      });
    }

    function editCard(list, idx, voice) {
      var v = list[idx];
      var isName = typeof v === 'object';
      var api = UI.popup({
        title: isName ? '重命名语音' : '编辑字卡',
        body: '<input class="pop-input" id="ec-input" value="' + esc(isName ? v.name : v) + '" maxlength="40">',
        actions: [
          { label: '取消' },
          { label: '保存', primary: true, onClick: function () {
            var val = document.getElementById('ec-input').value.trim();
            if (!val) return;
            if (isName) v.name = val; else list[idx] = val;
            S.saveDebounced(); draw();
          } }
        ]
      });
      setTimeout(function () { var i = document.getElementById('ec-input'); if (i) { i.focus(); i.select(); } }, 60);
    }

    function batchPopup(done) {
      var api = UI.popup({
        title: '批量添加（一行一条）',
        body: '<textarea class="pop-textarea" id="bp-ta" rows="8" placeholder="每条字卡占一行"></textarea>',
        actions: [
          { label: '取消' },
          { label: '添加', primary: true, onClick: function () {
            var lines = document.getElementById('bp-ta').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
            if (lines.length) done(lines);
          } }
        ]
      });
    }

    /* 导入：支持整份字卡 JSON（含分组）/ 数组 / 纯文本（一行一条） */
    function importCards(done) {
      UI.pickFile('.txt,.json,text/plain', false).then(function (files) {
        if (!files.length) return;
        var r = new FileReader();
        r.onload = function () {
          var txt = String(r.result || '');
          try {
            var j = JSON.parse(txt);
            if (Array.isArray(j)) { done(j.map(String)); return; }
            if (j && typeof j === 'object') {
              var merged = false;
              Object.keys(j).forEach(function (k) {
                if (['chat', 'pat', 'status', 'daily', 'voice', 'emoji', 'kaomoji'].indexOf(k) !== -1 && Array.isArray(j[k])) {
                  if (!c.cards[k]) c.cards[k] = [];
                  j[k].forEach(function (item) {
                    if (k === 'chat' && item && typeof item === 'object' && item.g) {
                      var g0 = c.cards.chat.find(function (x) { return x.g === item.g; });
                      if (!g0) { g0 = { g: item.g, items: [] }; c.cards.chat.push(g0); }
                      (item.items || []).forEach(function (s) { if (s && g0.items.indexOf(s) === -1) g0.items.push(s); });
                    } else if (typeof item === 'string' && c.cards[k].indexOf(item) === -1) {
                      c.cards[k].push(item);
                    }
                  });
                  merged = true;
                }
              });
              if (merged) { S.saveDebounced(); draw(); UI.toast('字卡文件已导入', 'check'); return; }
            }
          } catch (e) { /* 非 JSON，按文本处理 */ }
          done(txt.split('\n').map(function (s) { return s.trim(); }).filter(Boolean));
        };
        r.readAsText(files[0]);
      });
    }

    /* 导出：整份字卡 JSON 文件 */
    function exportCards() {
      var blob = new Blob([JSON.stringify(c.cards, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '字卡_' + (c.remark || c.name) + '_' + Date.now() + '.json';
      a.click();
      UI.toast('字卡已导出', 'check');
    }

    function dedupe(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }

    draw();
  });

  /* ================= 语音导入页面 ================= */
  Router.register('voice-import', function (el, args) {
    var c = S.getContact(args.cid);
    if (!c) { Router.back(); return; }
    var list = c.cards.voice || (c.cards.voice = []);
    function draw() {
      el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">语音导入</div></div>' +
        '<div class="vi-body">' +
        '<button class="glass-btn primary big" id="vi-add">' + Icon('upload', 17) + ' 导入语音（m4a）</button>' +
        '<div class="ce-tip">支持 m4a 格式，一个文件为一条语音；可修改名称作为聊天中「语音转文字」内容</div>' +
        '<div class="ce-items vo-list">' + list.map(function (v, ii) {
          return '<div class="ce-item" data-ii="' + ii + '"><span class="ce-item-t">' + Icon('mic', 15) + ' ' + esc(v.name) + '</span>' +
            '<span class="ce-item-x" data-edit="1">' + Icon('edit', 13) + '</span><span class="ce-item-x" data-x="1">' + Icon('close', 14) + '</span></div>';
        }).join('') + '</div></div>';
      el.querySelector('#vi-add').addEventListener('click', async function () {
        var files = await UI.pickFile('audio/m4a,.m4a,audio/*', true);
        files.forEach(function (f) {
          var r = new FileReader();
          r.onload = function () {
            list.push({ name: f.name.replace(/\.[^.]+$/, ''), src: r.result, dur: 5 + Math.random() * 8 });
            S.saveDebounced(); draw();
          };
          r.readAsDataURL(f);
        });
      });
      el.querySelectorAll('.ce-item').forEach(function (it) {
        it.querySelector('[data-x]').addEventListener('click', function () { list.splice(+it.dataset.ii, 1); S.saveDebounced(); draw(); });
        it.querySelector('[data-edit]').addEventListener('click', function () {
          var v = list[+it.dataset.ii];
          var api = UI.popup({
            title: '重命名（语音转文字内容）',
            body: '<input class="pop-input" id="vi-inp" value="' + esc(v.name) + '">',
            actions: [
              { label: '取消' },
              { label: '保存', primary: true, onClick: function () {
                var val = document.getElementById('vi-inp').value.trim();
                if (val) { v.name = val; S.saveDebounced(); draw(); }
              } }
            ]
          });
        });
      });
    }
    draw();
  });

  /* ================= 表情包（该联系人专用） ================= */
  Router.register('sticker-editor', function (el, args) {
    var c = S.getContact(args.cid);
    if (!c) { Router.back(); return; }
    function draw() {
      el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">表情包 · ' + esc(c.name) + '</div></div>' +
        '<div class="se-body">' +
        '<div class="ce-tip">支持 jpg / png，可批量上传/删除；该联系人使用的表情包相互独立</div>' +
        '<div class="se-tools"><button class="glass-btn primary" id="se-add">' + Icon('plus', 16) + ' 批量上传</button>' +
        '<button class="glass-btn sm danger" id="se-clear">' + Icon('trash', 15) + ' 全部删除</button></div>' +
        '<div class="se-grid">' + (c.stickers.length ? c.stickers.map(function (s, i) {
          return '<div class="se-cell" data-i="' + i + '"><img src="' + s + '"><span class="se-x">' + Icon('close', 13) + '</span></div>';
        }).join('') : '<div class="empty"><div class="empty-ic">' + Icon('sticker', 34) + '</div><div class="empty-t">还没有表情包，点击上方上传</div></div>') + '</div></div>';
      el.querySelector('#se-add').addEventListener('click', async function () {
        var imgs = await UI.pickImage({ multiple: true });
        imgs.forEach(function (im) { c.stickers.push(im); });
        S.saveDebounced(); draw(); UI.toast('已添加 ' + imgs.length + ' 张', 'check');
      });
      el.querySelector('#se-clear').addEventListener('click', async function () {
        var ok = await UI.confirm('删除表情包', '确定删除该联系人的全部表情包吗？', { danger: true, okText: '删除' });
        if (ok) { c.stickers = []; S.saveDebounced(); draw(); }
      });
      el.querySelectorAll('.se-cell').forEach(function (cell) {
        cell.querySelector('.se-x').addEventListener('click', function () {
          c.stickers.splice(+cell.dataset.i, 1);
          S.saveDebounced(); draw();
        });
      });
    }
    draw();
  });

  /* ================= 联系人头像库 ================= */
  Router.register('avatar-lib-contact', function (el, args) {
    var c = S.getContact(args.cid);
    if (!c) { Router.back(); return; }
    function draw() {
      el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">头像库 · ' + esc(c.name) + '</div></div>' +
        '<div class="se-body">' +
        '<div class="ce-tip">对方会随机从头像库、表情包以及你朋友圈的图片中选取一张作为头像（每 2 天 ~ 1 个月更换）</div>' +
        '<div class="se-tools"><button class="glass-btn primary" id="al-add">' + Icon('plus', 16) + ' 批量上传</button>' +
        '<button class="glass-btn sm danger" id="al-clear">' + Icon('trash', 15) + ' 全部删除</button></div>' +
        '<div class="se-grid">' + (c.avatarLib.length ? c.avatarLib.map(function (s, i) {
          return '<div class="se-cell" data-i="' + i + '"><img src="' + s + '"><span class="se-x">' + Icon('close', 13) + '</span></div>';
        }).join('') : '<div class="empty"><div class="empty-ic">' + Icon('persons', 34) + '</div><div class="empty-t">头像库为空</div></div>') + '</div></div>';
      el.querySelector('#al-add').addEventListener('click', async function () {
        var imgs = await UI.pickImage({ multiple: true });
        imgs.forEach(function (im) { c.avatarLib.push(im); });
        S.saveDebounced(); draw(); UI.toast('已添加 ' + imgs.length + ' 张', 'check');
      });
      el.querySelector('#al-clear').addEventListener('click', async function () {
        var ok = await UI.confirm('删除头像', '确定清空头像库吗？', { danger: true, okText: '删除' });
        if (ok) { c.avatarLib = []; S.saveDebounced(); draw(); }
      });
      el.querySelectorAll('.se-cell').forEach(function (cell) {
        cell.querySelector('.se-x').addEventListener('click', function () {
          c.avatarLib.splice(+cell.dataset.i, 1);
          S.saveDebounced(); draw();
        });
      });
    }
    draw();
  });

  /* ================= 群聊信息 ================= */
  Router.register('group-info', function (el, args) {
    var g = S.getGroup(args.gid);
    if (!g) { Router.back(); return; }
    function draw() {
      el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">群聊信息</div></div>' +
        '<div class="gi-top">' + UI.avatarEl(g.avatar, 84) + '<div class="ci-name" id="gi-ava">' + esc(g.name) + '</div>' +
        '<div class="ci-id">' + (g.members.length + 1) + ' 名成员（含你）</div></div>' +
        '<div class="gi-members">' +
        '<div class="gi-mem">' + UI.avatarEl(S.state.me.avatar, 40) + '<span>我</span></div>' +
        g.members.map(function (mid) {
          var c = S.getContact(mid);
          return '<div class="gi-mem">' + (c ? UI.avatarEl(c.avatar, 40) : UI.avatarEl(S.genAvatar('?', 0), 40)) + '<span>' + esc(c ? c.name : '已离开') + '</span></div>';
        }).join('') + '</div>' +
        '<div class="ci-btns two">' +
        '<button class="ci-btn" id="gi-set">' + Icon('gear', 22) + '<span>群聊设置</span></button>' +
        '<button class="ci-btn danger" id="gi-del">' + Icon('trash', 22) + '<span>删除群聊</span></button>' +
        '</div>';
      // 点群头像改头像
      var ava = el.querySelector('.gi-top img');
      ava.style.cursor = 'pointer';
      ava.addEventListener('click', async function () {
        var imgs = await UI.pickImage({});
        if (imgs.length) { g.avatar = imgs[0]; S.saveDebounced(); draw(); }
      });
      // 改名称
      el.querySelector('#gi-ava').addEventListener('click', function () {
        var api = UI.popup({
          title: '修改群聊名称',
          body: '<input class="pop-input" id="gi-name" value="' + esc(g.name) + '">',
          actions: [
            { label: '取消' },
            { label: '保存', primary: true, onClick: function () {
              var v = document.getElementById('gi-name').value.trim();
              if (v) { g.name = v; S.saveDebounced(); draw(); }
            } }
          ]
        });
      });
      el.querySelector('#gi-set').addEventListener('click', function () { Router.go('group-settings', { gid: g.id }); });
      el.querySelector('#gi-del').addEventListener('click', async function () {
        var ok = await UI.confirm('删除群聊', '确定删除该群聊吗？将清空群聊数据（表情包保留）。', { danger: true, okText: '删除' });
        if (ok) {
          var idx = S.state.groups.findIndex(function (x) { return x.id === g.id; });
          if (idx > -1) S.state.groups.splice(idx, 1);
          delete S.state.groupMsgs[g.id];
          S.saveDebounced();
          UI.toast('群聊已删除', 'check');
          Router.back();
        }
      });
    }
    draw();
  });

  /* ================= 群聊设置 ================= */
  Router.register('group-settings', function (el, args) {
    var g = S.getGroup(args.gid);
    if (!g) { Router.back(); return; }
    function draw() {
      el.innerHTML = '<div class="page-head">' + backBtn() + '<div class="ph-title">群聊设置</div></div><div class="gs-body"></div>';
      var body = el.querySelector('.gs-body');
      function row(title, sub, sw) {
        var r = document.createElement('div');
        r.className = 'gs-row';
        var t = document.createElement('div');
        t.innerHTML = '<div class="gs-name">' + esc(title) + '</div>' + (sub ? '<div class="gs-sub">' + esc(sub) + '</div>' : '');
        r.appendChild(t);
        r.appendChild(sw);
        body.appendChild(r);
      }
      row('自动发送消息', '开启后群成员会不定期自动发言', UI.switchEl(g.settings.autoSend, function (v) {
        g.settings.autoSend = v; S.saveDebounced();
      }));
      row('互相 @', '关闭后群成员只能 @ 你', UI.switchEl(g.settings.mutualAt, function (v) {
        g.settings.mutualAt = v; S.saveDebounced();
      }));
      row('全体禁言', '开启后群内无人可以发言', UI.switchEl(g.settings.muteAll, function (v) {
        g.settings.muteAll = v; S.saveDebounced(); draw();
      }));
      var sec = document.createElement('div');
      sec.className = 'ct-sec';
      sec.textContent = '禁言成员';
      body.appendChild(sec);
      g.members.forEach(function (mid) {
        var c = S.getContact(mid);
        if (!c) return;
        var muted = g.settings.muteMembers.indexOf(mid) !== -1;
        row(c.name, '', UI.switchEl(muted, function (v) {
          g.settings.muteMembers = g.settings.muteMembers.filter(function (x) { return x !== mid; });
          if (v) g.settings.muteMembers.push(mid);
          S.saveDebounced();
        }));
      });
    }
    draw();
  });

  /* ---------- 公共：返回按钮 ---------- */
  function backBtn() {
    return '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-back]');
    if (b) Router.back();
  });
})();
