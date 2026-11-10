(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const search = document.querySelector('#post-search');
  const posts = Array.from(document.querySelectorAll('[data-post]'));
  if (!search) return;
  const categories = Array.from(document.querySelectorAll('[data-category].filter-button'));
  const tags = Array.from(document.querySelectorAll('.tag-filter'));
  const status = document.querySelector('#search-status');
  const empty = document.querySelector('#no-results');
  const initial = new URLSearchParams(location.search);
  let selectedCategory = (initial.get('category') || '').toLowerCase();
  let selectedTag = (initial.get('tag') || '').toLowerCase();

  function syncFilterUrl() {
    const params = new URLSearchParams(location.search);
    if (selectedCategory) params.set('category', selectedCategory);
    else params.delete('category');
    if (selectedTag) params.set('tag', selectedTag);
    else params.delete('tag');
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
  }

  function update() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    posts.forEach(post => {
      const postCategories = JSON.parse(post.dataset.categories || '[]').map(value => String(value).toLowerCase());
      const postTags = JSON.parse(post.dataset.tags || '[]').map(value => String(value).toLowerCase());
      const text = `${post.dataset.search || ''} ${postCategories.join(' ')} ${postTags.join(' ')}`;
      const categoryMatch = !selectedCategory || postCategories.includes(selectedCategory);
      const tagMatch = !selectedTag || postTags.includes(selectedTag);
      const show = (!query || text.includes(query)) && categoryMatch && tagMatch;
      post.hidden = !show;
      if (show) visible += 1;
    });
    categories.forEach(button => {
      const selected = button.dataset.category === selectedCategory;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    tags.forEach(button => button.classList.toggle('is-active', button.dataset.tag === selectedTag));
    if (status) status.textContent = (query || selectedCategory || selectedTag) ? `검색된 기록 ${visible}개${selectedTag ? ` · #${selectedTag}` : ''}` : '';
    if (empty) empty.hidden = visible !== 0 || posts.length === 0;
  }
  search.addEventListener('input', update);
  categories.forEach(button => button.addEventListener('click', () => {
    selectedCategory = button.dataset.category || '';
    selectedTag = '';
    syncFilterUrl();
    update();
    if (button.classList.contains('side-category')) document.querySelector('#stories')?.scrollIntoView({behavior: 'smooth'});
  }));
  tags.forEach(button => button.addEventListener('click', () => {
    selectedTag = selectedTag === button.dataset.tag ? '' : button.dataset.tag;
    selectedCategory = '';
    syncFilterUrl();
    update();
    document.querySelector('#stories')?.scrollIntoView({behavior: 'smooth'});
  }));
  update();
})();
