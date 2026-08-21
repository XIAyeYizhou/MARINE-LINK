/* ============================================================
   字卡 · 玻璃信使 — AI 行为调度器
   模拟对方：自动回复 / 状态 / 头像 / 朋友圈 / 信箱 / 红包 / 通话 / 戳一戳 / 视奸 / 打卡 / 礼物
   ============================================================ */
(function () {
  var S = Store;

  function flatChat(c) {
    var arr = [];
    (c.cards.chat || []).forEach(function (g) { (g.items || []).forEach(function (t) { arr.push(t); }); });
    (c.cards.emoji || []).forEach(function (t) { arr.push(t); });
    (c.cards.kaomoji || []).forEach(function (t) { arr.push(t); });
    return arr;
  }

  function userMomentsImages() {
    var imgs = [];
    S.state.moments.forEach(function (m) {
      if (m.author === 'me' && m.images) imgs = imgs.concat(m.images);
    });
    return imgs;
  }

  function recordCalendar(who, text) {
    var k = S.dayKey();
    var cal = S.state.checkins.calendar;
    if (!cal[k]) cal[k] = [];
    var list = cal[k];
    if (!list.some(function (e) { return e.who === who; }) && text) list.push({ who: who, text: text });
    // 只保留 60 天
    var keys = Object.keys(cal).sort();
    while (keys.length > 60) { delete cal[keys.shift()]; }
  }

  /* ---------- 对方回复用户消息 ---------- */
  function replyTo(cid) {
    var meta = S.convMeta(cid);
    var texts = [], who = null, settings = null;
    if (meta.group) {
      var g = S.getGroup(cid);
      if (!g || g.settings.muteAll) return;
      var cands = g.members.filter(function (m) { return g.settings.muteMembers.indexOf(m) === -1; });
      if (!cands.length) return;
      who = S.pick(cands);
      var c = S.getContact(who);
      if (!c) return;
      settings = c.settings;
    } else {
      var cc = S.getContact(cid);
      if (!cc) return;
      settings = cc.settings;
      who = null;
    }
    var n = S.clamp(settings.replyCount || 2, 1, 6);
    var cards = meta.group ? flatChat(S.getContact(who)) : flatChat(S.getContact(cid));
    for (var i = 0; i < n; i++) { var t = S.pick(cards); if (t && texts.indexOf(t) === -1) texts.push(t); }
    if (!texts.length) return;
    if (settings.merge) {
      if (meta.group) S.pushGroupMsg(cid, { from: who, type: 'text', content: texts.join('；'), read: false });
      else S.pushMsg(cid, { from: 'them', type: 'text', content: texts.join('；'), read: false });
    } else {
      texts.forEach(function (t) {
        if (meta.group) S.pushGroupMsg(cid, { from: who, type: 'text', content: t, read: false });
        else S.pushMsg(cid, { from: 'them', type: 'text', content: t, read: false });
      });
    }
    try { AudioX.receiveSound(); } catch (e) { }
  }

  /* 用户发消息后，对方进入「正在输入」并安排回复 */
  function onUserMsg(cid) {
    var meta = S.convMeta(cid);
    var gap = 8;
    if (meta.group) {
      var g = S.getGroup(cid);
      if (g && g.members.length) {
        var c0 = S.getContact(g.members[0]);
        if (c0) gap = c0.settings.gapSec;
      }
    } else {
      var c = S.getContact(cid);
      if (c) gap = c.settings.gapSec;
    }
    S.state.pendingReplies[cid] = { at: Date.now() + gap * 1000 };
    setTyping(cid, true);
  }

  function setTyping(cid, on) {
    var meta = S.convMeta(cid);
    var c = meta.group ? null : S.getContact(cid);
    if (c) c.typing = on;
    Bus.emit('typing', cid);
  }

  /* 对方主动发内容 */
  function sendRandomContent(cid) {
    var meta = S.convMeta(cid);
    var c = meta.group ? null : S.getContact(cid);
    var cobj = c;
    if (meta.group) {
      var g = S.getGroup(cid);
      if (!g || g.settings.muteAll) return;
      var cands = g.members.filter(function (m) { return g.settings.muteMembers.indexOf(m) === -1; });
      if (!cands.length) return;
      cobj = S.getContact(S.pick(cands));
      if (!cobj) return;
    }
    if (!cobj) return;
    var r = Math.random();
    var cards = flatChat(cobj);
    if (r < 0.62) {
      var t = S.pick(cards);
      if (!t) return;
      if (meta.group) S.pushGroupMsg(cid, { from: cobj.id, type: 'text', content: t, read: false });
      else S.pushMsg(cid, { from: 'them', type: 'text', content: t, read: false });
    } else if (r < 0.78 && cobj.stickers.length) {
      var st = S.pick(cobj.stickers);
      if (meta.group) S.pushGroupMsg(cid, { from: cobj.id, type: 'sticker', content: '', meta: { sticker: true, image: st }, read: false });
      else S.pushMsg(cid, { from: 'them', type: 'sticker', content: '', meta: { sticker: true, image: st }, read: false });
    } else if (r < 0.88 && cobj.cards.voice && cobj.cards.voice.length) {
      var v = S.pick(cobj.cards.voice);
      if (meta.group) S.pushGroupMsg(cid, { from: cobj.id, type: 'voice', content: v.name, meta: { src: v.src, dur: 6 + Math.random() * 8, text: v.name }, read: false });
      else S.pushMsg(cid, { from: 'them', type: 'voice', content: v.name, meta: { src: v.src, dur: 6 + Math.random() * 8, text: v.name }, read: false });
    } else {
      var e = S.pick(cobj.cards.emoji);
      if (!e) return;
      if (meta.group) S.pushGroupMsg(cid, { from: cobj.id, type: 'text', content: e, read: false });
      else S.pushMsg(cid, { from: 'them', type: 'text', content: e, read: false });
    }
    try { AudioX.receiveSound(); } catch (e) { }
  }

  /* ---------- 状态 / 头像 ---------- */
  function statusTick(c) {
    var t = S.simNow();
    // 状态仅存在 24h：到期清除后重新计算随机时间（2 天 ~ 1 个月）；无 expiresAt 的旧数据不视为过期
    if (c.status && c.status.text && c.status.expiresAt && Date.now() >= c.status.expiresAt) {
      c.status = { text: '', image: null };
      c.timers.nextStatusAt = t + S.rand(2, 30) * 86400e3;
      Bus.emit('conv', c.id);
      Bus.emit('status', c.id);
      return;
    }
    if (t < c.timers.nextStatusAt) return;
    c.timers.nextStatusAt = t + S.rand(2, 30) * 86400e3;
    if (Math.random() < 0.3) {
      c.status = { text: '', image: null };
    } else {
      var txt = S.pick(c.cards.status || []) || '';
      var img = S.pick(c.stickers || []) || S.pick(userMomentsImages()) || null;
      c.status = { text: txt, image: img, expiresAt: Date.now() + 24 * 3600e3 };
      if (txt) recordCalendar(c.id, txt);
    }
    c.statusChangedAt = Date.now();
    Bus.emit('conv', c.id);
    Bus.emit('status', c.id);
  }

  function avatarTick(c) {
    var t = S.simNow();
    if (t < c.timers.nextAvatarAt) return;
    c.timers.nextAvatarAt = t + S.rand(2, 30) * 86400e3;
    var pool = (c.avatarLib || []).slice();
    (c.stickers || []).forEach(function (s) { pool.push(s); });
    userMomentsImages().forEach(function (im) { pool.push(im); });
    var img = S.pick(pool);
    if (img) { c.avatar = img; Bus.emit('conv', c.id); }
  }

  /* 个性签名：不定期从字卡随机挑 3 个组成（最短 2 天，最长 1 个月） */
  function signatureTick(c) {
    var t = S.simNow();
    if (t < c.timers.nextSigAt) return;
    c.timers.nextSigAt = t + S.rand(2, 30) * 86400e3;
    var cards = flatChat(c);
    var parts = [];
    for (var i = 0; i < 3; i++) { var x = S.pick(cards); if (x && parts.indexOf(x) === -1) parts.push(x); }
    if (parts.length) c.signature = parts.join(' · ');
    Bus.emit('conv', c.id);
  }

  /* 朋友圈背景：用户首次修改后，对方会从表情包/头像库/用户朋友圈图片随机更换（2 天 ~ 1 个月） */
  function momentsBgTick(c) {
    if (!c.momentsBgUserSet) return;
    var t = S.simNow();
    if (t < (c.timers.nextMomentsBgAt || 0)) return;
    c.timers.nextMomentsBgAt = t + S.rand(2, 30) * 86400e3;
    var pool = (c.stickers || []).slice();
    (c.avatarLib || []).forEach(function (a) { pool.push(a); });
    userMomentsImages().forEach(function (im) { pool.push(im); });
    var img = S.pick(pool);
    if (img) { c.momentsBg = img; Bus.emit('conv', c.id); }
  }

  /* ---------- 朋友圈 ---------- */
  function postTick(c) {
    var t = S.simNow();
    if (t < c.timers.nextPostAt) return;
    c.timers.nextPostAt = t + S.rand(6, 72) * 3600e3;
    var cards = flatChat(c);
    var parts = [];
    for (var i = 0; i < 3; i++) { var x = S.pick(cards); if (x && parts.indexOf(x) === -1) parts.push(x); }
    var imgs = [];
    if (Math.random() < 0.45) {
      var pool = (c.stickers || []).slice();
      userMomentsImages().forEach(function (im) { pool.push(im); });
      for (var j = 0; j < Math.min(3, 1 + Math.floor(Math.random() * 2)); j++) {
        var im = S.pick(pool);
        if (im && imgs.indexOf(im) === -1) imgs.push(im);
      }
    }
    S.state.moments.unshift({
      id: S.uid('mo'), author: c.id,
      text: parts.join('，') || S.pick(c.cards.daily || []) || '',
      images: imgs, time: Date.now(),
      likes: [], dislikes: [], comments: []
    });
    Bus.emit('moments');
  }

  function interactUserMoments() {
    var now = Date.now();
    S.state.moments.forEach(function (m) {
      if (m.author !== 'me') return;
      m._reacts = m._reacts || {};
      // 每位联系人只能对每条动态点赞/点踩/评论一次
      var reactedCount = 0, pendingWho = null;
      S.state.contacts.forEach(function (c) {
        if (m._reacts[c.id]) reactedCount++;
        else if (!pendingWho && Math.random() < 0.5) pendingWho = c;
      });
      if (!pendingWho || reactedCount >= S.state.contacts.length) return;
      if (now - m.time < 25e3) return;
      m._reacts[pendingWho.id] = true;
      var r = Math.random();
      if (r < 0.35) {
        m.likes.push({ who: pendingWho.id, time: now });
      } else if (r < 0.5) {
        m.dislikes.push({ who: pendingWho.id, time: now });
      } else {
        var cards = flatChat(pendingWho);
        var t = S.pick(cards) || '赞';
        m.comments.push({ who: pendingWho.id, text: t, time: now });
      }
      Bus.emit('moments');
    });
  }

  function momentCommented(momentId) {
    var m = S.state.moments.find(function (x) { return x.id === momentId; });
    if (!m) return;
    if (m.author !== 'me') {
      // 用户评论了联系人的动态 → 对方回一条字卡
      var c = S.getContact(m.author);
      if (!c) return;
      S.state.pendingComments[S.uid('pc')] = { at: Date.now() + S.rand(5, 22) * 1000, who: c.id, mid: m.id };
    } else {
      // 用户评论了自己的动态 → 之前评论过的联系人各回一条字卡（轮流，不会无限制）
      var seen = {};
      m.comments.forEach(function (cm) {
        if (cm.who === 'me' || seen[cm.who]) return;
        seen[cm.who] = true;
        var c = S.getContact(cm.who);
        if (c) S.state.pendingComments[S.uid('pc')] = { at: Date.now() + S.rand(5, 22) * 1000, who: c.id, mid: m.id };
      });
    }
  }

  /* 回复某条评论：该评论者回一条字卡（有概率不回） */
  function momentCommentedReply(momentId, whoId) {
    var m = S.state.moments.find(function (x) { return x.id === momentId; });
    if (!m) return;
    var c = S.getContact(whoId);
    if (!c) return;
    S.state.pendingComments[S.uid('pc')] = { at: Date.now() + S.rand(5, 22) * 1000, who: c.id, mid: m.id };
  }

  /* ---------- 信箱 ---------- */
  function letterTick(c) {
    var t = S.simNow();
    var st = S.state;
    // 回复用户来信
    st.letters.forEach(function (l) {
      if (l.from === 'me' && l.to === c.id && !l.replied && t >= (l.replyAt || 0)) {
        l.replied = true;
        var cards = flatChat(c);
        var parts = [];
        var n = S.randInt(10, 30);
        for (var i = 0; i < n; i++) { var x = S.pick(cards); if (x && parts.length < 30) parts.push(x); }
        st.letters.unshift({ id: S.uid('l'), from: c.id, to: 'me', content: parts.join('，'), time: Date.now(), read: false, replied: true });
        c.lastLetterAt = t;
        c.timers.nextLetterAt = t + S.rand(1, 30) * 86400e3;
        Bus.emit('letters');
        UI.toast('收到来自 ' + c.name + ' 的回信', 'mail');
      }
    });
    // 主动来信
    if (t >= c.timers.nextLetterAt) {
      c.timers.nextLetterAt = t + S.rand(1, 30) * 86400e3;
      c.lastLetterAt = t;
      var cards2 = flatChat(c);
      var parts2 = [];
      var n2 = S.randInt(10, 30);
      for (var i2 = 0; i2 < n2; i2++) { var x2 = S.pick(cards2); if (x2 && parts2.length < 30) parts2.push(x2); }
      st.letters.unshift({ id: S.uid('l'), from: c.id, to: 'me', content: parts2.join('，'), time: Date.now(), read: false, replied: true });
      Bus.emit('letters');
      UI.toast('收到来自 ' + c.name + ' 的信件', 'mail');
    }
  }

  /* ---------- 红包 ---------- */
  function redPacketTick(c) {
    var t = S.simNow();
    if (t < c.timers.nextRedPacketAt) return;
    c.timers.nextRedPacketAt = t + S.rand(1, 3) * 86400e3;
    var cover = null;
    if (Math.random() < 0.6) cover = S.pick(c.stickers || []) || S.pick(userMomentsImages());
    var note = '';
    if (Math.random() < 0.5) {
      var cards = flatChat(c);
      note = S.pick(cards) || '';
    }
    S.pushMsg(c.id, {
      from: 'them', type: 'redpacket', content: '',
      meta: { amount: S.randInt(1, 88), note: note, cover: cover, status: 'unopened', fromAi: true },
      read: false
    });
    UI.toast(c.name + ' 给你发了一个红包', 'redpacket');
  }

  function packetTick() {
    var st = S.state;
    var now = Date.now();
    function findMsg(cid, msgId) {
      var m = (st.convs[cid] || []).find(function (x) { return x.id === msgId; });
      if (m) return m;
      return (st.groupMsgs[cid] || []).find(function (x) { return x.id === msgId; });
    }
    // 用户发出的红包：对方领取 / 超时退还
    Object.keys(st.pendingPackets).forEach(function (msgId) {
      var p = st.pendingPackets[msgId];
      var m = findMsg(p.cid, msgId);
      if (!m) { delete st.pendingPackets[msgId]; return; }
      if (m.meta.status === 'opened' || m.meta.status === 'refunded') { delete st.pendingPackets[msgId]; return; }
      if (!p.never && now >= p.openAt) {
        m.meta.status = 'opened';
        S.pushMsg(p.cid, { from: 'sys', type: 'sys', content: '对方领取了你的红包' });
        delete st.pendingPackets[msgId];
        Bus.emit('conv', p.cid);
      } else if (p.never && S.simNow() - m.time >= 24 * 3600e3) {
        m.meta.status = 'refunded';
        S.pushMsg(p.cid, { from: 'sys', type: 'sys', content: '红包已退还（对方 24 小时未领取）' });
        delete st.pendingPackets[msgId];
        Bus.emit('conv', p.cid);
      }
    });
    // 对方发出的红包：24h 未拆自动退还
    Object.keys(st.convs).forEach(function (cid) {
      S.conv(cid).forEach(function (m) {
        if (m.type === 'redpacket' && m.meta && m.meta.fromAi && m.meta.status === 'unopened' && S.simNow() - m.time >= 24 * 3600e3) {
          m.meta.status = 'refunded';
          S.pushMsg(cid, { from: 'sys', type: 'sys', content: '红包已退还（24 小时未领取）' });
          Bus.emit('conv', cid);
        }
      });
    });
  }

  /* ---------- 通话 / 戳一戳 / 视奸 ---------- */
  function callTick(c) {
    var t = S.simNow();
    if (t < c.timers.nextCallAt) return;
    c.timers.nextCallAt = t + S.rand(3, 24) * 3600e3;
    var type = Math.random() < 0.5 ? 'video' : 'voice';
    Bus.emit('incoming-call', { cid: c.id, type: type });
  }

  function pokeTick(c) {
    var t = S.simNow();
    if (t < c.timers.nextPokeAt) return;
    c.timers.nextPokeAt = t + S.rand(2, 10) * 3600e3;
    S.pushMsg(c.id, { from: 'sys', type: 'sys', content: c.name + ' 戳了戳你' });
    Bus.emit('poke', c.id);
    Bus.emit('conv', c.id);
  }

  function recommendTick(c) {
    var t = S.simNow();
    if (!S.state.me.allowAvatarRecommend) return;
    if (t < c.timers.nextRecommendAt) return;
    c.timers.nextRecommendAt = t + S.rand(2, 30) * 86400e3;
    var img = S.pick(S.state.me.avatarLib || []);
    if (!img) return;
    S.pushMsg(c.id, {
      from: 'them', type: 'image', content: '',
      meta: { recommend: true, image: img, text: '我推荐你用这张头像，很适合你' },
      read: false
    });
  }

  /* ---------- 打卡 ---------- */
  function checkinTick(c) {
    var t = S.simNow();
    if (t < c.timers.nextCheckinAt) return;
    c.timers.nextCheckinAt = t + S.rand(2, 8) * 3600e3;
    var content = S.pick(c.cards.daily || []) || '打卡';
    S.state.checkins.timeline.unshift({ who: c.id, time: Date.now(), content: content, avatar: c.avatar });
    Bus.emit('checkin');
  }

  function calendarTick() {
    // 我的状态 24h 到期自动消失（无 expiresAt 的旧数据不视为过期）
    var ms = S.state.me.status;
    if (ms && ms.text && ms.expiresAt && Date.now() >= ms.expiresAt) {
      S.state.me.status = { text: '', image: null };
      Bus.emit('status', 'me');
    }
    var k = S.dayKey();
    S.state.contacts.forEach(function (c) {
      if (c.status && c.status.text) recordCalendar(c.id, c.status.text);
    });
    if (S.state.me.status && S.state.me.status.text) recordCalendar('me', S.state.me.status.text);
  }

  /* ---------- 礼物送达 ---------- */
  function giftTick() {
    var t = S.simNow();
    var st = S.state;
    st.shop.gifts.forEach(function (g) {
      if (g.status === 'delivering' && t >= g.deliverAt) {
        g.status = 'delivered';
        var p = st.shop.products.find(function (x) { return x.id === g.productId; });
        var c = S.getContact(g.to);
        if (c && p) {
          S.pushMsg(c.id, { from: 'them', type: 'text', content: '收到了你送的「' + p.name + '」，很喜欢，谢谢你！', read: false });
          st.shop.replies.unshift({ to: c.name, product: p.name, time: Date.now() });
        }
        Bus.emit('shop');
        Bus.emit('conv', g.to);
      }
    });
  }

  /* ---------- 主循环 ---------- */
  var lastAutoSendCheck = 0;
  function tick() {
    var st = S.state;
    var now = Date.now();

    // 回复用户消息
    Object.keys(st.pendingReplies || {}).forEach(function (cid) {
      var p = st.pendingReplies[cid];
      if (now >= p.at) {
        setTyping(cid, false);
        delete st.pendingReplies[cid];
        replyTo(cid);
      }
    });

    // 对方动态评论回复（每条用户评论最多回一条字卡）
    Object.keys(st.pendingComments || {}).forEach(function (key) {
      var p = st.pendingComments[key];
      if (now < p.at) return;
      delete st.pendingComments[key];
      var m = st.moments.find(function (x) { return x.id === p.mid; });
      if (!m) return;
      var c = S.getContact(p.who);
      if (!c) return;
      if (Math.random() < 0.72) {
        var cards = flatChat(c);
        var t = S.pick(cards);
        if (t) {
          // 回复用户的评论：显示「回复 我」
          m.comments.push({ who: c.id, text: t, replyTo: '我', time: Date.now() });
          Bus.emit('moments');
        }
      }
    });

    // 戳一戳回戳
    if (st.pokeBack) {
      Object.keys(st.pokeBack).forEach(function (k) {
        var p = st.pokeBack[k];
        if (now >= p.at) {
          delete st.pokeBack[k];
          var c = S.getContact(p.cid);
          if (c) {
            S.pushMsg(c.id, { from: 'sys', type: 'sys', content: c.name + ' 戳了戳你' });
            Bus.emit('poke', c.id);
            Bus.emit('conv', c.id);
          }
        }
      });
    }

    // 联系人级事件
    st.contacts.forEach(function (c) {
      statusTick(c);
      avatarTick(c);
      signatureTick(c);
      momentsBgTick(c);
      postTick(c);
      letterTick(c);
      redPacketTick(c);
      callTick(c);
      pokeTick(c);
      recommendTick(c);
      checkinTick(c);

      // 自动发送（真实秒间隔）
      if (!c.conv.deleted && (st.convs[c.id] || []).length) {
        if (c.settings.autoSend && now - (c.timers.lastAiMsgAt || 0) > S.rand(50, 130) * 1000) {
          c.timers.lastAiMsgAt = now;
          sendRandomContent(c.id);
        }
      }
    });

    // 群聊自动发言
    st.groups.forEach(function (g) {
      if (!g.conv.deleted && (st.groupMsgs[g.id] || []).length && g.settings.autoSend && !g.settings.muteAll) {
        if (now - (g._lastAiAt || 0) > S.rand(70, 170) * 1000) {
          g._lastAiAt = now;
          sendRandomContent(g.id);
        }
      }
    });

    packetTick();
    interactUserMoments();
    calendarTick();
    giftTick();
  }

  function start() {
    setInterval(tick, 1000);
  }

  window.AI = {
    start: start, tick: tick, onUserMsg: onUserMsg,
    flatChat: flatChat, userMomentsImages: userMomentsImages,
    momentCommented: momentCommented, momentCommentedReply: momentCommentedReply,
    setTyping: setTyping
  };
})();
