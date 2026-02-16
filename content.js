// ============================================
// Gemini 常用问题助手 - Content Script
// 注入到 gemini.google.com 页面
// 支持在面板内直接管理分类和问题
// ============================================

(function () {
    'use strict';

    let panelVisible = false;
    let currentCategory = 'all';
    let manageMode = false;       // 是否处于管理模式
    let manageTab = 'questions';  // 管理模式下的子标签：questions / categories
    let allCategories = [];
    let allQuestions = [];

    const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

    // ---- 初始化 ----
    function init() {
        createTriggerButton();
        createOverlay();
        createPanel();
        createToast();
        loadData();
        listenMessages();
    }

    // ---- 检查扩展上下文是否有效 ----
    function isContextValid() {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }

    // ---- 从 Storage 加载数据 ----
    function loadData() {
        if (!isContextValid()) return;
        try {
            chrome.storage.sync.get(['categories', 'questions'], (data) => {
                if (chrome.runtime.lastError) return;
                allCategories = data.categories || [];
                allQuestions = data.questions || [];
                renderCurrentView();
            });
        } catch (e) {
            console.log('AI 常用问题助手：扩展已更新，请刷新页面');
        }
    }

    function saveData(callback) {
        if (!isContextValid()) return;
        try {
            chrome.storage.sync.set({ categories: allCategories, questions: allQuestions }, () => {
                if (chrome.runtime.lastError) return;
                if (callback) callback();
            });
        } catch (e) {
            console.log('AI 常用问题助手：扩展已更新，请刷新页面');
        }
    }

    // ---- 监听 storage 变化 ----
    try {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync') {
                if (changes.categories) allCategories = changes.categories.newValue || [];
                if (changes.questions) allQuestions = changes.questions.newValue || [];
                renderCurrentView();
            }
        });
    } catch (e) { /* 扩展上下文已失效 */ }

    // ---- 监听来自 background 的快捷键消息 ----
    function listenMessages() {
        if (!isContextValid()) return;
        try {
            chrome.runtime.onMessage.addListener((msg) => {
                if (msg.action === 'toggle-panel') {
                    togglePanel();
                }
            });
        } catch (e) { /* 扩展上下文已失效 */ }
    }

    // ---- 创建浮动触发按钮（可拖拽）----
    function createTriggerButton() {
        const btn = document.createElement('button');
        btn.id = 'gqa-trigger-btn';
        btn.innerHTML = '⚡';
        btn.title = '常用问题 (Alt+Q) — 可拖拽';

        // 恢复已保存的位置
        const saved = localStorage.getItem('gqa-btn-pos');
        if (saved) {
            try {
                const pos = JSON.parse(saved);
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
                btn.style.left = Math.min(pos.x, window.innerWidth - 56) + 'px';
                btn.style.top = Math.min(pos.y, window.innerHeight - 56) + 'px';
            } catch (e) { /* 忽略 */ }
        }

        // 拖拽逻辑
        let isDragging = false, hasMoved = false, startX, startY, origX, origY;

        btn.addEventListener('pointerdown', (e) => {
            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = btn.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;
            btn.setPointerCapture(e.pointerId);
            btn.style.transition = 'none';
            btn.style.animation = 'none';
            e.preventDefault();
        });

        btn.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
            if (!hasMoved) return;
            let newX = origX + dx;
            let newY = origY + dy;
            // 限制不超出屏幕
            newX = Math.max(0, Math.min(newX, window.innerWidth - 48));
            newY = Math.max(0, Math.min(newY, window.innerHeight - 48));
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
            btn.style.left = newX + 'px';
            btn.style.top = newY + 'px';
        });

        btn.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            btn.releasePointerCapture(e.pointerId);
            btn.style.transition = '';
            if (hasMoved) {
                // 保存位置
                const rect = btn.getBoundingClientRect();
                localStorage.setItem('gqa-btn-pos', JSON.stringify({ x: rect.left, y: rect.top }));
                // 更新面板位置
                updatePanelPosition();
            } else {
                // 没拖动 = 点击
                togglePanel();
            }
        });

        document.body.appendChild(btn);
    }

    // ---- 更新面板位置（跟随按钮）----
    function updatePanelPosition() {
        const btn = document.getElementById('gqa-trigger-btn');
        const panel = document.getElementById('gqa-panel');
        if (!btn || !panel) return;
        const rect = btn.getBoundingClientRect();
        const panelW = 400, panelH = 560;
        // 默认在按钮上方显示
        let left = rect.left + rect.width / 2 - panelW / 2;
        let top = rect.top - panelH - 12;
        // 如果上方放不下，放到下方
        if (top < 10) top = rect.bottom + 12;
        // 水平边界
        left = Math.max(10, Math.min(left, window.innerWidth - panelW - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - panelH - 10));
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }

    // ---- 创建遮罩层 ----
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'gqa-overlay';
        overlay.addEventListener('click', () => hidePanel());
        document.body.appendChild(overlay);
    }

    // ---- 创建 Toast ----
    function createToast() {
        const toast = document.createElement('div');
        toast.className = 'gqa-toast';
        toast.id = 'gqa-toast';
        document.body.appendChild(toast);
    }

    function showToast(msg) {
        const toast = document.getElementById('gqa-toast');
        toast.textContent = msg;
        toast.classList.add('gqa-show');
        setTimeout(() => toast.classList.remove('gqa-show'), 2000);
    }

    // ---- 创建问题面板 ----
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'gqa-panel';
        panel.innerHTML = `
      <div class="gqa-header">
        <div class="gqa-header-left">
          <div class="gqa-header-title">
            <span class="gqa-icon">⚡</span>
            常用问题
          </div>
        </div>
        <div class="gqa-header-right">
          <button class="gqa-header-btn" id="gqa-manage-toggle" title="管理模式">⚙️</button>
          <button class="gqa-header-btn" id="gqa-close-btn" title="关闭">✕</button>
        </div>
      </div>

      <!-- 管理模式导航 -->
      <div class="gqa-mode-bar" id="gqa-mode-bar">
        <div class="gqa-mode-tabs">
          <button class="gqa-mode-tab gqa-active" data-mtab="questions">📋 问题管理</button>
          <button class="gqa-mode-tab" data-mtab="categories">🏷️ 分类管理</button>
        </div>
      </div>

      <!-- 浏览模式内容 -->
      <div id="gqa-browse-view">
        <div class="gqa-search-box">
          <input type="text" class="gqa-search-input" id="gqa-search" placeholder="🔍 搜索问题..." />
        </div>
        <div class="gqa-tabs" id="gqa-tabs"></div>
        <div class="gqa-questions-list" id="gqa-questions-list"></div>
      </div>

      <!-- 管理模式 - 问题管理 -->
      <div class="gqa-manage-view" id="gqa-manage-questions">
        <div class="gqa-search-box">
          <input type="text" class="gqa-search-input" id="gqa-manage-search" placeholder="🔍 搜索问题..." />
        </div>
        <div id="gqa-question-form" class="gqa-inline-form"></div>
        <div class="gqa-manage-list" id="gqa-manage-questions-list"></div>
        <div class="gqa-add-bar">
          <button class="gqa-add-btn" id="gqa-add-question-btn">＋ 添加新问题</button>
        </div>
      </div>

      <!-- 管理模式 - 分类管理 -->
      <div class="gqa-manage-view" id="gqa-manage-categories">
        <div id="gqa-category-form" class="gqa-inline-form"></div>
        <div class="gqa-manage-list" id="gqa-manage-categories-list"></div>
        <div class="gqa-add-bar">
          <button class="gqa-add-btn" id="gqa-add-category-btn">＋ 添加新分类</button>
        </div>
      </div>

      <div class="gqa-footer">
        <span class="gqa-footer-text">按</span>
        <span class="gqa-kbd">Alt</span>
        <span class="gqa-footer-text">+</span>
        <span class="gqa-kbd">Q</span>
        <span class="gqa-footer-text">快速切换</span>
      </div>
    `;
        document.body.appendChild(panel);

        // 阻止面板内的点击冒泡
        panel.addEventListener('click', (e) => e.stopPropagation());

        // ---- 面板拖拽（通过标题栏）----
        const header = panel.querySelector('.gqa-header');
        let pDrag = false, pHasMoved = false, pStartX, pStartY, pOrigX, pOrigY;
        header.style.cursor = 'grab';

        header.addEventListener('pointerdown', (e) => {
            // 不拦截按钮点击
            if (e.target.closest('.gqa-header-btn')) return;
            pDrag = true;
            pHasMoved = false;
            pStartX = e.clientX;
            pStartY = e.clientY;
            const rect = panel.getBoundingClientRect();
            pOrigX = rect.left;
            pOrigY = rect.top;
            header.setPointerCapture(e.pointerId);
            header.style.cursor = 'grabbing';
            e.preventDefault();
        });

        header.addEventListener('pointermove', (e) => {
            if (!pDrag) return;
            const dx = e.clientX - pStartX;
            const dy = e.clientY - pStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pHasMoved = true;
            if (!pHasMoved) return;
            let newX = pOrigX + dx;
            let newY = pOrigY + dy;
            newX = Math.max(0, Math.min(newX, window.innerWidth - panel.offsetWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - 60));
            panel.style.left = newX + 'px';
            panel.style.top = newY + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        header.addEventListener('pointerup', (e) => {
            if (!pDrag) return;
            pDrag = false;
            header.releasePointerCapture(e.pointerId);
            header.style.cursor = 'grab';
            if (pHasMoved) {
                const rect = panel.getBoundingClientRect();
                localStorage.setItem('gqa-panel-pos', JSON.stringify({ x: rect.left, y: rect.top }));
            }
        });

        // ---- 面板缩放（右下角手柄）----
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'gqa-resize-handle';
        resizeHandle.innerHTML = '⟋';
        panel.appendChild(resizeHandle);

        let rDrag = false, rStartX, rStartY, rOrigW, rOrigH;

        resizeHandle.addEventListener('pointerdown', (e) => {
            rDrag = true;
            rStartX = e.clientX;
            rStartY = e.clientY;
            rOrigW = panel.offsetWidth;
            rOrigH = panel.offsetHeight;
            resizeHandle.setPointerCapture(e.pointerId);
            e.preventDefault();
            e.stopPropagation();
        });

        resizeHandle.addEventListener('pointermove', (e) => {
            if (!rDrag) return;
            let newW = rOrigW + (e.clientX - rStartX);
            let newH = rOrigH + (e.clientY - rStartY);
            newW = Math.max(300, Math.min(newW, window.innerWidth - 20));
            newH = Math.max(300, Math.min(newH, window.innerHeight - 20));
            panel.style.width = newW + 'px';
            panel.style.maxHeight = newH + 'px';
            panel.style.height = newH + 'px';
        });

        resizeHandle.addEventListener('pointerup', (e) => {
            if (!rDrag) return;
            rDrag = false;
            resizeHandle.releasePointerCapture(e.pointerId);
            localStorage.setItem('gqa-panel-size', JSON.stringify({
                w: panel.offsetWidth,
                h: panel.offsetHeight
            }));
        });

        // 关闭
        document.getElementById('gqa-close-btn').addEventListener('click', hidePanel);

        // 搜索
        document.getElementById('gqa-search').addEventListener('input', renderBrowseQuestions);
        document.getElementById('gqa-manage-search').addEventListener('input', renderManageQuestions);

        // 管理模式切换
        document.getElementById('gqa-manage-toggle').addEventListener('click', () => {
            manageMode = !manageMode;
            renderCurrentView();
        });

        // 管理子标签切换
        panel.querySelectorAll('.gqa-mode-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                manageTab = tab.dataset.mtab;
                panel.querySelectorAll('.gqa-mode-tab').forEach(t => t.classList.remove('gqa-active'));
                tab.classList.add('gqa-active');
                renderCurrentView();
            });
        });

        // 添加按钮
        document.getElementById('gqa-add-question-btn').addEventListener('click', () => showQuestionForm(null));
        document.getElementById('gqa-add-category-btn').addEventListener('click', () => showCategoryForm(null));
    }

    // ---- 渲染当前视图 ----
    function renderCurrentView() {
        const browseView = document.getElementById('gqa-browse-view');
        const manageQView = document.getElementById('gqa-manage-questions');
        const manageCView = document.getElementById('gqa-manage-categories');
        const modeBar = document.getElementById('gqa-mode-bar');
        const toggleBtn = document.getElementById('gqa-manage-toggle');

        // 隐藏所有
        browseView.style.display = 'none';
        manageQView.classList.remove('gqa-visible');
        manageCView.classList.remove('gqa-visible');

        if (manageMode) {
            modeBar.classList.add('gqa-visible');
            toggleBtn.classList.add('gqa-active-mode');
            if (manageTab === 'questions') {
                manageQView.classList.add('gqa-visible');
                renderManageQuestions();
            } else {
                manageCView.classList.add('gqa-visible');
                renderManageCategories();
            }
        } else {
            modeBar.classList.remove('gqa-visible');
            toggleBtn.classList.remove('gqa-active-mode');
            browseView.style.display = '';
            renderTabs();
            renderBrowseQuestions();
        }
    }

    // ==========================================
    // 浏览模式
    // ==========================================

    function renderTabs() {
        const container = document.getElementById('gqa-tabs');
        if (!container) return;
        let html = `<button class="gqa-tab ${currentCategory === 'all' ? 'gqa-active' : ''}" data-cat="all">全部</button>`;
        allCategories.forEach((cat) => {
            html += `<button class="gqa-tab ${currentCategory === cat.id ? 'gqa-active' : ''}" data-cat="${cat.id}">${cat.name}</button>`;
        });
        container.innerHTML = html;
        container.querySelectorAll('.gqa-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                currentCategory = tab.dataset.cat;
                renderTabs();
                renderBrowseQuestions();
            });
        });
    }

    function renderBrowseQuestions() {
        const container = document.getElementById('gqa-questions-list');
        if (!container) return;
        const keyword = (document.getElementById('gqa-search')?.value || '').trim().toLowerCase();

        let filtered = allQuestions;
        if (currentCategory !== 'all') {
            filtered = filtered.filter((q) => q.categoryId === currentCategory);
        }
        if (keyword) {
            filtered = filtered.filter((q) => q.text.toLowerCase().includes(keyword));
        }
        filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

        if (filtered.length === 0) {
            container.innerHTML = `
        <div class="gqa-empty">
          <div class="gqa-empty-icon">📭</div>
          ${keyword ? '没有找到匹配的问题' : '暂无问题，点击 ⚙️ 进入管理模式添加'}
        </div>`;
            return;
        }

        let html = '';
        filtered.forEach((q) => {
            const cat = allCategories.find((c) => c.id === q.categoryId);
            const dotColor = cat ? cat.color : '#64748B';
            html += `
        <div class="gqa-question-item" data-qid="${q.id}">
          <span class="gqa-question-dot" style="background:${dotColor}"></span>
          <span class="gqa-question-text">${escapeHtml(q.text)}</span>
          <div class="gqa-question-actions">
            <button class="gqa-action-btn" data-action="fill" title="填入输入框">📝</button>
            <button class="gqa-action-btn gqa-send-btn" data-action="fill-send" title="填入并发送">🚀</button>
          </div>
        </div>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.gqa-question-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.gqa-action-btn')) return;
                const q = allQuestions.find((q) => q.id === item.dataset.qid);
                if (q) fillInput(q.text, false);
            });
            item.querySelector('[data-action="fill"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const q = allQuestions.find((q) => q.id === item.dataset.qid);
                if (q) fillInput(q.text, false);
            });
            item.querySelector('[data-action="fill-send"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const q = allQuestions.find((q) => q.id === item.dataset.qid);
                if (q) fillInput(q.text, true);
            });
        });
    }

    // ==========================================
    // 管理模式 - 问题
    // ==========================================

    function renderManageQuestions() {
        const container = document.getElementById('gqa-manage-questions-list');
        if (!container) return;
        const keyword = (document.getElementById('gqa-manage-search')?.value || '').trim().toLowerCase();

        let filtered = allQuestions;
        if (keyword) {
            filtered = filtered.filter((q) => q.text.toLowerCase().includes(keyword));
        }

        if (filtered.length === 0) {
            container.innerHTML = `
        <div class="gqa-empty">
          <div class="gqa-empty-icon">📭</div>
          ${keyword ? '没有找到匹配的问题' : '暂无问题，点击下方按钮添加'}
        </div>`;
            return;
        }

        let html = '';
        filtered.forEach((q) => {
            const cat = allCategories.find((c) => c.id === q.categoryId);
            const dotColor = cat ? cat.color : '#64748B';
            const catName = cat ? cat.name : '未分类';
            html += `
        <div class="gqa-question-item" data-qid="${q.id}">
          <span class="gqa-question-dot" style="background:${dotColor}"></span>
          <div style="flex:1;min-width:0">
            <span class="gqa-question-text">${escapeHtml(q.text)}</span>
            <div style="font-size:11px;color:#475569;margin-top:2px">${catName}</div>
          </div>
          <div class="gqa-question-actions" style="opacity:1">
            <button class="gqa-action-btn gqa-edit-btn" data-action="edit" title="编辑">✏️</button>
            <button class="gqa-action-btn gqa-del-btn" data-action="delete" title="删除">🗑️</button>
          </div>
        </div>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.gqa-question-item').forEach((item) => {
            item.querySelector('[data-action="edit"]').addEventListener('click', () => {
                showQuestionForm(item.dataset.qid);
            });
            item.querySelector('[data-action="delete"]').addEventListener('click', () => {
                if (confirm('确定删除这个问题吗？')) {
                    allQuestions = allQuestions.filter((q) => q.id !== item.dataset.qid);
                    saveData(() => {
                        renderManageQuestions();
                        showToast('问题已删除');
                    });
                }
            });
        });
    }

    function showQuestionForm(editId) {
        const formEl = document.getElementById('gqa-question-form');
        const q = editId ? allQuestions.find((q) => q.id === editId) : null;

        let catOptions = allCategories.map(c =>
            `<option value="${c.id}" ${q && q.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        formEl.innerHTML = `
      <div class="gqa-form-group">
        <label class="gqa-form-label">分类</label>
        <select class="gqa-form-select" id="gqa-qf-cat">${catOptions}</select>
      </div>
      <div class="gqa-form-group">
        <label class="gqa-form-label">问题内容</label>
        <textarea class="gqa-form-input" id="gqa-qf-text" rows="3" placeholder="输入你的常用问题...">${q ? escapeHtml(q.text) : ''}</textarea>
      </div>
      <div class="gqa-form-btns">
        <button class="gqa-form-btn gqa-form-btn-cancel" id="gqa-qf-cancel">取消</button>
        <button class="gqa-form-btn gqa-form-btn-save" id="gqa-qf-save">${q ? '更新' : '添加'}</button>
      </div>
    `;
        formEl.classList.add('gqa-visible');

        document.getElementById('gqa-qf-cancel').addEventListener('click', () => {
            formEl.classList.remove('gqa-visible');
        });

        document.getElementById('gqa-qf-save').addEventListener('click', () => {
            const text = document.getElementById('gqa-qf-text').value.trim();
            const catId = document.getElementById('gqa-qf-cat').value;
            if (!text) { showToast('请输入问题内容'); return; }

            if (q) {
                q.text = text;
                q.categoryId = catId;
                showToast('问题已更新 ✓');
            } else {
                allQuestions.push({
                    id: 'q_' + Date.now(),
                    categoryId: catId,
                    text: text,
                    order: allQuestions.length
                });
                showToast('问题已添加 ✓');
            }
            saveData(() => {
                formEl.classList.remove('gqa-visible');
                renderManageQuestions();
            });
        });

        // 焦点到文本框
        setTimeout(() => document.getElementById('gqa-qf-text')?.focus(), 100);
    }

    // ==========================================
    // 管理模式 - 分类
    // ==========================================

    function renderManageCategories() {
        const container = document.getElementById('gqa-manage-categories-list');
        if (!container) return;

        if (allCategories.length === 0) {
            container.innerHTML = `
        <div class="gqa-empty">
          <div class="gqa-empty-icon">🏷️</div>
          暂无分类，点击下方按钮添加
        </div>`;
            return;
        }

        let html = '';
        allCategories.forEach((cat) => {
            const count = allQuestions.filter((q) => q.categoryId === cat.id).length;
            html += `
        <div class="gqa-cat-item" data-cid="${cat.id}">
          <span class="gqa-cat-dot" style="background:${cat.color}"></span>
          <span class="gqa-cat-name">${escapeHtml(cat.name)}</span>
          <span class="gqa-cat-count">${count} 个问题</span>
          <div class="gqa-cat-actions" style="opacity:1">
            <button class="gqa-action-btn gqa-edit-btn" data-action="edit" title="编辑">✏️</button>
            <button class="gqa-action-btn gqa-del-btn" data-action="delete" title="删除">🗑️</button>
          </div>
        </div>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.gqa-cat-item').forEach((item) => {
            item.querySelector('[data-action="edit"]').addEventListener('click', () => {
                showCategoryForm(item.dataset.cid);
            });
            item.querySelector('[data-action="delete"]').addEventListener('click', () => {
                const cid = item.dataset.cid;
                const count = allQuestions.filter((q) => q.categoryId === cid).length;
                const msg = count > 0
                    ? `该分类下有 ${count} 个问题，删除分类后这些问题也会被删除。确定吗？`
                    : '确定删除这个分类吗？';
                if (confirm(msg)) {
                    allCategories = allCategories.filter((c) => c.id !== cid);
                    allQuestions = allQuestions.filter((q) => q.categoryId !== cid);
                    saveData(() => {
                        renderManageCategories();
                        showToast('分类已删除');
                    });
                }
            });
        });
    }

    function showCategoryForm(editId) {
        const formEl = document.getElementById('gqa-category-form');
        const cat = editId ? allCategories.find((c) => c.id === editId) : null;
        const selectedColor = cat ? cat.color : COLORS[0];

        let colorDots = COLORS.map(c =>
            `<button type="button" class="gqa-color-dot ${c === selectedColor ? 'gqa-selected' : ''}" data-color="${c}" style="background:${c}"></button>`
        ).join('');

        formEl.innerHTML = `
      <div class="gqa-form-group">
        <label class="gqa-form-label">分类名称</label>
        <input type="text" class="gqa-form-input" id="gqa-cf-name" placeholder="例如：翻译" value="${cat ? escapeHtml(cat.name) : ''}" />
      </div>
      <div class="gqa-form-group">
        <label class="gqa-form-label">颜色</label>
        <div class="gqa-color-row" id="gqa-cf-colors">${colorDots}</div>
      </div>
      <div class="gqa-form-btns">
        <button class="gqa-form-btn gqa-form-btn-cancel" id="gqa-cf-cancel">取消</button>
        <button class="gqa-form-btn gqa-form-btn-save" id="gqa-cf-save">${cat ? '更新' : '添加'}</button>
      </div>
    `;
        formEl.classList.add('gqa-visible');

        let pickedColor = selectedColor;

        // 颜色选择
        formEl.querySelectorAll('.gqa-color-dot').forEach((dot) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                pickedColor = dot.dataset.color;
                formEl.querySelectorAll('.gqa-color-dot').forEach(d => d.classList.remove('gqa-selected'));
                dot.classList.add('gqa-selected');
            });
        });

        document.getElementById('gqa-cf-cancel').addEventListener('click', () => {
            formEl.classList.remove('gqa-visible');
        });

        document.getElementById('gqa-cf-save').addEventListener('click', () => {
            const name = document.getElementById('gqa-cf-name').value.trim();
            if (!name) { showToast('请输入分类名称'); return; }

            if (cat) {
                cat.name = name;
                cat.color = pickedColor;
                showToast('分类已更新 ✓');
            } else {
                allCategories.push({
                    id: 'cat_' + Date.now(),
                    name: name,
                    color: pickedColor
                });
                showToast('分类已添加 ✓');
            }
            saveData(() => {
                formEl.classList.remove('gqa-visible');
                renderManageCategories();
            });
        });

        setTimeout(() => document.getElementById('gqa-cf-name')?.focus(), 100);
    }

    // ==========================================
    // 填入 Gemini 输入框
    // ==========================================

    function fillInput(text, autoSend) {
        const selectors = [
            '.ql-editor[contenteditable="true"]',
            'div[contenteditable="true"][role="textbox"]',
            '.input-area [contenteditable="true"]',
            'rich-textarea [contenteditable="true"]',
            'div[contenteditable="true"]'
        ];

        let inputEl = null;
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) { inputEl = el; break; }
        }
        if (!inputEl) inputEl = document.querySelector('textarea');

        if (inputEl) {
            inputEl.focus();
            if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
                    || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                if (nativeSetter) nativeSetter.call(inputEl, text);
                else inputEl.value = text;
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                inputEl.innerText = text;
                inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
            }
            hidePanel();
            if (autoSend) {
                setTimeout(() => {
                    const sendSelectors = [
                        'button[aria-label="Send message"]', 'button[aria-label="发送"]',
                        'button.send-button', '.send-button-container button',
                        'button[mat-icon-button][aria-label*="Send"]', 'button[data-test-id="send-button"]'
                    ];
                    let sendBtn = null;
                    for (const sel of sendSelectors) { sendBtn = document.querySelector(sel); if (sendBtn) break; }
                    if (!sendBtn) {
                        const allBtns = document.querySelectorAll('button');
                        for (const btn of allBtns) {
                            if (btn.querySelector('svg') || btn.querySelector('mat-icon')) {
                                const rect = btn.getBoundingClientRect();
                                if (rect.bottom > window.innerHeight - 200) sendBtn = btn;
                            }
                        }
                    }
                    if (sendBtn && !sendBtn.disabled) sendBtn.click();
                }, 300);
            }
        } else {
            showToast('未找到输入框');
        }
    }

    // ---- 切换面板 ----
    function togglePanel() {
        panelVisible ? hidePanel() : showPanel();
    }

    function showPanel() {
        const panel = document.getElementById('gqa-panel');
        const overlay = document.getElementById('gqa-overlay');
        if (panel) {
            // 恢复保存的大小
            const savedSize = localStorage.getItem('gqa-panel-size');
            if (savedSize) {
                try {
                    const size = JSON.parse(savedSize);
                    panel.style.width = size.w + 'px';
                    panel.style.maxHeight = size.h + 'px';
                    panel.style.height = size.h + 'px';
                } catch (e) { /* 忽略 */ }
            }
            // 恢复保存的位置优先，否则跟随按钮
            const savedPos = localStorage.getItem('gqa-panel-pos');
            if (savedPos) {
                try {
                    const pos = JSON.parse(savedPos);
                    panel.style.left = Math.min(pos.x, window.innerWidth - 100) + 'px';
                    panel.style.top = Math.min(pos.y, window.innerHeight - 100) + 'px';
                    panel.style.right = 'auto';
                    panel.style.bottom = 'auto';
                } catch (e) { updatePanelPosition(); }
            } else {
                updatePanelPosition();
            }
            panel.classList.add('gqa-visible');
            overlay?.classList.add('gqa-visible');
            panelVisible = true;
            loadData();
            if (!manageMode) {
                setTimeout(() => document.getElementById('gqa-search')?.focus(), 100);
            }
        }
    }

    function hidePanel() {
        const panel = document.getElementById('gqa-panel');
        const overlay = document.getElementById('gqa-overlay');
        if (panel) {
            panel.classList.remove('gqa-visible');
            overlay?.classList.remove('gqa-visible');
            panelVisible = false;
        }
    }

    // ---- 工具函数 ----
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panelVisible) hidePanel();
    });

    // ---- 启动 ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
