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
  .dpm-fab{position:fixed;right:20px;bottom:72px;z-index:10001;width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#3b9eff,#8f7bff);color:#fff;box-shadow:0 6px 18px rgba(60,110,255,.35);}
  .dpm-rsbtn{position:fixed;left:12px;top:50%;transform:translateY(-50%);z-index:10001;width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;font-size:19px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#19a463,#2f9e6e);color:#fff;box-shadow:0 6px 18px rgba(30,160,100,.4);}
  .dpm-rsbtn:active{transform:translateY(-50%) scale(.94);}
  .dpm-toast{position:fixed;left:12px;top:calc(50% + 40px);z-index:10001;max-width:240px;padding:8px 12px;border-radius:10px;background:rgba(22,26,46,.95);color:#eef1f8;font-size:12px;line-height:1.45;box-shadow:0 8px 24px rgba(0,0,0,.35);display:none;}
  .dpm-toast.ok{background:rgba(25,164,99,.96);}
  .dpm-toast.bad{background:rgba(212,59,59,.96);}
  .dpm-mask{position:fixed;inset:0;z-index:9999;background:rgba(8,12,26,.38);display:none;backdrop-filter:blur(2px);}
  .dpm-mask.open{display:block;}
  .dpm-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10000;width:460px;max-width:94vw;max-height:80vh;overflow:auto;box-sizing:border-box;padding:16px;border-radius:16px;border:1px solid rgba(23,30,60,.12);background:rgba(255,255,255,.97);color:#1a1d24;display:none;flex-direction:column;gap:10px;box-shadow:0 16px 48px rgba(20,28,60,.35);backdrop-filter:blur(16px);font-size:13px;line-height:1.5;}
  .dpm-panel.open{display:flex;}
  .dpm-title{font-weight:700;display:flex;justify-content:space-between;align-items:center;}
  .dpm-close{border:none;background:transparent;cursor:pointer;font-size:14px;color:inherit;opacity:.7;}
  .dpm-searchRow{display:flex;gap:6px;}
  .dpm-filter{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.85;user-select:none;}
  .dpm-input{flex:1;box-sizing:border-box;height:30px;border:1px solid rgba(23,30,60,.16);border-radius:10px;padding:0 10px;font:inherit;font-size:12px;background:rgba(255,255,255,.7);color:inherit;}
  .dpm-btn{border:none;border-radius:10px;padding:0 12px;height:30px;font:inherit;font-size:12px;cursor:pointer;background:linear-gradient(135deg,#3b9eff,#8f7bff);color:#fff;font-weight:600;}
  .dpm-btn:disabled{opacity:.5;cursor:wait;}
  .dpm-mini{border:1px solid rgba(23,30,60,.16);background:rgba(120,140,255,.12);color:inherit;}
  .dpm-sec{display:flex;justify-content:space-between;align-items:center;font-weight:700;}
  .dpm-item{display:flex;gap:8px;align-items:flex-start;padding:8px;border-radius:10px;background:rgba(255,255,255,.55);border:1px solid rgba(23,30,60,.08);}
  .dpm-itemBody{flex:1;min-width:0;}
  .dpm-itemName{font-weight:600;word-break:break-all;color:#2b6de0;text-decoration:none;cursor:pointer;}
  .dpm-itemName:hover{text-decoration:underline;}
  .dpm-itemVer{opacity:.55;font-size:11px;margin-left:6px;}
  .dpm-itemMeta{display:block;opacity:.6;font-size:11px;margin-top:1px;}
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

  let panel = null, fab = null, mask = null, rsbtn = null, toast = null;

  function injectCss(tag, css) {
    if (document.getElementById(tag)) return;
    const st = document.createElement("style");
    st.id = tag;
    st.textContent = css;
    document.head.appendChild(st);
  }

  /** 调用宿主受限通道（10s 超时，失败立即反馈而非无限挂起） */
  async function call(action, payload) {
    const res = await fetch("/pm", {
      method: "POST",
      headers: { "content-type": "application/json", "x-dsh-pm": "1" },
      body: JSON.stringify({ action, payload: payload || {} }),
      signal: AbortSignal.timeout(10000)
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
    const name = esc(item.name);
    const url = item.npmUrl ? esc(item.npmUrl) : "";
    const title = url
      ? '<a class="dpm-itemName" href="' + url + '" target="_blank" rel="noreferrer" title="查看版本发布历史">' + name + "</a>"
      : '<span class="dpm-itemName">' + name + "</span>";
    return (
      '<div class="dpm-item">' +
      '<div class="dpm-itemBody">' +
      title +
      '<span class="dpm-itemVer">v' + esc(item.version || "—") + "</span>" +
      '<span class="dpm-itemMeta">⬇ ' + fmtDl(item.downloads) + " · 🕒 " + esc(item.date || "—") + "</span>" +
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

  /** 下载量人性化显示：1234567 → 1.23M；无数据 → — */
  function fmtDl(n) {
    if (typeof n !== "number" || !isFinite(n) || n <= 0) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function installedHtml(name) {
    const escName = esc(name);
    const url = npmUrlFor(name);
    return (
      '<div class="dpm-item"><div class="dpm-itemBody">' +
      '<a class="dpm-itemName" href="' + esc(url) + '" target="_blank" rel="noreferrer" title="查看版本发布历史">' + escName + "</a>" +
      '<div class="dpm-action"><button type="button" class="dpm-btn dpm-mini" data-remove="' + escName + '">卸载</button></div>' +
      "</div></div>"
    );
  }

  /** npm 版本发布页 URL（scoped 包名做 URL 编码） */
  function npmUrlFor(name) {
    return "https://www.npmjs.com/package/" + encodeURIComponent(name) + "?activeTab=versions";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function doSearch() {
    const q = $(".dpm-input[data-f=q]").value.trim();
    if (!q) return;
    const dshOnly = $(".dpm-toggle").checked;
    const list = $(".dpm-results");
    list.innerHTML = '<div class="dpm-hint">搜索中…</div>';
    try {
      log("搜索: " + q + (dshOnly ? "（仅 dsh 插件）" : "（npm 全库）"), "");
      const items = await call("search", { q, dshOnly });
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
    mask = document.createElement("div");
    mask.className = "dpm-mask";
    mask.addEventListener("click", closePanel);
    rsbtn = document.createElement("button");
    rsbtn.type = "button";
    rsbtn.className = "dpm-rsbtn";
    rsbtn.title = "一键重启服务（安装/卸载插件后生效）";
    rsbtn.textContent = "⚡";
    rsbtn.addEventListener("click", doRestart);
    toast = document.createElement("div");
    toast.className = "dpm-toast";
    toast.setAttribute("role", "status");
    panel = document.createElement("div");
    panel.className = "dpm-panel";
    panel.innerHTML =
      '<div class="dpm-title"><span>🧩 插件管理</span><button type="button" class="dpm-close" aria-label="关闭">✕</button></div>' +
      '<div class="dpm-searchRow"><input type="text" class="dpm-input" data-f="q" placeholder="搜索 npm 插件，如 dsh / theme / tool…">' +
      '<button type="button" class="dpm-btn" data-act="search">搜索</button></div>' +
      '<label class="dpm-filter"><input type="checkbox" class="dpm-toggle" checked> 仅 dsh 插件</label>' +
      '<div class="dpm-results"></div>' +
      '<div class="dpm-sec"><span>已安装</span><button type="button" class="dpm-btn dpm-mini" data-act="refresh">刷新</button></div>' +
      '<div class="dpm-installed"></div>' +
      '<div class="dpm-log"></div>' +
      '<div class="dpm-hint">默认仅 dsh 插件（取消勾选搜全库）；按关联性→下载量排序；点包名看版本发布页。安装/卸载后需重启服务（sudo systemctl restart dsh-web）生效。</div>';
    fab = document.createElement("button");
    fab.type = "button";
    fab.className = "dpm-fab";
    fab.title = "插件管理";
    fab.textContent = "🧩";
    fab.addEventListener("click", () => {
      const open = panel.classList.toggle("open");
      mask.classList.toggle("open", open);
      if (open) refreshInstalled();
    });
    panel.querySelector(".dpm-close").addEventListener("click", closePanel);
    panel.querySelector("[data-act=search]").addEventListener("click", doSearch);
    panel.querySelector("[data-act=refresh]").addEventListener("click", refreshInstalled);
    panel.querySelector(".dpm-input[data-f=q]").addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("open")) closePanel();
    });
    document.body.appendChild(mask);
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    document.body.appendChild(rsbtn);
    document.body.appendChild(toast);
  }

  function closePanel() {
    if (panel) panel.classList.remove("open");
    if (mask) mask.classList.remove("open");
  }

  /** 一键重启：触发后服务短暂中断，页面稍后自行刷新或手动刷新 */
  async function doRestart() {
    if (!window.confirm("重启 dsh-web 服务？安装/卸载插件后重启才会生效，页面将短暂中断。")) return;
    showToast("⏳ 正在触发重启…", "std");
    try {
      const out = await call("restart");
      showToast("✅ " + out.replace(/\n/g, " "), "ok");
      // 服务重连后刷新页面以恢复连接
      setTimeout(() => window.location.reload(), 2500);
    } catch (e) {
      showToast("❌ 重启失败：" + e.message + "（可 SSH 执行 sudo systemctl restart dsh-web）", "bad");
    }
  }

  let toastTimer = null;
  function showToast(msg, kind) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "dpm-toast" + (kind === "ok" ? " ok" : kind === "bad" ? " bad" : "");
    toast.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = "none"; }, kind === "bad" ? 8000 : 5000);
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