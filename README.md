# ⚡ AI 常用问题助手

> Chrome 扩展 — 在 Gemini / ChatGPT / Claude 等 AI 页面一键插入常用问题，支持分类管理、拖拽定位和快捷键

![preview](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white)
![version](https://img.shields.io/badge/version-1.0.0-purple)
![license](https://img.shields.io/badge/license-MIT-green)

## ✨ 功能特性

- 🚀 **一键填入** — 点击问题自动填入 AI 输入框，支持填入后直接发送
- 🏷️ **分类管理** — 自定义分类（科研/写作/编程/通用等），支持颜色标记
- ⚙️ **面板内管理** — 直接在面板中添加、编辑、删除问题和分类
- 🖱️ **自由拖拽** — 悬浮按钮和面板都可自由拖动到任意位置，位置自动保存
- 📐 **面板缩放** — 拖拽面板右下角手柄自由调整大小
- ⌨️ **快捷键** — `Alt+Q` 快速打开/关闭面板
- 🔍 **搜索过滤** — 支持按关键词搜索问题
- 🌙 **深色主题** — 精心设计的暗色 UI，与各 AI 页面风格匹配
- 🔄 **数据同步** — 使用 Chrome Sync 跨设备同步你的问题和分类

## 🌐 支持网站

| 国际 | 国内 |
|------|------|
| [Gemini](https://gemini.google.com) | [DeepSeek](https://chat.deepseek.com) |
| [ChatGPT](https://chatgpt.com) | [Kimi](https://kimi.moonshot.cn) |
| [Claude](https://claude.ai) | [豆包](https://www.doubao.com) |
| [Perplexity](https://www.perplexity.ai) | [通义千问](https://tongyi.aliyun.com) |
| [Copilot](https://copilot.microsoft.com) | [文心一言](https://yiyan.baidu.com) |
| [Poe](https://poe.com) | [智谱清言](https://chatglm.cn) |
| [HuggingChat](https://huggingface.co/chat) | [Coze](https://www.coze.com) |

## 📦 安装方法

### 方式一：本地安装（推荐）

1. **下载项目**
   - 点击本页面右上角绿色 **Code** 按钮 → **Download ZIP**
   - 或使用 Git 克隆：
     ```bash
     git clone https://github.com/你的用户名/ai-questions-assistant.git
     ```

2. **解压文件**（如果下载的是 ZIP）

3. **打开 Chrome 扩展管理页面**
   - 在地址栏输入 `chrome://extensions/` 并回车
   - 或通过菜单：**更多工具** → **扩展程序**

4. **启用开发者模式**
   - 点击页面右上角的 **"开发者模式"** 开关

5. **加载扩展**
   - 点击 **"加载已解压的扩展程序"**
   - 选择解压后的文件夹（包含 `manifest.json` 的那个目录）

6. **完成！** 打开任意支持的 AI 网站，右下角会出现 ⚡ 按钮

> ⚠️ **注意**：不要删除解压后的文件夹，否则扩展会失效。

## 🎯 使用指南

### 基本操作

| 操作 | 方式 |
|------|------|
| 打开面板 | 点击页面右下角 ⚡ 按钮，或按 `Alt+Q` |
| 填入问题 | 点击问题文字，或点击 📝 按钮 |
| 填入并发送 | 点击 🚀 按钮 |
| 搜索问题 | 在搜索框中输入关键词 |
| 按分类筛选 | 点击分类标签（全部/科研/写作/编程/通用） |
| 关闭面板 | 点击 ✕ 按钮、按 `Esc`、或点击面板外区域 |

### 管理问题和分类

1. 点击面板右上角 ⚙️ **齿轮按钮** 进入管理模式
2. 切换 **📋 问题管理** / **🏷️ 分类管理** 标签
3. 点击 **＋ 添加** 按钮新增，或点击 ✏️ 编辑 / 🗑️ 删除

### 自定义位置和大小

- **拖动 ⚡ 按钮**：按住拖到页面任意位置
- **拖动面板**：按住面板顶部标题栏拖动
- **缩放面板**：拖拽面板右下角缩放手柄

位置和大小会自动保存，下次打开时恢复。

## 📁 项目结构

```
├── manifest.json       # 扩展配置文件
├── background.js       # 后台服务脚本（初始化数据 + 快捷键）
├── content.js          # 内容脚本（面板 UI + 交互逻辑）
├── content.css         # 内容脚本样式
├── popup.html/js/css   # 弹窗页面（备用管理界面）
├── preview.html        # 本地预览页面（无需安装即可体验 UI）
├── icons/              # 扩展图标
└── README.md           # 本文件
```

## 🛠️ 技术栈

- **Manifest V3** — Chrome 最新扩展标准
- **Chrome Storage Sync API** — 跨设备数据同步
- **Pointer Events API** — 流畅的拖拽和缩放体验
- **原生 JavaScript** — 零依赖，轻量高效

## 📄 License

MIT License — 自由使用和修改
