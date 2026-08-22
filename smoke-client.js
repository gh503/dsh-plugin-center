/* 冒烟测试：在 Node 中模拟 __ModuleLoader__ + 极简 DOM，跑 dsh-plugin-center 客户端主流程 */
"use strict";

class FakeEl {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this.dataset = {};
    this._listeners = {};
    this.className = "";
    this._text = "";
    this.innerHTML = "";
    this.scrollHeight = 0;
  }
  get classList() {
    const self = this;
    return {
      toggle: (c) => {
        const has = self.className.split(" ").includes(c);
        self.className = has ? self.className.replace(c, "").trim() : (self.className + " " + c).trim();
        return !has;
      },
      add: (c) => (self.className += " " + c).trim(),
      contains: (c) => self.className.split(" ").includes(c)
    };
  }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, fn) { (this._listeners[t] ||= []).push(fn); }
  setAttribute(k, v) { this[k] = v; }
  set textContent(v) { this._text = v; }
  get textContent() { return this._text; }
  set type(v) { this._type = v; }
  get type() { return this._type; }
  querySelector(sel) {
    const hit = this._q(sel);
    if (hit) return hit;
    return this._synthEl(sel);
  }
  querySelectorAll(sel) {
    const out = [];
    const m = sel.match(/^\[data-([a-z]+)=([a-zA-Z0-9-]+)\]$/);
    const walk = (els) => {
      for (const e of els) {
        if (m && e.dataset[m[1]] === m[2]) out.push(e);
        walk(e.children || []);
      }
    };
    walk(this.children);
    if (out.length) return out;
    const s = this._synthEl(sel);
    return s ? [s] : [];
  }
  _q(sel) {
    // 支持 .class / .class[data-f=x] / [data-act=x]
    const m1 = sel.match(/^\.([a-zA-Z0-9-]+)$/);
    const m2 = sel.match(/^\.([a-zA-Z0-9-]+)\[data-f=([a-zA-Z0-9]+)\]$/);
    const m3 = sel.match(/^\[data-([a-z]+)=([a-zA-Z0-9-]+)\]$/);
    const walk = (els) => {
      for (const e of els) {
        const cl = (e.className || "").split(" ").filter(Boolean);
        let hit = false;
        if (m1) hit = cl.includes(m1[1]);
        else if (m2) hit = cl.includes(m2[1]) && e.dataset.f === m2[2];
        else if (m3) hit = e.dataset[m3[1]] === m3[2];
        if (hit) return e;
        const r = walk(e.children || []);
        if (r) return r;
      }
      return null;
    };
    return walk(this.children);
  }
  /** 把 innerHTML 里的类名/属性合成出缓存元素（真实 DOM 由浏览器解析，这里只做桩） */
  _synthEl(sel) {
    const cls = (sel.match(/^\.([a-zA-Z0-9-]+)/) || [])[1];
    const fattr = (sel.match(/\[data-([a-z]+)=([a-zA-Z0-9-]+)\]/) || []);
    const bare = (sel.match(/\[data-([a-z]+)\]/) || [])[1];
    // 规范化缓存键：同一 data 属性共享同一合成元素（无值与带值选择器互通）
    const key = fattr[1] ? "[data-" + fattr[1] + "]" : bare ? "[data-" + bare + "]" : sel;
    const attrName = fattr[1] || bare;
    if (this._synth && this._synth[key]) {
      if (fattr[2]) this._synth[key].dataset[attrName] = fattr[2];
      return this._synth[key];
    }
    const maker = () => {
      const e = new FakeEl("div");
      if (cls) e.className = cls;
      if (attrName && fattr[2]) e.dataset[attrName] = fattr[2];
      return (this._synth ||= {})[key] = e;
    };
    const needle = (attrName && fattr[2] ? attrName + '=' : attrName ? attrName : cls || "");
    const any = (html) => !needle || html.includes(needle);
    if (this.innerHTML && any(this.innerHTML)) return maker();
    for (const k in this._synth || {}) {
      const ch = this._synth[k];
      if (ch === this) continue;
      if (ch.innerHTML && any(ch.innerHTML)) return maker();
    }
    return null;
  }
}

const calls = [];
globalThis.window = {
  __ModuleLoader__: { load(o) { this._loaded = o; } },
  confirm: () => true
};
globalThis.document = {
  body: new FakeEl("body"),
  head: new FakeEl("head"),
  createElement: (t) => new FakeEl(t),
  getElementById: () => null,
  addEventListener() {},
  querySelector: () => null
};
globalThis.fetch = async (url, opts) => ({
  status: 200,
  json: async () => {
    calls.push({ url, opts });
    const body = JSON.parse(opts.body);
    if (body.action === "list") return { ok: true, data: { dependencies: ["is-number", "dsh-plugin-center"] } };
    if (body.action === "search") return { ok: true, data: [{ name: "dsh-theme-center", version: "1.0.0", description: "主题中心", repository: "" }] };
    if (body.action === "install") return { ok: true, data: "dependencies:\n+ dsh-theme-center" };
    return { ok: true, data: "ok" };
  }
});

// 加载 bundle
const loader = window.__ModuleLoader__;
require("/Users/gh503/Documents/DSH/plugin-manager/dsh-plugin-manager/lib/client.js");
// 上面的 require 在 CommonJS 包装下执行脚本；脚本调用 window.__ModuleLoader__.load
const entry = globalThis.window.__ModuleLoader__._loaded;
if (!entry) throw new Error("未注册 __ModuleLoader__.load");
console.log("注册 id =", entry.id);
if (entry.id !== "dsh-plugin-center") throw new Error("id 不对");

// 直接调用 factory（模拟加载器）
const mod = entry.factory(() => ({}));
console.log("exports keys =", Object.keys(mod).sort().join(","));
if (typeof mod.apply !== "function") throw new Error("缺少 apply");

// 应用（挂 FAB + 面板）
mod.apply();

const doc = globalThis.document;
const fab = doc.body.children.find((c) => c.className.includes("dpm-fab"));
if (!fab) throw new Error("FAB 未创建");
console.log("FAB 已挂载 ✓");

const tick = () => new Promise((r) => setTimeout(r, 60));
const callsOf = (a) => calls.filter((c) => JSON.parse(c.opts.body).action === a);

(async () => {
  // 打开面板 → refreshInstalled 触发 list
  fab._listeners.click[0]();
  await tick();
  if (!callsOf("list").length) throw new Error("打开面板未调 list");
  console.log("打开面板调用了 list ✓ body =", JSON.stringify(JSON.parse(callsOf("list")[0].opts.body)));

  // 检查请求头
  const h = callsOf("list")[0].opts.headers;
  if (h["x-dsh-pm"] !== "1") throw new Error("缺 X-DSH-PM 头");
  if (h["content-type"] !== "application/json") throw new Error("缺 json content-type");
  console.log("请求头正确 ✓ url =", callsOf("list")[0].url);

  // 搜索
  const panel = doc.body.children.find((c) => c.className.includes("dpm-panel"));
  const input = panel.querySelector(".dpm-input[data-f=q]");
  input.value = "dsh theme";
  panel.querySelector("[data-act=search]")._listeners.click[0]();
  await tick();
  if (!callsOf("search").length) throw new Error("搜索未触发");
  console.log("搜索调用 ✓ q =", JSON.parse(callsOf("search")[0].opts.body).payload.q);

  // 安装按钮
  const installBtn = panel.querySelectorAll("[data-install=dsh-theme-center]")[0];
  if (!installBtn) throw new Error("结果里没有安装按钮");
  installBtn._listeners.click[0]();
  await tick();
  if (!callsOf("install").length) throw new Error("安装未触发");
  console.log("安装调用 ✓ pkg =", JSON.parse(callsOf("install")[0].opts.body).payload.pkg);
  console.log("\n✅ 冒烟测试全部通过");
  process.exit(0);
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});