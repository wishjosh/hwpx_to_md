import JSZip from 'jszip';

// 장·절 카운터 상태 및 메타데이터 컨텍스트
export let _titleCtx = {
  chapterNum: 0,
  sectionCounter: 0,
  figureCounter: 0,
  chapterEmitted: false,
  reportTitleEmitted: false,
  inPolicySummary: false,
  usedCaptions: new Set(),
  pendingChapterNum: null,
  summaryEmitted: false,
  keywordsEmitted: false,
  coverDate: '',
  coverAuthor: '',
  coverIssue: '',
  dateEmitted: false,
  authorEmitted: false,
  issueEmitted: false,
  combinedReportTitle: '',
  coverSubtitleEn: '',
  coverKeywords: ''
};

// ===================================================================
//  기본 설정 및 상수 정의
// ===================================================================
const HANGUL_CHARS = '가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허';
const CIRCLED_CHARS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

const BULLET_FAMILIES = [
  { name: 'nemo',   chars: '□■￭▪◼▣', priority: 0 },
  { name: 'circle', chars: '◯○◦●◎⊙', priority: 1 },
  { name: 'hyphen', chars: '-–—ー',    priority: 2 },
  { name: 'dot',    chars: '․·•‧∙',    priority: 3 },
];

const MAX_NUMBER_HEADING_DEPTH = 3;

// ===== 기본연구 모드 스타일 규칙 =====
const GIBON_STYLE_RULES = {
  '보고서제목':      { kind: 'heading', level: 1, onceOnly: true },
  '큰제목':          { kind: 'heading', level: 1 },
  '간지-장제목':     { kind: 'heading', level: 1 },
  '헤드제목':        { kind: 'heading', level: 2 },
  '절':             { kind: 'heading', level: 2 },
  '1':              { kind: 'heading', level: 3, withNumber: true },
  '1)':             { kind: 'heading', level: 4, withNumber: true },
  '(1)':            { kind: 'heading', level: 5, withNumber: true },
  '바탕글':         { kind: 'body' },
  '본문':          { kind: 'body' },
  '동글':          { kind: 'bullet', famIdx: 0 },
  '선':            { kind: 'bullet', famIdx: 1 },
  '점':            { kind: 'bullet', famIdx: 2 },
  '본문 네모':      { kind: 'bullet', famIdx: 0, char: '■' },
  '본문 동그라미':   { kind: 'bullet', famIdx: 1, char: '◯' },
  '하이픈(-)':      { kind: 'bullet', famIdx: 1, char: '-' },
  '동그라미':       { kind: 'bullet', famIdx: 0, char: '◯' },
  '각주':          { kind: 'footnote' },
  '참고문헌':       { kind: 'reference' },
  '참고문헌볼드':    { kind: 'reference' },
  '참고문헌이탤릭':   { kind: 'reference' },
  '표제목':         { kind: 'caption', type: 'table' },
  '그림제목':       { kind: 'caption', type: 'figure' },
  '표제목-요약':     { kind: 'caption', type: 'table' },
  '표 제목':        { kind: 'caption', type: 'table' },
  '표_제목':        { kind: 'caption', type: 'table' },
  '표머리':         { kind: 'skip' },
  '표_머리':        { kind: 'skip' },
  '표내용_가운데':   { kind: 'skip' },
  '표내용_점':      { kind: 'skip' },
  '표내용_우측':     { kind: 'skip' },
  '표단위':         { kind: 'skip' },
  '표볼드':         { kind: 'skip' },
  '표 내용':        { kind: 'skip' },
  '표,그림_내용':    { kind: 'skip' },
  '보고서번호':     { kind: 'meta', field: 'reportNo' },
  '보고서제목-영문': { kind: 'meta', field: 'titleEn' },
  '저자명':         { kind: 'meta', field: 'author' },
  '판권제목':       { kind: 'skip' },
  '판권제목-영문':   { kind: 'skip' },
  '판권저자':       { kind: 'skip' },
  '쪽번호짝':       { kind: 'skip' },
  '쪽번호홀':       { kind: 'skip' },
  '짝수하시라':     { kind: 'skip' },
  '홀수하시라':     { kind: 'skip' },
  '하시라장번호':    { kind: 'skip' },
  '간지-장':        { kind: 'skip' },
  '간지-소제목':     { kind: 'skip' },
  '간지-소제목볼드':  { kind: 'skip' },
  '목차-장':        { kind: 'skip' },
  '목차-절':        { kind: 'skip' },
  '목차-1':         { kind: 'skip' },
  '목차-표그림':     { kind: 'skip' },
};

// ===== 정책·수시연구 모드 스타일 규칙 =====
const JEONGCHAEK_STYLE_RULES = {
  '보고서_국문_제목': { kind: 'heading', level: 1, onceOnly: true },
  '보고서_영문_제목': { kind: 'subtitle' },
  '키워드':          { kind: 'keywords' },
  '[번호]번호':      { kind: 'chapterNumber' },
  '[번호]제목':      { kind: 'heading', level: 2, pairChapterNumber: true },
  '[타이틀]소제목':   { kind: 'heading', level: 3 },
  '요약_네모':       { kind: 'heading', level: 3, inSummary: true },
  '요약_동그라미':    { kind: 'bullet', famIdx: 0, char: '-', inSummary: true },
  '[본문]네모':      { kind: 'bullet', famIdx: 0, char: '■' },
  '[본문]동그라미':   { kind: 'bullet', famIdx: 1, char: '◯' },
  '[본문]-':         { kind: 'bullet', famIdx: 2, char: '-' },
  '표_그림_제목':    { kind: 'caption', type: 'auto' },
  '표_제목':         { kind: 'caption', type: 'table' },
  '표_단위':         { kind: 'caption', type: 'unit' },
  '표머리':         { kind: 'skip' },
  '표내용_가운데':   { kind: 'skip' },
  '표내용_좌측':     { kind: 'skip' },
  '표내용_우측':     { kind: 'skip' },
  '각주 및 주석':    { kind: 'footnote' },
  '마지막페이지_이름':    { kind: 'body' },
  '마지막페이지_소속':    { kind: 'heading', level: 2 },
  '마지막페이지_역할':    { kind: 'body' },
  '마지막페이지_국문제목': { kind: 'skip' },
  '마지막페이지_영문제목': { kind: 'skip' },
  '바탕글':         { kind: 'body' },
  '짝수_하시라':     { kind: 'skip' },
  '홀수_하시라':     { kind: 'skip' },
  '쪽번호짝':        { kind: 'skip' },
  '쪽번호홀':        { kind: 'skip' },
};

// ===== 정책브리프(brief) 모드 스타일 규칙 =====
const BRIEF_STYLE_RULES = {
  '제목':          { kind: 'heading', level: 1, onceOnly: true },
  '날짜':          { kind: 'coverMeta', field: 'date' },
  '저자명':        { kind: 'coverMeta', field: 'author' },
  '판권호수글자':   { kind: 'coverMeta', field: 'issue' },
  '큰제목로마':    { kind: 'heading', level: 2 },
  '큰제목':        { kind: 'heading', level: 2 },
  '소제목':        { kind: 'heading', level: 3 },
  '동글':          { kind: 'bullet', famIdx: 0 },
  '-':            { kind: 'bullet', famIdx: 1 },
  '점':           { kind: 'bullet', famIdx: 2 },
  '표제목':        { kind: 'caption', type: 'table' },
  '그림제목':      { kind: 'caption', type: 'figure' },
  '바탕글':        { kind: 'body' },
  '각주':          { kind: 'body' },
  '참고문헌내용':   { kind: 'body' },
  '판권정보':      { kind: 'skip' },
  '판권날짜':      { kind: 'skip' },
  '짝수하시라':    { kind: 'skip' },
  '홀수하시라':    { kind: 'skip' },
  '쪽번호':        { kind: 'skip' },
  '표머리':        { kind: 'skip' },
};

// ===================================================================
//  HWPX 헬퍼 함수들
// ===================================================================

export function convertToJpg(uint8arr, mimeType) {
  return new Promise((resolve) => {
    const blob = new Blob([uint8arr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((jpgBlob) => { URL.revokeObjectURL(url); resolve(jpgBlob); }, 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(new Blob([uint8arr])); };
    img.src = url;
  });
}

export function sanitizeFilename(text) {
  return text.replace(/^[<\[]\s*/, '').replace(/\s*[>\]]\s*/, '_')
    .replace(/[\\/:*?"<>|\[\]]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_')
    .substring(0, 80).replace(/^_|_$/g, '');
}

export function getMimeType(ext) {
  const map = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff' };
  return map[ext] || 'image/png';
}

function normalizeBulletChar(ch) {
  if (!ch || ch.length === 0) return '■';
  const code = ch.charCodeAt(0);
  if (code >= 0xE000 && code <= 0xF8FF) return '■';
  return ch;
}

function formatNumberByFormat(num, format) {
  const n = parseInt(num);
  if (isNaN(n) || n < 1) return String(num);
  if (format === 'HANGUL_SYLLABLE') {
    return HANGUL_CHARS[n - 1] || String(n);
  }
  if (format === 'CIRCLED_DIGIT') {
    return CIRCLED_CHARS[n - 1] || String(n);
  }
  return String(n);
}

function getCharFamily(ch) {
  for (const fam of BULLET_FAMILIES) {
    if (fam.chars.includes(ch)) return fam;
  }
  return null;
}

async function buildBulletLevelMap(zip, sectionFiles, paraStyles) {
  const usedFamilies = new Set();
  const unknownChars = [];

  for (const path of sectionFiles) {
    const xml = await zip.file(path).async('text');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const elems = doc.getElementsByTagName('*');

    for (let i = 0; i < elems.length; i++) {
      if (localTag(elems[i]) !== 'p') continue;
      const p = elems[i];
      if (isInsideTag(p, 'tc') || isInsideTag(p, 'fn') ||
          isInsideTag(p, 'endnote') || isInsideTag(p, 'footNote') ||
          isInsideTag(p, 'endNote')) continue;

      const info = resolveParaInfo(
        p.getAttribute('paraPrIDRef'),
        p.getAttribute('styleIDRef'),
        paraStyles
      );
      if (!info || info.type !== 'BULLET') continue;

      const ch = paraStyles.bullets[info.idRef];
      if (!ch) continue;

      const fam = getCharFamily(ch);
      if (fam) {
        usedFamilies.add(fam.name);
      } else {
        const key = `unk:${ch}`;
        if (!unknownChars.includes(key)) unknownChars.push(key);
      }
    }
  }

  const familyOrder = BULLET_FAMILIES
    .filter(f => usedFamilies.has(f.name))
    .sort((a, b) => a.priority - b.priority)
    .map(f => f.name);
  familyOrder.push(...unknownChars);

  const levelMap = {};
  for (const [id, ch] of Object.entries(paraStyles.bullets)) {
    const fam = getCharFamily(ch);
    const famKey = fam ? fam.name : `unk:${ch}`;
    const idx = familyOrder.indexOf(famKey);
    levelMap[id] = idx >= 0 ? idx : familyOrder.length;
  }

  return levelMap;
}

function computeNumberHeadingOffset(paraPrMap) {
  let minLevel = Infinity;
  for (const info of Object.values(paraPrMap)) {
    if (info.type === 'NUMBER' && info.level < minLevel) {
      minLevel = info.level;
    }
  }
  return minLevel === Infinity ? 0 : minLevel;
}

async function parseHwpxStyles(zip) {
  const result = {
    numberings: {},
    bullets: {},
    paraPrMap: {},
    styles: {},
    bulletLevelMap: {},
    numberHeadingOffset: 0,
  };

  const headerPath = Object.keys(zip.files).find(f =>
    f.toLowerCase().includes('contents/') && f.toLowerCase().endsWith('header.xml')
  );
  if (!headerPath) return result;

  const xmlText = await zip.file(headerPath).async('text');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const allElems = doc.getElementsByTagName('*');

  for (let i = 0; i < allElems.length; i++) {
    if (localTag(allElems[i]) !== 'numbering') continue;
    const id = allElems[i].getAttribute('id');
    if (id == null) continue;

    result.numberings[id] = {};
    for (let c = 0; c < allElems[i].childNodes.length; c++) {
      const child = allElems[i].childNodes[c];
      if (child.nodeType !== 1 || localTag(child) !== 'paraHead') continue;
      const level = parseInt(child.getAttribute('level'));
      if (!isNaN(level)) {
        result.numberings[id][level] = {
          text: child.textContent || '',
          format: (child.getAttribute('numFormat') || 'DIGIT').toUpperCase(),
        };
      }
    }
  }

  for (let i = 0; i < allElems.length; i++) {
    if (localTag(allElems[i]) !== 'bullet') continue;
    const id = allElems[i].getAttribute('id');
    const ch = allElems[i].getAttribute('char');
    if (id != null && ch) result.bullets[id] = normalizeBulletChar(ch);
  }

  for (let i = 0; i < allElems.length; i++) {
    const tag = localTag(allElems[i]);
    if (tag !== 'paraPr' && tag !== 'paraShape') continue;
    const id = allElems[i].getAttribute('id');
    if (id == null) continue;

    for (let c = 0; c < allElems[i].childNodes.length; c++) {
      const child = allElems[i].childNodes[c];
      if (child.nodeType !== 1 || localTag(child) !== 'heading') continue;

      const type = (child.getAttribute('type') || 'NONE').toUpperCase();
      if (type === 'NONE') continue;

      result.paraPrMap[id] = {
        type,
        idRef: child.getAttribute('idRef') || '0',
        level: parseInt(child.getAttribute('level')) || 0,
      };
    }
  }

  for (let i = 0; i < allElems.length; i++) {
    if (localTag(allElems[i]) !== 'style') continue;
    const id = allElems[i].getAttribute('id');
    const name = allElems[i].getAttribute('name') || '';
    const ppr = allElems[i].getAttribute('paraPrIDRef');
    if (id != null) result.styles[id] = { name, paraPrIDRef: ppr || '0' };
  }

  result.numberHeadingOffset = computeNumberHeadingOffset(result.paraPrMap);
  result.bulletLevelMap = {};

  return result;
}

function resolveParaInfo(paraPrIDRef, styleIDRef, paraStyles) {
  if (!paraStyles?.paraPrMap) return null;
  let info = paraStyles.paraPrMap[paraPrIDRef];
  if (!info && styleIDRef && paraStyles.styles) {
    const style = paraStyles.styles[styleIDRef];
    if (style?.paraPrIDRef) info = paraStyles.paraPrMap[style.paraPrIDRef];
  }
  return info;
}

function detectHeadingByStyleName(name) {
  if (!name) return null;
  if (/^큰제목$|^헤드제목$|^장제목$|^간지-장제목$|^간지-장$/.test(name)) {
    return 1;
  }
  if (/^보고서제목/.test(name)) {
    return 1;
  }
  if (/^절$|^소제목$|^간지-소제목/.test(name)) {
    return 2;
  }
  return null;
}

function resolveStyleHeading(styleIDRef, paraStyles) {
  if (!styleIDRef || !paraStyles?.styles) return null;
  const style = paraStyles.styles[styleIDRef];
  if (!style) return null;
  const level = detectHeadingByStyleName(style.name);
  return level ? { level, name: style.name } : null;
}

function getGibonRule(styleIDRef, paraStyles) {
  if (!styleIDRef || !paraStyles?.styles) return null;
  const style = paraStyles.styles[styleIDRef];
  if (!style) return null;
  const rule = GIBON_STYLE_RULES[style.name];
  return rule ? { ...rule, styleName: style.name } : null;
}

function getBriefRule(styleIDRef, paraStyles) {
  if (!styleIDRef || !paraStyles?.styles) return null;
  const style = paraStyles.styles[styleIDRef];
  if (!style) return null;
  const rule = BRIEF_STYLE_RULES[style.name];
  return rule ? { ...rule, styleName: style.name } : null;
}

function getJeongchaekRule(styleIDRef, paraStyles) {
  if (!styleIDRef || !paraStyles?.styles) return null;
  const style = paraStyles.styles[styleIDRef];
  if (!style) return null;
  const rule = JEONGCHAEK_STYLE_RULES[style.name];
  return rule ? { ...rule, styleName: style.name } : null;
}

function extractTextOutsideTables(p) {
  return collectRunText(p, { excludeTbl: true, rootP: p }).trim();
}

function detectHeadingByTextPrefix(text) {
  if (!text) return null;
  const t = text.trim();
  let m = t.match(/^제\s*(\d+)\s*장(?:\s+(.+))?$/);
  if (m) {
    return { level: 1, prefix: `제${parseInt(m[1])}장`, title: (m[2] || '').trim() };
  }
  m = t.match(/^제\s*(\d+)\s*절(?:\s+(.+))?$/);
  if (m) {
    return { level: 2, prefix: `제${parseInt(m[1])}절`, title: (m[2] || '').trim() };
  }
  return null;
}

function getNumberPrefix(paraPrIDRef, styleIDRef, paraStyles, numCounters) {
  const info = resolveParaInfo(paraPrIDRef, styleIDRef, paraStyles);
  if (!info || info.type !== 'NUMBER') return '';

  const numDef = paraStyles.numberings?.[info.idRef];
  if (!numDef) return '';

  const paraHeadLevel = info.level + 1;
  const entry = numDef[paraHeadLevel];
  if (!entry || !entry.text || !entry.text.trim()) return '';

  let prefix = entry.text;
  if (/\^\d/.test(prefix)) {
    for (const k of Object.keys(numCounters)) {
      const [kIdRef, kLevel] = k.split('-');
      if (kIdRef === info.idRef && parseInt(kLevel) > info.level) {
        delete numCounters[k];
      }
    }
    const key = `${info.idRef}-${info.level}`;
    numCounters[key] = (numCounters[key] || 0) + 1;
    const formatted = formatNumberByFormat(numCounters[key], entry.format || 'DIGIT');
    prefix = prefix.replace(/\^\d/g, formatted);
  }
  return prefix.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
}

function getParaPrefix(paraPrIDRef, styleIDRef, paraStyles, numCounters) {
  const info = resolveParaInfo(paraPrIDRef, styleIDRef, paraStyles);

  if (!info) {
    const styleHead = resolveStyleHeading(styleIDRef, paraStyles);
    if (styleHead) {
      for (const k of Object.keys(numCounters)) delete numCounters[k];
      return {
        text: '#'.repeat(Math.min(styleHead.level, 6)) + ' ',
        isHeading: true,
        level: styleHead.level - 1,
      };
    }
    return null;
  }

  if (info.type === 'OUTLINE') {
    for (const k of Object.keys(numCounters)) delete numCounters[k];
    const headLevel = Math.max(info.level + 1, 1);
    return { text: '#'.repeat(Math.min(headLevel, 6)) + ' ', isHeading: true, level: info.level };
  }

  if (info.type === 'BULLET') {
    const ch = paraStyles.bullets?.[info.idRef];
    if (!ch) return null;

    const level = paraStyles.bulletLevelMap?.[info.idRef] ?? 0;
    const indent = '  '.repeat(level);
    return { text: indent + '- ', isHeading: false, isBullet: true, level };
  }

  if (info.type === 'NUMBER') {
    const numDef = paraStyles.numberings?.[info.idRef];
    if (!numDef) return null;

    const paraHeadLevel = info.level + 1;
    const entry = numDef[paraHeadLevel];
    if (!entry || !entry.text || !entry.text.trim()) return null;
    const symbolText = entry.text;
    const numFormat = entry.format || 'DIGIT';

    let prefix = symbolText;
    if (/\^\d/.test(symbolText)) {
      for (const k of Object.keys(numCounters)) {
        const [kIdRef, kLevel] = k.split('-');
        if (kIdRef === info.idRef && parseInt(kLevel) > info.level) {
          delete numCounters[k];
        }
      }
      const key = `${info.idRef}-${info.level}`;
      numCounters[key] = (numCounters[key] || 0) + 1;
      const formatted = formatNumberByFormat(numCounters[key], numFormat);
      prefix = symbolText.replace(/\^\d/g, formatted);
    }

    prefix = prefix.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();

    const offset = paraStyles.numberHeadingOffset || 0;
    const relativeLevel = info.level - offset;

    if (relativeLevel < MAX_NUMBER_HEADING_DEPTH) {
      for (const k of Object.keys(numCounters)) delete numCounters[k];
      numCounters[`${info.idRef}-${info.level}`] = numCounters[`${info.idRef}-${info.level}`] || 1;
      const headLevel = Math.min(relativeLevel + 1, 6);
      return { text: '#'.repeat(headLevel) + ' ' + prefix + ' ', isHeading: true, level: relativeLevel };
    } else {
      const indent = '  '.repeat(relativeLevel - MAX_NUMBER_HEADING_DEPTH);
      return { text: indent + prefix + ' ', isHeading: false, isBullet: false, level: relativeLevel };
    }
  }

  return null;
}

function collectImageCaptions(xmlText, rawImages, imageMap) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const allP = [];
  const allElems = doc.getElementsByTagName('*');
  for (let i = 0; i < allElems.length; i++) {
    if (localTag(allElems[i]) === 'p') {
      if (!isInsideTag(allElems[i], 'tc') && !isInsideTag(allElems[i], 'fn') &&
          !isInsideTag(allElems[i], 'endnote') && !isInsideTag(allElems[i], 'footNote') &&
          !isInsideTag(allElems[i], 'endNote')) {
        allP.push(allElems[i]);
      }
    }
  }

  const paraInfo = [];
  for (const p of allP) {
    const binRef = findBinRefInPara(p);
    const text = extractAllText(p);
    paraInfo.push({ isImage: !!binRef, binRef, text: text || '' });
  }

  const captionExtract = /([<\[]\s*그림\s*[\d\-]*\s*[>\]]\s*.+)$/;
  const extract = (t) => {
    if (!t) return '';
    const m = t.match(captionExtract);
    return m ? m[1].trim() : '';
  };
  for (let i = 0; i < paraInfo.length; i++) {
    if (!paraInfo[i].isImage) continue;
    const binRef = paraInfo[i].binRef;
    let caption = extract(paraInfo[i].text);
    if (!caption && i + 1 < paraInfo.length && !paraInfo[i + 1].isImage) caption = extract(paraInfo[i + 1].text);
    if (!caption && i - 1 >= 0 && !paraInfo[i - 1].isImage) caption = extract(paraInfo[i - 1].text);

    for (const origPath of Object.keys(rawImages)) {
      const baseName = origPath.split('/').pop().replace(/\.[^.]+$/, '');
      if (origPath.includes(binRef) || baseName === binRef) {
        if (!imageMap[origPath]) imageMap[origPath] = { caption };
        break;
      }
    }
  }
}

function findBinRefInPara(p) {
  const imgTags = ['img', 'pic', 'image', 'drawobj', 'shapeobject'];
  const allElems = p.getElementsByTagName('*');
  for (let i = 0; i < allElems.length; i++) {
    const tag = localTag(allElems[i]).toLowerCase();
    if (!imgTags.includes(tag)) continue;
    const ref = findBinRef(allElems[i]);
    if (ref) return ref;
    const subs = allElems[i].getElementsByTagName('*');
    for (let j = 0; j < subs.length; j++) {
      const ref2 = findBinRef(subs[j]);
      if (ref2) return ref2;
    }
  }
  return null;
}

function parseSection(xmlText, imageMap, paraStyles, mode = 'eopmu') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const footnotes = [];
  const allElems = doc.getElementsByTagName('*');
  let fnIndex = 1;
  for (let i = 0; i < allElems.length; i++) {
    const tag = localTag(allElems[i]);
    if (tag === 'fn' || tag === 'endnote' || tag === 'footNote' || tag === 'endNote') {
      const fnText = extractAllText(allElems[i]);
      if (fnText) { footnotes.push(`[^${fnIndex}]: ${fnText}`); fnIndex++; }
    }
  }

  const paragraphs = doc.getElementsByTagName('*');
  const pElements = [];
  for (let i = 0; i < paragraphs.length; i++) {
    if (localTag(paragraphs[i]) === 'p') {
      if (isInsideTag(paragraphs[i], 'tc')) continue;
      if (isInsideTag(paragraphs[i], 'fn')) continue;
      if (isInsideTag(paragraphs[i], 'endnote')) continue;
      if (isInsideTag(paragraphs[i], 'footNote')) continue;
      if (isInsideTag(paragraphs[i], 'endNote')) continue;
      pElements.push(paragraphs[i]);
    }
  }

  let fnRefIndex = 1;
  const numCounters = {};

  const entries = [];
  let lastListLevel = 0;

  for (const p of pElements) {
    const r = parseParagraph(p, imageMap, paraStyles, numCounters, mode);
    if (r === null) continue;

    let line = r;
    const fnChildren = p.getElementsByTagName('*');
    for (let i = 0; i < fnChildren.length; i++) {
      const tag = localTag(fnChildren[i]);
      if (tag === 'fn' || tag === 'footNote' || tag === 'endnote' || tag === 'endNote') {
        line += `[^${fnRefIndex}]`; fnRefIndex++;
      }
    }

    const paraPrIDRef = p.getAttribute('paraPrIDRef');
    const styleIDRef = p.getAttribute('styleIDRef');
    const info = resolveParaInfo(paraPrIDRef, styleIDRef, paraStyles);
    let kind = 'para';
    let level = -1;

    if (info) {
      if (info.type === 'OUTLINE') {
        kind = 'heading'; level = info.level;
      } else if (info.type === 'NUMBER') {
        const offset = paraStyles?.numberHeadingOffset || 0;
        const rel = info.level - offset;
        if (rel < MAX_NUMBER_HEADING_DEPTH) {
          kind = 'heading'; level = rel;
        } else {
          kind = 'list'; level = rel;
        }
      } else if (info.type === 'BULLET') {
        kind = 'list';
        level = paraStyles?.bulletLevelMap?.[info.idRef] ?? 0;
      }
    } else {
      const styleHead = resolveStyleHeading(styleIDRef, paraStyles);
      if (styleHead) {
        kind = 'heading'; level = styleHead.level - 1;
      }
    }
    if (line.startsWith('#')) kind = 'heading';
    if (line.startsWith('|') || line.startsWith('<table')) kind = 'table';

    if (kind === 'para' && lastListLevel >= 0 && entries.length > 0) {
      const prev = entries[entries.length - 1];
      if (prev.kind === 'list' || prev.kind === 'listcont') {
        const contIndent = '  '.repeat(prev.level + 1);
        line = contIndent + line;
        kind = 'listcont';
        level = prev.level;
      }
    }

    if (kind === 'list') lastListLevel = level;
    if (kind === 'heading' || kind === 'table') lastListLevel = -1;

    entries.push({ text: line, kind, level });
  }

  if (mode === 'gibon' || mode === 'jeongchaek' || mode === 'brief') {
    const capPattern = /^[<\[]\s*(?:부록\s*)?표\s*[\d\-]*\s*[>\]]\s*.+/;
    const srcPattern = /^(자료|출처|주)\s*[:：]/;
    const isTableText = (t) => {
      if (!t) return false;
      const s = t.trimStart();
      return s.startsWith('|') || s.startsWith('<table');
    };
    const paired = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e._consumed) continue;
      if (!(e.kind === 'table' || isTableText(e.text))) {
        paired.push(e);
        continue;
      }
      let capText = null, srcText = null;
      for (let j = i + 1; j < Math.min(entries.length, i + 4); j++) {
        const nx = entries[j];
        if (nx._consumed) continue;
        const t = (nx.text || '').trim();
        if (!capText && capPattern.test(t)) {
          capText = t; nx._consumed = true; continue;
        }
        if (!srcText && srcPattern.test(t)) {
          srcText = t; nx._consumed = true; continue;
        }
        break;
      }
      let out = e.text;
      if (capText) out = `**${capText}**\n\n` + out;
      if (srcText) out = out + `\n\n` + srcText;
      paired.push({ ...e, text: out });
    }
    entries.length = 0;
    for (const p of paired) entries.push(p);
  }

  if (footnotes.length > 0) {
    entries.push({ text: '---', kind: 'para', level: -1 });
    entries.push({ text: footnotes.join('\n\n'), kind: 'para', level: -1 });
  }

  const joined = [];
  for (let i = 0; i < entries.length; i++) {
    joined.push(entries[i].text);
    if (i >= entries.length - 1) continue;

    const curr = entries[i];
    const next = entries[i + 1];

    if (curr.kind === 'heading' || next.kind === 'heading') {
      joined.push('\n\n');
    }
    else if ((curr.kind === 'list' || curr.kind === 'listcont') &&
             (next.kind === 'list' || next.kind === 'listcont')) {
      joined.push('\n');
    }
    else if ((curr.kind === 'list' || curr.kind === 'listcont') && next.kind === 'para') {
      joined.push('\n\n');
    }
    else if (curr.kind === 'para' && next.kind === 'list') {
      joined.push('\n\n');
    }
    else if (curr.kind === 'table' || next.kind === 'table') {
      joined.push('\n\n');
    }
    else {
      joined.push('\n\n');
    }
  }
  return joined.join('');
}

function collectRunText(root, opts = {}) {
  const { excludeTbl = false, rootP = null } = opts;
  const texts = [];
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const tag = localTag(all[i]);
    if (tag !== 't' && tag !== 'autoNum') continue;
    {
      let a = all[i].parentElement;
      let insideNote = false;
      while (a && a !== root) {
        const at = localTag(a);
        if (at === 'footNote' || at === 'endNote' || at === 'fn' || at === 'endnote') {
          insideNote = true; break;
        }
        a = a.parentElement;
      }
      if (insideNote) continue;
    }
    if (excludeTbl && rootP) {
      let a = all[i].parentElement;
      let inside = false;
      while (a && a !== rootP) {
        if (localTag(a) === 'tbl') { inside = true; break; }
        a = a.parentElement;
      }
      if (inside) continue;
    }
    if (tag === 't') {
      for (const node of all[i].childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent) texts.push(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE && localTag(node) === 'lineBreak') {
          texts.push('\n');
        }
      }
    } else {
      const numType = all[i].getAttribute('numType') || '';
      if (numType === 'PAGE' || numType === 'FOOTNOTE') continue;
      const num = all[i].getAttribute('num');
      if (num) texts.push(num);
    }
  }
  return texts.join('');
}

function extractCellText(tc) {
  const parts = [];
  const all = tc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (localTag(all[i]) !== 'p') continue;
    let a = all[i].parentElement;
    let insideNested = false;
    while (a && a !== tc) {
      if (localTag(a) === 'tbl') { insideNested = true; break; }
      a = a.parentElement;
    }
    if (insideNested) continue;
    const t = collectRunText(all[i]).replace(/\s+$/g, '');
    if (t) parts.push(t);
  }
  return parts.join('\n').trim();
}

function extractAllText(elem) {
  return collectRunText(elem).trim();
}

function parseParagraph(p, imageMap, paraStyles, numCounters, mode = 'eopmu') {
  const allTbl = [];
  const all = p.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (localTag(all[i]) === 'tbl') {
      let ancestor = all[i].parentElement;
      let isNested = false;
      while (ancestor && ancestor !== p) {
        if (localTag(ancestor) === 'tbl') { isNested = true; break; }
        ancestor = ancestor.parentElement;
      }
      if (!isNested) allTbl.push(all[i]);
    }
  }
  if (allTbl.length > 0) {
    const parts = [];
    for (const tbl of allTbl) {
      const r = parseTable(tbl, paraStyles, mode, imageMap);
      if (r) parts.push(r);
    }
    if (mode === 'gibon') {
      const ownText = extractTextOutsideTables(p);
      if (ownText) {
        const paraPrIDRef = p.getAttribute('paraPrIDRef');
        const styleIDRef = p.getAttribute('styleIDRef');
        const rule = getGibonRule(styleIDRef, paraStyles);
        if (rule && rule.kind === 'heading' && !rule.onceOnly) {
          if (rule.level <= 2) {
            for (const k of Object.keys(numCounters)) delete numCounters[k];
          }
          let numPrefix = '';
          if (rule.withNumber) {
            const n = getNumberPrefix(paraPrIDRef, styleIDRef, paraStyles, numCounters);
            if (n) numPrefix = n + ' ';
          }
          const manualNumPattern = /^(\d+\.\s+|\d+\)\s+|\(\d+\)\s+|[가-힣]\.\s+)/;
          if (numPrefix && manualNumPattern.test(ownText)) numPrefix = '';
          parts.push('#'.repeat(rule.level) + ' ' + numPrefix + ownText);
        } else {
          const hdBy = detectHeadingByTextPrefix(ownText);
          if (hdBy) {
            const headStr = hdBy.title ? `${hdBy.prefix} ${hdBy.title}` : hdBy.prefix;
            parts.push('#'.repeat(hdBy.level) + ' ' + headStr);
          }
        }
      }
    }
    return parts.length > 0 ? parts.join('\n\n') : null;
  }
  const img = findImage(p, imageMap, mode);
  if (img) return img;

  const text = collectRunText(p).trim();
  if (!text) return null;

  const paraPrIDRef = p.getAttribute('paraPrIDRef');
  const styleIDRef = p.getAttribute('styleIDRef');

  if (mode === 'gibon') {
    if (_titleCtx.usedCaptions && _titleCtx.usedCaptions.has(text)) {
      return null;
    }
    const rule = getGibonRule(styleIDRef, paraStyles);
    if (rule) {
      switch (rule.kind) {
        case 'skip':
        case 'meta':
          return null;
        case 'heading': {
          if (rule.onceOnly) {
            if (_titleCtx.reportTitleEmitted) return null;
            _titleCtx.reportTitleEmitted = true;
            if (_titleCtx.combinedReportTitle) {
              return '# ' + _titleCtx.combinedReportTitle;
            }
          }
          if (rule.level <= 2) {
            for (const k of Object.keys(numCounters)) delete numCounters[k];
          }
          let numPrefix = '';
          if (rule.withNumber) {
            const n = getNumberPrefix(paraPrIDRef, styleIDRef, paraStyles, numCounters);
            if (n) numPrefix = n + ' ';
          }
          const manualNumPattern = /^(\d+\.\s+|\d+\)\s+|\(\d+\)\s+|[가-힣]\.\s+)/;
          if (numPrefix && manualNumPattern.test(text)) {
            numPrefix = '';
          }
          let effectiveLevel = rule.level;
          if (/^(참고문헌|참고자료|통계자료)$/.test(text)) {
            effectiveLevel = 2;
          }
          else if (_titleCtx.inPolicySummary && effectiveLevel === 1) {
            effectiveLevel = 3;
          }
          return '#'.repeat(effectiveLevel) + ' ' + numPrefix + text;
        }
        case 'bullet': {
          const indent = '  '.repeat(rule.famIdx);
          return indent + '- ' + text;
        }
        case 'caption':
          if (rule.type === 'figure' && _titleCtx.usedCaptions && _titleCtx.usedCaptions.has(text)) {
            return null;
          }
          return text;
        case 'footnote':
        case 'reference':
          return text;
        case 'body':
          break;
        case 'passthrough':
          break;
      }
    }

    const hdBy = detectHeadingByTextPrefix(text);
    if (hdBy) {
      if (hdBy.level === 1) {
        _titleCtx.sectionCounter = 0;
        _titleCtx.figureCounter = 0;
        const m = hdBy.prefix.match(/(\d+)/);
        if (m) _titleCtx.chapterNum = parseInt(m[1]);
        _titleCtx.chapterEmitted = true;
        for (const k of Object.keys(numCounters)) delete numCounters[k];
      }
      const headStr = hdBy.title
        ? `${hdBy.prefix} ${hdBy.title}`
        : hdBy.prefix;
      return '#'.repeat(hdBy.level) + ' ' + headStr;
    }
  }

  if (mode === 'jeongchaek') {
    if (_titleCtx.usedCaptions && _titleCtx.usedCaptions.has(text)) {
      return null;
    }
    const rule = getJeongchaekRule(styleIDRef, paraStyles);
    if (rule) {
      switch (rule.kind) {
        case 'skip':
          return null;
        case 'chapterNumber':
          _titleCtx.pendingChapterNum = text || null;
          return null;
        case 'heading': {
          if (rule.onceOnly) {
            if (_titleCtx.reportTitleEmitted) return null;
            _titleCtx.reportTitleEmitted = true;
            const titleText = _titleCtx.combinedReportTitle || text;
            return '# ' + titleText;
          }
          const lines = [];
          if (rule.inSummary && !_titleCtx.summaryEmitted) {
            _titleCtx.summaryEmitted = true;
            lines.push('## 요약');
            lines.push('');
          }
          let heading = text;
          if (rule.pairChapterNumber) {
            _titleCtx.sectionCounter = 0;
            _titleCtx.figureCounter = 0;
            for (const k of Object.keys(numCounters)) delete numCounters[k];
            if (_titleCtx.pendingChapterNum) {
              heading = `${_titleCtx.pendingChapterNum}. ${text}`;
              const m = _titleCtx.pendingChapterNum.match(/\d+/);
              if (m) _titleCtx.chapterNum = parseInt(m[1] || m[0]);
              _titleCtx.pendingChapterNum = null;
            }
            _titleCtx.chapterEmitted = true;
          }
          lines.push('#'.repeat(rule.level) + ' ' + heading);
          return lines.join('\n');
        }
        case 'bullet': {
          const indent = '  '.repeat(rule.famIdx);
          return indent + '- ' + text;
        }
        case 'caption':
          if (_titleCtx.usedCaptions && _titleCtx.usedCaptions.has(text)) {
            return null;
          }
          return text;
        case 'keywords':
          if (_titleCtx.keywordsEmitted) return null;
          _titleCtx.keywordsEmitted = true;
          return `**키워드**: ${text}`;
        case 'subtitle':
          if (_titleCtx.subtitleEnEmitted) return null;
          _titleCtx.subtitleEnEmitted = true;
          return `*${text}*`;
        case 'footnote':
          return text;
        case 'body':
          break;
      }
    }
  }

  if (mode === 'brief') {
    if (_titleCtx.usedCaptions && _titleCtx.usedCaptions.has(text)) {
      return null;
    }
    const rule = getBriefRule(styleIDRef, paraStyles);
    if (rule) {
      switch (rule.kind) {
        case 'skip':
          return null;
        case 'coverMeta':
          return null;
        case 'heading': {
          if (rule.onceOnly) {
            if (_titleCtx.reportTitleEmitted) return null;
            _titleCtx.reportTitleEmitted = true;
            const titleText = _titleCtx.combinedReportTitle || text;
            return '# ' + titleText;
          }
          return '#'.repeat(rule.level) + ' ' + text;
        }
        case 'bullet': {
          const indent = '  '.repeat(rule.famIdx);
          return indent + '- ' + text;
        }
        case 'caption':
          if (_titleCtx.usedCaptions && _titleCtx.usedCaptions.has(text)) {
            return null;
          }
          return text;
        case 'body':
          break;
      }
    }
  }

  const prefix = getParaPrefix(paraPrIDRef, styleIDRef, paraStyles, numCounters);
  if (prefix) {
    return prefix.text + text;
  }

  const level = detectHeading(p);
  if (level) return '#'.repeat(level) + ' ' + text;

  return text;
}

function detectHeading(p) {
  for (const attr of p.attributes) {
    const val = attr.value.toLowerCase();
    if (val.includes('outline') || val.includes('heading') || val.includes('제목')) {
      const match = attr.value.match(/(\d)/);
      if (match) { const l = parseInt(match[1]); if (l >= 1 && l <= 6) return l; }
      return 1;
    }
  }
  for (const child of p.children) {
    for (const attr of child.attributes) {
      const val = attr.value.toLowerCase();
      if (val.includes('outline') || val.includes('heading')) {
        const match = attr.value.match(/(\d)/);
        if (match) { const l = parseInt(match[1]); if (l >= 1 && l <= 6) return l; }
        return 1;
      }
    }
  }
  return 0;
}

function findImage(p, imageMap, mode = 'eopmu') {
  const imgTags = ['img', 'pic', 'image', 'drawobj', 'shapeobject'];
  const allElems = p.getElementsByTagName('*');
  for (let i = 0; i < allElems.length; i++) {
    const tag = localTag(allElems[i]).toLowerCase();
    if (!imgTags.includes(tag)) continue;
    let binRef = findBinRef(allElems[i]);
    if (!binRef) {
      const subs = allElems[i].getElementsByTagName('*');
      for (let j = 0; j < subs.length; j++) { binRef = findBinRef(subs[j]); if (binRef) break; }
    }
    if (binRef) {
      for (const [origPath, entry] of Object.entries(imageMap)) {
        const baseName = origPath.split('/').pop().replace(/\.[^.]+$/, '');
        if (origPath.includes(binRef) || baseName === binRef) {
          const filename = typeof entry === 'string' ? entry : entry.filename;
          const caption = typeof entry === 'string' ? '' : (entry.caption || '');
          if (mode === 'gibon' || mode === 'jeongchaek' || mode === 'brief') {
            if ((mode === 'jeongchaek' || mode === 'brief') && !caption) {
              return null;
            }
            if (caption && _titleCtx.usedCaptions) {
              _titleCtx.usedCaptions.add(caption);
              const sub = caption.match(/[<\[]\s*그림[^<>\[\]]*[>\]]\s*.+/);
              if (sub) _titleCtx.usedCaptions.add(sub[0].trim());
            }
            const m = caption.match(/[<\[]\s*그림\s*([\d\-]*)\s*[>\]]\s*(.+)/);
            let placeholder = null;
            let extractedSource = '';
            if (m) {
              let numPart = m[1].trim();
              let title = m[2].trim();
              title = title.split(/그림입니다|원본 그림의/)[0].trim();
              const srcSplit = title.match(/^(.+?)(\s*(?:자료|출처|주)\s*[:：]\s*.+)$/);
              if (srcSplit) {
                title = srcSplit[1].trim();
                extractedSource = srcSplit[2].trim();
              }
              if (numPart.endsWith('-')) {
                _titleCtx.figureCounter = (_titleCtx.figureCounter || 0) + 1;
                numPart = numPart + _titleCtx.figureCounter;
              } else if (!numPart || !/\d/.test(numPart)) {
                _titleCtx.figureCounter = (_titleCtx.figureCounter || 0) + 1;
                numPart = `${_titleCtx.chapterNum || 0}-${_titleCtx.figureCounter}`;
              }
              if (_titleCtx.usedCaptions && title) {
                _titleCtx.usedCaptions.add(title);
                _titleCtx.usedCaptions.add(`<그림 ${numPart}> ${title}`);
                _titleCtx.usedCaptions.add(`<그림 ${numPart.split('-')[0]}-> ${title}`);
              }
              if (extractedSource && _titleCtx.usedCaptions) {
                _titleCtx.usedCaptions.add(extractedSource);
              }
              placeholder = title ? `[그림 ${numPart} ${title}]` : `[그림 ${numPart}]`;
            } else if (caption) {
              placeholder = `[${caption}]`;
            } else {
              _titleCtx.figureCounter = (_titleCtx.figureCounter || 0) + 1;
              placeholder = `[그림 ${_titleCtx.chapterNum || 0}-${_titleCtx.figureCounter}]`;
            }
            return extractedSource
              ? `${placeholder}\n\n${extractedSource}`
              : placeholder;
          }
          const label = filename.replace(/\.jpg$/, '');
          return `![${label}](images/${filename})`;
        }
      }
    }
  }
  return null;
}

function findBinRef(elem) {
  for (const attr of elem.attributes) {
    if (attr.name.toLowerCase().includes('binaryitemidref') || attr.name.toLowerCase().includes('binitemidref'))
      return attr.value;
  }
  return null;
}

function parseTable(tbl, paraStyles, mode, imageMap) {
  if (mode === 'gibon') {
    const styleHeading = extractGibonTableHeading(tbl, paraStyles);
    if (styleHeading === 'SKIP') return null;
    if (styleHeading) return styleHeading;
  }

  if (mode === 'jeongchaek') {
    const tableHeading = extractJeongchaekTableContent(tbl, paraStyles);
    if (tableHeading === 'SKIP') return null;
    if (tableHeading) return tableHeading;
  }

  if (mode === 'brief') {
    const tableHeading = extractBriefTableContent(tbl, paraStyles);
    if (tableHeading === 'SKIP') return null;
    if (tableHeading) return tableHeading;
  }

  if ((mode === 'gibon' || mode === 'jeongchaek' || mode === 'brief') && imageMap) {
    const imgPlaceholder = extractGibonImageFromTable(tbl, imageMap, mode);
    if (imgPlaceholder) return imgPlaceholder;
  }

  let colCount = 0;
  for (const attr of tbl.attributes) {
    const name = attr.name.toLowerCase();
    if (name === 'colcnt' || name === 'colcount') colCount = parseInt(attr.value) || 0;
  }
  const trElements = [];
  for (const child of tbl.childNodes) {
    if (child.nodeType === 1 && localTag(child) === 'tr') trElements.push(child);
  }
  if (trElements.length === 0) {
    const allElems = tbl.getElementsByTagName('*');
    for (let i = 0; i < allElems.length; i++) {
      if (localTag(allElems[i]) === 'tr') trElements.push(allElems[i]);
    }
  }

  const cellData = [];
  for (const tr of trElements) {
    const tcList = [];
    for (const child of tr.childNodes) {
      if (child.nodeType === 1 && localTag(child) === 'tc') tcList.push(child);
    }
    if (tcList.length === 0) {
      const trChildren = tr.getElementsByTagName('*');
      const processed = new Set();
      for (let i = 0; i < trChildren.length; i++) {
        if (localTag(trChildren[i]) === 'tc' && !processed.has(trChildren[i])) {
          processed.add(trChildren[i]); tcList.push(trChildren[i]);
        }
      }
    }
    for (const tc of tcList) {
      const cellText = extractCellText(tc).replace(/\|/g, '\\|');
      let colAddr = -1, rowAddr = -1, cs = 1, rs = 1;
      const tcChildren = tc.getElementsByTagName('*');
      for (let i = 0; i < tcChildren.length; i++) {
        const tag = localTag(tcChildren[i]);
        if (tag === 'cellAddr') {
          for (const attr of tcChildren[i].attributes) {
            if (attr.name.toLowerCase() === 'coladdr') colAddr = parseInt(attr.value);
            if (attr.name.toLowerCase() === 'rowaddr') rowAddr = parseInt(attr.value);
          }
        }
        if (tag === 'cellSpan') {
          for (const attr of tcChildren[i].attributes) {
            if (attr.name.toLowerCase() === 'colspan') cs = parseInt(attr.value) || 1;
            if (attr.name.toLowerCase() === 'rowspan') rs = parseInt(attr.value) || 1;
          }
        }
      }
      cellData.push({ colAddr, rowAddr, colSpan: cs, rowSpan: rs, text: cellText });
    }
  }
  if (cellData.length === 0) return null;
  if (!colCount) colCount = Math.max(...cellData.map(c => c.colAddr + c.colSpan));
  const rowCount = trElements.length;
  const grid = Array.from({ length: rowCount }, () => Array(colCount).fill(''));
  for (const cell of cellData) {
    const r = cell.rowAddr, c = cell.colAddr;
    if (r >= 0 && r < rowCount && c >= 0 && c < colCount) grid[r][c] = cell.text;
  }

  const titleHeading = detectTitleTable(grid);
  if (titleHeading) return titleHeading;

  let hasMerge = false, hasMultilineCell = false;
  for (const cell of cellData) {
    if (cell.colSpan > 1 || cell.rowSpan > 1) hasMerge = true;
    if (/\r?\n/.test(cell.text)) hasMultilineCell = true;
  }
  const complex = hasMerge || hasMultilineCell;

  if (complex) {
    return renderTableAsHtml(cellData, rowCount, colCount);
  }

  const mdLines = [];
  mdLines.push('| ' + grid[0].join(' | ') + ' |');
  mdLines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |');
  for (let i = 1; i < grid.length; i++) mdLines.push('| ' + grid[i].join(' | ') + ' |');
  return mdLines.join('\n');
}

function renderTableAsHtml(cellData, rowCount, colCount) {
  const byRow = {};
  for (const c of cellData) {
    if (c.rowAddr < 0 || c.colAddr < 0) continue;
    if (!byRow[c.rowAddr]) byRow[c.rowAddr] = [];
    byRow[c.rowAddr].push(c);
  }
  const lines = ['<table border="1">'];
  for (let r = 0; r < rowCount; r++) {
    const row = byRow[r];
    if (!row || row.length === 0) continue;
    row.sort((a, b) => a.colAddr - b.colAddr);
    lines.push('  <tr>');
    for (const c of row) {
      const attrs = [];
      if (c.colSpan > 1) attrs.push(`colspan="${c.colSpan}"`);
      if (c.rowSpan > 1) attrs.push(`rowspan="${c.rowSpan}"`);
      const text = c.text
        .replace(/\\\|/g, '|')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r?\n/g, '<br>');
      const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
      lines.push(`    <td${attrStr}>${text}</td>`);
    }
    lines.push('  </tr>');
  }
  lines.push('</table>');
  return lines.join('\n');
}

function extractGibonTableHeading(tbl, paraStyles) {
  if (!paraStyles?.styles) return null;

  const elements = tbl.getElementsByTagName('*');
  const reportTitles = [];
  const headTitles = [];
  let chapterMarker = null;
  const chapterNames = [];
  let sectionText = null;

  const styleKinds = new Set();

  for (let i = 0; i < elements.length; i++) {
    if (localTag(elements[i]) !== 'p') continue;
    const p = elements[i];
    const styleIDRef = p.getAttribute('styleIDRef');
    if (!styleIDRef) continue;
    const style = paraStyles.styles[styleIDRef];
    if (!style) continue;

    const text = extractAllText(p);
    if (!text) continue;

    const rule = GIBON_STYLE_RULES[style.name];
    if (rule) styleKinds.add(rule.kind);

    if (style.name === '보고서제목') {
      reportTitles.push(text);
    }
    else if (style.name === '헤드제목') {
      headTitles.push(text);
    }
    else if (style.name === '간지-장') {
      if (!chapterMarker) chapterMarker = text;
    }
    else if (style.name === '간지-장제목' || style.name === '큰제목') {
      chapterNames.push(text);
    }
    else if (style.name === '절') {
      if (!sectionText) sectionText = text;
    }
  }

  const reportTitle = reportTitles.join(' ').replace(/\s+/g, ' ').trim() || null;
  const chapterName = chapterNames.join(' ').replace(/\s+/g, ' ').trim() || null;

  if (sectionText) {
    _titleCtx.sectionCounter++;
    return `## 제${_titleCtx.sectionCounter}절 ${sectionText}`;
  }

  if (chapterMarker || chapterName) {
    let chNum = null;
    let chName = '';

    if (chapterMarker) {
      const mm = chapterMarker.match(/제\s*(\d+)\s*장/);
      if (mm) chNum = parseInt(mm[1]);
    }
    if (chapterName) {
      const mn = chapterName.match(/^제\s*(\d+)\s*장\s*(.+)$/);
      if (mn) {
        if (chNum === null) chNum = parseInt(mn[1]);
        chName = mn[2].replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        chName = chapterName.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }

    if (chapterMarker) {
      if (chNum === null) {
        _titleCtx.chapterNum++;
        chNum = _titleCtx.chapterNum;
      }
      if (chNum === _titleCtx.chapterNum && _titleCtx.chapterEmitted) {
        return 'SKIP';
      }
      _titleCtx.chapterNum = chNum;
      _titleCtx.sectionCounter = 0;
      _titleCtx.figureCounter = 0;
      _titleCtx.chapterEmitted = true;
      _titleCtx.inPolicySummary = false;
      return chName ? `# 제${chNum}장 ${chName}` : `# 제${chNum}장`;
    }

    _titleCtx.sectionCounter = 0;
    _titleCtx.figureCounter = 0;
    if (_titleCtx.inPolicySummary) {
      return `### ${chName}`;
    }
    if (/^(참고문헌|참고자료|통계자료)$/.test(chName)) {
      return `## ${chName}`;
    }
    _titleCtx.chapterEmitted = true;
    return `# ${chName}`;
  }

  if (headTitles.length > 0) {
    _titleCtx.chapterEmitted = false;
    _titleCtx.sectionCounter = 0;
    if (headTitles.some(t => /정책\s*요약/.test(t))) {
      _titleCtx.inPolicySummary = true;
    } else {
      _titleCtx.inPolicySummary = false;
    }
    return headTitles.map(t => `## ${t}`).join('\n\n');
  }

  if (reportTitle) {
    if (_titleCtx.reportTitleEmitted) return 'SKIP';
    _titleCtx.reportTitleEmitted = true;
    return `# ${_titleCtx.combinedReportTitle || reportTitle}`;
  }

  if (styleKinds.size > 0 && !styleKinds.has('body') && !styleKinds.has('bullet') &&
      !styleKinds.has('heading') && !styleKinds.has('caption')) {
    return 'SKIP';
  }

  const allTexts = [];
  for (let i = 0; i < elements.length; i++) {
    if (localTag(elements[i]) !== 'p') continue;
    const t = extractAllText(elements[i]);
    if (t && t.trim()) allTexts.push(t.trim());
  }
  if (allTexts.length > 0) {
    const tocTokens = /^(목차|표\s*목차|그림\s*목차)$/;
    if (allTexts.every(t => tocTokens.test(t))) {
      return 'SKIP';
    }
  }

  return null;
}

function extractJeongchaekTableContent(tbl, paraStyles) {
  const allElems = tbl.getElementsByTagName('*');
  let chapterNum = null;
  let chapterTitle = null;
  let subtitle = null;
  let hasSummaryStyle = false;
  let hasCoverStyle = false;
  let hasRealContent = false;

  for (let i = 0; i < allElems.length; i++) {
    if (localTag(allElems[i]) !== 'p') continue;
    const sid = allElems[i].getAttribute('styleIDRef');
    const st = paraStyles?.styles?.[sid];
    if (!st) continue;
    const t = extractAllText(allElems[i]).trim();
    const name = st.name;

    if (name === '[번호]번호') { if (t) chapterNum = t; continue; }
    if (name === '[번호]제목') { if (t) chapterTitle = t; continue; }
    if (name === '[타이틀]소제목') { if (t) subtitle = t; continue; }
    if (name === '요약_네모' || name === '요약_동그라미') {
      if (t) hasSummaryStyle = true;
      continue;
    }

    if (name === '보고서_국문_제목' || name === '보고서_영문_제목' || name === '키워드') {
      hasCoverStyle = true;
      continue;
    }
    if (name === '짝수_하시라' || name === '홀수_하시라' ||
        name === '쪽번호짝' || name === '쪽번호홀') {
      continue;
    }
    if (t && /^(요\s*약|KEYWORD|Keyword|키워드|목\s*차|목\s*록|참고\s*문헌)$/i.test(t)) {
      continue;
    }
    if (t) hasRealContent = true;
  }

  if (chapterTitle) {
    _titleCtx.sectionCounter = 0;
    _titleCtx.figureCounter = 0;
    _titleCtx.chapterEmitted = true;
    if (chapterNum) {
      const m = chapterNum.match(/\d+/);
      if (m) _titleCtx.chapterNum = parseInt(m[0]);
    }
    const prefix = chapterNum ? `${chapterNum}. ` : '';
    return `## ${prefix}${chapterTitle}`;
  }

  if (hasSummaryStyle) {
    const lines = [];
    if (!_titleCtx.summaryEmitted) {
      _titleCtx.summaryEmitted = true;
      lines.push('## 요약');
      lines.push('');
    }
    let lastKind = null;
    for (let i = 0; i < allElems.length; i++) {
      if (localTag(allElems[i]) !== 'p') continue;
      const sid = allElems[i].getAttribute('styleIDRef');
      const st = paraStyles?.styles?.[sid];
      if (!st) continue;
      const t = extractAllText(allElems[i]).trim();
      if (!t) continue;
      const name = st.name;

      if (/^(요\s*약|KEYWORD|Keyword|키워드|목\s*차|목\s*록|참고\s*문헌)$/i.test(t)) {
        continue;
      }

      if (name === '요약_네모') {
        if (lastKind) lines.push('');
        lines.push(`### ${t}`);
        lines.push('');
        lastKind = 'head';
      } else if (name === '요약_동그라미') {
        lines.push(`- ${t}`);
        lastKind = 'bullet';
      } else if (name === '바탕글') {
        if (lastKind === 'bullet') lines.push('');
        lines.push(t);
        lastKind = 'body';
      }
    }
    return lines.join('\n');
  }

  if (subtitle) return `### ${subtitle}`;
  if (hasCoverStyle) return 'SKIP';
  if (!hasRealContent) return 'SKIP';

  return null;
}

function extractBriefTableContent(tbl, paraStyles) {
  if (!paraStyles?.styles) return null;
  const elems = tbl.getElementsByTagName('*');
  const decoNames = new Set([
    '제목','날짜','저자명','판권호수글자','판권정보','판권날짜',
    '짝수하시라','홀수하시라','쪽번호','표머리','바탕글'
  ]);
  const headingNames = new Set(['큰제목로마','큰제목','소제목']);

  const headings = [];
  let hasNonDeco = false;
  let pCount = 0;
  for (let i = 0; i < elems.length; i++) {
    if (localTag(elems[i]) !== 'p') continue;
    pCount++;
    const sid = elems[i].getAttribute('styleIDRef');
    const style = paraStyles.styles[sid];
    if (!style) continue;
    const t = extractAllText(elems[i]).trim();
    if (headingNames.has(style.name)) {
      if (t) headings.push(t);
      continue;
    }
    if (!t) continue;
    if (!decoNames.has(style.name)) {
      hasNonDeco = true;
    }
  }
  if (pCount === 0) return null;

  if (headings.length > 0 && !hasNonDeco) {
    return headings.map(t => '## ' + t).join('\n\n');
  }
  if (headings.length === 0 && !hasNonDeco) return 'SKIP';
  return null;
}

function extractGibonImageFromTable(tbl, imageMap, mode = 'gibon') {
  const imgTags = ['img', 'pic', 'image', 'drawobj', 'shapeobject'];
  let binRef = null;
  const allElems = tbl.getElementsByTagName('*');
  for (let i = 0; i < allElems.length && !binRef; i++) {
    const t = localTag(allElems[i]).toLowerCase();
    if (!imgTags.includes(t)) continue;
    binRef = findBinRef(allElems[i]);
    if (!binRef) {
      const subs = allElems[i].getElementsByTagName('*');
      for (let j = 0; j < subs.length && !binRef; j++) binRef = findBinRef(subs[j]);
    }
  }
  if (!binRef) return null;

  let caption = '';
  for (const [origPath, entry] of Object.entries(imageMap)) {
    const baseName = origPath.split('/').pop().replace(/\.[^.]+$/, '');
    if (origPath.includes(binRef) || baseName === binRef) {
      caption = typeof entry === 'string' ? '' : (entry.caption || '');
      break;
    }
  }

  const capPattern = /[<\[]\s*그림\s*[\d\-]*\s*[>\]]\s*.+/;
  const srcPattern = /^(자료|출처|주)\s*[:：]/;
  let fallbackCaption = '';
  const sourceLines = [];
  for (let i = 0; i < allElems.length; i++) {
    if (localTag(allElems[i]) !== 'p') continue;
    const txt = extractAllText(allElems[i]);
    if (!txt) continue;
    if (!fallbackCaption) {
      const m = txt.match(/([<\[]\s*그림\s*[\d\-]*\s*[>\]]\s*.+?)(?=그림입니다|$)/);
      if (m) fallbackCaption = m[1].trim();
    }
    if (srcPattern.test(txt) && !sourceLines.includes(txt)) {
      sourceLines.push(txt);
    }
  }
  if (!caption && fallbackCaption) caption = fallbackCaption;

  if ((mode === 'jeongchaek' || mode === 'brief') && !caption) {
    return null;
  }

  let numPart = '';
  let title = '';
  const m = caption.match(/[<\[]\s*그림\s*([\d\-]*)\s*[>\]]\s*(.+)/);
  if (m) {
    numPart = m[1].trim();
    title = m[2].trim();
    title = title.split(/그림입니다|원본 그림의/)[0].trim();
    const srcSplit = title.match(/^(.+?)(\s*(?:자료|출처|주)\s*[:：]\s*.+)$/);
    if (srcSplit) {
      title = srcSplit[1].trim();
      const embeddedSrc = srcSplit[2].trim();
      if (embeddedSrc && !sourceLines.includes(embeddedSrc)) {
        sourceLines.push(embeddedSrc);
      }
    }
  }
  if (numPart.endsWith('-') || !numPart) {
    _titleCtx.figureCounter = (_titleCtx.figureCounter || 0) + 1;
    if (numPart.endsWith('-')) numPart = numPart + _titleCtx.figureCounter;
    else numPart = `${_titleCtx.chapterNum || 0}-${_titleCtx.figureCounter}`;
  }

  if (_titleCtx.usedCaptions) {
    if (caption) {
      _titleCtx.usedCaptions.add(caption);
      const sub = caption.match(/[<\[]\s*그림[^<>\[\]]*[>\]]\s*.+/);
      if (sub) _titleCtx.usedCaptions.add(sub[0].trim());
    }
    if (title) {
      _titleCtx.usedCaptions.add(title);
      _titleCtx.usedCaptions.add(`<그림 ${numPart}> ${title}`);
      _titleCtx.usedCaptions.add(`<그림 ${numPart.replace(/\d+$/, '')}> ${title}`);
      _titleCtx.usedCaptions.add(`<그림 ${numPart.split('-')[0]}-> ${title}`);
    }
    for (const sl of sourceLines) _titleCtx.usedCaptions.add(sl);
  }

  const placeholder = title ? `[그림 ${numPart} ${title}]` : `[그림 ${numPart}]`;
  if (sourceLines.length > 0) {
    return placeholder + '\n\n' + sourceLines.join('\n');
  }
  return placeholder;
}

function detectTitleTable(grid) {
  const cells = [];
  for (const row of grid) {
    for (const cell of row) {
      const text = (cell || '').replace(/\\\|/g, '|').trim();
      if (text) cells.push(text);
    }
  }
  if (cells.length === 0) return null;

  const hasChapterRef = cells.some(c => /^제\s*\d+\s*장/.test(c));
  let sectionRefsInList = 0;
  for (const c of cells) {
    if (/제\s*\d+\s*절/.test(c)) {
      const matches = [...c.matchAll(/제\s*(\d+)\s*절/g)];
      sectionRefsInList += matches.length;
    }
  }

  if (hasChapterRef && sectionRefsInList >= 2) {
    for (const cell of cells) {
      const m = cell.match(/^제\s*(\d+)\s*장\s*(.+)$/);
      if (!m) continue;
      const chTitle = m[2].replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
      if (/제\s*\d+\s*[장절]/.test(chTitle)) continue;
      if (!chTitle) continue;

      _titleCtx.chapterNum = parseInt(m[1]);
      _titleCtx.sectionCounter = 0;
      return `# 제${m[1]}장 ${chTitle}`;
    }
  }

  if (hasChapterRef && sectionRefsInList === 0 && cells.length <= 4) {
    let sectionTitle = null;
    for (const c of cells) {
      if (/^제\s*\d+\s*장/.test(c)) continue;
      if (c.length > 100) continue;
      sectionTitle = c;
      break;
    }
    if (sectionTitle) {
      _titleCtx.sectionCounter++;
      return `## 제${_titleCtx.sectionCounter}절 ${sectionTitle}`;
    }
  }

  return null;
}

function isInsideTag(elem, targetTag) {
  let node = elem.parentElement;
  while (node) { if (localTag(node) === targetTag) return true; node = node.parentElement; }
  return false;
}

function localTag(elem) {
  const tag = elem.tagName || elem.nodeName;
  const idx = tag.indexOf(':');
  return idx >= 0 ? tag.substring(idx + 1) : tag;
}

// ===================================================================
//  메인 HWPX 파싱 엔트리 포인트
// ===================================================================
export async function handleHwpx(file, mode = 'eopmu') {
  // 상태 초기화
  _titleCtx = {
    chapterNum: 0,
    sectionCounter: 0,
    figureCounter: 0,
    chapterEmitted: false,
    reportTitleEmitted: false,
    inPolicySummary: false,
    usedCaptions: new Set(),
    pendingChapterNum: null,
    summaryEmitted: false,
    keywordsEmitted: false,
    coverDate: '',
    coverAuthor: '',
    coverIssue: '',
    dateEmitted: false,
    authorEmitted: false,
    issueEmitted: false,
    combinedReportTitle: '',
    coverSubtitleEn: '',
    coverKeywords: ''
  };

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const paraStyles = await parseHwpxStyles(zip);

  const rawImages = {};
  const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff', '.emf', '.wmf'];
  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    if (imgExts.includes(ext)) {
      const data = await zipEntry.async('uint8array');
      rawImages[path] = { data, ext };
    }
  }

  const sectionFiles = Object.keys(zip.files)
    .filter(f => f.toLowerCase().includes('contents/') && f.toLowerCase().endsWith('.xml') && f.toLowerCase().includes('section'))
    .sort();

  if (sectionFiles.length === 0) {
    throw new Error('본문 섹션을 찾을 수 없습니다. HWPX 파일이 올바른지 확인해주세요.');
  }

  paraStyles.bulletLevelMap = await buildBulletLevelMap(zip, sectionFiles, paraStyles);

  const imageMap = {};
  let imgIndex = 1;
  for (const sectionPath of sectionFiles) {
    const xmlText = await zip.file(sectionPath).async('text');
    collectImageCaptions(xmlText, rawImages, imageMap, imgIndex);
    imgIndex += Object.keys(imageMap).length;
  }

  const reportPrefix = sanitizeFilename(file.name.replace(/\.hwpx$/i, '')) || 'report';
  const imageNameMap = {};
  const usedNames = new Set();
  let fallbackIdx = 1;
  const extractedImages = [];

  for (const [origPath, info] of Object.entries(rawImages)) {
    const caption = imageMap[origPath]?.caption;
    let baseName;
    if (caption) baseName = sanitizeFilename(caption);
    if (!baseName) { baseName = 'image_' + fallbackIdx; fallbackIdx++; }
    baseName = reportPrefix + '_' + baseName;
    let finalName = baseName + '.jpg';
    let i = 2;
    while (usedNames.has(finalName)) { finalName = baseName + '_' + i + '.jpg'; i++; }
    usedNames.add(finalName);
    imageNameMap[origPath] = { filename: finalName, caption: caption || '' };

    const mimeType = getMimeType(info.ext);
    const jpgBlob = await convertToJpg(info.data, mimeType);
    extractedImages.push({ name: finalName, jpgBlob, origPath });
  }

  if (mode === 'gibon') {
    const titleParts = [];
    for (const sectionPath of sectionFiles) {
      const xmlText = await zip.file(sectionPath).async('text');
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      const allP = doc.getElementsByTagName('*');
      for (let i = 0; i < allP.length; i++) {
        if (localTag(allP[i]) !== 'p') continue;
        const sid = allP[i].getAttribute('styleIDRef');
        const st = paraStyles?.styles?.[sid];
        if (st && st.name === '보고서제목') {
          const t = extractAllText(allP[i]).trim();
          if (t) titleParts.push(t);
        }
      }
      if (titleParts.length > 0) break;
    }
    _titleCtx.combinedReportTitle = titleParts.join(' ').replace(/\s+/g, ' ').trim();
  }

  if (mode === 'jeongchaek') {
    const titleParts = [];
    let subtitleEn = '';
    let keywords = '';
    for (const sectionPath of sectionFiles) {
      const xmlText = await zip.file(sectionPath).async('text');
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      const allP = doc.getElementsByTagName('*');
      for (let i = 0; i < allP.length; i++) {
        if (localTag(allP[i]) !== 'p') continue;
        const sid = allP[i].getAttribute('styleIDRef');
        const st = paraStyles?.styles?.[sid];
        if (!st) continue;
        const t = extractAllText(allP[i]).trim();
        if (!t) continue;
        if (st.name === '보고서_국문_제목') titleParts.push(t);
        else if (st.name === '보고서_영문_제목' && !subtitleEn) subtitleEn = t;
        else if (st.name === '키워드' && !keywords) keywords = t;
      }
      if (titleParts.length || subtitleEn || keywords) break;
    }
    _titleCtx.combinedReportTitle = titleParts.join(' ').replace(/\s+/g, ' ').trim();
    _titleCtx.coverSubtitleEn = subtitleEn;
    _titleCtx.coverKeywords = keywords;
  }

  if (mode === 'brief') {
    const titleParts = [];
    let coverDate = '', coverAuthor = '', coverIssue = '';
    for (const sectionPath of sectionFiles) {
      const xmlText = await zip.file(sectionPath).async('text');
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      const allP = doc.getElementsByTagName('*');
      for (let i = 0; i < allP.length; i++) {
        if (localTag(allP[i]) !== 'p') continue;
        const sid = allP[i].getAttribute('styleIDRef');
        const st = paraStyles?.styles?.[sid];
        if (!st) continue;
        const t = extractAllText(allP[i]).trim();
        if (!t) continue;
        if (st.name === '제목') titleParts.push(t);
        else if (st.name === '날짜' && !coverDate) coverDate = t;
        else if (st.name === '저자명' && !coverAuthor) coverAuthor = t;
        else if (st.name === '판권호수글자' && !coverIssue) coverIssue = t;
      }
      if (titleParts.length || coverDate || coverAuthor || coverIssue) break;
    }
    _titleCtx.combinedReportTitle = titleParts.join(' ').replace(/\s+/g, ' ').trim();
    _titleCtx.coverDate = coverDate;
    _titleCtx.coverAuthor = coverAuthor;
    _titleCtx.coverIssue = coverIssue;
  }

  const mdParts = [];

  if (mode === 'jeongchaek' && _titleCtx.combinedReportTitle) {
    const coverLines = [`# ${_titleCtx.combinedReportTitle}`];
    if (_titleCtx.coverSubtitleEn) coverLines.push('', `*${_titleCtx.coverSubtitleEn}*`);
    if (_titleCtx.coverKeywords) coverLines.push('', `**키워드**: ${_titleCtx.coverKeywords}`);
    mdParts.push(coverLines.join('\n'));
    _titleCtx.reportTitleEmitted = true;
    _titleCtx.keywordsEmitted = true;
  }

  if (mode === 'brief' && _titleCtx.combinedReportTitle) {
    const coverLines = [`# ${_titleCtx.combinedReportTitle}`];
    const meta = [_titleCtx.coverAuthor, _titleCtx.coverIssue, _titleCtx.coverDate]
      .filter(Boolean).join(' · ');
    if (meta) coverLines.push('', `*${meta}*`);
    mdParts.push(coverLines.join('\n'));
    _titleCtx.reportTitleEmitted = true;
    _titleCtx.dateEmitted = true;
    _titleCtx.authorEmitted = true;
    _titleCtx.issueEmitted = true;
  }

  for (const sectionPath of sectionFiles) {
    const xmlText = await zip.file(sectionPath).async('text');
    mdParts.push(parseSection(xmlText, imageNameMap, paraStyles, mode));
  }

  const currentMarkdown = mdParts.join('\n\n');

  return {
    markdown: currentMarkdown,
    images: extractedImages,
    sectionsCount: sectionFiles.length
  };
}
