/**
 * dsh-plugin-manager — 插件搜索与安装管理 · host 半
 *
 * 职责：
 *  1) 注册设置命名空间（供客户端读取安装开关等状态）。
 *  2) 提供受限命令通道（HTTP 端点，浏览器半调用）：
 *     - search:  查询 npm registry（服务端代查，避开 CORS）
 *     - list:    列出当前 profile 已装插件
 *     - install: dsh plugin add <pkg>
 *     - remove:  dsh plugin remove <pkg>
 *  3) 安全边界：profile 恒取配置值（不接受客户端指定）；包名白名单正则校验；
 *     全部 execFile 无 shell；安装后不自动重启，由用户在界面确认。
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";

const execFileP = promisify(execFile);

/** npm 包名：unscoped 或 @scope/name，仅字母数字 . _ - ~ */
const PKG_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
const PROFILE_RE = /^[a-z0-9_-]{1,32}$/;
const EXTRA_PATH = "/usr/local/bin:/usr/bin:/bin";
const REGISTRY_SEARCH = "https://registry.npmjs.org/-/v1/search";

/** schemastery（与 dsh-bright-focus-theme 同款导入+兜底策略） */
let z;
try {
  z = (await import("@deepseek-ai/schemastery")).default;
} catch {
  z = (
    await import(
      "file:///usr/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/schemastery/lib/index.mjs"
    )
  ).default;
}

function guardProfile(profile) {
  if (!PROFILE_RE.test(String(profile))) throw new Error("非法 profile: " + profile);
}

function profileDir(home, profile) {
  return path.join(home, "profiles", profile);
}

async function runDsh(profile, args) {
  guardProfile(profile);
  const env = Object.assign({}, process.env, {
    PATH: (process.env.PATH ? process.env.PATH + ":" : "") + EXTRA_PATH
  });
  const { stdout, stderr } = await execFileP("dsh", ["plugin", "--profile", profile].concat(args), {
    env,
    timeout: 240000,
    maxBuffer: 8 * 1024 * 1024
  });
  return ((stdout || "") + (stderr || "")).trim();
}

async function registrySearch(text, size) {
  const url = REGISTRY_SEARCH + "?text=" + encodeURIComponent(text) + "&size=" + size;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error("registry 请求失败: HTTP " + res.status);
  return (await res.json()).objects || [];
}

async function search(query, dshOnly) {
  const q = String(query || "").trim();
  if (!q) return [];
  let objects;
  if (dshOnly) {
    // dsh 模式：并行三路查询合并去重，覆盖小众 dsh 包排不进前 18 的情况
    const [a, b, c] = await Promise.all([
      registrySearch(q, 18),
      registrySearch("dsh " + q, 12),
      registrySearch("deepseek-harness " + q, 10)
    ]);
    const seen = new Set();
    objects = [...a, ...b, ...c].filter((o) => {
      const n = (o.package && o.package.name) || "";
      if (!n || seen.has(n)) return false;
      seen.add(n);
      return true;
    });
  } else {
    objects = await registrySearch(q, 18);
  }
  const rows = objects.filter((o) => {
    if (!dshOnly) return true;
    const p = o.package || {};
    const name = p.name || "";
    if (name.startsWith("dsh-") || name.startsWith("@deepseek-ai/")) return true;
    const kw = (p.keywords || []).map((k) => String(k).toLowerCase());
    return kw.includes("dsh") || kw.includes("deepseek-harness");
  });
  const items = rows.map((o) => {
    const p = o.package || {};
    return {
      name: p.name,
      version: p.version,
      description: (p.description || "").slice(0, 200),
      date: p.date ? String(p.date).slice(0, 10) : "",
      repository: (p.links && (p.links.repository || p.links.homepage)) || "",
      npmUrl: "https://www.npmjs.com/package/" + encodeURIComponent(p.name) + "?activeTab=versions",
      downloads: 0
    };
  });
  // 近一月下载量：非 scoped 包走批量接口（1 次请求）；scoped 包批量不支持，并行逐个查
  const downloadsMap = {};
  const tryDl = async (name) => {
    try {
      const r = await fetch("https://api.npmjs.org/downloads/point/last-month/" + name, {
        signal: AbortSignal.timeout(10000)
      });
      if (!r.ok) return;
      const j = await r.json();
      if (j && typeof j.downloads === "number") downloadsMap[name] = j.downloads;
    } catch {}
  };
  try {
    const plain = items.filter((i) => !i.name.startsWith("@"));
    if (plain.length) {
      const dr = await fetch(
        "https://api.npmjs.org/downloads/point/last-month/" + plain.map((i) => i.name).join(","),
        { signal: AbortSignal.timeout(15000) }
      );
      if (dr.ok) {
        const dl = await dr.json();
        for (const it of plain) {
          const hit = dl[it.name];
          if (hit && typeof hit.downloads === "number") downloadsMap[it.name] = hit.downloads;
        }
      }
    }
    await Promise.all(items.filter((i) => i.name.startsWith("@")).map((i) => tryDl(i.name)));
  } catch {}
  for (const it of items) it.downloads = downloadsMap[it.name] || 0;
  // 按近一月下载量降序（并列按包名）
  items.sort((a, b) => b.downloads - a.downloads || a.name.localeCompare(b.name));
  return items;
}

async function list(home, profile) {
  guardProfile(profile);
  try {
    const pkg = JSON.parse(await readFile(path.join(profileDir(home, profile), "package.json"), "utf8"));
    return {
      path: profileDir(home, profile),
      dependencies: Object.keys(pkg.dependencies || {}).sort(),
      bundles: ((pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || []).slice()
    };
  } catch (e) {
    return { path: profileDir(home, profile), dependencies: [], bundles: [], error: String(e.message || e) };
  }
}

function assertPkg(name) {
  const n = String(name || "").trim();
  if (!PKG_RE.test(n)) throw new Error("非法包名: " + n);
  return n;
}

export const inject = ["settings", "webServer"];

/** 入口配置（cordis.yml plugin-manager 行） */
export const Config = z.object({
  home: z.string().default(""),
  profile: z.string().default("web"),
  allowInstall: z.boolean().default(true)
});

export function apply(ctx, config) {
  const cfg = config || {};
  const home = typeof cfg.home === "string" && cfg.home ? cfg.home : process.env.DSH_HOME || "/home/gh503/.dsh";
  const profile = typeof cfg.profile === "string" && PROFILE_RE.test(cfg.profile) ? cfg.profile : "web";
  const allowInstall = cfg.allowInstall !== false;

  const handlers = {
    async search({ q, dshOnly } = {}) {
      return search(q, dshOnly !== false);
    },
    async list() {
      return list(home, profile);
    },
    async install({ pkg } = {}) {
      if (!allowInstall) throw new Error("安装已被管理员禁用（allowInstall=false）");
      const name = assertPkg(pkg);
      return runDsh(profile, ["add", name]);
    },
    async remove({ pkg } = {}) {
      if (!allowInstall) throw new Error("卸载已被管理员禁用（allowInstall=false）");
      const name = assertPkg(pkg);
      return runDsh(profile, ["remove", name]);
    }
  };

  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(
      "dsh-plugin-manager",
      z.object({
        profile: z.string().default("web"),
        allowInstall: z.boolean().default(true)
      })
    );
  });

  // 受限命令通道：注册 /pm 前缀路由（浏览器半同源 POST 调用）
  // 防护：仅 POST + application/json；必须带 X-DSH-PM 自定义头（跨站无法预检）；
  //       Origin/Referer 若存在必须与请求 Host 同源（挡 DNS-rebinding）。
  ctx.webServer.register({
    kind: "prefix",
    path: "/pm",
    handler: async (req, res) => {
      try {
        if (req.method !== "POST") return send(res, 405, { ok: false, error: "仅支持 POST" });
        if ((req.headers["x-dsh-pm"] || "") !== "1") return send(res, 403, { ok: false, error: "缺少 X-DSH-PM 头" });
        const origin = req.headers.origin || req.headers.referer || "";
        if (origin) {
          const host = req.headers.host || "";
          const o = new URL(origin);
          if (o.host !== host) return send(res, 403, { ok: false, error: "跨源请求被拒绝" });
        }
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        const { action = "", payload = {} } = body;
        if (typeof action !== "string" || !(action in handlers)) {
          return send(res, 400, { ok: false, error: "未知 action: " + action });
        }
        const data = await handlers[action](payload && typeof payload === "object" ? payload : {});
        send(res, 200, { ok: true, data });
      } catch (e) {
        send(res, 200, { ok: false, error: String((e && e.message) || e) });
      }
    }
  });

  function send(res, status, obj) {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(obj));
  }
}

export default apply;