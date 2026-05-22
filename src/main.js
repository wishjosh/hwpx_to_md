import JSZip from 'jszip';
import { marked } from 'marked';
import { handleHwpx } from './parser.js';

// ===================================================================
//  DOM Element Selectors
// ===================================================================
const container = document.querySelector('.container');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const status = document.getElementById('status');
const result = document.getElementById('result');
const previewEditor = document.getElementById('previewEditor');
const previewRendered = document.getElementById('previewRendered');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');
const docTypeSelect = document.getElementById('docType');

// Layout Tab components
const tabBtns = document.querySelectorAll('.tab-btn');
const paneRaw = document.getElementById('paneRaw');
const paneRendered = document.getElementById('paneRendered');
const previewContent = document.getElementById('previewContent');
const statsBadge = document.getElementById('statsBadge');

// State Variables
let currentFilename = '';
let extractedImages = []; // Array of {name, jpgBlob, origPath}

// Get the currently selected HWPX conversion template mode
function getCurrentMode() {
  return docTypeSelect.value; // 'eopmu' | 'gibon' | 'jeongchaek' | 'brief'
}

// ===================================================================
//  Event Listeners & Bindings
// ===================================================================

// Handle File selection trigger
selectBtn.addEventListener('click', (e) => { 
  e.stopPropagation(); 
  fileInput.click(); 
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

// Drag and Drop Events for Files
dropZone.addEventListener('dragover', (e) => { 
  e.preventDefault(); 
  dropZone.classList.add('dragover'); 
});
dropZone.addEventListener('dragleave', () => { 
  dropZone.classList.remove('dragover'); 
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

// Real-time Editor Sync (marked.js Parsing & Character Counting)
previewEditor.addEventListener('input', () => {
  const currentText = previewEditor.value;
  previewRendered.innerHTML = marked.parse(currentText);
  updateStats(currentText);
});

// Zip or MD Download Action (using the latest editor value)
downloadBtn.addEventListener('click', async () => {
  const baseName = currentFilename.replace(/\.hwpx$/i, '');
  const latestMarkdown = previewEditor.value;

  if (extractedImages.length > 0) {
    const zip = new JSZip();
    zip.file(baseName + '.md', latestMarkdown);
    const imgFolder = zip.folder('images');
    for (const img of extractedImages) {
      imgFolder.file(img.name, img.jpgBlob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, baseName + '.zip');
  } else {
    downloadBlob(new Blob([latestMarkdown], { type: 'text/markdown;charset=utf-8' }), baseName + '.md');
  }
});

// Copy to Clipboard Action (using the latest editor value)
copyBtn.addEventListener('click', async () => {
  const latestMarkdown = previewEditor.value;
  await navigator.clipboard.writeText(latestMarkdown);
  const origText = copyBtn.textContent;
  copyBtn.innerHTML = '✅ 복사 완료!';
  setTimeout(() => {
    copyBtn.innerHTML = origText;
  }, 1500);
});

// Layout Tabs switching logic (Raw / Rendered / Split)
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const tab = btn.dataset.tab;
    
    if (tab === 'split') {
      previewContent.classList.add('split-mode');
      paneRaw.classList.add('active');
      paneRendered.classList.add('active');
    } else {
      previewContent.classList.remove('split-mode');
      if (tab === 'raw') {
        paneRaw.classList.add('active');
        paneRendered.classList.remove('active');
      } else {
        paneRaw.classList.remove('active');
        paneRendered.classList.add('active');
      }
    }
  });
});

// Clear and reset all views to the initial state
resetBtn.addEventListener('click', () => {
  currentFilename = '';
  extractedImages = [];
  fileInput.value = '';
  status.className = 'status';
  status.textContent = '';
  result.classList.remove('show');
  previewEditor.value = '';
  previewRendered.innerHTML = '';
  container.classList.remove('expanded');
  previewContent.classList.remove('split-mode');
  statsBadge.textContent = '0자 (0단어)';
  
  // Restore default tab to editor
  tabBtns.forEach(b => b.classList.remove('active'));
  if (tabBtns.length > 0) {
    tabBtns[0].classList.add('active');
  }
  paneRaw.classList.add('active');
  paneRendered.classList.remove('active');
});

// ===================================================================
//  UI Helpers & Utilities
// ===================================================================

function downloadBlob(data, filename) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
  const a = document.createElement('a');
  a.href = url; 
  a.download = filename; 
  a.click();
  URL.revokeObjectURL(url);
}

function showStatus(msg, type) {
  status.className = 'status ' + type;
  status.textContent = msg;
}

function modeLabel(mode) {
  const map = {
    eopmu: '업무보고',
    gibon: '기본연구',
    jeongchaek: '정책·수시연구',
    brief: '정책브리프',
  };
  return map[mode] || mode;
}

// Live character and word count calculations
function updateStats(text) {
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  statsBadge.textContent = `${charCount.toLocaleString()}자 (${wordCount.toLocaleString()}단어)`;
}

// Handle layout & view updates upon successful conversion
function finishConversion(msg, markdownText) {
  showStatus(msg, 'success');
  
  previewEditor.value = markdownText;
  previewRendered.innerHTML = marked.parse(markdownText);
  updateStats(markdownText);

  // Expand container width for desktop view
  container.classList.add('expanded');
  result.classList.add('show');
  
  // Set download button text based on image presence
  downloadBtn.innerHTML = extractedImages.length > 0 ? '📥 ZIP 다운로드' : '📥 MD 다운로드';

  // Automatically enable split mode for desktop (width > 768px) for maximum interactivity
  if (window.innerWidth > 768) {
    tabBtns.forEach(b => b.classList.remove('active'));
    
    // Find the split button and set it active
    const splitBtn = Array.from(tabBtns).find(b => b.dataset.tab === 'split');
    if (splitBtn) {
      splitBtn.classList.add('active');
      previewContent.classList.add('split-mode');
      paneRaw.classList.add('active');
      paneRendered.classList.add('active');
    }
  }
}

// ===================================================================
//  File upload handling entry point
// ===================================================================
async function handleFile(file) {
  currentFilename = file.name;
  extractedImages = [];
  result.classList.remove('show');

  const name = file.name.toLowerCase();
  const mode = getCurrentMode();

  if (name.endsWith('.hwp') && !name.endsWith('.hwpx')) {
    showStatus('HWP 파일입니다. 상단의 변환 사이트에서 HWPX로 먼저 변환해주세요.', 'error');
    return;
  }
  
  if (name.endsWith('.hwpx')) {
    showStatus(`변환 중... (${modeLabel(mode)})`, 'loading');
    try {
      const res = await handleHwpx(file, mode);
      extractedImages = res.images;
      finishConversion(
        `HWPX 변환 완료! (${res.sectionsCount}개 섹션, ${res.images.length}개 이미지)`, 
        res.markdown
      );
    } catch (e) {
      showStatus('변환 실패: ' + e.message, 'error');
      console.error(e);
    }
    return;
  }
  
  showStatus('HWPX 파일만 지원합니다.', 'error');
}
