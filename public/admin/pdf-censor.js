// Censors phone numbers out of every PDF the CMS saves, automatically, before the save leaves this
// browser. A save is a commit to the public repository, so this is the last point at which a number
// can be kept out of it (and out of its history) for good.
//
// Sveltia CMS sends each save to GitHub through window.fetch, with every file inside the request
// body as base64 (a PDF's base64 always starts "JVBERi", from "%PDF-"). This wraps fetch: any
// request carrying a PDF has each one run through censorPdf (censor-core.js) and replaced by the
// censored, re-checked copy before the request is sent. If censoring fails for any reason the
// request is refused, so the CMS reports a failed save and nothing is committed.
//
// MuPDF is loaded on the first PDF only, from a pinned CDN build whose bytes are checked against
// fixed hashes (the import map in index.html for the scripts, below for the WebAssembly).

const WASM_URL = 'https://cdn.jsdelivr.net/npm/mupdf@1.28.1/dist/mupdf-wasm.wasm';
const WASM_SHA384 = 'ThGVLDN2M/kxF2Ztf/jSSuqFpRQQRJg39SHGUGoukIKpGBgmVZZH255Flykzzeij';
const PDF_BASE64 = 'JVBERi';

let engine;

function loadEngine() {
  engine ??= (async () => {
    globalThis.$libmupdf_wasm_Module = {
      instantiateWasm(imports, done) {
        (async () => {
          const bytes = await (await fetch.original(WASM_URL)).arrayBuffer();
          const digest = new Uint8Array(await crypto.subtle.digest('SHA-384', bytes));
          if (btoa(String.fromCharCode(...digest)) !== WASM_SHA384) throw new Error('MuPDF did not match its expected hash.');
          const { instance, module } = await WebAssembly.instantiate(bytes, imports);
          done(instance, module);
        })().catch((err) => fail(err));
        return {};
      },
    };
    let fail;
    const failed = new Promise((_, reject) => (fail = reject));
    const [mupdf, core] = await Promise.race([Promise.all([import('mupdf'), import('./censor-core.js')]), failed]);
    return { mupdf, censorPdf: core.censorPdf };
  })();
  engine.catch(() => (engine = undefined));
  return engine;
}

function toBytes(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Censors every PDF found in a JSON request body. Returns the new body and what was removed. */
export async function censorBody(body) {
  const data = JSON.parse(body);
  const removed = [];
  const visit = async (node, name) => {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (typeof node[i] === 'string' && node[i].startsWith(PDF_BASE64)) node[i] = await censor(node[i], name);
        else await visit(node[i], name);
      }
    } else if (node && typeof node === 'object') {
      const label = typeof node.path === 'string' ? node.path : name;
      for (const key of Object.keys(node)) {
        if (typeof node[key] === 'string' && node[key].startsWith(PDF_BASE64)) node[key] = await censor(node[key], label);
        else await visit(node[key], label);
      }
    }
  };
  const censor = async (base64, label) => {
    const { mupdf, censorPdf } = await loadEngine();
    const out = censorPdf(mupdf, toBytes(base64));
    if (out.found === 0) return base64;
    removed.push({ file: label ?? 'a PDF', found: out.found });
    return toBase64(out.bytes);
  };
  await visit(data, undefined);
  return { body: JSON.stringify(data), removed };
}

function notice(text, tone) {
  const el = document.createElement('div');
  el.setAttribute('role', tone === 'bad' ? 'alert' : 'status');
  el.textContent = text;
  el.style.cssText =
    'position:fixed;z-index:2147483647;left:16px;bottom:16px;max-width:min(32rem,calc(100vw - 32px));padding:12px 16px;' +
    'font:14px/1.5 ui-monospace,monospace;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.4);' +
    (tone === 'bad' ? 'background:#b00020;' : 'background:#141414;border-left:4px solid #ff3333;');
  document.body.append(el);
  setTimeout(() => el.remove(), tone === 'bad' ? 20000 : 8000);
}

const original = window.fetch.bind(window);

async function guardedFetch(input, init) {
  const body = init?.body;
  if (typeof body === 'string' && body.includes(`"${PDF_BASE64}`)) {
    let result;
    try {
      result = await censorBody(body);
    } catch (err) {
      notice(`Save stopped: a PDF could not be censored, so it was not uploaded. ${err.message}`, 'bad');
      throw new Error(`PDF censoring failed: ${err.message}`);
    }
    for (const { file, found } of result.removed) {
      notice(`Phone number removed from ${file.split('/').pop()} (${found} place${found === 1 ? '' : 's'}) before it was saved.`);
    }
    return original(input, { ...init, body: result.body });
  }
  // A body that isn't text (a Blob, FormData, a stream) can't be read here without consuming it;
  // Sveltia's GitHub saves are JSON text, so anything else carrying a PDF is refused, not passed.
  if (body && typeof body !== 'string' && init?.method && init.method !== 'GET') {
    const sample = body instanceof Blob ? await body.slice(0, 5).text() : '';
    if (sample.startsWith('%PDF')) {
      notice('Save stopped: a PDF was about to be sent in a form this guard cannot censor.', 'bad');
      throw new Error('Uncensorable PDF upload refused.');
    }
  }
  return original(input, init);
}
guardedFetch.original = original;
window.fetch = guardedFetch;
