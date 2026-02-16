// ============================================
// Gemini 常用问题助手 - Popup 管理面板逻辑
// ============================================

(function () {
    'use strict';

    let categories = [];
    let questions = [];
    let editingQuestionId = null;
    let editingCategoryId = null;
    let selectedColor = '#8B5CF6';

    // ========== 初始化 ==========
    document.addEventListener('DOMContentLoaded', () => {
        loadData();
        bindNavTabs();
        bindQuestionForm();
        bindCategoryForm();
    });

    // ========== 加载数据 ==========
    function loadData() {
        chrome.storage.sync.get(['categories', 'questions'], (data) => {
            categories = data.categories || [];
            questions = data.questions || [];
            renderAll();
        });
    }

    function saveData(callback) {
        chrome.storage.sync.set({ categories, questions }, () => {
            if (callback) callback();
        });
    }

    function renderAll() {
        renderFilterDropdown();
        renderQuestionCategoryDropdown();
        renderQuestionsList();
        renderCategoriesList();
    }

    // ========== Tab 导航 ==========
    function bindNavTabs() {
        document.querySelectorAll('.nav-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
                document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`view-${tab.dataset.view}`).classList.add('active');
            });
        });
    }

    // ========== 问题管理 ==========

    // 渲染筛选下拉框
    function renderFilterDropdown() {
        const select = document.getElementById('filter-category');
        select.innerHTML = '<option value="all">全部分类</option>';
        categories.forEach((cat) => {
            select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
        select.addEventListener('change', renderQuestionsList);
    }

    // 渲染问题表单中的分类下拉
    function renderQuestionCategoryDropdown() {
        const select = document.getElementById('question-category');
        select.innerHTML = '';
        categories.forEach((cat) => {
            select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }

    // 渲染问题列表
    function renderQuestionsList() {
        const container = document.getElementById('questions-list');
        const filterCat = document.getElementById('filter-category').value;

        let filtered = questions;
        if (filterCat !== 'all') {
            filtered = questions.filter((q) => q.categoryId === filterCat);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">暂无问题，点击上方按钮添加</div>
        </div>`;
            return;
        }

        let html = '';
        filtered.forEach((q) => {
            const cat = categories.find((c) => c.id === q.categoryId);
            const dotColor = cat ? cat.color : '#64748B';
            const catName = cat ? cat.name : '未分类';
            html += `
        <div class="list-item" data-qid="${q.id}">
          <span class="item-dot" style="background:${dotColor}"></span>
          <div class="item-content">
            <div class="item-text">${escapeHtml(q.text)}</div>
            <div class="item-meta">${catName}</div>
          </div>
          <div class="item-actions">
            <button class="btn-icon" data-action="edit" title="编辑">✏️</button>
            <button class="btn-icon btn-danger" data-action="delete" title="删除">🗑️</button>
          </div>
        </div>`;
        });
        container.innerHTML = html;

        // 绑定事件
        container.querySelectorAll('.list-item').forEach((item) => {
            item.querySelector('[data-action="edit"]').addEventListener('click', () => {
                editQuestion(item.dataset.qid);
            });
            item.querySelector('[data-action="delete"]').addEventListener('click', () => {
                deleteQuestion(item.dataset.qid);
            });
        });
    }

    // 绑定问题表单
    function bindQuestionForm() {
        const overlay = document.getElementById('question-form-overlay');

        document.getElementById('btn-add-question').addEventListener('click', () => {
            editingQuestionId = null;
            document.getElementById('question-form-title').textContent = '添加问题';
            document.getElementById('question-text').value = '';
            renderQuestionCategoryDropdown();
            overlay.classList.add('visible');
        });

        document.getElementById('question-form-close').addEventListener('click', () => {
            overlay.classList.remove('visible');
        });

        document.getElementById('question-form-cancel').addEventListener('click', () => {
            overlay.classList.remove('visible');
        });

        document.getElementById('question-form-save').addEventListener('click', () => {
            const text = document.getElementById('question-text').value.trim();
            const categoryId = document.getElementById('question-category').value;

            if (!text) {
                showToast('请输入问题内容');
                return;
            }

            if (editingQuestionId) {
                // 编辑
                const q = questions.find((q) => q.id === editingQuestionId);
                if (q) {
                    q.text = text;
                    q.categoryId = categoryId;
                }
                showToast('问题已更新 ✓');
            } else {
                // 新增
                questions.push({
                    id: 'q_' + Date.now(),
                    categoryId: categoryId,
                    text: text,
                    order: questions.length
                });
                showToast('问题已添加 ✓');
            }

            saveData(() => {
                overlay.classList.remove('visible');
                renderQuestionsList();
            });
        });
    }

    function editQuestion(id) {
        const q = questions.find((q) => q.id === id);
        if (!q) return;

        editingQuestionId = id;
        document.getElementById('question-form-title').textContent = '编辑问题';
        renderQuestionCategoryDropdown();
        document.getElementById('question-category').value = q.categoryId;
        document.getElementById('question-text').value = q.text;
        document.getElementById('question-form-overlay').classList.add('visible');
    }

    function deleteQuestion(id) {
        if (!confirm('确定删除这个问题吗？')) return;
        questions = questions.filter((q) => q.id !== id);
        saveData(() => {
            renderQuestionsList();
            showToast('问题已删除');
        });
    }

    // ========== 分类管理 ==========

    function renderCategoriesList() {
        const container = document.getElementById('categories-list');

        if (categories.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏷️</div>
          <div class="empty-text">暂无分类，点击上方按钮添加</div>
        </div>`;
            return;
        }

        let html = '';
        categories.forEach((cat) => {
            const count = questions.filter((q) => q.categoryId === cat.id).length;
            html += `
        <div class="cat-item" data-cid="${cat.id}">
          <span class="cat-dot" style="background:${cat.color}"></span>
          <span class="cat-name">${escapeHtml(cat.name)}</span>
          <span class="cat-count">${count} 个问题</span>
          <div class="cat-actions">
            <button class="btn-icon" data-action="edit" title="编辑">✏️</button>
            <button class="btn-icon btn-danger" data-action="delete" title="删除">🗑️</button>
          </div>
        </div>`;
        });
        container.innerHTML = html;

        // 绑定事件
        container.querySelectorAll('.cat-item').forEach((item) => {
            item.querySelector('[data-action="edit"]').addEventListener('click', () => {
                editCategory(item.dataset.cid);
            });
            item.querySelector('[data-action="delete"]').addEventListener('click', () => {
                deleteCategory(item.dataset.cid);
            });
        });
    }

    function bindCategoryForm() {
        const overlay = document.getElementById('category-form-overlay');

        document.getElementById('btn-add-category').addEventListener('click', () => {
            editingCategoryId = null;
            document.getElementById('category-form-title').textContent = '添加分类';
            document.getElementById('category-name').value = '';
            selectedColor = '#8B5CF6';
            updateColorSelection();
            overlay.classList.add('visible');
        });

        document.getElementById('category-form-close').addEventListener('click', () => {
            overlay.classList.remove('visible');
        });

        document.getElementById('category-form-cancel').addEventListener('click', () => {
            overlay.classList.remove('visible');
        });

        // 颜色选择
        document.querySelectorAll('.color-swatch').forEach((swatch) => {
            swatch.addEventListener('click', () => {
                selectedColor = swatch.dataset.color;
                updateColorSelection();
            });
        });

        document.getElementById('category-form-save').addEventListener('click', () => {
            const name = document.getElementById('category-name').value.trim();
            if (!name) {
                showToast('请输入分类名称');
                return;
            }

            if (editingCategoryId) {
                const cat = categories.find((c) => c.id === editingCategoryId);
                if (cat) {
                    cat.name = name;
                    cat.color = selectedColor;
                }
                showToast('分类已更新 ✓');
            } else {
                categories.push({
                    id: 'cat_' + Date.now(),
                    name: name,
                    color: selectedColor
                });
                showToast('分类已添加 ✓');
            }

            saveData(() => {
                overlay.classList.remove('visible');
                renderAll();
            });
        });
    }

    function editCategory(id) {
        const cat = categories.find((c) => c.id === id);
        if (!cat) return;

        editingCategoryId = id;
        document.getElementById('category-form-title').textContent = '编辑分类';
        document.getElementById('category-name').value = cat.name;
        selectedColor = cat.color;
        updateColorSelection();
        document.getElementById('category-form-overlay').classList.add('visible');
    }

    function deleteCategory(id) {
        const count = questions.filter((q) => q.categoryId === id).length;
        const msg = count > 0
            ? `该分类下有 ${count} 个问题，删除分类后这些问题也会被删除。确定要删除吗？`
            : '确定删除这个分类吗？';

        if (!confirm(msg)) return;

        categories = categories.filter((c) => c.id !== id);
        questions = questions.filter((q) => q.categoryId !== id);

        saveData(() => {
            renderAll();
            showToast('分类已删除');
        });
    }

    function updateColorSelection() {
        document.querySelectorAll('.color-swatch').forEach((swatch) => {
            swatch.classList.toggle('active', swatch.dataset.color === selectedColor);
        });
    }

    // ========== 工具函数 ==========

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }
})();
