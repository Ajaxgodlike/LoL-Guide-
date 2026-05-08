/* ============================================
   LOL学习站 - 主应用逻辑
   Created by 粥粥
   ============================================ */

(function () {
    'use strict';

    // ---------- 状态管理 ----------
    const state = {
        champions: [],        // 所有英雄数据
        filtered: [],         // 筛选后的英雄
        favorites: [],        // 收藏的英雄ID
        compareList: [],      // 对比的英雄ID（最多3个）
        currentFilter: 'all', // 当前筛选标签
        searchQuery: '',      // 搜索关键词
        sortBy: 'name-asc',   // 排序方式
        isLoading: true
    };

    // ---------- DOM 元素 ----------
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        grid: $('#champions-grid'),
        loading: $('#loading'),
        noResults: $('#no-results'),
        searchInput: $('#search-input'),
        clearSearch: $('#clear-search'),
        filterTags: $$('.filter-tag'),
        sortSelect: $('#sort-select'),
        resultCount: $('#result-count'),
        totalChampions: $('#total-champions'),
        favCount: $('#fav-count'),
        themeToggle: $('#theme-toggle'),
        mobileMenuBtn: $('#mobile-menu-btn'),
        mobileMenu: $('#mobile-menu'),
        // 弹窗
        favoritesModal: $('#favorites-modal'),
        compareModal: $('#compare-modal'),
        detailModal: $('#detail-modal'),
        favoritesList: $('#favorites-list'),
        compareContent: $('#compare-content'),
        detailTitle: $('#detail-title'),
        detailContent: $('#detail-content'),
        // 弹窗按钮
        navFavorites: $('#nav-favorites'),
        navCompare: $('#nav-compare'),
        closeFavorites: $('#close-favorites'),
        closeCompare: $('#close-compare'),
        closeDetail: $('#close-detail'),
        mobileFavorites: $('#mobile-favorites'),
        mobileCompare: $('#mobile-compare')
    };

    // ---------- 初始化 ----------
    async function init() {
        loadTheme();
        loadFavorites();
        loadCompareList();
        bindEvents();
        await loadChampions();
    }

    // ---------- 加载英雄数据 ----------
    async function loadChampions() {
        state.isLoading = true;
        showLoading(true);

        const data = await LOLAPI.getChampionList();
        if (data) {
            state.champions = LOLAPI.processChampionList(data);
            state.filtered = [...state.champions];
            els.totalChampions.textContent = state.champions.length;
            applyFilters();
        } else {
            showError('加载失败，请检查网络连接后刷新页面');
        }

        state.isLoading = false;
        showLoading(false);
    }

    // ---------- 事件绑定 ----------
    function bindEvents() {
        // 搜索
        els.searchInput.addEventListener('input', debounce((e) => {
            state.searchQuery = e.target.value.trim().toLowerCase();
            els.clearSearch.classList.toggle('visible', !!e.target.value);
            applyFilters();
        }, 200));

        els.clearSearch.addEventListener('click', () => {
            els.searchInput.value = '';
            state.searchQuery = '';
            els.clearSearch.classList.remove('visible');
            applyFilters();
        });

        // 筛选标签
        els.filterTags.forEach(tag => {
            tag.addEventListener('click', () => {
                els.filterTags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                state.currentFilter = tag.dataset.tag;
                applyFilters();
            });
        });

        // 排序
        els.sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            applyFilters();
        });

        // 主题切换
        els.themeToggle.addEventListener('click', toggleTheme);

        // 移动端菜单
        els.mobileMenuBtn.addEventListener('click', () => {
            els.mobileMenu.classList.toggle('active');
        });

        // 弹窗
        els.navFavorites.addEventListener('click', (e) => { e.preventDefault(); openFavoritesModal(); });
        els.navCompare.addEventListener('click', (e) => { e.preventDefault(); openCompareModal(); });
        els.mobileFavorites.addEventListener('click', (e) => { e.preventDefault(); openFavoritesModal(); els.mobileMenu.classList.remove('active'); });
        els.mobileCompare.addEventListener('click', (e) => { e.preventDefault(); openCompareModal(); els.mobileMenu.classList.remove('active'); });

        els.closeFavorites.addEventListener('click', () => closeModal(els.favoritesModal));
        els.closeCompare.addEventListener('click', () => closeModal(els.compareModal));
        els.closeDetail.addEventListener('click', () => closeModal(els.detailModal));

        // 点击遮罩关闭弹窗
        [els.favoritesModal, els.compareModal, els.detailModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modal);
            });
        });

        // ESC 关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                [els.detailModal, els.compareModal, els.favoritesModal].forEach(closeModal);
            }
        });
    }

    // ---------- 筛选和排序 ----------
    function applyFilters() {
        let result = [...state.champions];

        // 搜索过滤
        if (state.searchQuery) {
            result = result.filter(c =>
                c.name.toLowerCase().includes(state.searchQuery) ||
                c.title.toLowerCase().includes(state.searchQuery) ||
                c.id.toLowerCase().includes(state.searchQuery)
            );
        }

        // 标签过滤
        if (state.currentFilter !== 'all') {
            result = result.filter(c => c.tags.includes(state.currentFilter));
        }

        // 排序
        result.sort((a, b) => {
            switch (state.sortBy) {
                case 'name-asc': return a.name.localeCompare(b.name, 'zh-CN');
                case 'name-desc': return b.name.localeCompare(a.name, 'zh-CN');
                case 'attack-desc': return b.info.attack - a.info.attack;
                case 'magic-desc': return b.info.magic - a.info.magic;
                case 'defense-desc': return b.info.defense - a.info.defense;
                case 'difficulty-desc': return b.info.difficulty - a.info.difficulty;
                default: return 0;
            }
        });

        state.filtered = result;
        renderChampions();
        els.resultCount.textContent = `显示 ${result.length} 个英雄`;
    }

    // ---------- 渲染英雄列表 ----------
    function renderChampions() {
        if (state.filtered.length === 0) {
            els.grid.innerHTML = '';
            els.noResults.style.display = 'block';
            return;
        }

        els.noResults.style.display = 'none';
        els.grid.innerHTML = state.filtered.map((champ, index) => createChampionCard(champ, index)).join('');

        // 绑定卡片事件
        els.grid.querySelectorAll('.champion-card').forEach(card => {
            const id = card.dataset.id;

            // 点击卡片 → 打开详情
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-action-btn')) return;
                openDetailModal(id);
            });

            // 收藏按钮
            card.querySelector('.btn-fav')?.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(id);
            });

            // 对比按钮
            card.querySelector('.btn-compare')?.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCompare(id);
            });
        });
    }

    // ---------- 创建英雄卡片 HTML ----------
    function createChampionCard(champ, index) {
        const isFav = state.favorites.includes(champ.id);
        const isCompare = state.compareList.includes(champ.id);
        const delay = Math.min(index * 30, 600);

        const tagsHtml = champ.tags.map(tag =>
            `<span class="card-tag ${tag}">${LOLAPI.TAG_MAP[tag] || tag}</span>`
        ).join('');

        return `
            <div class="champion-card" data-id="${champ.id}" style="animation-delay: ${delay}ms">
                <div class="champion-card-img">
                    <img src="${champ.iconUrl}" alt="${champ.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><rect fill=%22%231a2332%22 width=%2248%22 height=%2248%22/><text x=%2224%22 y=%2228%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2216%22>${champ.name[0]}</text></svg>'">
                    <div class="champion-card-tags">${tagsHtml}</div>
                    <div class="champion-card-actions">
                        <button class="card-action-btn btn-fav ${isFav ? 'active' : ''}" title="收藏">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="card-action-btn btn-compare ${isCompare ? 'active' : ''}" title="对比">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="champion-card-info">
                    <div class="champion-card-name">${champ.name}</div>
                    <div class="champion-card-title">${champ.title}</div>
                    <div class="champion-card-stats">
                        <span class="mini-stat attack"><i class="fas fa-sword"></i> ${champ.info.attack}</span>
                        <span class="mini-stat magic"><i class="fas fa-magic"></i> ${champ.info.magic}</span>
                        <span class="mini-stat defense"><i class="fas fa-shield"></i> ${champ.info.defense}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ---------- 英雄详情弹窗 ----------
    async function openDetailModal(championId) {
        openModal(els.detailModal);
        els.detailTitle.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
        els.detailContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        // 先用列表数据快速渲染基础信息
        const basicChamp = state.champions.find(c => c.id === championId);
        if (basicChamp) {
            els.detailTitle.textContent = basicChamp.name;
            els.detailContent.innerHTML = createBasicDetailHTML(basicChamp);
        }

        // 获取完整数据（含技能）
        const fullData = await LOLAPI.getChampionDetail(championId);
        if (fullData) {
            const detail = LOLAPI.processChampionDetail(fullData);
            els.detailTitle.textContent = detail.name;
            els.detailContent.innerHTML = createFullDetailHTML(detail);
        }
    }

    // 基础详情 HTML（快速加载）
    function createBasicDetailHTML(champ) {
        const tagsHtml = champ.tags.map(tag =>
            `<span class="detail-tag card-tag ${tag}">${LOLAPI.TAG_MAP[tag] || tag}</span>`
        ).join('');

        return `
            <div class="detail-hero">
                <div class="detail-img">
                    <img src="${champ.iconUrl}" alt="${champ.name}">
                </div>
                <div class="detail-basic">
                    <h2 class="detail-name">${champ.name}</h2>
                    <p class="detail-title">${champ.title}</p>
                    <div class="detail-tags">${tagsHtml}</div>
                    <p class="detail-blurb">${champ.blurb}</p>
                    ${createStatsHTML(champ.info)}
                </div>
            </div>
            <div class="loading"><div class="spinner"></div><p>正在加载技能数据...</p></div>
        `;
    }

    // 完整详情 HTML
    function createFullDetailHTML(detail) {
        const tagsHtml = detail.tags.map(tag =>
            `<span class="detail-tag card-tag ${tag}">${LOLAPI.TAG_MAP[tag] || tag}</span>`
        ).join('');

        const build = LOLAPI.getRecommendedBuild(detail);
        const counterTips = LOLAPI.getCounterTips(detail);

        return `
            <div class="detail-hero">
                <div class="detail-img">
                    <img src="${detail.splashUrl}" alt="${detail.name}" onerror="this.src='${detail.iconUrl}'">
                </div>
                <div class="detail-basic">
                    <h2 class="detail-name">${detail.name}</h2>
                    <p class="detail-title">${detail.title}</p>
                    <div class="detail-tags">${tagsHtml}</div>
                    <p class="detail-blurb">${detail.blurb}</p>
                    ${createStatsHTML(detail.info)}
                </div>
            </div>

            <!-- 技能介绍 -->
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-magic"></i> 技能介绍</h3>
                <div class="skills-grid">
                    <div class="skill-card">
                        <div class="skill-card-header">
                            <div class="skill-icon"><img src="${detail.passive.iconUrl}" alt="${detail.passive.name}" onerror="this.style.display='none'"></div>
                            <div>
                                <div class="skill-name">${detail.passive.name}</div>
                                <div class="skill-key">被动</div>
                            </div>
                        </div>
                        <div class="skill-desc">${stripHTML(detail.passive.description)}</div>
                    </div>
                    ${detail.spells.map(spell => `
                        <div class="skill-card">
                            <div class="skill-card-header">
                                <div class="skill-icon"><img src="${spell.iconUrl}" alt="${spell.name}" onerror="this.style.display='none'"></div>
                                <div>
                                    <div class="skill-name">${spell.name}</div>
                                    <div class="skill-key">${spell.key}</div>
                                </div>
                            </div>
                            <div class="skill-desc">${stripHTML(spell.description)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- 基础属性 -->
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-chart-bar"></i> 基础属性</h3>
                <table class="stats-table">
                    <tr><th>生命值</th><td>${detail.stats.hp} (+${detail.stats.hpperlevel}/级)</td></tr>
                    <tr><th>法力值</th><td>${detail.stats.mp || detail.partype === '无' ? '无蓝条' : detail.stats.mp + ' (+' + detail.stats.mpperlevel + '/级)'}</td></tr>
                    <tr><th>移动速度</th><td>${detail.stats.movespeed}</td></tr>
                    <tr><th>攻击力</th><td>${detail.stats.attackdamage} (+${detail.stats.attackdamageperlevel}/级)</td></tr>
                    <tr><th>攻击速度</th><td>${(detail.stats.attackspeed * 100).toFixed(0)}% (+${(detail.stats.attackspeedperlevel * 100).toFixed(1)}%/级)</td></tr>
                    <tr><th>护甲</th><td>${detail.stats.armor} (+${detail.stats.armorperlevel}/级)</td></tr>
                    <tr><th>魔抗</th><td>${detail.stats.spellblock} (+${detail.stats.spellblockperlevel}/级)</td></tr>
                    <tr><th>攻击距离</th><td>${detail.stats.attackrange}</td></tr>
                </table>
            </div>

            <!-- 出装推荐 -->
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-shopping-cart"></i> 推荐出装</h3>
                <div class="build-section">
                    <div class="build-block">
                        <h4><i class="fas fa-box"></i> 推荐装备</h4>
                        <div class="build-items">
                            ${build.items.map((item) => `
                                <div class="build-item-slot" title="${item.name}" style="border-style:solid; padding:0; overflow:hidden;">
                                    <img src="${item.iconUrl}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-cube\\'></i>'">
                                </div>
                            `).join('')}
                        </div>
                        <div style="margin-top:10px; font-size:0.75rem; color:var(--text-muted);">
                            ${build.items.map((item, i) => `${i + 1}. ${item.name}`).join(' &nbsp;|&nbsp; ')}
                        </div>
                    </div>
                    <div class="build-block">
                        <h4><i class="fas fa-gem"></i> 推荐符文</h4>
                        <div class="rune-grid">
                            ${build.runes.map((rune) => `
                                <div class="rune-slot" title="${rune.name}" style="border-style:solid; padding:0; overflow:hidden;">
                                    <img src="${rune.iconUrl}" alt="${rune.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-star\\'></i>'">
                                </div>
                            `).join('')}
                        </div>
                        <div style="margin-top:10px; font-size:0.75rem; color:var(--text-muted);">
                            ${build.runes.map((rune, i) => `${i + 1}. ${rune.name}`).join(' &nbsp;|&nbsp; ')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 克制关系和技巧 -->
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-lightbulb"></i> 攻略技巧</h3>
                <div class="build-section">
                    <div class="build-block">
                        <h4><i class="fas fa-check-circle" style="color:var(--success)"></i> 优势</h4>
                        <p style="font-size:0.85rem; color:var(--text-secondary);">${counterTips.strong}</p>
                    </div>
                    <div class="build-block">
                        <h4><i class="fas fa-exclamation-triangle" style="color:var(--warning)"></i> 注意</h4>
                        <p style="font-size:0.85rem; color:var(--text-secondary);">${counterTips.weak}</p>
                    </div>
                    <div class="build-block" style="grid-column: 1 / -1;">
                        <h4><i class="fas fa-fire" style="color:var(--tag-assassin)"></i> 连招技巧</h4>
                        <p style="font-size:0.85rem; color:var(--text-secondary);">${counterTips.combo}</p>
                    </div>
                </div>
            </div>

            ${detail.allytips.length > 0 ? `
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-users"></i> 友方提示</h3>
                <ul style="padding-left:20px; font-size:0.85rem; color:var(--text-secondary);">
                    ${detail.allytips.map(tip => `<li style="margin-bottom:6px;">${tip}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            ${detail.enemytips.length > 0 ? `
            <div class="detail-section">
                <h3 class="detail-section-title"><i class="fas fa-skull-crossbones"></i> 敌方提示</h3>
                <ul style="padding-left:20px; font-size:0.85rem; color:var(--text-secondary);">
                    ${detail.enemytips.map(tip => `<li style="margin-bottom:6px;">${tip}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        `;
    }

    // 属性条 HTML
    function createStatsHTML(info) {
        const stats = [
            { label: '攻击', key: 'attack', value: info.attack },
            { label: '防御', key: 'defense', value: info.defense },
            { label: '法术', key: 'magic', value: info.magic },
            { label: '难度', key: 'difficulty', value: info.difficulty }
        ];

        return `
            <div class="detail-stats">
                ${stats.map(s => `
                    <div class="stat-bar-item">
                        <span class="stat-bar-label">${s.label}</span>
                        <div class="stat-bar-track">
                            <div class="stat-bar-fill ${s.key}" style="width: ${s.value * 10}%"></div>
                        </div>
                        <span class="stat-bar-value">${s.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ---------- 收藏功能 ----------
    function toggleFavorite(championId) {
        const index = state.favorites.indexOf(championId);
        if (index > -1) {
            state.favorites.splice(index, 1);
        } else {
            state.favorites.push(championId);
        }
        saveFavorites();
        updateFavCount();
        renderChampions();
    }

    function loadFavorites() {
        try {
            state.favorites = JSON.parse(localStorage.getItem('lol_favorites') || '[]');
        } catch {
            state.favorites = [];
        }
        updateFavCount();
    }

    function saveFavorites() {
        localStorage.setItem('lol_favorites', JSON.stringify(state.favorites));
    }

    function updateFavCount() {
        els.favCount.textContent = state.favorites.length;
    }

    function openFavoritesModal() {
        const favChampions = state.champions.filter(c => state.favorites.includes(c.id));

        if (favChampions.length === 0) {
            els.favoritesList.innerHTML = '<p class="empty-msg"><i class="fas fa-heart-broken" style="font-size:2rem;display:block;margin-bottom:12px;"></i>还没有收藏任何英雄<br><small>点击英雄卡片上的 ❤️ 按钮来收藏</small></p>';
        } else {
            els.favoritesList.innerHTML = `
                <div class="favorites-grid">
                    ${favChampions.map(champ => `
                        <div class="fav-card" data-id="${champ.id}">
                            <img src="${champ.iconUrl}" alt="${champ.name}" loading="lazy">
                            <div class="fav-card-info">
                                <div class="fav-card-name">${champ.name}</div>
                                <div class="fav-card-title">${champ.title}</div>
                            </div>
                            <button class="fav-remove" data-id="${champ.id}" title="取消收藏">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;

            // 绑定事件
            els.favoritesList.querySelectorAll('.fav-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.fav-remove')) return;
                    closeModal(els.favoritesModal);
                    setTimeout(() => openDetailModal(card.dataset.id), 300);
                });
            });

            els.favoritesList.querySelectorAll('.fav-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(btn.dataset.id);
                    openFavoritesModal(); // 刷新
                });
            });
        }

        openModal(els.favoritesModal);
    }

    // ---------- 对比功能 ----------
    function toggleCompare(championId) {
        const index = state.compareList.indexOf(championId);
        if (index > -1) {
            state.compareList.splice(index, 1);
        } else {
            if (state.compareList.length >= 3) {
                showToast('最多只能对比3个英雄');
                return;
            }
            state.compareList.push(championId);
        }
        saveCompareList();
        renderChampions();
    }

    function loadCompareList() {
        try {
            state.compareList = JSON.parse(localStorage.getItem('lol_compare') || '[]');
        } catch {
            state.compareList = [];
        }
    }

    function saveCompareList() {
        localStorage.setItem('lol_compare', JSON.stringify(state.compareList));
    }

    function openCompareModal() {
        if (state.compareList.length < 2) {
            els.compareContent.innerHTML = `<p class="empty-msg"><i class="fas fa-exchange-alt" style="font-size:2rem;display:block;margin-bottom:12px;"></i>请在英雄卡片上点击 <strong>+</strong> 按钮选择英雄<br><small>至少选择2个，最多3个</small></p>`;
            openModal(els.compareModal);
            return;
        }

        const compareChampions = state.champions.filter(c => state.compareList.includes(c.id));

        els.compareContent.innerHTML = `
            <div class="compare-grid">
                ${compareChampions.map(champ => `
                    <div class="compare-card">
                        <div class="compare-card-img">
                            <img src="${champ.iconUrl}" alt="${champ.name}" loading="lazy">
                        </div>
                        <h3>${champ.name}</h3>
                        <p class="compare-title">${champ.title}</p>
                        <div style="margin-bottom:12px;">
                            ${champ.tags.map(t => `<span class="detail-tag card-tag ${t}" style="font-size:0.7rem;">${LOLAPI.TAG_MAP[t]}</span>`).join(' ')}
                        </div>
                        <div class="compare-stat-row">
                            <span class="compare-stat-label">攻击</span>
                            <span class="compare-stat-value" style="color:var(--tag-fighter)">${champ.info.attack}</span>
                        </div>
                        <div class="compare-stat-row">
                            <span class="compare-stat-label">法术</span>
                            <span class="compare-stat-value" style="color:var(--tag-mage)">${champ.info.magic}</span>
                        </div>
                        <div class="compare-stat-row">
                            <span class="compare-stat-label">防御</span>
                            <span class="compare-stat-value" style="color:var(--tag-tank)">${champ.info.defense}</span>
                        </div>
                        <div class="compare-stat-row">
                            <span class="compare-stat-label">难度</span>
                            <span class="compare-stat-value" style="color:var(--tag-assassin)">${champ.info.difficulty}</span>
                        </div>
                        <div class="compare-stat-row">
                            <span class="compare-stat-label">生命值</span>
                            <span class="compare-stat-value">${champ.stats.hp}</span>
                        </div>
                        <div class="compare-stat-row">
                            <span class="compare-stat-label">攻击力</span>
                            <span class="compare-stat-value">${champ.stats.attackdamage}</span>
                        </div>
                        <div class="compare-stat-row">
                            <span class="compare-stat-label">移动速度</span>
                            <span class="compare-stat-value">${champ.stats.movespeed}</span>
                        </div>
                        <div class="compare-stat-row">
                            <span class="compare-stat-label">攻击距离</span>
                            <span class="compare-stat-value">${champ.stats.attackrange}</span>
                        </div>
                        <button class="card-action-btn btn-compare active" style="margin:12px auto 0;" onclick="document.querySelector('.btn-compare[data-id=${champ.id}]')?.click(); document.querySelector('#close-compare').click();" title="移除对比">
                            <i class="fas fa-times"></i> 移除
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        openModal(els.compareModal);
    }

    // ---------- 主题切换 ----------
    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') !== 'light';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('lol_theme', isDark ? 'light' : 'dark');

        const icon = els.themeToggle.querySelector('i');
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('lol_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = els.themeToggle.querySelector('i');
        icon.className = savedTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // ---------- 弹窗控制 ----------
    function openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        modal.classList.remove('active');
        // 检查是否还有其他弹窗打开
        const anyOpen = [els.favoritesModal, els.compareModal, els.detailModal].some(m => m.classList.contains('active'));
        if (!anyOpen) document.body.style.overflow = '';
    }

    // ---------- 工具函数 ----------
    function showLoading(show) {
        els.loading.style.display = show ? 'flex' : 'none';
        els.grid.style.display = show ? 'none' : '';
    }

    function showError(msg) {
        els.loading.style.display = 'none';
        els.grid.style.display = 'none';
        els.noResults.style.display = 'block';
        els.noResults.innerHTML = `<i class="fas fa-exclamation-circle"></i><p>${msg}</p>`;
    }

    function stripHTML(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: var(--bg-card); color: var(--text-primary); padding: 12px 24px;
            border-radius: 10px; border: 1px solid var(--accent); font-size: 0.9rem;
            z-index: 9999; animation: fadeInUp 0.3s ease; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // ---------- 启动 ----------
    document.addEventListener('DOMContentLoaded', init);

})();
