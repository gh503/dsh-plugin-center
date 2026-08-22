/**
 * dsh-plugin-center — 插件搜索与安装管理 · 浏览器半
 *
 * 本文件是 client bundle：window.__ModuleLoader__.load({ id, factory })。
 * 与 dsh-bright-focus-theme 同款自举：不依赖任何 ctx 服务（天然免疫注入限制）。
 * UI：右下角 🧩 悬浮按钮 → 面板：搜索 npm / 已装列表 / 安装·卸载 / 操作输出。
 * 传输：同源 POST /pm（宿主端受限命令通道），自定义头 X-DSH-PM 过跨站预检。
 */
window.__ModuleLoader__.load({
  id: "dsh-plugin-center",
  factory: (require) => {
    "use strict";
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

  if (typeof window === "undefined" || typeof document === "undefined") {
      exports.inject = [];
      exports.apply = () => {};
      exports.default = exports.apply;
      return module.exports;
    }

  const TAG = "dpm-css";
  const PANEL_CSS = `
  .dpm-fab{position:fixed;right:20px;bottom:20px;z-index:9998;width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#3b9eff,#8f7bff);color:#fff;box-shadow:0 6px 18px rgba(60,110,255,.35);}
  .dpm-panel{position:fixed;right:20px;bottom:72px;z-index:9999;width:320px;max-height:74vh;overflow:auto;box-sizing:border-box;padding:14px;border-radius:16px;border:1px solid rgba(23,30,60,.12);background:rgba(255,255,255,.94);color:#1a1d24;display:none;flex-direction:column;gap:10px;box-shadow:0 12px 36px rgba(30,40,80,.2);backdrop-filter:blur(14px);font-size:13px;line-height:1.5;}
  .dpm-panel.open{display:flex;}
  .dpm-title{font-weight:700;display:flex;justify-content:space-between;align-items:center;}
  .dpm-close{border:none;background:transparent;cursor:pointer;font-size:14px;color:inherit;opacity:.7;}
  .dpm-searchRow{display:flex;gap:6px;}
  .dpm-input{flex:1;box-sizing:border-box;height:30px;border:1px solid rgba(23,30,60,.16);border-radius:10px;padding:0 10px;font:inherit;font-size:12px;background:rgba(255,255,255,.7);color:inherit;}
  .dpm-btn{border:none;border-radius:10px;padding:0 12px;height:30px;font:inherit;font-size:12px;cursor:pointer;background:linear-gradient(135deg,#3b9eff,#8f7bff);color:#fff;font-weight:600;}
  .dpm-btn:disabled{opacity:.5;cursor:wait;}
  .dpm-mini{border:1px solid rgba(23,30,60,.16);background:rgba(120,140,255,.12);color:inherit;}
  .dpm-sec{display:flex;justify-content:space-between;align-items:center;font-weight:700;}
  .dpm-item{display:flex;gap:8px;align-items:flex-start;padding:8px;border-radius:10px;background:rgba(255,255,255,.55);border:1px solid rgba(23,30,60,.08);}
  .dpm-itemBody{flex:1;min-width:0;}
  .dpm-itemName{font-weight:600;word-break:break-all;}
  .dpm-itemVer{opacity:.55;font-size:11px;margin-left:6px;}
  .dpm-itemDesc{opacity:.75;font-size:12px;margin-top:2px;word-break:break-word;}
  .dpm-action{margin-top:6px;display:flex;gap:6px;align-items:center;}
  .dpm-link{font-size:11px;opacity:.6;word-break:break-all;}
  .dpm-log{white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace;font-size:11px;background:rgba(23,30,60,.06);border-radius:10px;padding:8px;max-height:120px;overflow:auto;word-break:break-word;}
  .dpm-hint{font-size:11px;opacity:.6;}
  .dpm-err{color:#d43b3b;font-size:12px;}
  .dpm-ok{color:#19a463;font-size:12px;}
  body[data-ds-dark-theme] .dpm-panel{background:rgba(17,20,38,.95);color:#eef1f8;border-color:rgba(255,255,255,.14);}
  body[data-ds-dark-theme] .dpm-item{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);}
  body[data-ds-dark-theme] .dpm-input{background:rgba(0,0,0,.3);border-color:rgba(255,255,255,.18);}
  body[data-ds-dark-theme] .dpm-mini{background:rgba(120,140,255,.2);border-color:rgba(255,255,255,.22);}
  body[data-ds-dark-theme] .dpm-log{background:rgba(0,0,0,.35);}
  `;

  let panel = null, fab = null;

  function injectCss(tag, css) {
    if (document.getElementById(tag)) return;
    const st = document.createElement("style");
    st.id = tag;
    st.textContent = css;
    document.head.appendChild(st);
  }

  /** 调用宿主受限通道 */
  async function call(action, payload) {
    const res = await fetch("/pm", {
      method: "POST",
      headers: { "content-type": "application/json", "x-dsh-pm": "1" },
      body: JSON.stringify({ action, payload: payload || {} })
    });
    const js = await res.json().catch(() => ({ ok: false, error: "响应解析失败 HTTP " + res.status }));
    if (!js || js.ok !== true) throw new Error((js && js.error) || ("HTTP " + res.status));
    return js.data;
  }

  const $ = (sel) => panel.querySelector(sel);

  function log(msg, cls) {
    const box = $(".dpm-log");
    if (!box) return;
    box.textContent = (box.textContent ? box.textContent + "\n" : "") + msg;
    box.scrollTop = box.scrollHeight;
    box.className = "dpm-log" + (cls ? " " + cls : "");
  }

  function itemHtml(item, installed) {
    return (
      '<div class="dpm-item">' +
      '<div class="dpm-itemBody">' +
      '<span class="dpm-itemName">' + esc(item.name) + '</span><span class="dpm-itemVer">' + esc(item.version || "") + "</span>" +
      (item.description ? '<div class="dpm-itemDesc">' + esc(item.description) + "</div>" : "") +
      (item.repository ? '<div class="dpm-link">' + esc(item.repository) + "</div>" : "") +
      '<div class="dpm-action">' +
      (installed
        ? '<span class="dpm-ok">已安装</span>'
        : '<button type="button" class="dpm-btn" data-install="' + esc(item.name) + '">安装</button>') +
      "</div>" +
      "</div></div>"
    );
  }

  function installedHtml(name) {
    const escName = esc(name);
    return (
      '<div class="dpm-item"><div class="dpm-itemBody">' +
      '<span class="dpm-itemName">' + escName + "</span>" +
      '<div class="dpm-action"><button type="button" class="dpm-btn dpm-mini" data-remove="' + escName + '">卸载</button></div>' +
      "</div></div>"
    );
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function doSearch() {
    const q = $(".dpm-input[data-f=q]").value.trim();
    if (!q) return;
    const list = $(".dpm-results");
    list.innerHTML = '<div class="dpm-hint">搜索中…</div>';
    try {
      log("搜索: " + q, "");
      const items = await call("search", { q });
      const installed = await call("list");
      const set = new Set(installed.dependencies || []);
      list.innerHTML = items.length
        ? items.map((i) => itemHtml(i, set.has(i.name))).join("")
        : '<div class="dpm-hint">没有结果</div>';
      bindActions();
    } catch (e) {
      list.innerHTML = '<div class="dpm-err">' + esc(e.message) + "</div>";
      log("搜索失败: " + e.message, "dpm-err");
    }
  }

  async function refreshInstalled() {
    const box = $(".dpm-installed");
    try {
      const data = await call("list");
      const names = (data.dependencies || []).sort();
      box.innerHTML = names.length
        ? names.map(installedHtml).join("")
        : '<div class="dpm-hint">暂无第三方插件依赖</div>';
      bindActions();
    } catch (e) {
      box.innerHTML = '<div class="dpm-err">' + esc(e.message) + "</div>";
    }
  }

  function bindActions() {
    panel.querySelectorAll("[data-install]").forEach((b) =>
      b.addEventListener("click", () => run("install", b.dataset.install, b))
    );
    panel.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", () => run("remove", b.dataset.remove, b))
    );
  }

  async function run(action, pkg, btn) {
    const label = action === "install" ? "安装" : "卸载";
    if (!window.confirm(label + "插件 " + pkg + " ？安装/卸载后需重启服务生效。")) return;
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = label + "中…";
    log(label + ": " + pkg, "");
    try {
      const out = await call(action, { pkg });
      log(out, "dpm-ok");
      btn.textContent = label + "成功 ✓";
      setTimeout(() => {
        if (action === "install") {
          btn.textContent = "已安装";
          btn.disabled = true;
        }
        refreshInstalled();
      }, 800);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = old;
      log(label + "失败: " + e.message, "dpm-err");
    }
  }

  function buildPanel() {
    if (panel) return;
    panel = document.createElement("div");
    panel.className = "dpm-panel";
    panel.innerHTML =
      '<div class="dpm-title"><span>🧩 插件管理</span><button type="button" class="dpm-close" aria-label="关闭">✕</button></div>' +
      '<div class="dpm-searchRow"><input type="text" class="dpm-input" data-f="q" placeholder="搜索 npm 插件，如 dsh / theme / tool…">' +
      '<button type="button" class="dpm-btn" data-act="search">搜索</button></div>' +
      '<div class="dpm-results"></div>' +
      '<div class="dpm-sec"><span>已安装</span><button type="button" class="dpm-btn dpm-mini" data-act="refresh">刷新</button></div>' +
      '<div class="dpm-installed"></div>' +
      '<div class="dpm-log"></div>' +
      '<div class="dpm-hint">只管理当前 profile（web）。安装/卸载后请重启服务（sudo systemctl restart dsh-web）并在浏览器硬刷新。</div>';
    panel.style.display = "none";
    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "dpm-fab";
    fab.title = "插件管理";
    fab.textContent = "🧩";
    fab.addEventListener("click", () => {
      const open = panel.classList.toggle("open");
      if (open) refreshInstalled();
    });
    panel.querySelector(".dpm-close").addEventListener("click", () => panel.classList.remove("open"));
    panel.querySelector("[data-act=search]").addEventListener("click", doSearch);
    panel.querySelector("[data-act=refresh]").addEventListener("click", refreshInstalled);
    panel.querySelector(".dpm-input[data-f=q]").addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
    document.body.appendChild(fab);
    document.body.appendChild(panel);
  }

  function apply() {
    injectCss(TAG, PANEL_CSS);
    const boot = () => {
      if (document.body && !document.querySelector(".dpm-fab")) buildPanel();
    };
    if (document.body) boot();
    else document.addEventListener("DOMContentLoaded", boot);
  }

  exports.inject = ["slots", "locale", "connection", "remote", "settingsScope"];
    exports.apply = apply;
    exports.default = apply;
    return module.exports;
  }
});