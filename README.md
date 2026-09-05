<p align="center">
 <img src="https://raw.githubusercontent.com/shiyi312/deepseek-enhancer/main/favicon.ico" alt="DeepSeek Logo" width="80">
  <h1 align="center">DeepSeek 全能增强助手</h1>
  <p align="center">
    <strong>🎯 让 DeepSeek Chat 更强大、更高效、更顺手</strong>
  </p>
  <p align="center">
    <a href="#-功能一览">功能</a> •
    <a href="#-安装">安装</a> •
    <a href="#-使用指南">使用指南</a> •
    <a href="#-设置面板">设置</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.4.2-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-DeepSeek%20Chat-orange?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Requires-Tampermonkey%20%2F%20ScriptCat-red?style=flat-square" alt="Requires">
  <img src="https://img.shields.io/badge/Status-Stable-brightgreen?style=flat-square" alt="Status">
</p>

---

## 📖 简介

**DeepSeek 全能增强助手** 是一款专为 [DeepSeek Chat](https://chat.deepseek.com) 设计的用户脚本（Userscript），集成了 **12+ 项实用增强功能**，让你的 AI 对话体验全面提升。

无论你是 DeepSeek 的重度用户、开发者还是研究者，这个脚本都能显著提升你的使用效率和阅读体验。

---

## ✨ 功能一览

| 功能模块 | 说明 |
|----------|------|
| 📁 **全局代码折叠** | 右上角一键折叠/展开所有代码块，告别长代码刷屏 |
| 📦 **独立代码折叠** | 每个代码块自带折叠按钮，按需收起/展开 |
| 📊 **表格导出增强** | 悬停表格右上角，一键导出 PNG / CSV / Markdown |
| 🧠 **思考过程折叠** | AI 思考区域自动折叠，点击标题即可展开 |
| 🛡️ **智能防撤回** | 自动检测并恢复被撤回的 AI 回复内容 |
| 📋 **一键复制回复** | 悬停 AI 消息右上角，快速复制回答内容 |
| 📤 **多格式导出** | 导出完整对话为 JSON / Markdown / TXT / HTML |
| 🖥️ **宽屏模式** | 减少页面留白，让内容显示更宽广 |
| ⌨️ **Ctrl+Enter 发送** | 自定义发送快捷键，防止误触发送 |
| 📁 **文件夹管理** | 对历史对话进行分类整理，告别杂乱无章 |
| ⚙️ **图形化设置面板** | 所有功能可视化开关，点击即生效 |
| 🔄 **状态持久化** | 所有设置自动保存，刷新页面不丢失 |

---

## 🖼️ 界面预览

### 右上角工具栏

[📁 折叠全部] [📤 导出 ▾]
↑ ↑
一键折叠/展开所有代码块 多格式导出 + 筛选

### 设置面板
- 通过 **油猴/脚本猫菜单 → ⚙️ 打开设置面板** 进入
- 可视化开关，实时生效

### 功能位置示意

| 功能 | 位置 |
|------|------|
| 全局折叠按钮 | 右上角（导出按钮左侧） |
| 代码块折叠 | 每个代码块右上角 |
| 表格导出 | 表格右下角（悬停显示） |
| 复制按钮 | AI 回复右上角（悬停显示） |
| 思考折叠 | 点击“已思考”标题展开/收起 |
| 导出按钮 | 右上角 |
| 文件夹管理 | 左侧边栏“历史对话”附近 |

---

## 📦 安装

### 前置条件
请先安装以下任一用户脚本管理器（推荐两者任选其一）：

- **[Tampermonkey（油猴）](https://www.tampermonkey.net/)** — 最流行的用户脚本管理器，支持 Chrome / Edge / Firefox / Safari
- **[ScriptCat（脚本猫）](https://scriptcat.org/)** — 国产优秀扩展，支持 Chrome / Edge / Firefox，中文文档友好

> 💡 两者功能类似，选择您习惯使用的即可。

### 安装脚本

#### 方式一：从源码安装（通用）
1. 复制本仓库中的完整脚本代码：[https://github.com/shiyi312/deepseek-enhancer](https://github.com/shiyi312/deepseek-enhancer)
2. 打开您的用户脚本管理器（油猴或脚本猫）仪表盘
3. 点击 **“新建脚本”**（或“添加脚本”）
4. 粘贴代码，保存（Ctrl+S）
5. 刷新 DeepSeek 页面即可生效

#### 方式二：从脚本猫主页安装
> 访问我的脚本猫主页：[https://scriptcat.org/zh-CN/users/202800](https://scriptcat.org/zh-CN/users/202800)，找到本脚本一键安装

#### 方式三：从 GreasyFork 安装（待提交）
> 稍后将提交至 GreasyFork，届时可直接点击安装按钮

---

## 🚀 使用指南

### 基础操作

#### 全局折叠/展开所有代码块
- 点击右上角 **`📁 折叠全部`** 按钮
- 再次点击变为 **`📂 展开全部`**
- 状态自动保存，刷新页面后保持

#### 导出对话
1. 点击右上角 **`📤 导出`**
2. 选择格式：JSON / Markdown / TXT / HTML
3. 在下拉菜单中勾选筛选条件（如“仅回复内容”）

#### 管理文件夹
1. 在左侧边栏找到 **📁 文件夹** 区域
2. 点击 **＋ 新建** 创建文件夹
3. 将对话拖入或通过“移出”按钮管理

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Shift + E` | 导出当前对话为 JSON（可自定义） |
| `Ctrl + Enter` | 发送消息（需在设置中启用） |

---

## ⚙️ 设置面板

### 打开方式
1. 点击浏览器右上角的 **油猴/脚本猫图标**
2. 悬停或点击 **DeepSeek 全能增强助手 v2.4.2**
3. 选择 **⚙️ 打开设置面板**

### 可配置选项

| 分类 | 选项 | 说明 |
|------|------|------|
| 📦 代码块折叠 | 折叠阈值（行） | 超过此行数自动折叠，0=禁用 |
| | 预览行数 | 折叠后保留的行数 |
| 📊 表格导出 | 表格导出按钮 | 悬停显示 PNG/CSV/Markdown 按钮 |
| 🧠 思考折叠 | 自动折叠思考区域 | AI 回复后自动收起思考过程 |
| 🖥️ 界面增强 | 宽屏模式 | 减少左右留白 |
| | Ctrl+Enter 发送 | 改为 Ctrl+Enter 发送，Enter 换行 |
| 🛡️ 防撤回 | 启用防撤回 | 自动检测并恢复被撤回的消息 |
| 📁 文件夹管理 | 启用文件夹分组 | 在侧边栏增加文件夹管理功能 |
| 📋 复制功能 | 启用复制按钮 | 在 AI 回复右上角显示复制按钮 |
| ⌨️ 快捷键 | 导出快捷键 | 自定义组合键 |
| 📤 导出筛选 | 保留用户问题 / 思考过程 / 仅回复 / 引用链接 | 按需过滤导出内容 |

---

## 🛠️ 开发与贡献

### 技术栈
- 原生 JavaScript（ES6+）
- Tampermonkey / ScriptCat API（GM_*）
- HTML2Canvas（表格导出 PNG）

### 本地开发
1. 克隆本仓库：
   ```bash
   git clone https://github.com/shiyi312/deepseek-enhancer.git
2. 修改源码后，复制到油猴或脚本猫中测试
3. 提交 PR 前请确保功能正常且无报错

### 贡献指南
欢迎提交 Issue 和 Pull Request！建议在提交前：
- 检查代码风格一致性
- 确保新增功能有对应的设置开关
- 添加必要的注释说明

---

## 📄 许可证

MIT License © 2026 [shiyi312](https://github.com/shiyi312)

---

## 🙏 致谢

- [DeepSeek](https://deepseek.com) - 提供出色的 AI 对话服务
- [Tampermonkey](https://www.tampermonkey.net/) - 全球流行的用户脚本管理器
- [ScriptCat](https://scriptcat.org/) - 优秀的国产脚本管理器
- [html2canvas](https://html2canvas.hertzen.com/) - 表格导出 PNG 的得力工具

---

<p align="center">
  <sub>Built with ❤️ for the DeepSeek community</sub>
</p>
```

---

- **GitHub 仓库链接**：`https://github.com/shiyi312/deepseek-enhancer`
- **脚本猫主页链接**：`https://scriptcat.org/zh-CN/users/202800`
