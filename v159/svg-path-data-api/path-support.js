// Shared helpers for the SVG Path Data API concept pages.
//
// 1. probe(): an honest, per-method behavioural probe of the NATIVE surface
//    (SVGPathElement.prototype.getPathData / setPathData /
//    getPathSegmentAtLength). Each entry can genuinely come back false:
//    the method must exist AND produce the spec-shaped result on a known path.
// 2. fallbackParse()/fallbackSerialize(): a small, clearly-labelled JS
//    d-string parser used ONLY when the native method is missing. Pages must
//    label any output it produces as "fallback", never as native.
//
// Exposed as globalThis.SvgPathDemo (namespaced to avoid host-global collisions).
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function scratchPath(d) {
    const p = document.createElementNS(NS, 'path');
    if (d != null) p.setAttribute('d', d);
    return p;
  }

  function probe() {
    const proto = globalThis.SVGPathElement && SVGPathElement.prototype;
    const out = {
      getPathData: { exists: false, works: false, detail: '' },
      setPathData: { exists: false, works: false, detail: '' },
      getPathSegmentAtLength: { exists: false, works: false, detail: '' },
    };
    if (!proto) {
      for (const k of Object.keys(out)) out[k].detail = 'SVGPathElement missing';
      return out;
    }
    // getPathData: must return [{type:'M',values:[0,0]},{type:'L',values:[10,10]}]
    out.getPathData.exists = typeof proto.getPathData === 'function';
    if (out.getPathData.exists) {
      try {
        const r = scratchPath('M0 0 L10 10').getPathData();
        out.getPathData.works = Array.isArray(r) && r.length === 2 && r[0].type === 'M' &&
          r[1].type === 'L' && r[1].values[0] === 10 && r[1].values[1] === 10;
        out.getPathData.detail = JSON.stringify(r);
      } catch (e) {
        out.getPathData.detail = `${e.name}: ${e.message}`;
      }
    } else out.getPathData.detail = 'typeof getPathData = ' + typeof proto.getPathData;

    // setPathData: must write the d attribute from plain {type, values} objects.
    out.setPathData.exists = typeof proto.setPathData === 'function';
    if (out.setPathData.exists) {
      try {
        const p = scratchPath(null);
        p.setPathData([{ type: 'M', values: [1, 2] }, { type: 'L', values: [3, 4] }]);
        const d = p.getAttribute('d') || '';
        out.setPathData.works = /^M\s*1[\s,]+2\s*L\s*3[\s,]+4$/.test(d.trim());
        out.setPathData.detail = 'd after setPathData = ' + JSON.stringify(d);
      } catch (e) {
        out.setPathData.detail = `${e.name}: ${e.message}`;
      }
    } else out.setPathData.detail = 'typeof setPathData = ' + typeof proto.setPathData;

    // getPathSegmentAtLength: on M0 0 L10 0 L10 10, distance 15 is inside the 2nd L.
    out.getPathSegmentAtLength.exists = typeof proto.getPathSegmentAtLength === 'function';
    if (out.getPathSegmentAtLength.exists) {
      try {
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        const p = scratchPath('M0 0 L10 0 L10 10');
        svg.append(p);
        document.body.append(svg);
        const r = p.getPathSegmentAtLength(15);
        svg.remove();
        out.getPathSegmentAtLength.works = !!r && r.type === 'L' && r.values[0] === 10 && r.values[1] === 10;
        out.getPathSegmentAtLength.detail = JSON.stringify(r);
      } catch (e) {
        out.getPathSegmentAtLength.detail = `${e.name}: ${e.message}`;
      }
    } else out.getPathSegmentAtLength.detail = 'typeof getPathSegmentAtLength = ' + typeof proto.getPathSegmentAtLength;
    return out;
  }

  // ---- labelled JS fallback (NOT the platform API) ----
  const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

  function fallbackParse(d) {
    const segs = [];
    const s = String(d || '');
    let i = 0;
    const isWs = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === ',';
    const skip = () => { while (i < s.length && isWs(s[i])) i++; };
    const numRe = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
    const readNum = () => { skip(); numRe.lastIndex = i; const m = numRe.exec(s); if (!m) return null; i = numRe.lastIndex; return Number(m[0]); };
    const readFlag = () => { skip(); const c = s[i]; if (c === '0' || c === '1') { i++; return Number(c); } return null; };
    let cmd = null;
    skip();
    while (i < s.length) {
      skip();
      if (i >= s.length) break;
      const c = s[i];
      if (/[MLHVCSQTAZmlhvcsqtaz]/.test(c)) { cmd = c; i++; } else if (cmd === null || /[Zz]/.test(cmd)) break;
      if (segs.length === 0 && !/[Mm]/.test(cmd)) break; // must begin with moveto
      const n = ARGS[cmd.toUpperCase()];
      if (n === 0) { segs.push({ type: cmd, values: [] }); continue; }
      const values = [];
      for (let k = 0; k < n; k++) {
        const v = (cmd.toUpperCase() === 'A' && (k === 3 || k === 4)) ? readFlag() : readNum();
        if (v === null) return segs; // error: render/return the valid prefix
        values.push(v);
      }
      segs.push({ type: cmd, values });
      if (cmd === 'M') cmd = 'L'; else if (cmd === 'm') cmd = 'l'; // implicit lineto after moveto
    }
    return segs;
  }

  function fmt(n) {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
  }

  function fallbackSerialize(segs) {
    return segs.map((sg) => sg.values.length ? `${sg.type} ${sg.values.map(fmt).join(' ')}` : sg.type).join(' ');
  }

  // Read segments from an element: native when available, otherwise the labelled fallback.
  function read(el, caps, normalize) {
    if (caps.getPathData.works) {
      return { source: 'native', segs: normalize ? el.getPathData({ normalize: true }) : el.getPathData() };
    }
    if (normalize) return { source: 'unavailable', segs: [] };
    return { source: 'fallback', segs: fallbackParse(el.getAttribute('d')) };
  }

  function write(el, caps, segs) {
    if (caps.setPathData.works) { el.setPathData(segs); return 'native'; }
    const d = fallbackSerialize(segs);
    if (d) el.setAttribute('d', d); else el.removeAttribute('d');
    return 'fallback';
  }

  // Render the per-method status list into a <ul>.
  function renderStatus(ul, caps) {
    ul.textContent = '';
    for (const [name, r] of Object.entries(caps)) {
      const li = document.createElement('li');
      const b = document.createElement('span');
      b.className = 'state ' + (r.works ? 'yes' : 'no');
      b.textContent = r.works ? 'native · works' : (r.exists ? 'present · wrong result' : 'not available');
      const code = document.createElement('code');
      code.textContent = name + '()';
      const det = document.createElement('span');
      det.className = 'detail';
      det.textContent = r.detail;
      li.append(code, ' ', b, ' ', det);
      ul.append(li);
    }
  }

  globalThis.SvgPathDemo = { probe, fallbackParse, fallbackSerialize, read, write, renderStatus, fmt, scratchPath, NS };
})();
