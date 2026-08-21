/* ============================================================
   字卡 · 玻璃信使 — 数据层（种子数据 + localStorage 持久化）
   ============================================================ */
(function () {
  var KEY = 'zika_glass_v2';
  var SIM_SPEED = 1;            // 真实时间：1 真实秒 = 1 真实秒（网站用于实际使用，不做演示加速）
  var state = null;

  function uid(p) { return (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function simNow() { return state.simBase + (Date.now() - state.simStart) * SIM_SPEED; }
  function dayKey(ms) { var d = new Date(ms || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function genAvatar(label, hue) {
    if (hue == null) hue = randInt(0, 360);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ',72%,72%)"/>' +
      '<stop offset="1" stop-color="hsl(' + ((hue + 42) % 360) + ',72%,54%)"/>' +
      '</linearGradient></defs>' +
      '<rect width="200" height="200" fill="url(#g)"/>' +
      '<circle cx="100" cy="76" r="38" fill="rgba(255,255,255,.88)"/>' +
      '<path d="M42 192c5-50 32-74 58-74s53 24 58 74z" fill="rgba(255,255,255,.88)"/>' +
      '<text x="100" y="120" font-size="44" text-anchor="middle" fill="hsl(' + hue + ',46%,36%)" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-weight="600">' + label + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function genSticker(text, hue) {
    if (hue == null) hue = randInt(0, 360);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="hsl(' + hue + ',78%,78%)"/>' +
      '<stop offset="1" stop-color="hsl(' + ((hue + 40) % 360) + ',70%,60%)"/>' +
      '</linearGradient></defs>' +
      '<rect width="240" height="240" rx="46" fill="url(#g)"/>' +
      '<circle cx="92" cy="100" r="14" fill="rgba(255,255,255,.9)"/><circle cx="148" cy="100" r="14" fill="rgba(255,255,255,.9)"/>' +
      '<path d="M88 138c14 20 50 20 64 0" stroke="rgba(255,255,255,.9)" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<text x="120" y="202" font-size="34" text-anchor="middle" fill="rgba(255,255,255,.96)" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-weight="600">' + text + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* ---------- 联系人种子 ---------- */
  function contactSeed(id, name, account, sig, hue, cards) {
    return {
      id: id, name: name, account: account, signature: sig,
      avatar: genAvatar(name.charAt(0), hue),
      status: { text: '', image: null }, statusChangedAt: 0,
      avatarLib: [genAvatar(name.charAt(0), (hue + 90) % 360), genAvatar(name.charAt(0), (hue + 180) % 360)],
      stickers: [],
      cards: cards,
      posts: [], conv: { pinned: false, muted: false, deleted: false },
      settings: { autoSend: true, replyCount: 2, gapSec: 8, merge: false, chatBg: null, videoBg: null, callBg: null },
      timers: { nextStatusAt: 0, nextAvatarAt: 0, nextPostAt: 0, nextCheckinAt: 0, nextLetterAt: 0, nextRedPacketAt: 0, nextRecommendAt: 0, nextCallAt: 0, nextPokeAt: 0, lastAiMsgAt: 0, nextSigAt: 0, nextMomentsBgAt: 0 },
      momentsBg: null, momentsBgUserSet: false,
      lastLetterAt: 0, created: Date.now()
    };
  }

  /* ---------- 初始状态（实际使用：无演示人物，从空开始） ---------- */
  function seed() {
    var me = {
      id: 'me', name: '我', account: 'link_0001', signature: '把日子过成诗',
      avatar: genAvatar('L', 232),
      status: { text: '', image: null },
      momentsBg: null,
      stickers: [],                                    // 我自己的全局表情包（聊天弹窗内添加）
      avatarLib: [genAvatar('L', 210), genAvatar('L', 120)],
      allowAvatarRecommend: false,
      theme: { font: '#3F3A36', page: '#DDD8CE', ui: '#9AA7B5' }
    };
    return {
      me: me,
      contacts: [],
      groups: [],
      convs: {},
      groupMsgs: {},
      moments: [],
      letters: [],
      music: [],
      musicState: { idx: 0, playing: false, mode: 'list', colisten: null, float: false },
      checkins: { calendar: {}, timeline: [] },
      shop: { products: [], gifts: [], replies: [] },
      draftLetter: null,
      simBase: Date.now(), simStart: Date.now(),
      pendingReplies: {},      // cid -> {at(real ms)}
      pendingPackets: {},      // 用户红包 -> {cid, msgId, openAt, never:bool}
      pendingComments: {},     // 联系人动态被评论 -> 延迟回复
      pokeBack: {}             // cid -> {at, cid} 对方回戳
    };
  }

  /* ---------- 存取 ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (!state.contacts) throw new Error('bad');
        heal();
        return;
      }
    } catch (e) { /* 损坏则重建 */ }
    state = seed();
    save();
  }

  /* 自愈：无状态的联系人尽快安排首个状态（避免旧数据时间戳失效导致长时间看不到状态） */
  function heal() {
    var now = Date.now();
    (state.contacts || []).forEach(function (c) {
      if (!c.timers) c.timers = {};
      if (!c.cards) c.cards = {};
      if (!c.status || !c.status.text) {
        c.timers.nextStatusAt = now + rand(20, 90) * 1000;
      }
    });
    if (!state.me.status || !state.me.status.text) {
      state.me.status = { text: '', image: null };
    }
    saveDebounced();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 容量超限忽略 */ }
  }
  var _t = null;
  function saveDebounced() { clearTimeout(_t); _t = setTimeout(save, 250); }
  function reset() { localStorage.removeItem(KEY); state = seed(); save(); }

  function getContact(id) { return state.contacts.find(function (c) { return c.id === id; }); }
  function getGroup(id) { return state.groups.find(function (g) { return g.id === id; }); }
  function conv(id) { if (!state.convs[id]) state.convs[id] = []; return state.convs[id]; }
  function groupMsgs(id) { if (!state.groupMsgs[id]) state.groupMsgs[id] = []; return state.groupMsgs[id]; }

  function convMeta(cid) {
    if (state.groups.some(function (g) { return g.id === cid; })) return { group: true };
    var c = getContact(cid);
    return { group: false, contact: c };
  }

  function pushMsg(cid, msg) {
    msg.id = msg.id || uid('m');
    msg.time = msg.time || Date.now();
    msg.read = msg.read !== false;
    var arr = conv(cid);
    arr.push(msg);
    var meta = convMeta(cid);
    if (meta.group) {
      var g = getGroup(cid);
      if (g) { g.conv.deleted = false; g.conv.lastAt = msg.time; }
    } else {
      var c = getContact(cid);
      if (c) { c.conv.deleted = false; c.conv.lastAt = msg.time; }
    }
    saveDebounced();
    Bus.emit('conv', cid);
    return msg;
  }

  function pushGroupMsg(gid, msg) {
    msg.id = msg.id || uid('m');
    msg.time = msg.time || Date.now();
    var arr = groupMsgs(gid);
    arr.push(msg);
    var g = getGroup(gid);
    if (g) { g.conv.deleted = false; g.conv.lastAt = msg.time; }
    saveDebounced();
    Bus.emit('conv', gid);
    return msg;
  }

  function unread(cid) {
    var arr = state.convs[cid] || [];
    var n = 0;
    arr.forEach(function (m) { if (m.from !== 'me' && m.from !== 'sys' && !m.read) n++; });
    return n;
  }
  function groupUnread(gid) {
    var arr = state.groupMsgs[gid] || [];
    var n = 0;
    arr.forEach(function (m) { if (m.from !== 'me' && m.from !== 'sys' && !m.read) n++; });
    return n;
  }
  function markRead(cid) {
    (state.convs[cid] || []).forEach(function (m) { if (m.from !== 'me') m.read = true; });
    (state.groupMsgs[cid] || []).forEach(function (m) { if (m.from !== 'me') m.read = true; });
    saveDebounced();
    Bus.emit('conv', cid);
  }

  /* 会话列表（联系人 + 群） */
  function convList() {
    var list = [];
    state.contacts.forEach(function (c) {
      var arr = state.convs[c.id] || [];
      if (!c.conv.deleted && arr.length) list.push({ kind: 'c', id: c.id, lastAt: c.conv.lastAt || arr[arr.length - 1].time, pinned: c.conv.pinned, muted: c.conv.muted });
    });
    state.groups.forEach(function (g) {
      var arr = state.groupMsgs[g.id] || [];
      if (!g.conv.deleted && arr.length) list.push({ kind: 'g', id: g.id, lastAt: g.conv.lastAt || arr[arr.length - 1].time, pinned: g.conv.pinned, muted: g.conv.muted });
    });
    list.sort(function (a, b) { return (b.pinned - a.pinned) || (b.lastAt - a.lastAt); });
    return list;
  }

  function msgPreview(m) {
    if (!m) return '';
    switch (m.type) {
      case 'text': return m.content;
      case 'image': return m.meta && m.meta.sticker ? '[表情]' : '[图片]';
      case 'sticker': return '[表情]';
      case 'redpacket': return '[红包]' + (m.meta && m.meta.note ? '：' + m.meta.note : '');
      case 'voice': return '[语音]' + (m.meta && m.meta.text ? '：' + m.meta.text : '');
      case 'sys': return m.content;
      default: return '[消息]';
    }
  }

  /* 会话名称/头像 */
  function convInfo(cid) {
    var g = getGroup(cid);
    if (g) return { name: g.name, avatar: g.avatar, group: true, obj: g };
    var c = getContact(cid);
    return { name: c ? c.name : '未知', avatar: c ? c.avatar : '', group: false, obj: c };
  }

  window.Store = {
    get state() { return state; },
    load: load, save: save, saveDebounced: saveDebounced, reset: reset, heal: heal,
    uid: uid, rand: rand, randInt: randInt, pick: pick, clamp: clamp, esc: esc,
    simNow: simNow, dayKey: dayKey, SIM_SPEED: SIM_SPEED,
    getContact: getContact, getGroup: getGroup,
    conv: conv, groupMsgs: groupMsgs, convMeta: convMeta,
    pushMsg: pushMsg, pushGroupMsg: pushGroupMsg,
    unread: unread, groupUnread: groupUnread, markRead: markRead,
    convList: convList, msgPreview: msgPreview, convInfo: convInfo,
    genAvatar: genAvatar, genSticker: genSticker
  };
})();

/* 极简事件总线 */
var Bus = (function () {
  var m = {};
  return {
    on: function (ev, fn) { (m[ev] = m[ev] || []).push(fn); },
    emit: function (ev, data) { (m[ev] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { } }); }
  };
})();
