/* ============================================================
   字卡 · 玻璃信使 — 纯 SVG 线性图标库（全站禁用 emoji）
   ============================================================ */
(function () {
  var P = {
    chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
    persons: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.5 14.6c2.6.4 4.5 2.4 4.5 5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    me: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="2.6"/><path d="M6.5 18.5c1-2.4 3-3.5 5.5-3.5s4.5 1.1 5.5 3.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
    morev: '<path d="M12 5h.01M12 12h.01M12 19h.01"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M20.5 15l-5-5L5 20"/>',
    camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.2"/>',
    sticker: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 14c1.2 1.6 2.6 2.4 4 2.4s2.8-.8 4-2.4"/><path d="M8.5 9.5h.01M15.5 9.5h.01"/>',
    redpacket: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M3.5 10h17"/><path d="M12 10l-3.5-3.5M12 10l3.5-3.5"/>',
    video: '<rect x="2.5" y="6" width="13" height="12" rx="3"/><path d="M15.5 10.5l6-3v9l-6-3"/>',
    call: '<path d="M5 4h4l1.5 4.5-2.5 2a13 13 0 0 0 5.5 5.5l2-2.5L20 15v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    hangup: '<path d="M5 4h4l1.5 4.5-2.5 2a13 13 0 0 0 5.5 5.5l2-2.5L20 15v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/><path d="M3 21L21 3"/>',
    poke: '<path d="M11 12V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 11.5V6.8a1.5 1.5 0 0 1 3 0V12"/><path d="M17 12V9.3a1.5 1.5 0 0 1 3 0V15c0 3.4-2.7 6-6.2 6H13a6 6 0 0 1-4.9-2.6L5 15.1c-1-1.4.4-3.4 2-2.4l2 1.4V8.5a1.5 1.5 0 0 1 3 0v1"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
    dice: '<rect x="4.5" y="4.5" width="15" height="15" rx="3.5"/><path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    pin: '<path d="M12 3a6 6 0 0 0-6 6c0 4 6 11 6 11s6-7 6-11a6 6 0 0 0-6-6z"/><circle cx="12" cy="9" r="2"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 5M21 9l-5 5"/>',
    speaker: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/>',
    reply: '<path d="M9 14l-5-4 5-4"/><path d="M4 10h9a6 6 0 0 1 6 6v2"/>',
    star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/>',
    like: '<path d="M4 11h3v8H4z"/><path d="M7 11l3.5-6.5A2 2 0 0 1 13 6.4V9h4.8A2 2 0 0 1 19.7 11.3L18.3 17.5A2 2 0 0 1 16.4 19H7z"/>',
    dislike: '<path d="M20 11h-3V3h3v8z"/><path d="M17 11l-3.5 6.5A2 2 0 0 1 11 15.6V13H6.2A2 2 0 0 1 4.3 10.7l1.4-6.2A2 2 0 0 1 7.6 3H17v8z"/>',
    comment: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3.5A8 8 0 1 1 21 12z"/><path d="M9 12h.01M12.5 12h.01M16 12h.01"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="2.4"/>',
    prev: '<path d="M7 5v14"/><path d="M18 6.5v11L9 12z" fill="currentColor" stroke="none"/>',
    next: '<path d="M17 5v14"/><path d="M6 6.5v11l9-5.5z" fill="currentColor" stroke="none"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h16"/><path d="M9 6h.01M9 12h.01M9 18h.01"/>',
    gear: '<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2.2" fill="var(--c-page)"/><circle cx="15" cy="12" r="2.2" fill="var(--c-page)"/><circle cx="7" cy="17" r="2.2" fill="var(--c-page)"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14 6l3 3"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s-.5-2 .5-2.5c1.5-.7 3.5.3 4.5-.7 1.3-1.3-.5-3 .5-4.5 1.2-1.9-.2-3.8-2-4.6-.8-.4-3.5-.5-5-.5z"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="7.5" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/>',
    bag: '<path d="M6 8h12l1.2 12H4.8L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M2.5 9h19v3h-19z"/><path d="M12 9v11M12 9c-3 0-5-1.5-5-3.5S9 3 11 5l1 1 1-1c2-2 4 0 4 2s-2 2.5-5 2.5z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    chevronR: '<path d="M9 6l6 6-6 6"/>',
    chevronD: '<path d="M6 9l6 6 6-6"/>',
    download: '<path d="M12 4v11M7.5 11L12 15.5 16.5 11"/><path d="M4 19h16"/>',
    upload: '<path d="M12 15V4M7.5 8L12 3.5 16.5 8"/><path d="M4 19h16"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    wave: '<path d="M4 13h3l2-5 4 10 2-5h5"/>',
    send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 15h2"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9.5a4 4 0 0 1 0 5"/>',
    dot: '<circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>',
    record: '<circle cx="12" cy="12" r="7"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="5.5" r="2.5"/><circle cx="17" cy="18.5" r="2.5"/><path d="M8.3 10.8l6.4-3.8M8.3 13.2l6.4 3.8"/>',
    float: '<rect x="4" y="4" width="16" height="16" rx="3"/><rect x="9" y="9" width="9" height="9" rx="2" fill="var(--c-page)"/>'
  };
  function Icon(name, size, cls, sw) {
    size = size || 22;
    cls = cls || '';
    sw = sw || 1.8;
    return '<svg class="ic ' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || P.dot) + '</svg>';
  }
  window.Icon = Icon;
  window.ICONS = P;
})();
