import { extend, override } from 'flarum/common/extend';
import GlobalSearch from 'flarum/forum/components/GlobalSearch';
import Search from 'flarum/forum/components/Search';
import CommentPost from 'flarum/forum/components/CommentPost';
import app from 'flarum/forum/app';

function truncateExcerptNode(node, limit = 180) {
  let remaining = limit;

  const visit = (value) => {
    if (remaining <= 0 || value === null || value === undefined) return null;

    if (typeof value === 'string') {
      if (value.length <= remaining) {
        remaining -= value.length;
        return value;
      }

      const truncated = value.slice(0, remaining).trimEnd();
      remaining = 0;
      return `${truncated}\u2026`;
    }

    if (Array.isArray(value)) {
      const next = value
        .map((child) => visit(child))
        .filter((child) => child !== null && child !== undefined && child !== '');

      return next.length ? next : null;
    }

    if (typeof value === 'object') {
      const cloned = { ...value };
      const nextChildren = visit(value.children);

      if (nextChildren === null) return null;

      cloned.children = nextChildren;
      return cloned;
    }

    return value;
  };

  return visit(node);
}

function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      resolve();
    } catch (error) {
      reject(error);
    } finally {
      textarea.remove();
    }
  });
}

function normalizeLanguageLabel(language) {
  const aliases = {
    js: 'JavaScript',
    jsx: 'JSX',
    ts: 'TypeScript',
    tsx: 'TSX',
    html: 'HTML',
    xml: 'XML',
    css: 'CSS',
    scss: 'SCSS',
    less: 'Less',
    php: 'PHP',
    py: 'Python',
    rb: 'Ruby',
    rs: 'Rust',
    go: 'Go',
    java: 'Java',
    kt: 'Kotlin',
    c: 'C',
    cpp: 'C++',
    cs: 'C#',
    sh: 'Shell',
    bash: 'Bash',
    zsh: 'Zsh',
    shell: 'Shell',
    powershell: 'PowerShell',
    ps1: 'PowerShell',
    yml: 'YAML',
    yaml: 'YAML',
    md: 'Markdown',
    json: 'JSON',
    sql: 'SQL',
    diff: 'Diff',
    dockerfile: 'Dockerfile',
    plaintext: 'Plain Text',
    text: 'Plain Text',
  };

  const key = String(language || '').trim().toLowerCase();
  if (!key) return 'Code';
  if (aliases[key]) return aliases[key];

  return key
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`))
    .join(' ');
}

function detectCodeLanguage(pre, code) {
  const directValue =
    pre.getAttribute('data-language') ||
    pre.getAttribute('data-lang') ||
    code?.getAttribute?.('data-language') ||
    code?.getAttribute?.('data-lang');

  if (directValue) return normalizeLanguageLabel(directValue);

  const classSource = [pre.className, code?.className || ''].join(' ');
  const matched = classSource.match(/(?:^|\s)(?:lang|language)-([a-z0-9#+._-]+)/i);

  if (matched?.[1]) return normalizeLanguageLabel(matched[1]);

  return 'Code';
}

function getCodeText(pre, code) {
  if (code) return code.textContent || '';

  const clone = pre.cloneNode(true);
  clone.querySelectorAll('.z-codeblock-toolbar').forEach((node) => node.remove());
  return clone.textContent || '';
}

function initCodeBlocks(root) {
  if (!root) return;

  root.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    const text = getCodeText(pre, code).trim();

    if (!text) return;

    pre.classList.add('z-codeblock');

    const language = detectCodeLanguage(pre, code);
    let toolbar = pre.querySelector('.z-codeblock-toolbar');
    let label = pre.querySelector('.z-codeblock-language');
    let button = pre.querySelector('.z-codeblock-copy');

    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'z-codeblock-toolbar';

      label = document.createElement('span');
      label.className = 'z-codeblock-language';
      toolbar.appendChild(label);

      button = document.createElement('button');
      button.type = 'button';
      button.className = 'z-codeblock-copy';
      button.setAttribute('aria-label', '复制代码');
      toolbar.appendChild(button);

      pre.prepend(toolbar);
    }

    if (label) {
      label.textContent = language;
    }

    if (button && !button.dataset.bound) {
      button.dataset.bound = 'true';
      button.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i><span>复制</span>';

      button.addEventListener('click', () => {
        const currentCode = pre.querySelector('code');
        const currentText = getCodeText(pre, currentCode);

        copyTextToClipboard(currentText)
          .then(() => {
            button.classList.add('is-copied');
            button.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i><span>已复制</span>';

            window.setTimeout(() => {
              button.classList.remove('is-copied');
              button.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i><span>复制</span>';
            }, 1800);
          })
          .catch(() => {});
      });
    }
  });
}

app.initializers.add('zephyrisle/z-theme-search-v1', () => {
  override(GlobalSearch.prototype, 'view', function (original, ...args) {
    return <Search state={this.searchState} />;
  });

  extend(Search.prototype, 'view', function (vnode) {
    if (!vnode || !Array.isArray(vnode.children)) return;

    const searchInput = vnode.children.find(
      (child) => typeof child?.attrs?.className === 'string' && child.attrs.className.includes('Search-input')
    );

    if (searchInput) {
      searchInput.attrs.className = 'Input Search-input Input--withPrefix Input--withClear';

      if (Array.isArray(searchInput.children)) {
        const hasPrefixIcon = searchInput.children.some(
          (child) => typeof child?.attrs?.className === 'string' && child.attrs.className.includes('Input-prefix-icon')
        );

        if (!hasPrefixIcon) {
          searchInput.children.unshift(<i aria-hidden="true" className="icon fas fa-search Input-prefix-icon" />);
        }
      }
    }

    const walk = (node) => {
      if (!node || typeof node !== 'object') return;

      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      if (typeof node.attrs?.className === 'string' && node.attrs.className.includes('DiscussionSearchResult-excerpt')) {
        const nextChildren = truncateExcerptNode(node.children);
        if (nextChildren !== null) node.children = nextChildren;
        return;
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    };

    walk(vnode);
  });

  extend(CommentPost.prototype, 'oncreate', function () {
    initCodeBlocks(this.element);
  });

  extend(CommentPost.prototype, 'onupdate', function () {
    initCodeBlocks(this.element);
  });
});
