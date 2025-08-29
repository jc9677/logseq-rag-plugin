// Minimal Logseq plugin (no bundler). Provides commands and a simple panel.

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: { raw: text } };
  }
}

function getServiceUrl() {
  const el = document.getElementById('serviceUrl');
  return el && el.value ? el.value.replace(/\/$/, '') : 'http://127.0.0.1:8787';
}

async function reindex() {
  const ls = globalThis.logseq;
  if (!ls) {
    console.warn('Logseq API not available: reindex noop');
    return;
  }
  const service = getServiceUrl();
  const blocks = await ls.Editor.getCurrentPageBlocksTree();
  if (!blocks || !blocks.length) {
    ls.UI.showMsg('No blocks found on current page', 'warning');
    return;
  }
  // Flatten blocks
  const items = [];
  function walk(nodes, pageName) {
    for (const n of nodes) {
      items.push({ page: pageName, block_id: n.uuid, text: n.content || '' });
      if (n.children && n.children.length) walk(n.children, pageName);
    }
  }
  const page = await ls.Editor.getCurrentPage();
  const pageName = page ? (page.originalName || page.name) : 'Unknown';
  walk(blocks, pageName);

  const res = await fetch(`${service}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  const txt = await res.text();
  try {
    const json = JSON.parse(txt);
    ls.UI.showMsg(`Ingest: ${JSON.stringify(json)}`);
  } catch {
    ls.UI.showMsg(`Ingest raw: ${txt}`);
  }
}

async function ask() {
  const ls = globalThis.logseq;
  const service = getServiceUrl();
  const q = document.getElementById('question').value.trim();
  if (!q) {
    ls?.UI?.showMsg?.('Enter a question');
    return;
  }
  const { ok, data } = await postJSON(`${service}/query`, { question: q, top_k: 5 });
  const resultEl = document.getElementById('result');
  const sourcesEl = document.getElementById('sources');
  if (!ok) {
    resultEl.textContent = data && data.detail ? data.detail : JSON.stringify(data);
    sourcesEl.textContent = '';
    return;
  }
  resultEl.textContent = data.answer || '';
  const src = (data.sources || []).map(s => `- ${s.page} #${s.block_id} (score=${s.score?.toFixed?.(3)})`).join('\n');
  sourcesEl.textContent = src;
}

// Wire UI buttons
window.addEventListener('load', () => {
  document.getElementById('reindexBtn').addEventListener('click', reindex);
  document.getElementById('askBtn').addEventListener('click', ask);
});

// Register commands and open panel on plugin load, but only after Logseq API exists
function waitForLogseq(cb, tries = 0) {
  const ls = globalThis.logseq;
  if (ls && typeof ls.ready === 'function') {
    ls.ready(() => cb(ls));
    return;
  }
  if (tries < 100) {
    setTimeout(() => waitForLogseq(cb, tries + 1), 100);
  } else {
    console.warn('Logseq API not detected after waiting; UI-only mode.');
  }
}

waitForLogseq((ls) => {
  ls.provideModel({
    openPanel: () => {
      ls.showMainUI();
    },
    reindex,
    ask,
  });
  ls.provideUI({
    key: 'rag-panel',
    path: '/',
    template: '<div></div>',
  });

  ls.App.registerUIItem('toolbar', {
    key: 'rag-open',
    template: '<a class="button" data-on-click="openPanel">RAG</a>',
  });

  ls.App.registerCommandPalette({
    key: 'rag-reindex', label: 'RAG: Reindex current page', keybinding: { mode: 'global' }
  }, reindex);

  ls.App.registerCommandPalette({
    key: 'rag-ask', label: 'RAG: Ask (from panel input)', keybinding: { mode: 'global' }
  }, ask);
});
