# dsh-plugin-manager

DeepSeek Harness 插件搜索与安装管理 · 客户端插件

在设置页提供**插件管理卡片**：搜索 npm registry 上的 dsh 插件、一键安装 / 卸载；
命令通过宿主端**受限命令通道**执行（仅当前 profile、包名白名单、无 shell），
安装后由你在界面确认再重启服务生效。

## 特性

- 🔍 搜索：输入关键词查询 npm registry（服务端代查，避开 CORS），展示名称/版本/简介/仓库
- ➕ 安装 / ➖ 卸载：`dsh plugin --profile web add|remove <pkg>`，实时反馈输出
- 📋 已装列表：当前 profile 的依赖 + 组合包（bundle）清单
- 🔒 安全边界：profile 固定为配置值、包名正则白名单、`execFile` 无 shell、
  `allowInstall=false` 可整体禁用安装/卸载；自动重启不做，由用户确认
- 🧩 bundle 形态：`dsh plugin add` 一条命令安装，兼容 tarball / GitHub / npm

## 安装

```bash
# 离线 tarball 或本地目录
dsh plugin --profile web add ./dsh-plugin-manager

# npm registry（发布后）
dsh plugin --profile web add dsh-plugin-manager
```

安装后重启服务，浏览器硬刷新 → 设置页出现「插件管理」卡片。

## 配置

插件行 config：

```yaml
- id: plugin-manager
  name: dsh-plugin-manager
  config:
    profile: web      # 固定管理的 profile（不接受客户端指定）
    home: /home/gh503/.dsh   # profile 根目录（默认取 DSH_HOME）
    allowInstall: true       # false = 只读（禁安装/卸载）
```

## 结构

```
├── lib/
│   ├── index.js        # host 半：命令执行 + npm 搜索 + 设置命名空间
│   └── client.js       # 浏览器半：设置卡片（搜索/安装/卸载/列表）
└── cordis.patch.yml    # bundle 层
```

## 许可证

MIT