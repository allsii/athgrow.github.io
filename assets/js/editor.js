(() => {
  'use strict';

  const root = document.getElementById('post-editor');
  if (!root) return;

  const form = document.getElementById('editor-form');
  const fields = document.getElementById('editor-fields');
  const tokenInput = document.getElementById('editor-token');
  const titleInput = document.getElementById('editor-title');
  const descriptionInput = document.getElementById('editor-description');
  const dateInput = document.getElementById('editor-date');
  const categoriesInput = document.getElementById('editor-categories');
  const tagsInput = document.getElementById('editor-tags');
  const bodyInput = document.getElementById('editor-body');
  const fileInput = document.getElementById('editor-images');
  const imageList = document.getElementById('editor-image-list');
  const imageStatus = document.getElementById('editor-images-status');
  const status = document.getElementById('editor-status');
  const publishButton = document.getElementById('editor-publish');
  const MAX_IMAGES = 5;
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const API_ORIGIN = 'https://api.github.com';
  const images = [];
  const removedPaths = new Set();
  let working = false;
  let validatingImages = false;

  // There is no form submission, navigation, or persistence of credentials.
  form.addEventListener('submit', event => event.preventDefault());

  function todayLocal() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  dateInput.value = todayLocal();

  function showStatus(message, isError = false) {
    status.replaceChildren();
    status.classList.toggle('is-error', isError);
    status.textContent = message;
  }

  function encodeSegment(segment) {
    return encodeURIComponent(segment).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  function sitePrefix(value) {
    if (!value || value === '/') return '';
    if (!value.startsWith('/') || value.includes('//') || /[?#\\\x00-\x1f]/.test(value)) throw new Error('invalid baseurl');
    const segments = value.replace(/\/$/, '').slice(1).split('/');
    return '/' + segments.map(segment => {
      const decoded = decodeURIComponent(segment);
      if (!decoded || decoded === '.' || decoded === '..' || /[/\\\x00-\x1f]/.test(decoded)) throw new Error('invalid baseurl');
      return encodeSegment(decoded);
    }).join('/');
  }

  function configuration() {
    const owner = root.dataset.owner || '';
    const repo = root.dataset.repo || '';
    const branch = root.dataset.branch || '';
    if (!/^[A-Za-z0-9-]{1,39}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo) || repo === '.' || repo === '..' ||
        !/^[A-Za-z0-9._/-]+$/.test(branch) || branch.startsWith('/') || branch.endsWith('/') || branch.includes('//') ||
        branch.includes('..') || branch.split('/').some(part => !part || part.startsWith('.') || part.endsWith('.') || part.endsWith('.lock'))) {
      throw new Error('invalid configuration');
    }
    return { owner, repo, branch, base: sitePrefix(root.dataset.baseurl || '') };
  }

  function randomId() {
    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') throw new Error('secure randomness unavailable');
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function detectImage(bytes) {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
    if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'png';
    const text = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    if (text.startsWith('GIF87a') || text.startsWith('GIF89a')) return 'gif';
    if (text.length >= 12 && text.slice(0, 4) === 'RIFF' && text.slice(8, 12) === 'WEBP') return 'webp';
    return null;
  }

  async function validateImage(file) {
    if (!file.size || file.size > MAX_IMAGE_BYTES) return '비어 있거나 5MB를 초과합니다';
    const match = /\.(jpe?g|png|gif|webp)$/i.exec(file.name);
    if (!match) return 'JPG, PNG, GIF, WebP 파일만 선택할 수 있습니다';
    const expected = match[1].toLowerCase().replace('jpeg', 'jpg');
    const allowedTypes = { jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
    if (file.type && file.type.toLowerCase() !== allowedTypes[expected]) return '파일 형식이 확장자와 일치하지 않습니다';
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (detectImage(header) !== expected) return '이미지 내용이 확장자와 일치하지 않습니다';
    return null;
  }

  function insertImage(image) {
    if (bodyInput.value.includes(image.path)) {
      imageStatus.textContent = '이 사진은 이미 본문에 추가되어 있습니다.';
      return;
    }
    // Insert after a selection instead of replacing selected writing.
    const end = bodyInput.selectionEnd ?? bodyInput.value.length;
    const start = end;
    const before = bodyInput.value.slice(0, start);
    const after = bodyInput.value.slice(end);
    const prefix = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const suffix = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    bodyInput.setRangeText(`${prefix}![사진 설명](${image.url})${suffix}`, start, end, 'end');
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function removeImage(image) {
    const index = images.indexOf(image);
    if (index < 0) return;
    images.splice(index, 1);
    URL.revokeObjectURL(image.preview);
    removedPaths.add(image.path);
    // Remove the ordinary inline references we create, even if their alt text was edited.
    const reference = new RegExp(`!\\[[^\\]\\r\\n]*\\]\\(\\s*${escapeRegex(image.url)}\\s*\\)`, 'g');
    bodyInput.value = bodyInput.value.replace(reference, '');
    bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
    renderImages();
    imageStatus.textContent = bodyInput.value.includes(image.path)
      ? '사진을 제거했습니다. 본문에 남은 해당 사진 경로도 직접 지워 주세요.'
      : '사진과 본문의 해당 이미지 문법을 제거했습니다.';
    fileInput.focus();
  }

  function renderImages() {
    imageList.replaceChildren();
    images.forEach(image => {
      const item = document.createElement('li');
      item.className = 'editor-image-item';
      const preview = document.createElement('img');
      preview.src = image.preview;
      preview.alt = '';
      const info = document.createElement('div');
      info.className = 'editor-image-info';
      const name = document.createElement('p');
      name.className = 'editor-image-name';
      name.textContent = image.file.name;
      const size = document.createElement('p');
      size.className = 'editor-image-size';
      size.textContent = `${(image.file.size / 1024 / 1024).toFixed(2)} MB`;
      const actions = document.createElement('div');
      actions.className = 'editor-image-actions';
      const insert = document.createElement('button');
      insert.type = 'button';
      insert.textContent = '본문에 넣기';
      insert.setAttribute('aria-label', `${image.file.name} 본문에 넣기`);
      insert.addEventListener('click', () => { insertImage(image); bodyInput.focus(); });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '제거';
      remove.setAttribute('aria-label', `${image.file.name} 제거`);
      remove.addEventListener('click', () => removeImage(image));
      actions.append(insert, remove);
      info.append(name, size, actions);
      item.append(preview, info);
      imageList.append(item);
    });
  }

  fileInput.addEventListener('change', async () => {
    if (working || validatingImages) return;
    const chosen = Array.from(fileInput.files || []);
    fileInput.value = '';
    if (!chosen.length) return;
    if (images.length + chosen.length > MAX_IMAGES) {
      imageStatus.textContent = `사진은 총 ${MAX_IMAGES}장까지 선택할 수 있습니다. 현재 ${images.length}장이 선택되어 있습니다.`;
      return;
    }
    validatingImages = true;
    fileInput.disabled = true;
    publishButton.disabled = true;
    imageStatus.textContent = '사진을 확인하고 있습니다.';
    const problems = [];
    try {
      const config = configuration();
      for (const file of chosen) {
        try {
          if (images.some(image => image.file.name === file.name && image.file.size === file.size && image.file.lastModified === file.lastModified)) {
            problems.push(`${file.name}: 이미 선택한 사진입니다`);
            continue;
          }
          const problem = await validateImage(file);
          if (problem) { problems.push(`${file.name}: ${problem}`); continue; }
          const extension = file.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg');
          const path = `assets/uploads/photo-${randomId()}.${extension}`;
          const image = { file, path, url: `${config.base}/${path}`, preview: URL.createObjectURL(file) };
          images.push(image);
          insertImage(image);
        } catch (_) {
          problems.push(`${file.name}: 파일을 확인할 수 없습니다`);
        }
      }
      renderImages();
      imageStatus.textContent = problems.length ? problems.join(' / ') : `${images.length}장의 사진이 선택되었습니다.`;
    } catch (_) {
      imageStatus.textContent = '사이트의 저장소 또는 baseurl 설정을 확인해 주세요.';
    } finally {
      validatingImages = false;
      fileInput.disabled = false;
      publishButton.disabled = false;
    }
  });

  function yaml(value) {
    // JSON strings/arrays are YAML-compatible; escape YAML line-separator characters too.
    return JSON.stringify(value).replace(/[\u0085\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  }

  function commaList(value) {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  // Jekyll evaluates Liquid before Markdown, including within code fences.
  // Preserve the author's literal text and safely split any raw-block terminator.
  function literalMarkdown(body) {
    const escaped = body.replace(/\{%-?\s*endraw\b[\s\S]*?%\}/g, match =>
      "{% endraw %}{{ '{' }}" + match.slice(1) + '{% raw %}');
    return `{% raw %}\n${escaped}\n{% endraw %}`;
  }

  function makePost(data) {
    return [
      '---',
      'layout: post',
      `title: ${yaml(data.title)}`,
      `date: ${yaml(`${data.date} 00:00:00`)}`,
      `description: ${yaml(data.description)}`,
      `excerpt: ${yaml(data.description || data.title)}`,
      `categories: ${yaml(data.categories)}`,
      `tags: ${yaml(data.tags)}`,
      '---',
      literalMarkdown(data.body),
      ''
    ].join('\n');
  }

  function toBase64(bytes) {
    let binary = '';
    for (let start = 0; start < bytes.length; start += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
    }
    return btoa(binary);
  }

  class ApiError extends Error {
    constructor(statusCode) { super('GitHub request failed'); this.statusCode = statusCode; }
  }

  async function github(token, endpoint, options = {}) {
    const response = await fetch(API_ORIGIN + endpoint, {
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer'
    });
    if (!response.ok) throw new ApiError(response.status);
    if (options.noJson) return null;
    return response.json();
  }

  function sha(value) {
    if (typeof value !== 'string' || !/^[0-9a-f]{40}$/i.test(value)) throw new Error('invalid GitHub response');
    return value;
  }

  async function pathsAreUnused(token, repoApi, baseTree, paths) {
    const trees = new Map();
    async function entries(treeSha) {
      if (!trees.has(treeSha)) {
        const tree = await github(token, `${repoApi}/git/trees/${treeSha}`);
        // Never assume a truncated or malformed listing proves a path is absent.
        if (!Array.isArray(tree?.tree) || tree.truncated === true) throw new Error('incomplete Git tree');
        trees.set(treeSha, tree.tree);
      }
      return trees.get(treeSha);
    }
    for (const path of paths) {
      const parts = path.split('/');
      let treeSha = baseTree;
      for (let i = 0; i < parts.length; i++) {
        const entry = (await entries(treeSha)).find(item => item.path === parts[i]);
        if (!entry) break;
        // A final entry or a non-tree ancestor must never be replaced.
        if (i === parts.length - 1 || entry.type !== 'tree') return false;
        treeSha = sha(entry.sha);
      }
    }
    return true;
  }

  function errorMessage(error) {
    if (error instanceof ApiError) {
      if (error.statusCode === 401) return '토큰이 유효하지 않거나 만료되었습니다. 새 토큰을 입력해 주세요.';
      if (error.statusCode === 403) return 'GitHub가 요청을 거절했습니다. 저장소 접근 및 Contents 읽기/쓰기 권한, API 제한을 확인해 주세요.';
      if (error.statusCode === 404) return '저장소 또는 브랜치를 찾을 수 없습니다. 토큰의 저장소 접근 권한과 사이트 설정을 확인해 주세요.';
      if (error.statusCode === 409 || error.statusCode === 422) return '브랜치가 변경되었거나 GitHub가 요청을 거절했습니다. GitHub에서 상태를 확인한 뒤 다시 게시해 주세요.';
      return 'GitHub 요청을 완료하지 못했습니다. 잠시 후 저장소 상태를 확인하고 다시 시도해 주세요.';
    }
    return '요청을 완료하지 못했습니다. 네트워크와 사이트 설정을 확인한 뒤 다시 시도해 주세요.';
  }

  publishButton.addEventListener('click', async () => {
    if (working || validatingImages) return;
    if (!form.reportValidity()) {
      tokenInput.value = '';
      showStatus('필수 항목을 확인하고 토큰을 다시 입력해 주세요.', true);
      return;
    }

    let token = tokenInput.value.trim();
    tokenInput.value = '';
    let patchStarted = false;
    let filePath = '';
    let config;
    try {
      if (!token) throw new Error('empty token');
      config = configuration();
      const date = dateInput.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) throw new Error('invalid date');
      const data = {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        date,
        categories: commaList(categoriesInput.value),
        tags: commaList(tagsInput.value),
        body: bodyInput.value
      };
      if (!data.title || !data.body.trim()) {
        showStatus('제목과 본문을 입력하고 토큰을 다시 입력해 주세요.', true);
        return;
      }
      if (Array.from(removedPaths).some(path => data.body.includes(path))) {
        showStatus('제거한 사진의 경로가 본문에 남아 있습니다. 해당 경로를 지우고 토큰을 다시 입력해 주세요.', true);
        return;
      }
      filePath = `_posts/${date}-post-${randomId()}.md`;
      const paths = [filePath, ...images.map(image => image.path)];
      if (new Set(paths).size !== paths.length) throw new Error('duplicate path');
      const repoApi = `/repos/${encodeSegment(config.owner)}/${encodeSegment(config.repo)}`;
      const branchPath = config.branch.split('/').map(encodeSegment).join('/');
      const pathApi = path => path.split('/').map(encodeSegment).join('/');

      working = true;
      fields.disabled = true;
      publishButton.disabled = true;
      form.setAttribute('aria-busy', 'true');
      showStatus('GitHub에서 현재 브랜치를 확인하고 있습니다.');
      const ref = await github(token, `${repoApi}/git/ref/heads/${branchPath}`);
      const head = sha(ref?.object?.sha);
      const commit = await github(token, `${repoApi}/git/commits/${head}`);
      const baseTree = sha(commit?.tree?.sha);

      // Walk the exact parent snapshot, checking both target paths and their ancestors.
      if (!await pathsAreUnused(token, repoApi, baseTree, paths)) {
        showStatus('같은 경로의 파일이 이미 있어 게시를 중단했습니다. 기존 파일은 변경하지 않았습니다. 토큰을 다시 입력해 주세요.', true);
        return;
      }

      const entries = [];
      const postBytes = new TextEncoder().encode(makePost(data));
      showStatus('글을 업로드하고 있습니다.');
      const postBlob = await github(token, `${repoApi}/git/blobs`, { method: 'POST', body: { content: toBase64(postBytes), encoding: 'base64' } });
      entries.push({ path: filePath, mode: '100644', type: 'blob', sha: sha(postBlob?.sha) });
      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        showStatus(`사진을 업로드하고 있습니다. (${index + 1}/${images.length})`);
        const imageBytes = new Uint8Array(await image.file.arrayBuffer());
        const blob = await github(token, `${repoApi}/git/blobs`, { method: 'POST', body: { content: toBase64(imageBytes), encoding: 'base64' } });
        entries.push({ path: image.path, mode: '100644', type: 'blob', sha: sha(blob?.sha) });
      }
      showStatus('하나의 커밋을 만들고 있습니다.');
      const tree = await github(token, `${repoApi}/git/trees`, { method: 'POST', body: { base_tree: baseTree, tree: entries } });
      const newCommit = await github(token, `${repoApi}/git/commits`, {
        method: 'POST', body: { message: `Add post ${date}`, tree: sha(tree?.sha), parents: [head] }
      });
      const newCommitSha = sha(newCommit?.sha);
      showStatus('브랜치를 업데이트하고 있습니다.');
      patchStarted = true;
      await github(token, `${repoApi}/git/refs/heads/${branchPath}`, { method: 'PATCH', body: { sha: newCommitSha, force: false }, noJson: true });
      patchStarted = false;

      images.forEach(image => URL.revokeObjectURL(image.preview));
      images.length = 0;
      removedPaths.clear();
      renderImages();
      imageStatus.textContent = '';
      form.reset();
      dateInput.value = todayLocal();
      showStatus('게시가 완료되었습니다. GitHub Pages에 반영되기까지 시간이 걸릴 수 있습니다. 미래 날짜의 글은 바로 표시되지 않을 수 있습니다.');
      const link = document.createElement('a');
      link.href = `https://github.com/${encodeSegment(config.owner)}/${encodeSegment(config.repo)}/blob/${newCommitSha}/${pathApi(filePath)}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'GitHub에서 게시된 글 파일 확인하기 ↗';
      status.append(document.createElement('br'), link);
    } catch (error) {
      const uncertain = patchStarted && (!(error instanceof ApiError) || error.statusCode >= 500);
      if (uncertain) {
        showStatus(`브랜치 업데이트의 결과를 확인하지 못했습니다. 중복 게시를 피하려면 다시 시도하기 전에 GitHub의 ${filePath} 파일을 확인해 주세요.`, true);
      } else {
        showStatus(`${errorMessage(error)} 토큰은 지워졌습니다.`, true);
      }
    } finally {
      token = '';
      tokenInput.value = '';
      working = false;
      fields.disabled = false;
      publishButton.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });

  window.addEventListener('pagehide', event => {
    if (!event.persisted) images.forEach(image => URL.revokeObjectURL(image.preview));
  });

  window.addEventListener('beforeunload', event => {
    const hasDraft = working || images.length > 0 || [titleInput, descriptionInput, categoriesInput, tagsInput, bodyInput]
      .some(input => input.value.trim().length > 0) || dateInput.value !== todayLocal();
    if (!hasDraft) return;
    event.preventDefault();
    event.returnValue = '';
  });
})();
