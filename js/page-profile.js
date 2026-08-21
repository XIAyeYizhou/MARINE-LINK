/* ============================================================
   字卡 · 玻璃信使 — 个人信息页面（资料/头像库/主题/Link杂货铺）
   ============================================================ */
(function () {
  var S = Store, UI = window.UI, esc = S.esc;

  /* ================= 我的主页 ================= */
  Router.register('profile', function (el) {
    function draw() {
      var me = S.state.me;
      var hasImg = !!(me.status && me.status.image);
      el.innerHTML = '<div class="pf-page">' +
        (hasImg ? '<div class="pf-status-img">' +
          '<img class="pf-img-sharp" src="' + me.status.image + '">' +
          '</div>' : '') +
        '<button class="pf-more" id="pf-more">' + Icon('more', 22) + '</button>' +
        '<div class="pf-sheet">' +
        '<div class="pf-ava">' + UI.avatarEl(me.avatar, 84) + '</div>' +
        '<div class="pf-name">' + esc(me.name) + '</div>' +
        '<div class="pf-id">' + esc(me.account || '') + '</div>' +
        '<div class="pf-sig">' + esc(me.signature || '') + '</div>' +
        '<div class="pf-btns">' +
        '<button data-p="edit-profile"><span class="pf-bt-ic" style="background:linear-gradient(135deg,#8f9cff,#5b6cff)">' + Icon('edit', 20) + '</span><span>编辑个人资料</span></button>' +
        '<button data-p="avatar-lib-me"><span class="pf-bt-ic" style="background:linear-gradient(135deg,#7fd0c4,#3aa89a)">' + Icon('persons', 20) + '</span><span>头像库</span></button>' +
        '<button data-p="theme"><span class="pf-bt-ic" style="background:linear-gradient(135deg,#f0a6c8,#e06aa8)">' + Icon('palette', 20) + '</span><span>网址主题颜色切换</span></button>' +
        '<button data-p="store"><span class="pf-bt-ic" style="background:linear-gradient(135deg,#f5c76a,#e8a33c)">' + Icon('bag', 20) + '</span><span>Link 杂货铺</span></button>' +
        '</div></div></div>';
      el.querySelectorAll('.pf-btns button').forEach(function (b) {
        b.addEventListener('click', function () { Router.go(b.dataset.p); });
      });
      el.querySelector('#pf-more').addEventListener('click', addStatus);
    }

    function addStatus() {
      var me = S.state.me;
      var body = '<div class="st-add">' +
        '<input class="pop-input" id="st-text" maxlength="12" placeholder="输入状态文字（如：在听歌）" value="' + esc((me.status && me.status.text) || '') + '">' +
        '<div class="st-img" id="st-img" style="' + (me.status && me.status.image ? 'background-image:url(' + me.status.image + ')' : '') + '">' +
        (me.status && me.status.image ? '' : Icon('image', 24) + '<span>选择配图</span>') + '</div>' +
        '<div class="st-tip">状态文字不会显示在个人页面，仅配图会以模糊效果展示</div></div>';
      var api = UI.popup({
        title: '添加状态',
        body: body,
        actions: [
          { label: '清除状态', onClick: function () {
            me.status = { text: '', image: null };
            me.status.comments = [];
            S.saveDebounced(); draw(); UI.toast('状态已清除', 'check');
          } },
          { label: '保存', primary: true, onClick: function () {
            var txt = document.getElementById('st-text').value.trim();
            var img = me._stImg || (me.status && me.status.image) || null;
            // 状态仅存在 24h，到期自动消失
            me.status = { text: txt, image: img, expiresAt: Date.now() + 24 * 3600e3, comments: [], likes: [], dislikes: [], reacts: {} };
            delete me._stImg;
            S.saveDebounced();
            UI.toast('状态已更新（24 小时后自动消失）', 'check');
            draw();
          } }
        ]
      });
      var stImg = api.body.querySelector('#st-img');
      stImg.addEventListener('click', async function () {
        var ap2 = UI.sheetList({
          title: '选择配图',
          items: [
            { icon: 'image', label: '从本地选取', onClick: function () { ap2.close(); doPick(false); } },
            { icon: 'camera', label: '拍照', onClick: function () { ap2.close(); doPick(true); } }
          ]
        });
        async function doPick(camera) {
          var imgs = await UI.pickImage({ camera: camera });
          if (imgs.length) {
            me._stImg = imgs[0];
            stImg.style.backgroundImage = 'url(' + imgs[0] + ')';
            stImg.innerHTML = '';
          }
        }
      });
    }

    draw();
  }, { nav: true });

  /* ================= 编辑个人资料 ================= */
  Router.register('edit-profile', function (el) {
    var me = S.state.me;
    el.innerHTML = '<div class="page-head light">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
      '<div class="ph-title">编辑个人资料</div></div>' +
      '<div class="ep-body">' +
      '<div class="nc-avatar" id="ep-ava">' + UI.avatarEl(me.avatar, 92) + '<div class="nc-ava-edit">' + Icon('camera', 16) + '</div></div>' +
      '<div class="nc-field"><label>姓名</label><input id="ep-name" value="' + esc(me.name) + '" maxlength="16"></div>' +
      '<div class="nc-field"><label>ID 账号</label><input id="ep-id" value="' + esc(me.account || '') + '" maxlength="24"></div>' +
      '<div class="nc-field"><label>个性签名</label><input id="ep-sig" value="' + esc(me.signature || '') + '" maxlength="40"></div>' +
      '<button class="glass-btn primary big" id="ep-save">保存</button></div>';

    el.querySelector('#ep-ava').addEventListener('click', function () {
      UI.sheetList({
        title: '选择头像',
        items: [
          { icon: 'image', label: '从本地选取', onClick: function (ap) { ap.close(); pick(false); } },
          { icon: 'camera', label: '拍照', onClick: function (ap) { ap.close(); pick(true); } },
          { icon: 'persons', label: '从头像库选择', onClick: function (ap) {
            ap.close();
            if (!me.avatarLib.length) { UI.toast('头像库为空，先去添加吧', 'info'); return; }
            var g = '<div class="stk-grid">' + me.avatarLib.map(function (s, i) { return '<img class="stk-cell" data-i="' + i + '" src="' + s + '">'; }).join('') + '</div>';
            var ap3 = UI.popup({ title: '头像库', body: g });
            ap3.body.querySelectorAll('.stk-cell').forEach(function (img) {
              img.addEventListener('click', function () {
                me.avatar = me.avatarLib[+img.dataset.i];
                el.querySelector('#ep-ava img').src = me.avatar;
                S.saveDebounced();
                ap3.close();
              });
            });
          } }
        ]
      });
      async function pick(camera) {
        var imgs = await UI.pickImage({ camera: camera });
        if (imgs.length) { me.avatar = imgs[0]; el.querySelector('#ep-ava img').src = me.avatar; S.saveDebounced(); }
      }
    });

    el.querySelector('#ep-save').addEventListener('click', function () {
      me.name = el.querySelector('#ep-name').value.trim() || me.name;
      me.account = el.querySelector('#ep-id').value.trim();
      me.signature = el.querySelector('#ep-sig').value.trim();
      S.saveDebounced();
      UI.toast('已保存', 'check');
      Router.back();
    });
  });

  /* ================= 我的头像库 ================= */
  Router.register('avatar-lib-me', function (el) {
    var me = S.state.me;
    function draw() {
      el.innerHTML = '<div class="page-head light">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
        '<div class="ph-title">头像库</div></div>' +
        '<div class="se-body">' +
        '<div class="se-tools"><button class="glass-btn primary" id="am-add">' + Icon('plus', 16) + ' 批量添加</button>' +
        '<button class="glass-btn sm danger" id="am-clear">' + Icon('trash', 15) + ' 全部删除</button></div>' +
        '<div class="se-grid">' + (me.avatarLib.length ? me.avatarLib.map(function (s, i) {
          return '<div class="se-cell" data-i="' + i + '"><img src="' + s + '"><span class="se-x">' + Icon('close', 13) + '</span></div>';
        }).join('') : '<div class="empty"><div class="empty-ic">' + Icon('persons', 34) + '</div><div class="empty-t">头像库为空</div></div>') + '</div>' +
        '<div class="am-toggle"><span><b>允许联系人推荐头像</b><br><small>开启后对方会随机从你的头像库挑选并在聊天界面推荐给你（每 2 天 ~ 1 个月）</small></span></div></div>';
      el.querySelector('#am-add').addEventListener('click', async function () {
        var ap = UI.sheetList({
          title: '添加头像',
          items: [
            { icon: 'image', label: '从本地批量选取', onClick: function () { ap.close(); doPick(false); } },
            { icon: 'camera', label: '拍照', onClick: function () { ap.close(); doPick(true); } }
          ]
        });
        async function doPick(camera) {
          var imgs = await UI.pickImage({ camera: camera, multiple: !camera });
          imgs.forEach(function (im) { me.avatarLib.push(im); });
          S.saveDebounced(); draw(); UI.toast('已添加 ' + imgs.length + ' 张', 'check');
        }
      });
      el.querySelector('#am-clear').addEventListener('click', async function () {
        var ok = await UI.confirm('删除头像', '确定清空头像库吗？', { danger: true, okText: '删除' });
        if (ok) { me.avatarLib = []; S.saveDebounced(); draw(); }
      });
      el.querySelectorAll('.se-cell').forEach(function (cell) {
        cell.querySelector('.se-x').addEventListener('click', function () {
          me.avatarLib.splice(+cell.dataset.i, 1);
          S.saveDebounced(); draw();
        });
      });
      var sw = UI.switchEl(me.allowAvatarRecommend, function (v) {
        me.allowAvatarRecommend = v;
        S.saveDebounced();
      });
      el.querySelector('.am-toggle').appendChild(sw);
    }
    draw();
  });

  /* ================= 主题颜色切换 ================= */
  Router.register('theme', function (el) {
    var me = S.state.me;
    var t = JSON.parse(JSON.stringify(me.theme || { font: '#3F3A36', page: '#DDD8CE', ui: '#9AA7B5' }));
    var curPalette = '中性莫兰迪';
    // 七组莫兰迪色系：中性 / 粉色 / 蓝色 / 绿色 / 紫色 / 橙色 / 红色（每组背景色均含默认 #D9D9D9）
    var PALETTES = {
      '中性莫兰迪': {
        font: ['#3F3A36', '#57534E', '#4A4642', '#2E2B28'],
        page: ['#DDD8CE', '#D8D2C8', '#CBD3CC', '#C9D0D8', '#D6CBC9', '#E2DDD4', '#D9D9D9'],
        ui: ['#9AA7B5', '#8FA39E', '#B09090', '#A69783', '#8E8FA5', '#7F8C93']
      },
      '粉色莫兰迪': {
        font: ['#4A3E42', '#5C4B52', '#3F3438', '#6B5A60'],
        page: ['#E8DCDA', '#E3D4D3', '#EDE0DC', '#E5D8D9', '#F0E2E0', '#E0D2D2', '#D9D9D9'],
        ui: ['#C49AA4', '#B98A96', '#D2A6AF', '#A97F8B', '#C08C98', '#B08090']
      },
      '蓝色莫兰迪': {
        font: ['#3A4048', '#4A5560', '#333A44', '#5A6672'],
        page: ['#D8DEE4', '#CDD6DE', '#D5DDE3', '#C9D3DC', '#E0E5EA', '#D2DAE2', '#D9D9D9'],
        ui: ['#8FA3B8', '#7E95AD', '#9FB2C4', '#7189A2', '#86A0B8', '#7590AA']
      },
      '绿色莫兰迪': {
        font: ['#3A4239', '#4A5548', '#333B31', '#57634F'],
        page: ['#D7DDD2', '#CDD6C6', '#DDE2D6', '#C8D2BE', '#E0E4DA', '#D3DACB', '#D9D9D9'],
        ui: ['#8FA389', '#7E957A', '#9DB293', '#6F8868', '#85A07F', '#759070']
      },
      '紫色莫兰迪': {
        font: ['#3E3946', '#4D4657', '#37323F', '#5A5268'],
        page: ['#DCD8E2', '#D2CDDA', '#E2DEE8', '#CCC6D6', '#E8E4EC', '#D6D2DF', '#D9D9D9'],
        ui: ['#9B93B0', '#8B82A3', '#A89FC0', '#7C7395', '#9389AC', '#83789F']
      },
      '橙色莫兰迪': {
        font: ['#453A31', '#544637', '#3E352C', '#61513F'],
        page: ['#E4D9CB', '#DFD2C2', '#EAE0D4', '#D9CCB9', '#EDE4D9', '#E2D7C8', '#D9D9D9'],
        ui: ['#C09A70', '#B08A5F', '#CDA87F', '#9F7C52', '#B8936A', '#A6855C']
      },
      '红色莫兰迪': {
        font: ['#463438', '#574044', '#3F2F32', '#644A4E'],
        page: ['#E5D6D3', '#E0CFCC', '#ECDFDC', '#DAC9C7', '#F0E4E1', '#E3D4D1', '#D9D9D9'],
        ui: ['#BE8B84', '#AD7A73', '#CD9C95', '#9C6B65', '#B8837C', '#A6736C']
      }
    };
    var LABELS = { font: '字体颜色', page: '页面背景颜色', ui: 'UI 主题框架颜色' };

    function swatchRow(key) {
      var h = '<div class="th-row"><div class="th-label">' + LABELS[key] + '</div><div class="th-swatches">' +
        PALETTES[curPalette][key].map(function (c) {
          var on = (t[key] || '').toLowerCase() === c.toLowerCase();
          return '<span class="th-swatch' + (on ? ' on' : '') + '" style="background:' + c + '" data-c="' + c + '" data-k="' + key + '">' + (on ? Icon('check', 14) : '') + '</span>';
        }).join('') +
        '</div><input type="color" class="th-custom" data-k="' + key + '" value="' + t[key] + '"></div>';
      return h;
    }
    function draw() {
      el.innerHTML = '<div class="page-head light">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
        '<div class="ph-title">主题颜色切换</div></div>' +
        '<div class="th-body">' +
        '<div class="th-palettes">' + Object.keys(PALETTES).map(function (p) {
          return '<button class="th-pal' + (p === curPalette ? ' on' : '') + '" data-p="' + p + '">' + p + '</button>';
        }).join('') + '</div>' +
        swatchRow('font') + swatchRow('page') + swatchRow('ui') +
        '<div class="th-preview glass-row">' + Icon('chat', 20) + '<span>主题预览</span></div>' +
        '<div class="th-btns">' +
        '<button class="glass-btn" id="th-reset">' + Icon('refresh', 16) + ' 一键还原</button>' +
        '<button class="glass-btn primary" id="th-save">' + Icon('check', 16) + ' 保存</button>' +
        '</div></div>';
      el.querySelectorAll('.th-pal').forEach(function (p) {
        p.addEventListener('click', function () {
          curPalette = p.dataset.p;
          // 一键套用该色系推荐组合
          var pal = PALETTES[curPalette];
          t = { font: pal.font[0], page: pal.page[0], ui: pal.ui[0] };
          applyPreview();
          draw();
        });
      });
      el.querySelectorAll('.th-swatch').forEach(function (s) {
        s.addEventListener('click', function () {
          t[s.dataset.k] = s.dataset.c;
          applyPreview();
          draw();
        });
      });
      el.querySelectorAll('.th-custom').forEach(function (inp) {
        inp.addEventListener('input', function () {
          t[inp.dataset.k] = inp.value;
          applyPreview();
        });
      });
      el.querySelector('#th-save').addEventListener('click', function () {
        me.theme = JSON.parse(JSON.stringify(t));
        S.saveDebounced();
        applyTheme();
        UI.toast('主题已保存', 'check');
        Router.back();
      });
      el.querySelector('#th-reset').addEventListener('click', function () {
        curPalette = '中性莫兰迪';
        t = { font: '#3F3A36', page: '#DDD8CE', ui: '#9AA7B5' };
        applyPreview();
        draw();
      });
    }
    function applyPreview() {
      var phone = document.getElementById('phone');
      if (phone) {
        phone.style.setProperty('--c-font', t.font);
        phone.style.setProperty('--c-page', t.page);
        phone.style.setProperty('--c-ui', t.ui);
      }
    }
    draw();
  });

  /* ================= Link 杂货铺 ================= */
  Router.register('store', function (el) {
    var shop = S.state.shop;
    function draw() {
      var delivering = shop.gifts.filter(function (g) { return g.status === 'delivering'; }).length;
      el.innerHTML = '<div class="page-head light">' + '<button class="back-btn" data-back>' + Icon('back', 22) + '</button>' +
        '<div class="ph-title">Link 杂货铺</div>' +
        '<button class="mo-add" id="st-add">' + Icon('plus', 22) + '</button></div>' +
        '<div class="st-body">' +
        '<div class="st-tip">' + (delivering ? Icon('box', 15) + ' 有 ' + delivering + ' 件商品派送中，送达后才能赠送下一件' : '创建商品，送给你的联系人（一次仅一件，次日 8:00 送达）') + '</div>' +
        '<div class="st-grid">' + (shop.products.length ? shop.products.map(function (p, i) {
          return '<div class="st-card glass-row" data-i="' + i + '">' +
            '<div class="st-img" style="background-image:url(' + p.image + ')"></div>' +
            '<div class="st-name">' + esc(p.name) + '</div>' +
            '<div class="st-price">¥ ' + p.price + '</div>' +
            '<div class="st-cat">' + esc(p.category || '其他') + '</div></div>';
        }).join('') : '<div class="empty" style="grid-column:1/-1"><div class="empty-ic">' + Icon('bag', 34) + '</div><div class="empty-t">杂货铺还是空的，点击右上角创建商品</div></div>') + '</div>' +
        (shop.gifts.length ? '<div class="st-sec">赠送记录</div><div class="st-gifts">' + shop.gifts.map(function (g) {
          var p = shop.products.find(function (x) { return x.id === g.productId; });
          var c = S.getContact(g.to);
          return '<div class="st-gift glass-row"><div class="st-gift-ic">' + Icon(g.status === 'delivered' ? 'check' : 'box', 17) + '</div>' +
            '<div><b>' + esc(p ? p.name : '商品') + '</b> → ' + esc(c ? c.name : '') + '<br><small>' + (g.status === 'delivered' ? '已送达' : '派送中 · 预计 ' + UI.fmtChatTime(g.deliverAt)) + '</small></div></div>';
        }).join('') + '</div>' : '') +
        (shop.replies.length ? '<div class="st-sec">对方回复</div><div class="st-replies">' + shop.replies.map(function (r) {
          return '<div class="st-reply glass-row">' + esc(r.to) + '：' + esc(r.product) + ' 已收到～</div>';
        }).join('') + '</div>' : '') +
        '</div>';

      el.querySelectorAll('.st-card').forEach(function (card) {
        card.addEventListener('click', function () {
          var p = shop.products[+card.dataset.i];
          giftFlow(p);
        });
      });
      el.querySelector('#st-add').addEventListener('click', createProduct);
    }

    function createProduct() {
      var img = S.genSticker('新品', 220);
      var api = UI.popup({
        title: '创建商品',
        body: '<div class="pr-create">' +
          '<div class="pr-img" id="pr-img" style="background-image:url(' + img + ')">' + Icon('camera', 20) + '</div>' +
          '<div class="nc-field"><label>商品名称</label><input id="pr-name" maxlength="16" placeholder="如：手工曲奇"></div>' +
          '<div class="nc-field"><label>价格</label><input id="pr-price" type="number" step="0.01" min="0" placeholder="0.00"></div>' +
          '<div class="nc-field"><label>分类</label><input id="pr-cat" maxlength="10" placeholder="如：零食 / 饰品 / 文具"></div>' +
          '</div>',
        actions: [
          { label: '取消' },
          { label: '上架', primary: true, onClick: function () {
            var name = document.getElementById('pr-name').value.trim();
            var price = parseFloat(document.getElementById('pr-price').value);
            if (!name || isNaN(price)) { UI.toast('请填写名称和价格', 'info'); return false; }
            shop.products.push({ id: S.uid('p'), name: name, price: Math.round(price * 100) / 100, image: img, category: document.getElementById('pr-cat').value.trim() || '其他' });
            S.saveDebounced();
            UI.toast('商品已上架', 'check');
            draw();
          } }
        ]
      });
      api.body.querySelector('#pr-img').addEventListener('click', async function () {
        var ap2 = UI.sheetList({
          title: '商品图片',
          items: [
            { icon: 'image', label: '从本地选取', onClick: function () { ap2.close(); doPick(false); } },
            { icon: 'camera', label: '拍照', onClick: function () { ap2.close(); doPick(true); } }
          ]
        });
        async function doPick(camera) {
          var imgs = await UI.pickImage({ camera: camera });
          if (imgs.length) { img = imgs[0]; api.body.querySelector('#pr-img').style.backgroundImage = 'url(' + img + ')'; api.body.querySelector('#pr-img').innerHTML = ''; }
        }
      });
    }

    function giftFlow(p) {
      var delivering = shop.gifts.filter(function (g) { return g.status === 'delivering'; }).length;
      if (delivering > 0) { UI.toast('有商品正在派送中，送达后才能赠送下一件', 'info'); return; }
      UI.sheetList({
        title: '把「' + p.name + '」送给',
        items: S.state.contacts.map(function (c) {
          return {
            icon: 'person', label: c.name,
            onClick: function () {
              giftConfirm(c, p);
            }
          };
        })
      });
    }
    function giftConfirm(c, p) {
      UI.confirm('赠送商品', '确定把「' + p.name + '」送给 ' + c.name + ' 吗？将于明日 8:00 送达。', { okText: '赠送' }).then(function (ok) {
        if (!ok) return;
        var t = S.simNow();
        var d = new Date(t);
        d.setDate(d.getDate() + 1);
        d.setHours(8, 0, 0, 0);
        shop.gifts.push({ id: S.uid('g'), productId: p.id, to: c.id, status: 'delivering', deliverAt: d.getTime() });
        S.saveDebounced();
        UI.toast('已下单，明日 8:00 送达', 'gift');
        draw();
      });
    }

    draw();
    Bus.on('shop', function () { if (Router.currentId() === 'store') draw(); });
  });

  /* 主题应用（供全局调用） */
  window.applyTheme = function () {
    var t = S.state.me.theme || { font: '#16161d', page: '#e9ebf5', ui: '#5b6cff' };
    var phone = document.getElementById('phone');
    if (phone) {
      phone.style.setProperty('--c-font', t.font);
      phone.style.setProperty('--c-page', t.page);
      phone.style.setProperty('--c-ui', t.ui);
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.page);
  };
})();
