// ==UserScript==
// @name         DeepSeek 全能增强助手
// @namespace    https://github.com/shiyi312/deepseek-enhancer
// @version      2026.9.5.1
// @description  全功能：代码折叠、表格导出、思考折叠、防撤回、多格式导出、文件夹管理、快捷键、图形设置面板，优化体验
// @author       辻弌20
// @match        https://chat.deepseek.com/*
// @icon         https://raw.githubusercontent.com/shiyi312/deepseek-enhancer/main/favicon.ico
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ========================================================================
    // 配置与存储
    // ========================================================================
    const STORAGE = {
        FOLD_THRESHOLD: 'ds_fold_threshold',
        PREVIEW_LINES: 'ds_preview_lines',
        TABLE_BUTTONS: 'ds_table_buttons',
        AUTO_COLLAPSE_THINK: 'ds_auto_collapse_think',
        WIDE_SCREEN: 'ds_wide_screen',
        CTRL_ENTER: 'ds_ctrl_enter',
        ANTI_RETRACT: 'ds_anti_retract',
        EXPORT_SETTINGS: 'ds_export_settings',
        FOLDER_MANAGER: 'ds_folder_manager',
        FOLDER_DATA: 'ds_folder_data_v2',
        SHORTCUT_EXPORT: 'ds_shortcut_export',
        COPY_BUTTON: 'ds_copy_button',
        ALL_CODE_FOLDED: 'ds_all_code_folded',
    };

    const KEY_MAP = {
        foldThreshold: 'FOLD_THRESHOLD',
        previewLines: 'PREVIEW_LINES',
        tableButtons: 'TABLE_BUTTONS',
        autoCollapseThink: 'AUTO_COLLAPSE_THINK',
        wideScreen: 'WIDE_SCREEN',
        ctrlEnter: 'CTRL_ENTER',
        antiRetract: 'ANTI_RETRACT',
        folderManager: 'FOLDER_MANAGER',
        shortcutExport: 'SHORTCUT_EXPORT',
        copyButton: 'COPY_BUTTON',
        allCodeFolded: 'ALL_CODE_FOLDED',
    };

    const DEFAULTS = {
        foldThreshold: 20,
        previewLines: 3,
        tableButtons: true,
        autoCollapseThink: true,
        wideScreen: false,
        ctrlEnter: false,
        antiRetract: true,
        folderManager: false,
        shortcutExport: 'Ctrl+Shift+E',
        copyButton: true,
        allCodeFolded: false,
        exportSettings: {
            includeUser: true,
            includeThink: true,
            onlyReply: false,
            exportRefs: true,
        },
    };

    function getVal(key, def) {
        const val = GM_getValue(key, null);
        if (val === null) return def;
        try { return JSON.parse(val); } catch { return val; }
    }
    function setVal(key, val) { GM_setValue(key, JSON.stringify(val)); }

    let config = {
        foldThreshold: getVal(STORAGE.FOLD_THRESHOLD, DEFAULTS.foldThreshold),
        previewLines: getVal(STORAGE.PREVIEW_LINES, DEFAULTS.previewLines),
        tableButtons: getVal(STORAGE.TABLE_BUTTONS, DEFAULTS.tableButtons),
        autoCollapseThink: getVal(STORAGE.AUTO_COLLAPSE_THINK, DEFAULTS.autoCollapseThink),
        wideScreen: getVal(STORAGE.WIDE_SCREEN, DEFAULTS.wideScreen),
        ctrlEnter: getVal(STORAGE.CTRL_ENTER, DEFAULTS.ctrlEnter),
        antiRetract: getVal(STORAGE.ANTI_RETRACT, DEFAULTS.antiRetract),
        folderManager: getVal(STORAGE.FOLDER_MANAGER, DEFAULTS.folderManager),
        shortcutExport: getVal(STORAGE.SHORTCUT_EXPORT, DEFAULTS.shortcutExport),
        copyButton: getVal(STORAGE.COPY_BUTTON, DEFAULTS.copyButton),
        allCodeFolded: getVal(STORAGE.ALL_CODE_FOLDED, DEFAULTS.allCodeFolded),
        exportSettings: getVal(STORAGE.EXPORT_SETTINGS, DEFAULTS.exportSettings),
    };

    // ========================================================================
    // 工具函数
    // ========================================================================
    function showToast(msg, duration = 2000, type = 'info') {
        const existing = document.getElementById('ds-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'ds-toast';
        toast.textContent = msg;
        const colors = { info: 'rgba(0,0,0,0.8)', success: 'rgba(46,125,50,0.9)', error: 'rgba(198,40,40,0.9)', warning: 'rgba(237,108,2,0.9)' };
        Object.assign(toast.style, {
            position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            background: colors[type] || colors.info, color: 'white', padding: '10px 24px',
            borderRadius: '10px', fontSize: '14px', fontFamily: 'system-ui, sans-serif',
            zIndex: 10001, opacity: 0, transition: 'opacity 0.25s ease',
            pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            maxWidth: '90vw', textAlign: 'center',
        });
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 250);
        }, duration);
    }

    function getText(el) { return (el?.textContent || '').trim(); }

    function findAllElements(selectors, context = document) {
        const results = [];
        const set = new Set();
        for (const sel of selectors) {
            const els = context.querySelectorAll(sel);
            for (const el of els) {
                if (!set.has(el)) { set.add(el); results.push(el); }
            }
        }
        return results;
    }

    // ========================================================================
    // 完整样式
    // ========================================================================
    GM_addStyle(`
        .ds-fold-btn {
            background: transparent; border: none; border-radius: 8px;
            font-size: 12px; padding: 2px 8px; cursor: pointer;
            transition: all 0.2s; font-family: system-ui, sans-serif;
            user-select: none; display: inline-flex; align-items: center;
            gap: 4px; opacity: 0.6; color: inherit;
            position: relative; z-index: 5;
        }
        .ds-fold-btn:hover { background: rgba(128,128,128,0.15); opacity: 1; }
        .ds-fold-btn svg { width: 18px; height: 18px; display: block; fill: currentColor; }
        .ds-fold-preview {
            position: relative;
            overflow: hidden;
            transition: max-height 0.3s ease;
        }
        .ds-fold-preview::after {
            content: ' ⋯';
            display: block;
            text-align: center;
            opacity: 0.5;
            margin-top: 2px;
            font-size: 12px;
        }

        .table-internal-buttons {
            position: absolute; bottom: 8px; right: 8px;
            display: flex; flex-direction: column; gap: 6px; z-index: 10;
            opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s;
            pointer-events: none;
        }
        .ds-markdown table:hover .table-internal-buttons,
        .table-internal-buttons:hover { opacity: 1; visibility: visible; pointer-events: auto; }
        .internal-export-btn {
            width: 30px; height: 30px; border-radius: 6px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1); transition: all 0.2s;
            font-size: 14px; background: rgba(255,255,255,0.92);
            border: 1px solid rgba(0,0,0,0.08);
        }
        .internal-export-btn:hover { background: #fff; transform: scale(1.05); }

        html.ds-wide-screen [class*="ds-virtual-list-items"][style*="--message-list-max-width"] {
            --message-list-max-width: 1000px !important;
        }

        .ds-think-content.ds-collapsed { display: none !important; }

        .ds-copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(255,255,255,0.85);
            backdrop-filter: blur(4px);
            border: none;
            border-radius: 6px;
            padding: 4px 10px;
            font-size: 12px;
            cursor: pointer;
            color: #333;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 5;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            font-family: system-ui, sans-serif;
        }
        .ds-message:hover .ds-copy-btn,
        .ds-copy-btn:hover { opacity: 1; }
        @media (prefers-color-scheme: dark) {
            .ds-copy-btn { background: rgba(30,30,40,0.85); color: #ddd; }
        }

        #ds-panel-overlay {
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(0,0,0,0.4); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            animation: dsFadeIn 0.25s ease;
        }
        #ds-panel-overlay.fade-out { animation: dsFadeOut 0.25s ease forwards; }
        @keyframes dsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dsFadeOut { from { opacity: 1; } to { opacity: 0; } }

        #ds-panel {
            background: #1a1a2e; border-radius: 20px; width: 520px;
            max-width: 94vw; max-height: 88vh; overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            font-family: system-ui, -apple-system, sans-serif;
            color: #e8e8ec; padding: 0;
            animation: dsModalIn 0.3s ease;
        }
        @keyframes dsModalIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        #ds-panel::-webkit-scrollbar { width: 6px; }
        #ds-panel::-webkit-scrollbar-track { background: transparent; }
        #ds-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }

        .ds-panel-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
            position: sticky; top: 0; background: #1a1a2e; z-index: 2;
            border-radius: 20px 20px 0 0;
        }
        .ds-panel-header h2 { margin: 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .ds-panel-close { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 22px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.2s; }
        .ds-panel-close:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .ds-panel-body { padding: 16px 24px 24px; }
        .ds-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
        .ds-card-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.4; margin-bottom: 10px; }

        .ds-control { margin-bottom: 12px; }
        .ds-control:last-child { margin-bottom: 0; }
        .ds-control-label { font-size: 13px; font-weight: 500; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
        .ds-control-desc { font-size: 11px; opacity: 0.4; margin-bottom: 6px; line-height: 1.4; }

        .ds-toggle-row { display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 4px 0; }
        .ds-toggle-track { width: 40px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.15); transition: background 0.25s; flex-shrink: 0; position: relative; }
        .ds-toggle-track.active { background: #4f46e5; }
        .ds-toggle-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.25s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .ds-toggle-track.active .ds-toggle-thumb { transform: translateX(18px); }

        .ds-input-number { width: 70px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #e8e8ec; font-size: 13px; outline: none; }
        .ds-input-number:focus { border-color: #4f46e5; }
        .ds-input-text { width: 180px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #e8e8ec; font-size: 13px; outline: none; }
        .ds-input-text:focus { border-color: #4f46e5; }

        .ds-panel-footer { padding: 12px 24px 18px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .ds-btn { padding: 8px 18px; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .ds-btn-primary { background: #4f46e5; color: #fff; }
        .ds-btn-primary:hover { background: #6366f1; }
        .ds-btn-secondary { background: rgba(255,255,255,0.08); color: #e8e8ec; }
        .ds-btn-secondary:hover { background: rgba(255,255,255,0.15); }
        .ds-btn-danger { background: rgba(239,68,68,0.2); color: #f87171; }
        .ds-btn-danger:hover { background: rgba(239,68,68,0.3); }
        .ds-btn-reset { background: none; border: none; color: rgba(255,255,255,0.3); font-size: 12px; cursor: pointer; text-decoration: underline; }
        .ds-btn-reset:hover { color: rgba(255,255,255,0.6); }

        #ds-export-btn {
            background: rgba(255,255,255,0.85); backdrop-filter: blur(8px);
            border: 1px solid rgba(0,0,0,0.08); border-radius: 8px;
            padding: 6px 14px; font-size: 13px; font-weight: 500;
            cursor: pointer; color: #333; display: flex; align-items: center;
            gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.2s; font-family: system-ui, sans-serif;
        }
        #ds-export-btn:hover { background: rgba(255,255,255,0.95); box-shadow: 0 4px 14px rgba(0,0,0,0.1); }
        #ds-export-btn .arrow { transition: transform 0.25s; display: inline-block; }
        #ds-export-btn .arrow.open { transform: rotate(180deg); }

        #ds-global-fold-btn {
            background: rgba(255,255,255,0.85); backdrop-filter: blur(8px);
            border: 1px solid rgba(0,0,0,0.08); border-radius: 8px;
            padding: 6px 12px; font-size: 13px; font-weight: 500;
            cursor: pointer; color: #333; display: flex; align-items: center;
            gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.2s; font-family: system-ui, sans-serif;
        }
        #ds-global-fold-btn:hover { background: rgba(255,255,255,0.95); box-shadow: 0 4px 14px rgba(0,0,0,0.1); }
        @media (prefers-color-scheme: dark) {
            #ds-global-fold-btn, #ds-export-btn {
                background: rgba(30,30,40,0.85) !important;
                color: #ddd !important;
                border-color: rgba(255,255,255,0.1) !important;
            }
            #ds-global-fold-btn:hover, #ds-export-btn:hover {
                background: rgba(30,30,40,0.95) !important;
            }
        }

        .ds-export-dropdown {
            position: fixed; top: 48px; right: 80px; z-index: 9999;
            background: rgba(255,255,255,0.96); backdrop-filter: blur(12px);
            border: 1px solid rgba(0,0,0,0.08); border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
            display: none; flex-direction: column; padding: 6px 0;
            min-width: 200px; max-height: 80vh; overflow-y: auto;
            font-family: system-ui, sans-serif;
        }
        .ds-export-dropdown .opt { padding: 8px 16px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.12s; color: #333; }
        .ds-export-dropdown .opt:hover { background: rgba(0,0,0,0.04); }
        .ds-export-dropdown .sep { height: 1px; background: #e8e8e8; margin: 4px 8px; }
        .ds-export-dropdown .filter-label { padding: 6px 16px 2px; font-size: 10px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .ds-export-dropdown .filter-item { padding: 4px 16px; display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; color: #333; }
        .ds-export-dropdown .filter-item input[type="checkbox"] { margin: 0; width: 15px; height: 15px; cursor: pointer; }
        .ds-export-dropdown .filter-item:hover { background: rgba(0,0,0,0.02); }

        @media (prefers-color-scheme: dark) {
            .ds-export-dropdown { background: rgba(30,30,40,0.95); border-color: rgba(255,255,255,0.08); color: #ddd; }
            .ds-export-dropdown .opt { color: #ddd; }
            .ds-export-dropdown .opt:hover { background: rgba(255,255,255,0.05); }
            .ds-export-dropdown .filter-item { color: #ddd; }
            .ds-export-dropdown .sep { background: #444; }
        }

        #ds-export-loading {
            position: fixed; inset: 0; z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.35); backdrop-filter: blur(4px);
        }
        .ds-loading-box { background: #1e1e2e; padding: 28px 36px; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.3); text-align: center; color: #e8e8ec; font-family: system-ui, sans-serif; min-width: 180px; }
        .ds-loading-spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #4f46e5; border-radius: 50%; animation: dsSpin 0.8s linear infinite; margin: 0 auto 12px; }
        @keyframes dsSpin { to { transform: rotate(360deg); } }

        .ds-folder-panel { margin: 4px 0 8px; padding: 4px 8px; font-size: 13px; color: #e8e8ec; background: rgba(255,255,255,0.03); border-radius: 8px; }
        .ds-folder-panel .ds-fh { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 6px; }
        .ds-folder-panel .ds-fh-title { cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 500; font-size: 12px; opacity: 0.6; }
        .ds-folder-panel .ds-fh-title:hover { opacity: 0.9; }
        .ds-folder-panel .ds-fh-new { background: rgba(255,255,255,0.06); border: none; color: #aaa; border-radius: 12px; padding: 2px 10px; font-size: 11px; cursor: pointer; }
        .ds-folder-panel .ds-fh-new:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .ds-folder-panel .ds-folder-item { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .ds-folder-panel .ds-folder-item:hover { background: rgba(255,255,255,0.05); }
        .ds-folder-panel .ds-folder-item .ds-fname { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ds-folder-panel .ds-folder-item .ds-fcount { opacity: 0.4; font-size: 11px; }
        .ds-folder-panel .ds-folder-item .ds-fops { display: none; gap: 4px; }
        .ds-folder-panel .ds-folder-item:hover .ds-fops { display: flex; }
        .ds-folder-panel .ds-fops button { background: none; border: none; color: #888; font-size: 11px; cursor: pointer; padding: 0 4px; }
        .ds-folder-panel .ds-fops button:hover { color: #fff; }
        .ds-folder-panel .ds-conv-row { display: flex; align-items: center; gap: 6px; padding: 3px 8px 3px 24px; border-radius: 6px; font-size: 12px; cursor: pointer; }
        .ds-folder-panel .ds-conv-row:hover { background: rgba(255,255,255,0.04); }
        .ds-folder-panel .ds-conv-row .ds-ctitle { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ds-folder-panel .ds-conv-row .ds-cout { background: rgba(255,255,255,0.06); border: none; color: #888; border-radius: 4px; padding: 0 6px; font-size: 10px; cursor: pointer; }
        .ds-folder-panel .ds-conv-row .ds-cout:hover { color: #f87171; }
        .ds-folder-panel .ds-empty { opacity: 0.3; font-size: 12px; padding: 6px 10px; }
        .ds-folder-panel .ds-caret { display: inline-block; transition: transform 0.2s; font-size: 10px; opacity: 0.5; }
        .ds-folder-panel .ds-caret.open { transform: rotate(90deg); }
        .ds-folder-panel .ds-children { padding-left: 8px; }
        .ds-folder-panel .ds-children.collapsed { display: none; }
    `);

    // ========================================================================
    // 核心功能：代码折叠（支持全局控制）
    // ========================================================================
    const lineHeightCache = new WeakMap();

    function getLineCount(pre) {
        const text = pre.textContent || '';
        const lines = text.split('\n');
        if (lines.length && lines[lines.length-1] === '') lines.pop();
        return lines.length;
    }

    function getLineHeight(pre) {
        if (lineHeightCache.has(pre)) return lineHeightCache.get(pre);
        const style = getComputedStyle(pre);
        let lh = style.lineHeight;
        if (lh === 'normal') lh = parseFloat(style.fontSize) * 1.2 + 'px';
        const result = parseFloat(lh);
        lineHeightCache.set(pre, result);
        return result;
    }

    function createFoldButton(pre) {
        const btn = document.createElement('button');
        btn.className = 'ds-fold-btn';
        const lineCount = getLineCount(pre);
        const shouldFold = config.foldThreshold > 0 && lineCount > config.foldThreshold;
        let folded = false;
        const icons = { down: `<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>`, up: `<svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>` };
        const updateUI = (isFolded) => {
            btn.innerHTML = `<span class="fold-icon">${isFolded ? icons.up : icons.down}</span><span>${isFolded ? '展开' : '折叠'}</span>`;
            btn.setAttribute('aria-label', isFolded ? '展开代码块' : '折叠代码块');
            folded = isFolded;
        };
        const fold = () => {
            if (config.previewLines > 0 && lineCount > config.previewLines) {
                const lh = getLineHeight(pre);
                const maxH = lh * config.previewLines;
                pre.style.maxHeight = maxH + 'px';
                pre.style.overflow = 'hidden';
                pre.classList.add('ds-fold-preview');
            } else {
                pre.style.display = 'none';
                pre.classList.remove('ds-fold-preview');
            }
            updateUI(true);
        };
        const expand = () => {
            pre.style.maxHeight = '';
            pre.style.overflow = '';
            pre.style.display = '';
            pre.classList.remove('ds-fold-preview');
            updateUI(false);
        };
        btn.addEventListener('click', (e) => { e.stopPropagation(); if (folded) expand(); else fold(); });
        // 挂载到 pre 元素，供全局控制调用
        pre.__dsFold = { fold, expand, isFolded: () => folded };
        if (shouldFold) {
            requestAnimationFrame(fold);
        } else {
            updateUI(false);
        }
        return btn;
    }

    function processCodeBlock(pre) {
        if (pre.dataset.dsFoldProcessed) return;
        pre.dataset.dsFoldProcessed = 'true';
        const container = pre.closest('.md-code-block, .code-block, [class*="code-block"]');
        if (!container) return;
        const oldBtn = container.querySelector('.ds-fold-btn');
        if (oldBtn) oldBtn.remove();
        const btn = createFoldButton(pre);
        let toolbar = container.querySelector('.md-code-block-banner-wrap, .code-info-button-text, [class*="banner"]');
        if (toolbar && toolbar.parentElement) {
            toolbar.parentElement.appendChild(btn);
        } else {
            btn.style.position = 'absolute';
            btn.style.top = '4px';
            btn.style.right = '8px';
            btn.style.background = 'rgba(0,0,0,0.05)';
            btn.style.borderRadius = '6px';
            btn.style.padding = '2px 8px';
            container.style.position = 'relative';
            container.appendChild(btn);
        }
    }

    function processPreElements(pres) {
        pres.forEach(pre => {
            if (!pre.dataset.dsFoldProcessed) processCodeBlock(pre);
        });
    }

    // ========================================================================
    // 表格导出
    // ========================================================================
    function getCleanTableClone(table) {
        const clone = table.cloneNode(true);
        const btns = clone.querySelector('.table-internal-buttons');
        if (btns) btns.remove();
        clone.style.tableLayout = '';
        clone.style.width = '';
        clone.style.maxWidth = '';
        clone.style.position = '';
        clone.querySelectorAll('th,td').forEach(cell => {
            cell.style.width = '';
            cell.style.whiteSpace = '';
            cell.style.overflowWrap = '';
            cell.style.wordBreak = '';
        });
        return clone;
    }

    function getCellText(cell) {
        let t = '';
        cell.childNodes.forEach(n => {
            if (n.nodeType === 3) t += n.textContent;
            else if (n.nodeName === 'BR') t += '\n';
            else if (n.nodeType === 1) t += getCellText(n);
        });
        return t.replace(/[^\S\n]+/g, ' ').replace(/ *\n */g, '\n').trim();
    }

    function exportTableAsCSV(table) {
        const clone = getCleanTableClone(table);
        const rows = [];
        const thead = clone.querySelector('thead');
        if (thead) thead.querySelectorAll('tr').forEach(tr => {
            const rd = []; tr.querySelectorAll('th').forEach(th => rd.push(getCellText(th)));
            if (rd.length) rows.push(rd);
        });
        const tbody = clone.querySelector('tbody');
        if (tbody) tbody.querySelectorAll('tr').forEach(tr => {
            const rd = []; tr.querySelectorAll('td').forEach(td => rd.push(getCellText(td)));
            if (rd.length) rows.push(rd);
        });
        else clone.querySelectorAll('tr').forEach(tr => {
            const rd = []; tr.querySelectorAll('td,th').forEach(c => rd.push(getCellText(c)));
            if (rd.length) rows.push(rd);
        });
        if (!rows.length) { showToast('无数据', 1500, 'warning'); return; }
        const csv = rows.map(r => r.map(c => {
            if (typeof c !== 'string') c = String(c);
            if (c.includes(',') || c.includes('"') || c.includes('\n')) c = '"' + c.replace(/"/g,'""') + '"';
            return c;
        }).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `table_${Date.now()}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 100);
        showToast('CSV 导出成功', 1200, 'success');
    }

    function exportTableAsMarkdown(table) {
        const clone = getCleanTableClone(table);
        let md = '';
        const rows = clone.querySelectorAll('tr');
        if (!rows.length) { showToast('无数据', 1500, 'warning'); return; }
        const headerCells = rows[0].querySelectorAll('th,td');
        md += '| ' + Array.from(headerCells).map(th => getCellText(th).replace(/\|/g,'\\|')).join(' | ') + ' |\n';
        md += '| ' + Array.from(headerCells).map(() => '---').join(' | ') + ' |\n';
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td,th');
            md += '| ' + Array.from(cells).map(td => getCellText(td).replace(/\|/g,'\\|')).join(' | ') + ' |\n';
        }
        navigator.clipboard.writeText(md).then(() => showToast('表格已复制为 Markdown', 1200, 'success')).catch(() => showToast('复制失败', 1500, 'error'));
    }

    async function exportTableAsPNG(table) {
        if (typeof html2canvas === 'undefined') { showToast('html2canvas 未加载', 2000, 'error'); return; }
        const clone = getCleanTableClone(table);
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;background:white;padding:16px;';
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);
        try {
            const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#fff', logging: false, useCORS: true });
            canvas.toBlob(blob => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.download = `table_${Date.now()}.png`;
                    a.href = url;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                    showToast('PNG 导出成功', 1200, 'success');
                } else showToast('PNG 导出失败', 1500, 'error');
            }, 'image/png');
        } catch(e) { showToast('PNG 异常: ' + e.message, 2000, 'error'); } finally { wrapper.remove(); }
    }

    function addTableButtons(table) {
        if (!config.tableButtons || table.dataset.dsTableProcessed) return;
        table.dataset.dsTableProcessed = 'true';
        const old = table.querySelector('.table-internal-buttons');
        if (old) old.remove();
        const container = document.createElement('div');
        container.className = 'table-internal-buttons';
        const png = createExportBtn('📸', '导出 PNG', () => exportTableAsPNG(table));
        const csv = createExportBtn('📄', '导出 CSV', () => exportTableAsCSV(table));
        const md = createExportBtn('📝', '复制 Markdown', () => exportTableAsMarkdown(table));
        container.append(png, csv, md);
        table.style.position = 'relative';
        table.appendChild(container);
    }

    function createExportBtn(icon, tooltip, action) {
        const btn = document.createElement('button');
        btn.className = 'internal-export-btn';
        btn.textContent = icon;
        btn.title = tooltip;
        btn.addEventListener('click', e => { e.stopPropagation(); action(); });
        return btn;
    }

    function processTableElements(tables) {
        tables.forEach(table => {
            if (!table.dataset.dsTableProcessed && table.closest('.ds-markdown')) {
                addTableButtons(table);
            }
        });
    }

    // ========================================================================
    // 思考折叠（修复：点击仅展开当前，不移除全局样式）
    // ========================================================================
    let thinkStyle = null;
    let thinkClickHandler = null;

    function setupThinkCollapse() {
        if (!thinkStyle) {
            thinkStyle = document.createElement('style');
            thinkStyle.id = 'ds-think-hide';
            thinkStyle.textContent = '.ds-think-content { display: none !important; }';
            document.head.appendChild(thinkStyle);
        }
        if (thinkClickHandler) {
            document.removeEventListener('click', thinkClickHandler, true);
        }
        thinkClickHandler = function(e) {
            const title = e.target.closest('[class*="_5ab5d64"], [class*="think-title"], [class*="chain-of-thought"]');
            if (title && (getText(title).includes('已思考') || getText(title).includes('思考'))) {
                const content = title.closest('.ds-message, [class*="message"]')?.querySelector('.ds-think-content, [class*="think-content"]');
                if (content) {
                    content.classList.remove('ds-collapsed');
                }
            }
        };
        document.addEventListener('click', thinkClickHandler, true);
    }

    function processThinkContents(contents) {
        if (!config.autoCollapseThink) return;
        contents.forEach(content => {
            const wrapper = content.closest('.ds-message, [class*="message"]');
            if (!wrapper) return;
            const title = wrapper.querySelector('[class*="_5ab5d64"], [class*="think-title"], [class*="chain-of-thought"]');
            if (title && (getText(title).includes('已思考') || getText(title).includes('思考'))) {
                if (!title.dataset.dsCollapsed) {
                    title.dataset.dsCollapsed = 'true';
                    content.classList.add('ds-collapsed');
                }
            }
        });
    }

    // ========================================================================
    // 防撤回（增强：尝试从 IndexedDB 恢复）
    // ========================================================================
    const msgCache = new WeakMap();
    const pendingUpdates = new Map();

    function scheduleCacheUpdate(msgContainer, html, text) {
        const key = msgContainer;
        if (pendingUpdates.has(key)) {
            clearTimeout(pendingUpdates.get(key));
            pendingUpdates.delete(key);
        }
        const timer = setTimeout(() => {
            msgCache.set(msgContainer, { html, text });
            pendingUpdates.delete(key);
        }, 1000);
        pendingUpdates.set(key, timer);
    }

    async function fetchMessageFromDB(chatId, msgIdx) {
        try {
            const data = await readDeepSeekDB(chatId);
            const msgs = parseDBData(data);
            if (msgs && msgs.length > msgIdx) return msgs[msgIdx].content || null;
        } catch(e) {}
        return null;
    }

        function antiRetractScanForNodes(nodes) {
        if (!config.antiRetract) return;
        const aiMessages = [];
        nodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches('.ds-message:not(.ds-message-user), [class*="assistant-message"]')) {
                aiMessages.push(node);
            }
            if (node.querySelectorAll) {
                const msgs = node.querySelectorAll('.ds-message:not(.ds-message-user), [class*="assistant-message"]');
                msgs.forEach(msg => aiMessages.push(msg));
            }
        });

        const chatId = getChatIdFromURL();
        aiMessages.forEach((msgContainer, index) => {
            const contentEl = msgContainer.querySelector('.ds-markdown, [class*="markdown"]');
            if (!contentEl) return;
            const currentText = contentEl.textContent.trim();
            const cached = msgCache.get(msgContainer);
            if (cached === undefined) {
                scheduleCacheUpdate(msgContainer, contentEl.innerHTML, currentText);
                return;
            }
            const retractKeywords = ['这个问题我暂时无法回答', '我还没学会这个问题', '内容已撤回', '已撤回', '无法回答'];
            const isRetracted = retractKeywords.some(kw => currentText.includes(kw));
            if (isRetracted && cached.text !== currentText) {
                (async function() {
                    try {
                        let recoveredText = null;
                        if (chatId) {
                            const dbMsg = await fetchMessageFromDB(chatId, index);
                            if (dbMsg) recoveredText = dbMsg;
                        }
                        if (recoveredText) {
                            contentEl.textContent = recoveredText;
                        } else {
                            contentEl.innerHTML = cached.html;
                        }
                        const parent = msgContainer;
                        if (!parent.querySelector('.ds-retract-restore')) {
                            const mark = document.createElement('div');
                            mark.className = 'ds-retract-restore';
                            mark.style.cssText = 'color: #f87171; font-size: 12px; margin-top: 6px; opacity: 0.7;';
                            mark.textContent = '↻ 原回复已被撤回，已自动恢复';
                            parent.appendChild(mark);
                        }
                        showToast('已恢复被撤回的消息', 1500, 'success');
                        msgCache.delete(msgContainer);
                    } catch (e) {
                        console.warn('DeepSeek 增强助手: 防撤回恢复失败:', e);
                        // 降级：仍然尝试使用缓存恢复
                        try {
                            contentEl.innerHTML = cached.html;
                            const parent = msgContainer;
                            if (!parent.querySelector('.ds-retract-restore')) {
                                const mark = document.createElement('div');
                                mark.className = 'ds-retract-restore';
                                mark.style.cssText = 'color: #f87171; font-size: 12px; margin-top: 6px; opacity: 0.7;';
                                mark.textContent = '↻ 原回复已被撤回，已自动恢复（缓存版本）';
                                parent.appendChild(mark);
                            }
                            showToast('已恢复被撤回的消息（缓存版本）', 1500, 'success');
                            msgCache.delete(msgContainer);
                        } catch (e2) {
                            console.error('DeepSeek 增强助手: 防撤回降级恢复也失败:', e2);
                        }
                    }
                })();
            } else if (!isRetracted && currentText !== cached.text) {
                scheduleCacheUpdate(msgContainer, contentEl.innerHTML, currentText);
            }
        });
    }

    // ========================================================================
    // 复制按钮
    // ========================================================================
    function addCopyButton(messageElement) {
        if (!config.copyButton) return;
        if (messageElement.querySelector('.ds-copy-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'ds-copy-btn';
        btn.textContent = '📋 复制';
        btn.title = '复制此回复内容';
        const contentEl = messageElement.querySelector('.ds-markdown, [class*="markdown"]');
        if (!contentEl) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = contentEl.textContent.trim();
            if (!text) { showToast('无内容可复制', 1000, 'warning'); return; }
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = '✅ 已复制';
                setTimeout(() => btn.textContent = '📋 复制', 1500);
            }).catch(() => {
                const area = document.createElement('textarea');
                area.value = text;
                document.body.appendChild(area);
                area.select();
                document.execCommand('copy');
                document.body.removeChild(area);
                btn.textContent = '✅ 已复制';
                setTimeout(() => btn.textContent = '📋 复制', 1500);
            });
        });
        if (getComputedStyle(messageElement).position === 'static') {
            messageElement.style.position = 'relative';
        }
        messageElement.appendChild(btn);
    }

    function processCopyButtons(nodes) {
        if (!config.copyButton) return;
        nodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches('.ds-message:not(.ds-message-user), [class*="assistant-message"]')) {
                if (!node.querySelector('.ds-copy-btn')) addCopyButton(node);
            }
            if (node.querySelectorAll) {
                const msgs = node.querySelectorAll('.ds-message:not(.ds-message-user), [class*="assistant-message"]');
                msgs.forEach(msg => {
                    if (!msg.querySelector('.ds-copy-btn')) addCopyButton(msg);
                });
            }
        });
    }

    // ========================================================================
    // 导出对话（包括从 IndexedDB 读取）
    // ========================================================================
    function getChatIdFromURL() {
        const hash = location.hash;
        let m = hash.match(/[/]chat[/]([a-f0-9-]+)/i);
        if (m) return m[1];
        const parts = location.pathname.split('/');
        return parts[parts.length-1] || '';
    }

    function readDeepSeekDB(chatId) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('deepseek-chat');
            req.onerror = () => reject(new Error('无法打开数据库'));
            req.onsuccess = () => {
                const db = req.result;
                try {
                    const tx = db.transaction('history-message', 'readonly');
                    const store = tx.objectStore('history-message');
                    const getReq = store.get(chatId);
                    getReq.onsuccess = () => {
                        const data = getReq.result;
                        db.close();
                        if (!data) reject(new Error('数据库中无此聊天记录'));
                        else resolve(data);
                    };
                    getReq.onerror = () => { db.close(); reject(new Error('读取失败')); };
                } catch(e) { db.close(); reject(e); }
            };
        });
    }

    function parseDBData(data) {
        const messages = [];
        try {
            const raw = data.chat?.data?.chat_messages || data.chat_messages || data.messages || [];
            raw.forEach(v => {
                const content = v.fragments?.[0]?.content || v.content || v.text || '';
                const role = v.role || 'user';
                const think = v.fragments?.[0]?.reasoning_content || v.reasoning_content || '';
                if (content && content.trim()) {
                    const msg = { role, content: content.trim() };
                    if (think && think.trim()) msg.chain_of_thought = think.trim();
                    messages.push(msg);
                }
            });
        } catch(e) { console.error('Parse error', e); }
        return messages;
    }

    function extractMessagesFromDOM() {
        const messages = [];
        const userEls = findAllElements(['.fbb737a4', '[class*="user-message"]', '[class*="user-msg"]'], document);
        const aiEls = findAllElements([
            '.ds-message .ds-markdown:not(.ds-think-content .ds-markdown)',
            '.ds-message [class*="markdown"]',
            '[class*="assistant-message"] [class*="markdown"]',
        ], document);
        const thinkEls = findAllElements(['.ds-think-content', '[class*="think-content"]'], document);
        const all = [];
        userEls.forEach(el => all.push({ type: 'user', el }));
        aiEls.forEach(el => all.push({ type: 'ai', el }));
        thinkEls.forEach(el => all.push({ type: 'think', el }));
        all.sort((a, b) => {
            const pos = a.el.compareDocumentPosition(b.el);
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            return 0;
        });
        let currentThink = '';
        all.forEach(item => {
            if (item.type === 'user') {
                const content = getText(item.el);
                if (content) messages.push({ role: 'user', content });
            } else if (item.type === 'think') {
                currentThink = getText(item.el);
            } else if (item.type === 'ai') {
                const content = getText(item.el);
                if (content) {
                    const msg = { role: 'assistant', content };
                    if (currentThink) { msg.chain_of_thought = currentThink; currentThink = ''; }
                    messages.push(msg);
                }
            }
        });
        return messages;
    }

    function getConversationTitle() {
        const titles = ['.f8d1e4c0 .afa34042', '.f8d1e4c0', '[class*="chat-title"]', '[class*="conversation-title"]'];
        for (const sel of titles) {
            const el = document.querySelector(sel);
            if (el) { const text = getText(el); if (text) return text; }
        }
        return 'DeepSeek Chat';
    }

    async function collectMessages() {
        try {
            const chatId = getChatIdFromURL();
            if (chatId) {
                const data = await readDeepSeekDB(chatId);
                const msgs = parseDBData(data);
                if (msgs && msgs.length) return { title: getConversationTitle(), messages: msgs };
            }
        } catch(e) { console.log('IndexedDB fallback:', e.message); }
        const msgs = extractMessagesFromDOM();
        return { title: getConversationTitle(), messages: msgs };
    }

    function filterMessages(messages, settings) {
        let filtered = messages;
        if (settings.onlyReply) {
            filtered = filtered.filter(m => m.role === 'assistant');
            filtered = filtered.map(m => ({ role: m.role, content: m.content }));
        } else {
            if (!settings.includeUser) filtered = filtered.filter(m => m.role !== 'user');
            if (!settings.includeThink) {
                filtered = filtered.map(m => {
                    if (m.role === 'assistant' && m.chain_of_thought) {
                        const { chain_of_thought, ...rest } = m;
                        return rest;
                    }
                    return m;
                });
            }
        }
        return filtered;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function convertToMarkdown(data, settings) {
        let md = '';
        if (!settings.onlyReply) {
            md += `# ${data.title}\n\n- **URL**: ${data.url}\n- **Date**: ${new Date(data.date).toLocaleString()}\n\n---\n\n`;
        }
        data.messages.forEach((msg, i) => {
            if (!settings.onlyReply) {
                const icon = msg.role === 'user' ? '👤' : '🤖';
                md += `## ${icon} ${msg.role === 'user' ? 'User' : 'Assistant'}\n\n`;
            }
            if (msg.chain_of_thought && !settings.onlyReply) {
                md += `**思考过程:**\n${msg.chain_of_thought}\n\n`;
            }
            md += `${msg.content}\n\n`;
            if (!settings.onlyReply && i < data.messages.length-1) md += '---\n\n';
        });
        return md;
    }

    function convertToPlain(data, settings) {
        let txt = '';
        if (!settings.onlyReply) {
            txt += `${data.title}\n\nURL: ${data.url}\nDate: ${new Date(data.date).toLocaleString()}\n\n${'='.repeat(50)}\n\n`;
        }
        data.messages.forEach((msg, i) => {
            if (!settings.onlyReply) txt += `${msg.role === 'user' ? 'User' : 'Assistant'}:\n\n`;
            if (msg.chain_of_thought && !settings.onlyReply) txt += `[思考过程]\n${msg.chain_of_thought}\n\n`;
            txt += `${msg.content}\n\n`;
            if (!settings.onlyReply && i < data.messages.length-1) txt += '-'.repeat(40) + '\n\n';
        });
        return txt;
    }

    function convertToHTML(data, settings) {
        const safeTitle = escapeHtml(data.title || 'DeepSeek Chat');
        let html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
        <style>
            :root { --bg: #fff; --text: #1a1a2e; --border: #e8e8ec; --user-bg: #f0f4ff; --ai-bg: #f4faf4; --user-border: #4f46e5; --ai-border: #22c55e; --code-bg: #1e1e2e; --code-text: #e8e8ec; --secondary: #6b7280; }
            @media (prefers-color-scheme: dark) { :root { --bg: #0d0d1a; --text: #e8e8ec; --border: #2a2a3e; --user-bg: #14142a; --ai-bg: #0d1f0d; --user-border: #6366f1; --ai-border: #4ade80; --code-bg: #1a1a2e; --code-text: #e8e8ec; --secondary: #9ca3af; } }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 20px auto; padding: 0 24px; background: var(--bg); color: var(--text); line-height: 1.7; }
            .chat-header { border-bottom: 2px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; }
            .chat-title { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
            .chat-meta { font-size: 13px; color: var(--secondary); }
            .msg { margin: 16px 0; padding: 16px 20px; border-radius: 12px; border-left: 4px solid var(--border); }
            .msg-user { background: var(--user-bg); border-left-color: var(--user-border); }
            .msg-assistant { background: var(--ai-bg); border-left-color: var(--ai-border); }
            .msg-role { font-weight: 600; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
            .msg-content { white-space: pre-wrap; word-break: break-word; }
            .msg-content pre { background: var(--code-bg); color: var(--code-text); padding: 12px 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.6; }
            .msg-content code { font-family: 'Fira Code', 'Consolas', monospace; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
            .msg-content pre code { background: none; padding: 0; }
            .think-box { background: rgba(255,200,0,0.06); border-left: 3px solid #fbbf24; padding: 8px 14px; margin: 8px 0; border-radius: 4px; font-size: 13px; color: var(--secondary); }
            .think-box summary { cursor: pointer; font-weight: 500; color: var(--text); }
            .think-box .think-body { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border); }
            .ref { font-size: 12px; color: var(--secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
            .ref a { color: var(--user-border); text-decoration: none; }
            .ref a:hover { text-decoration: underline; }
            .sep { margin: 24px 0; border: none; border-top: 1px solid var(--border); }
            .code-copy-btn { float: right; background: rgba(255,255,255,0.08); border: none; color: var(--secondary); padding: 2px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-top: -2px; }
            .code-copy-btn:hover { background: rgba(255,255,255,0.15); }
            .lang-label { font-size: 10px; text-transform: uppercase; color: var(--secondary); margin-right: 8px; }
            .math-block { text-align: center; padding: 8px 0; overflow-x: auto; }
            .math-inline { display: inline-block; padding: 0 4px; }
            table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
            th, td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
            th { background: rgba(0,0,0,0.04); font-weight: 600; }
            @media (prefers-color-scheme: dark) { th { background: rgba(255,255,255,0.04); } }
        </style>
        </head><body>
        <div class="chat-header"><div class="chat-title">${safeTitle}</div><div class="chat-meta">🔗 ${escapeHtml(data.url)}</div><div class="chat-meta">📅 ${new Date(data.date).toLocaleString()}</div></div>`;
        data.messages.forEach((msg, idx) => {
            const cls = msg.role === 'user' ? 'msg-user' : 'msg-assistant';
            const icon = msg.role === 'user' ? '👤' : '🤖';
            const label = msg.role === 'user' ? 'User' : 'Assistant';
            html += `<div class="msg ${cls}">`;
            if (!settings.onlyReply) html += `<div class="msg-role">${icon} ${label}</div>`;
            if (msg.chain_of_thought && !settings.onlyReply) {
                html += `<details class="think-box"><summary>💭 思考过程</summary><div class="think-body">${escapeHtml(msg.chain_of_thought).replace(/\n/g, '<br>')}</div></details>`;
            }
            html += `<div class="msg-content">${escapeHtml(msg.content || '').replace(/\n/g, '<br>')}</div>`;
            html += `</div>`;
            if (!settings.onlyReply && idx < data.messages.length-1) html += `<hr class="sep">`;
        });
        html += `<script>
            document.addEventListener('click', function(e) {
                const btn = e.target.closest('.code-copy-btn');
                if (!btn) return;
                const code = btn.closest('pre')?.querySelector('code');
                if (!code) return;
                const text = code.textContent || '';
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        const old = btn.textContent;
                        btn.textContent = '✓ 已复制';
                        setTimeout(() => btn.textContent = old, 1500);
                    }).catch(() => {});
                }
            });
        <\/script></body></html>`;
        return html;
    }

    function convertToJSON(data, settings) {
        return { title: data.title, url: data.url, date: data.date, messages: data.messages };
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    }

    async function exportChat(format) {
        const loading = document.createElement('div');
        loading.id = 'ds-export-loading';
        loading.innerHTML = `<div class="ds-loading-box"><div class="ds-loading-spinner"></div><div>正在导出 ${format.toUpperCase()}...</div></div>`;
        document.body.appendChild(loading);
        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('导出超时，请重试')), 10000));
            const collectPromise = collectMessages();
            const { title, messages } = await Promise.race([collectPromise, timeoutPromise]);
            if (!messages || !messages.length) { showToast('没有找到消息可导出', 2000, 'warning'); loading.remove(); return; }
            const settings = config.exportSettings;
            const filtered = filterMessages(messages, settings);
            const data = { title: title || 'DeepSeek Chat', url: location.href, date: new Date().toISOString(), messages: filtered };
            let content, filename, mime;
            const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50);
            switch(format) {
                case 'json': content = JSON.stringify(convertToJSON(data, settings), null, 2); filename = `${safeTitle}.json`; mime = 'application/json'; break;
                case 'markdown': content = convertToMarkdown(data, settings); filename = `${safeTitle}.md`; mime = 'text/markdown'; break;
                case 'text': content = convertToPlain(data, settings); filename = `${safeTitle}.txt`; mime = 'text/plain'; break;
                case 'html': content = convertToHTML(data, settings); filename = `${safeTitle}.html`; mime = 'text/html'; break;
                default: showToast('不支持的格式', 1500, 'error'); loading.remove(); return;
            }
            downloadFile(content, filename, mime);
            showToast(`✅ ${format.toUpperCase()} 导出成功`, 2000, 'success');
        } catch(e) {
            showToast('导出失败: ' + e.message, 2500, 'error');
            console.error(e);
        } finally {
            loading.remove();
        }
    }
    // ========================================================================
    // 设置面板（包含所有开关、数值输入、重置等）
    // ========================================================================
    function openSettingsPanel() {
        const existing = document.getElementById('ds-panel-overlay');
        if (existing) { existing.remove(); return; }

        const overlay = document.createElement('div');
        overlay.id = 'ds-panel-overlay';
        const panel = document.createElement('div');
        panel.id = 'ds-panel';
        const header = document.createElement('div');
        header.className = 'ds-panel-header';
        header.innerHTML = `<h2>⚙️ 增强设置</h2><button class="ds-panel-close" id="ds-panel-close">✕</button>`;
        panel.appendChild(header);

        const body = document.createElement('div');
        body.className = 'ds-panel-body';

        const card = (title) => {
            const c = document.createElement('div');
            c.className = 'ds-card';
            const t = document.createElement('div');
            t.className = 'ds-card-title';
            t.textContent = title;
            c.appendChild(t);
            return c;
        };

        const toggle = (label, desc, key, onChange) => {
            const div = document.createElement('div');
            div.className = 'ds-control';
            const row = document.createElement('div');
            row.className = 'ds-toggle-row';
            const info = document.createElement('div');
            info.innerHTML = `<div class="ds-control-label">${label}</div><div class="ds-control-desc">${desc}</div>`;
            const track = document.createElement('div');
            const current = config[key];
            track.className = `ds-toggle-track${current ? ' active' : ''}`;
            track.innerHTML = '<div class="ds-toggle-thumb"></div>';
            track.addEventListener('click', () => {
                const newVal = !config[key];
                config[key] = newVal;
                if (KEY_MAP[key]) setVal(STORAGE[KEY_MAP[key]], newVal);
                track.classList.toggle('active', newVal);
                if (onChange) onChange(newVal);
            });
            row.appendChild(info);
            row.appendChild(track);
            div.appendChild(row);
            return div;
        };

        const numberInput = (label, desc, key) => {
            const div = document.createElement('div');
            div.className = 'ds-control';
            div.innerHTML = `<div class="ds-control-label">${label}</div><div class="ds-control-desc">${desc}</div>`;
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'ds-input-number';
            input.value = config[key];
            input.min = 0;
            input.addEventListener('change', () => {
                let v = parseInt(input.value);
                if (isNaN(v) || v < 0) v = 0;
                input.value = v;
                config[key] = v;
                if (KEY_MAP[key]) setVal(STORAGE[KEY_MAP[key]], v);
                applyAllSettings();
                showToast(`${label} 设为 ${v}`, 1000);
            });
            div.appendChild(input);
            return div;
        };

        const textInput = (label, desc, key) => {
            const div = document.createElement('div');
            div.className = 'ds-control';
            div.innerHTML = `<div class="ds-control-label">${label}</div><div class="ds-control-desc">${desc}</div>`;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'ds-input-text';
            input.value = config[key] || '';
            input.addEventListener('change', () => {
                const v = input.value.trim();
                if (v) {
                    config[key] = v;
                    if (KEY_MAP[key]) setVal(STORAGE[KEY_MAP[key]], v);
                    setupShortcuts();
                    showToast('快捷键已更新', 1000);
                }
            });
            div.appendChild(input);
            return div;
        };

        const createExportToggle = (label, desc, key) => {
            const div = document.createElement('div');
            div.className = 'ds-control';
            const row = document.createElement('div');
            row.className = 'ds-toggle-row';
            const info = document.createElement('div');
            info.innerHTML = `<div class="ds-control-label">${label}</div><div class="ds-control-desc">${desc}</div>`;
            const track = document.createElement('div');
            const current = config.exportSettings[key];
            track.className = `ds-toggle-track${current ? ' active' : ''}`;
            track.innerHTML = '<div class="ds-toggle-thumb"></div>';
            track.addEventListener('click', () => {
                const newVal = !config.exportSettings[key];
                config.exportSettings[key] = newVal;
                setVal(STORAGE.EXPORT_SETTINGS, config.exportSettings);
                track.classList.toggle('active', newVal);
                showToast(`${label} ${newVal?'开启':'关闭'}`, 800);
            });
            row.appendChild(info);
            row.appendChild(track);
            div.appendChild(row);
            return div;
        };

        // 卡片构建
        const c1 = card('📦 代码块折叠');
        c1.appendChild(numberInput('折叠阈值 (行)', '超过此行数自动折叠，0=禁用', 'foldThreshold'));
        c1.appendChild(numberInput('预览行数', '折叠后保留的行数，0=完全隐藏', 'previewLines'));
        body.appendChild(c1);

        const c2 = card('📊 表格导出');
        c2.appendChild(toggle('表格导出按钮', '悬停显示 PNG/CSV/Markdown 按钮', 'tableButtons', (v) => { reapplyTables(); showToast(`表格导出 ${v?'开启':'关闭'}`, 1000); }));
        body.appendChild(c2);

        const c3 = card('🧠 思考折叠');
        c3.appendChild(toggle('自动折叠思考区域', 'AI 回复后自动收起思考过程', 'autoCollapseThink', (v) => { reapplyThinking(); showToast(`自动折叠 ${v?'开启':'关闭'}`, 1000); }));
        body.appendChild(c3);

        const c4 = card('🖥️ 界面增强');
        c4.appendChild(toggle('宽屏模式', '减少左右留白，扩展消息区域', 'wideScreen', (v) => { document.documentElement.classList.toggle('ds-wide-screen', v); showToast(`宽屏 ${v?'开启':'关闭'}`, 1000); }));
        c4.appendChild(toggle('Ctrl+Enter 发送', '改为 Ctrl+Enter 发送，Enter 换行', 'ctrlEnter', (v) => { setupCtrlEnter(); showToast(`Ctrl+Enter ${v?'开启':'关闭'}`, 1000); }));
        body.appendChild(c4);

        const c5 = card('🛡️ 防撤回');
        c5.appendChild(toggle('启用防撤回', '自动检测并恢复被撤回的消息', 'antiRetract', (v) => { if (v) { msgCache.clear(); fullScan(); } showToast(`防撤回 ${v?'开启':'关闭'}`, 1000); }));
        body.appendChild(c5);

        const c6 = card('📁 文件夹管理');
        c6.appendChild(toggle('启用文件夹分组', '在侧边栏增加文件夹管理功能', 'folderManager', (v) => { if (v) initFolderManager(); else destroyFolderManager(); showToast(`文件夹管理 ${v?'开启':'关闭'}`, 1000); }));
        body.appendChild(c6);

        const c7 = card('📋 复制功能');
        c7.appendChild(toggle('启用复制按钮', '在 AI 回复右上角显示复制按钮', 'copyButton', (v) => { if (v) fullScan(); else document.querySelectorAll('.ds-copy-btn').forEach(el => el.remove()); showToast(`复制按钮 ${v?'开启':'关闭'}`, 1000); }));
        body.appendChild(c7);

        const c8 = card('⌨️ 快捷键');
        c8.appendChild(textInput('导出快捷键', '组合键 (如 Ctrl+Shift+E)', 'shortcutExport'));
        body.appendChild(c8);

        const c9 = card('📤 导出筛选');
        c9.appendChild(createExportToggle('保留用户问题', '导出时包含用户的问题', 'includeUser'));
        c9.appendChild(createExportToggle('保留思考过程', '导出时包含 AI 的思考过程', 'includeThink'));
        c9.appendChild(createExportToggle('仅回复内容', '只导出 AI 的回复，忽略其他', 'onlyReply'));
        c9.appendChild(createExportToggle('导出引用链接', '在 HTML 导出中包含引用链接', 'exportRefs'));
        body.appendChild(c9);

        panel.appendChild(body);

        const footer = document.createElement('div');
        footer.className = 'ds-panel-footer';
        footer.innerHTML = `
            <div><button class="ds-btn ds-btn-secondary" id="ds-panel-close-btn">关闭</button>
            <button class="ds-btn ds-btn-danger" id="ds-panel-reset">重置默认</button></div>
            <div style="font-size:11px;opacity:0.3;">v2.4.2 · 设置自动保存</div>
        `;
        panel.appendChild(footer);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        const close = () => { overlay.classList.add('fade-out'); setTimeout(() => overlay.remove(), 300); };
        document.getElementById('ds-panel-close')?.addEventListener('click', close);
        document.getElementById('ds-panel-close-btn')?.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        document.getElementById('ds-panel-reset')?.addEventListener('click', () => {
            if (!confirm('确定恢复所有设置为默认值？')) return;
            Object.keys(DEFAULTS).forEach(key => {
                if (key === 'exportSettings') {
                    config.exportSettings = { ...DEFAULTS.exportSettings };
                    setVal(STORAGE.EXPORT_SETTINGS, config.exportSettings);
                } else {
                    config[key] = DEFAULTS[key];
                    if (KEY_MAP[key]) setVal(STORAGE[KEY_MAP[key]], config[key]);
                }
            });
            applyAllSettings();
            close();
            setTimeout(openSettingsPanel, 300);
            showToast('已重置所有设置', 1500, 'success');
        });
    }

    // ========================================================================
    // 全量扫描（初始化时执行一次）
    // ========================================================================
    let allCodeFolded = config.allCodeFolded;

    function updateGlobalFoldButton() {
        const btn = document.getElementById('ds-global-fold-btn');
        if (!btn) return;
        if (allCodeFolded) {
            btn.innerHTML = '📂 展开全部';
            btn.title = '展开所有代码块';
        } else {
            btn.innerHTML = '📁 折叠全部';
            btn.title = '折叠所有代码块';
        }
    }

    function toggleAllCodeBlocks() {
        allCodeFolded = !allCodeFolded;
        config.allCodeFolded = allCodeFolded;
        setVal(STORAGE.ALL_CODE_FOLDED, allCodeFolded);
        const pres = document.querySelectorAll('pre');
        pres.forEach(pre => {
            if (pre.__dsFold) {
                if (allCodeFolded) {
                    pre.__dsFold.fold();
                } else {
                    pre.__dsFold.expand();
                }
            }
        });
        updateGlobalFoldButton();
        showToast(allCodeFolded ? '已折叠所有代码块' : '已展开所有代码块', 1000);
    }

    function fullScan() {
        const idle = (fn) => {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(fn, { timeout: 2000 });
            } else {
                setTimeout(fn, 100);
            }
        };

        idle(() => {
            const pres = findAllElements(['pre', '.md-code-block pre', '[class*="code-block"] pre', 'pre[class*="language-"]'], document);
            processPreElements(pres);
            // 恢复全局折叠状态
            if (allCodeFolded) {
                setTimeout(() => {
                    document.querySelectorAll('pre').forEach(pre => {
                        if (pre.__dsFold) pre.__dsFold.fold();
                    });
                }, 300);
            }
        });

        idle(() => {
            const tables = findAllElements(['.ds-markdown table', '.ds-markdown-table', 'table'], document);
            processTableElements(tables);
        });

        if (config.autoCollapseThink) {
            idle(() => {
                const thinks = findAllElements(['.ds-think-content', '[class*="think-content"]'], document);
                processThinkContents(thinks);
            });
        }

        if (config.copyButton) {
            idle(() => {
                const msgs = findAllElements(['.ds-message:not(.ds-message-user)', '[class*="assistant-message"]'], document);
                processCopyButtons(msgs);
            });
        }

        if (config.antiRetract) {
            idle(() => {
                const containers = findAllElements(['.ds-message:not(.ds-message-user)', '[class*="assistant-message"]'], document);
                antiRetractScanForNodes(containers);
            });
        }
    }

    // ========================================================================
    // 增量观察者（防抖处理）
    // ========================================================================
    let observer = null;
    let processTimeout = null;

    function startObserver() {
        if (observer) return;
        let addedNodesBuffer = [];

        observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type !== 'childList' || !m.addedNodes.length) continue;
                for (const node of m.addedNodes) {
                    if (node.nodeType === 1) addedNodesBuffer.push(node);
                }
            }
            clearTimeout(processTimeout);
            processTimeout = setTimeout(() => {
                if (addedNodesBuffer.length === 0) return;
                const nodes = addedNodesBuffer.slice();
                addedNodesBuffer = [];

                const preElements = [], tableElements = [], thinkElements = [], copyElements = [], messageElements = [];

                nodes.forEach(node => {
                    if (node.matches && node.matches('pre, .md-code-block pre, [class*="code-block"] pre, pre[class*="language-"]')) {
                        preElements.push(node);
                    }
                    if (node.matches && node.matches('table, .ds-markdown table, .ds-markdown-table')) {
                        tableElements.push(node);
                    }
                    if (node.matches && node.matches('.ds-think-content, [class*="think-content"]')) {
                        thinkElements.push(node);
                    }
                    if (node.matches && node.matches('.ds-message:not(.ds-message-user), [class*="assistant-message"]')) {
                        copyElements.push(node);
                        messageElements.push(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('pre, .md-code-block pre, [class*="code-block"] pre, pre[class*="language-"]').forEach(el => preElements.push(el));
                        node.querySelectorAll('table, .ds-markdown table, .ds-markdown-table').forEach(el => tableElements.push(el));
                        node.querySelectorAll('.ds-think-content, [class*="think-content"]').forEach(el => thinkElements.push(el));
                        node.querySelectorAll('.ds-message:not(.ds-message-user), [class*="assistant-message"]').forEach(el => {
                            copyElements.push(el);
                            messageElements.push(el);
                        });
                    }
                });

                const unique = (arr) => { const s = new Set(arr); return Array.from(s); };
                const uniqPre = unique(preElements), uniqTable = unique(tableElements);
                const uniqThink = unique(thinkElements), uniqCopy = unique(copyElements);
                const uniqMsg = unique(messageElements);

                requestAnimationFrame(() => {
                    if (uniqPre.length) processPreElements(uniqPre);
                    if (uniqTable.length) processTableElements(uniqTable);
                    if (config.autoCollapseThink && uniqThink.length) processThinkContents(uniqThink);
                    if (config.copyButton && uniqCopy.length) processCopyButtons(uniqCopy);
                    if (config.antiRetract && uniqMsg.length) antiRetractScanForNodes(uniqMsg);
                    // 新代码块出现后，如果全局折叠状态为true，自动折叠
                    if (allCodeFolded && uniqPre.length) {
                        setTimeout(() => {
                            uniqPre.forEach(pre => {
                                if (pre.__dsFold) pre.__dsFold.fold();
                            });
                        }, 50);
                    }
                });
            }, 150);
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ========================================================================
    // 应用所有设置（清理旧UI并重新扫描）
    // ========================================================================
    function applyAllSettings() {
        document.documentElement.classList.toggle('ds-wide-screen', config.wideScreen);

        document.querySelectorAll('.ds-fold-btn').forEach(el => el.remove());
        document.querySelectorAll('.table-internal-buttons').forEach(el => el.remove());
        document.querySelectorAll('.ds-copy-btn').forEach(el => el.remove());

        document.querySelectorAll('pre').forEach(pre => { pre.dataset.dsFoldProcessed = ''; });
        document.querySelectorAll('.ds-markdown table').forEach(table => { table.dataset.dsTableProcessed = ''; });

        // 同步全局折叠状态
        allCodeFolded = config.allCodeFolded;
        updateGlobalFoldButton();

        fullScan();

        if (config.autoCollapseThink) {
            setupThinkCollapse();
        } else {
            document.querySelectorAll('.ds-think-content').forEach(el => el.classList.remove('ds-collapsed'));
            if (thinkStyle) { thinkStyle.remove(); thinkStyle = null; }
        }

        setupCtrlEnter();

        if (config.antiRetract) {
            msgCache.clear();
            fullScan();
        }

        if (config.folderManager) initFolderManager();
        else destroyFolderManager();

        setupShortcuts();
    }

    // ========================================================================
    // 快捷键
    // ========================================================================
    function setupShortcuts() {
        document.removeEventListener('keydown', handleShortcut);
        document.addEventListener('keydown', handleShortcut);
    }

    function handleShortcut(e) {
        const shortcut = config.shortcutExport || 'Ctrl+Shift+E';
        const parts = shortcut.split('+').map(s => s.trim());
        const key = parts.pop();
        const ctrl = parts.includes('Ctrl');
        const shift = parts.includes('Shift');
        const alt = parts.includes('Alt');
        const meta = parts.includes('Meta') || parts.includes('Cmd');
        if (e.key === key && e.ctrlKey === ctrl && e.shiftKey === shift && e.altKey === alt && e.metaKey === meta) {
            e.preventDefault();
            exportChat('json');
        }
    }

    // ========================================================================
    // Ctrl+Enter 发送（支持 textarea 和 contenteditable）
    // ========================================================================
    function setupCtrlEnter() {
        document.removeEventListener('keydown', handleCtrlEnter, true);
        if (config.ctrlEnter) document.addEventListener('keydown', handleCtrlEnter, true);
    }

    function handleCtrlEnter(e) {
        const target = e.target;
        if (!target) return;
        const isTextarea = target.tagName === 'TEXTAREA';
        const isContentEditable = target.getAttribute && target.getAttribute('contenteditable') === 'true';
        if (!isTextarea && !isContentEditable) return;
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
            target.dispatchEvent(ev);
        }
    }

    // ========================================================================
    // 文件夹管理
    // ========================================================================
    let folderInitialized = false;
    let folderObserver = null;

    function initFolderManager() {
        if (folderInitialized) return;
        folderInitialized = true;
        const insertPoint = findFolderInsertPoint();
        if (!insertPoint) { console.log('Folder: 未找到插入点'); return; }
        const panel = document.createElement('div');
        panel.className = 'ds-folder-panel';
        panel.id = 'ds-folder-panel';
        panel.innerHTML = `
            <div class="ds-fh"><span class="ds-fh-title">📁 文件夹</span><button class="ds-fh-new" id="ds-folder-new">＋ 新建</button></div>
            <div id="ds-folder-list"></div>
        `;
        insertPoint.parentElement?.insertBefore(panel, insertPoint.nextSibling);
        let folderData = loadFolderData();
        renderFolderList(folderData);
        document.getElementById('ds-folder-new')?.addEventListener('click', () => {
            const name = prompt('新建文件夹名称：');
            if (!name || !name.trim()) return;
            folderData.folders.push({ id: 'f_' + Date.now(), name: name.trim() });
            saveFolderData(folderData);
            renderFolderList(folderData);
        });
        if (folderObserver) folderObserver.disconnect();
        folderObserver = new MutationObserver(() => { renderFolderList(loadFolderData()); });
        folderObserver.observe(document.body, { childList: true, subtree: true });
    }

    function findFolderInsertPoint() {
        const newChatBtn = document.querySelector('[class*="new-chat"], [class*="start-chat"]');
        if (newChatBtn) return newChatBtn;
        const titles = document.querySelectorAll('div');
        for (const el of titles) {
            if (getText(el).includes('历史对话') || getText(el).includes('聊天记录')) return el;
        }
        return null;
    }

    function loadFolderData() {
        try {
            const raw = GM_getValue(STORAGE.FOLDER_DATA, null);
            if (raw) {
                const data = JSON.parse(raw);
                if (data && Array.isArray(data.folders)) return data;
            }
        } catch(e) {}
        return { folders: [], links: {}, expanded: {} };
    }

    function saveFolderData(data) {
        GM_setValue(STORAGE.FOLDER_DATA, JSON.stringify(data));
    }

    function renderFolderList(data) {
        const list = document.getElementById('ds-folder-list');
        if (!list) return;
        const folders = data.folders || [];
        const links = data.links || {};
        if (!folders.length) {
            list.innerHTML = '<div class="ds-empty">还没有文件夹，点击「＋ 新建」</div>';
            return;
        }
        let html = '';
        const currentSid = getChatIdFromURL();
        folders.forEach(f => {
            const sids = Object.keys(links).filter(k => links[k] === f.id);
            const count = sids.length;
            const color = hashColor(f.id);
            const expanded = data.expanded && data.expanded[f.id] !== false;
            html += `<div class="ds-folder-item" data-fid="${f.id}">
                <span class="ds-caret${expanded ? ' open' : ''}" data-fid="${f.id}">▸</span>
                <span class="ds-fname" style="color:${color}">${f.name}</span>
                <span class="ds-fcount">${count}</span>
                <span class="ds-fops">
                    <button data-action="rename" data-fid="${f.id}">✏️</button>
                    <button data-action="delete" data-fid="${f.id}">✕</button>
                </span>
            </div>
            <div class="ds-children${expanded ? '' : ' collapsed'}" data-fid="${f.id}">`;
            if (expanded) {
                sids.forEach(sid => {
                    const title = getConversationTitleBySid(sid) || '未命名对话';
                    const isCurrent = sid === currentSid;
                    html += `<div class="ds-conv-row${isCurrent ? ' on' : ''}" data-sid="${sid}">
                        <span class="ds-ctitle">${title}</span>
                        <button class="ds-cout" data-action="remove" data-sid="${sid}">移出</button>
                    </div>`;
                });
            }
            html += `</div>`;
        });
        list.innerHTML = html;

        // 事件绑定
        list.querySelectorAll('.ds-folder-item .ds-fname, .ds-folder-item .ds-caret').forEach(el => {
            el.addEventListener('click', function(e) {
                e.stopPropagation();
                const fid = this.closest('.ds-folder-item')?.dataset.fid || this.dataset.fid;
                if (!fid) return;
                const children = list.querySelector(`.ds-children[data-fid="${fid}"]`);
                if (children) {
                    children.classList.toggle('collapsed');
                    const caret = list.querySelector(`.ds-caret[data-fid="${fid}"]`);
                    if (caret) caret.classList.toggle('open');
                    const data2 = loadFolderData();
                    if (!data2.expanded) data2.expanded = {};
                    data2.expanded[fid] = !children.classList.contains('collapsed');
                    saveFolderData(data2);
                }
            });
        });

        list.querySelectorAll('.ds-conv-row').forEach(row => {
            row.addEventListener('click', function() {
                const sid = this.dataset.sid;
                if (sid) {
                    const link = document.querySelector(`a[href$="/s/${sid}"]`);
                    if (link) link.click();
                }
            });
        });

        list.querySelectorAll('[data-action="remove"]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const sid = this.dataset.sid;
                if (!sid) return;
                const data2 = loadFolderData();
                delete data2.links[sid];
                saveFolderData(data2);
                renderFolderList(data2);
                showToast('已移出文件夹', 1000);
            });
        });

        list.querySelectorAll('[data-action="rename"]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const fid = this.dataset.fid;
                if (!fid) return;
                const data2 = loadFolderData();
                const f = data2.folders.find(x => x.id === fid);
                if (!f) return;
                const name = prompt('重命名文件夹：', f.name);
                if (name && name.trim()) {
                    f.name = name.trim();
                    saveFolderData(data2);
                    renderFolderList(data2);
                }
            });
        });

        list.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const fid = this.dataset.fid;
                if (!fid) return;
                if (!confirm('确定删除此文件夹？')) return;
                const data2 = loadFolderData();
                data2.folders = data2.folders.filter(x => x.id !== fid);
                Object.keys(data2.links).forEach(k => {
                    if (data2.links[k] === fid) delete data2.links[k];
                });
                saveFolderData(data2);
                renderFolderList(data2);
                showToast('已删除文件夹', 1000);
            });
        });
    }

    function getConversationTitleBySid(sid) {
        const link = document.querySelector(`a[href$="/s/${sid}"]`);
        if (link) {
            const titleEl = link.querySelector('.c08e6e93, [class*="title"]');
            if (titleEl) return getText(titleEl);
            return getText(link);
        }
        return null;
    }

    function hashColor(id) {
        let h = 0;
        for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        const colors = ['#7aa2ff', '#ff9e7a', '#7affb0', '#ffd27a', '#d27aff', '#7affe0', '#ff7ab0'];
        return colors[h % colors.length];
    }

    function destroyFolderManager() {
        folderInitialized = false;
        if (folderObserver) {
            folderObserver.disconnect();
            folderObserver = null;
        }
        const panel = document.getElementById('ds-folder-panel');
        if (panel) panel.remove();
    }

    // ========================================================================
    // 导出按钮（下拉菜单）+ 全局折叠按钮已集成在 injectExportButton 中
    // ========================================================================
    let exportDropdownVisible = false;

    function injectExportButton() {
        if (document.getElementById('ds-export-btn')) return;

        // 容器
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;top:10px;right:80px;z-index:9998;display:flex;align-items:center;gap:6px;';

        // ---- 全局折叠按钮 ----
        const foldBtn = document.createElement('button');
        foldBtn.id = 'ds-global-fold-btn';
        foldBtn.style.cssText = `
            background: rgba(255,255,255,0.85); backdrop-filter: blur(8px);
            border: 1px solid rgba(0,0,0,0.08); border-radius: 8px;
            padding: 6px 12px; font-size: 13px; font-weight: 500;
            cursor: pointer; color: #333; display: flex; align-items: center;
            gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.2s; font-family: system-ui, sans-serif;
        `;
        foldBtn.title = '折叠/展开所有代码块';
        foldBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleAllCodeBlocks(); });
        container.appendChild(foldBtn);

        // ---- 导出按钮 ----
        const btn = document.createElement('button');
        btn.id = 'ds-export-btn';
        btn.style.cssText = `
            background: rgba(255,255,255,0.85); backdrop-filter: blur(8px);
            border: 1px solid rgba(0,0,0,0.08); border-radius: 8px;
            padding: 6px 14px; font-size: 13px; font-weight: 500;
            cursor: pointer; color: #333; display: flex; align-items: center;
            gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.2s; font-family: system-ui, sans-serif;
        `;
        btn.innerHTML = '📤 导出 <span class="arrow">▾</span>';
        container.appendChild(btn);

        document.body.appendChild(container);

        // 初始化图标
        updateGlobalFoldButton();

        // ---- 导出下拉菜单 ----
        const dropdown = document.createElement('div');
        dropdown.className = 'ds-export-dropdown';
        dropdown.id = 'ds-export-dropdown';
        dropdown.style.cssText = 'position:fixed;top:48px;right:80px;z-index:9999;';

        const formats = [
            { label: '📄 JSON', fmt: 'json' },
            { label: '📝 Markdown', fmt: 'markdown' },
            { label: '📃 纯文本', fmt: 'text' },
            { label: '🌐 HTML (增强)', fmt: 'html' },
        ];
        formats.forEach(f => {
            const opt = document.createElement('div');
            opt.className = 'opt';
            opt.textContent = f.label;
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                exportChat(f.fmt);
                toggleDropdown(false);
            });
            dropdown.appendChild(opt);
        });

        const sep = document.createElement('div');
        sep.className = 'sep';
        dropdown.appendChild(sep);

        const fl = document.createElement('div');
        fl.className = 'filter-label';
        fl.textContent = '筛选';
        dropdown.appendChild(fl);

        const filters = [
            { key: 'includeUser', label: '用户问题' },
            { key: 'includeThink', label: '思考过程' },
            { key: 'onlyReply', label: '仅回复' },
            { key: 'exportRefs', label: '引用链接' },
        ];
        filters.forEach(f => {
            const item = document.createElement('div');
            item.className = 'filter-item';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.dataset.filterKey = f.key;
            cb.checked = config.exportSettings[f.key] ?? DEFAULTS.exportSettings[f.key];
            cb.addEventListener('change', (e) => {
                config.exportSettings[f.key] = e.target.checked;
                setVal(STORAGE.EXPORT_SETTINGS, config.exportSettings);
            });
            const label = document.createElement('span');
            label.textContent = f.label;
            item.appendChild(cb);
            item.appendChild(label);
            dropdown.appendChild(item);
        });

        document.body.appendChild(dropdown);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(!exportDropdownVisible);
        });

        document.addEventListener('click', () => {
            if (exportDropdownVisible) toggleDropdown(false);
        });

        dropdown.addEventListener('click', e => e.stopPropagation());

        setupShortcuts();
    }

    function toggleDropdown(show) {
        const dropdown = document.getElementById('ds-export-dropdown');
        const btn = document.getElementById('ds-export-btn');
        if (!dropdown || !btn) return;
        exportDropdownVisible = show;
        dropdown.style.display = show ? 'flex' : 'none';
        const arrow = btn.querySelector('.arrow');
        if (arrow) arrow.classList.toggle('open', show);
        if (show) {
            dropdown.querySelectorAll('.filter-item input[type="checkbox"]').forEach(cb => {
                const key = cb.dataset.filterKey;
                if (key && key in config.exportSettings) cb.checked = config.exportSettings[key];
            });
        }
    }

    // ========================================================================
    // 重新应用辅助（用于设置面板动态切换）
    // ========================================================================
    function reapplyTables() {
        document.querySelectorAll('.ds-markdown table').forEach(table => {
            table.dataset.dsTableProcessed = '';
            const btns = table.querySelector('.table-internal-buttons');
            if (btns) btns.remove();
            if (config.tableButtons) addTableButtons(table);
        });
    }

    function reapplyThinking() {
        if (config.autoCollapseThink) {
            setupThinkCollapse();
            fullScan();
        } else {
            document.querySelectorAll('.ds-think-content').forEach(el => el.classList.remove('ds-collapsed'));
            if (thinkStyle) {
                thinkStyle.remove();
                thinkStyle = null;
            }
        }
    }

    // ========================================================================
    // 初始化
    // ========================================================================
    function init() {
        document.documentElement.classList.toggle('ds-wide-screen', config.wideScreen);

        // 初始化全局折叠状态
        allCodeFolded = config.allCodeFolded;

        fullScan();

        if (config.autoCollapseThink) setupThinkCollapse();

        setupCtrlEnter();
        injectExportButton();

        if (config.folderManager) setTimeout(initFolderManager, 1500);

        startObserver();

        GM_registerMenuCommand('⚙️ 打开设置面板', openSettingsPanel);
        GM_registerMenuCommand('📤 导出 JSON', () => exportChat('json'));
        GM_registerMenuCommand('📤 导出 Markdown', () => exportChat('markdown'));
        GM_registerMenuCommand('📤 导出 纯文本', () => exportChat('text'));
        GM_registerMenuCommand('📤 导出 HTML', () => exportChat('html'));
        GM_registerMenuCommand('📁 切换文件夹管理', () => {
            config.folderManager = !config.folderManager;
            setVal(STORAGE.FOLDER_MANAGER, config.folderManager);
            if (config.folderManager) {
                initFolderManager();
                showToast('文件夹管理已开启', 1000);
            } else {
                destroyFolderManager();
                showToast('文件夹管理已关闭', 1000);
            }
        });

        console.log('DeepSeek 全能增强助手 v2.4.2 已启动 (全局折叠)');
        console.log('💡 提示: 右上角「折叠全部」一键收起所有代码块');
        console.log('📤 点击「导出」按钮或使用快捷键', config.shortcutExport);
    }

    // ========================================================================
    // 启动
    // ========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();