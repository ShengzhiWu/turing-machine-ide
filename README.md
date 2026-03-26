# turing-machine-ide

这是一款用于图灵机编程、测试、可视化的应用软件。还支持渲染输出动画、烘焙音乐。

## 运行

### 在浏览器中运行（便于测试）

请直接运行`index.html`（方法是在文件管理器中双击此文件，或在VSCode中打开此文件然后点击 VSCode 右下角的 Go Live）

### 作为 Electron 应用运行

请执行（只需执行一次，下次运行无需再执行）

```bash
npm i
```

请执行如下指令

```bash
npx electron .
```

## 打包

如下两条指令二选一即可

打包出文件夹版可执行文件

```bash
npm run pack
```

打包出安装包

```bash
npm run build
```

## 项目结构

| 文件                       | 具体内容                                                     | 相关功能                                                     |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `index.html`               | CSS样式（菜单栏、对话框、面板布局）；全部HTML结构（菜单栏占位、About对话框、渲染动画对话框、三栏面板）；全局变量初始化（`language`、`example`、`code`、`tape`、`graph` 等）；各外部脚本的加载顺序 | 界面布局、样式、初始值、载入样例、菜单交互                   |
| `src/tm-core.js`           | 图灵机语言解析（`parseProgramCode`）；样式代码解析（`parseStyleCode`）；图灵机运行引擎（`run_turing_machine`）；纸带规范化（`normalizeTape`）；`NOT_VALID`/`N`/`OTHER` Symbol常量 | 图灵机语法规则、运行逻辑、纸带行为、样式代码格式             |
| `src/graph.js`             | 向量数学工具（`vector_plus` 等）；图布局物理参数；随机数生成器（`makeRng`）；状态转移图的数据结构构建（`construct_directed_graph_with_code`）；SVG DOM 渲染（`build_graph_dom`、`update_graph_dom`）；节点拖拽交互；弹簧物理模拟（`graph_evolve`）；动画帧循环（`update_graph_view`）；编辑器光标跳转（`jumpEditorToState`） | 有向图的外观、布局算法、节点/边的交互行为、高亮显示逻辑      |
| `src/app.js`               | 历史表格行生成与渲染（`refresh_history_table`）；纸带格子点击编辑（`finishEditingTapeCallback`）；图重建（`refresh_graph_embedding`）；`run_program`；代码编辑器事件（F4刷新图、F5运行、内容变化、光标移动）；样式编辑器变化事件；图面板拖拽与滚轮缩放事件 | 运行结果面板、纸带编辑交互、键盘快捷键、图面板的鼠标操作     |
| `src/i18n.js`              | 中英文翻译字符串（`MENU_I18N`）；翻译查询函数 `t()`          | 整个软件的多语言支持                                         |
| `src/file.js`              | 图嵌入读写（`getGraphEmbedding`、`applyGraphEmbedding`）；工程 JSON 序列化（`buildProjectJSON`、`buildEmbeddingJSON`）；底层文件读写（`saveJSONFile`、`openJSONFile`，支持 Electron IPC 与浏览器双路径）；工程保存/打开/样例加载的菜单动作（`saveProject`、`openProject`、`loadExample` 等） | 保存/打开工程文件、保存图嵌入、样例管理                      |
| `src/menu.js`              | 菜单栏动态构建（`buildMenuBar`、`buildMenuItems`）；About 对话框（`menuAbout`、`closeAbout`）；语言切换（`switchLanguage`）；界面语言刷新（`applyLanguageToUI`） | 菜单栏 UI、语言切换交互                                      |
| `src/render-anim.js`       | `menuRenderAnimation()` — 入口，打开设置窗口；`startRender()` — 图像渲染主循环；`buildFrameSequence()` — 构建帧序列；`drawRenderFrame()` / `drawGraphOnCanvas()` / `drawTapeOnCanvas()` — 绘制逻辑；IPC监听：`render-params-changed` / `render-start` / `render-music-preview` | 渲染流程控制；帧序列时序；画面内容和风格；与设置窗口的数据交换；渲染相关窗口的多语言支持 |
| `src/render-settings.html` | `getParams()` — 收集所有参数；IPC监听：`render-settings-init` / `render-ui-lock` / `render-music-preview-ready` | 所有渲染参数的UI；参数变动通知；触发渲染/音频预览；渲染期间禁用UI |
| `src/render-preview.html`  | IPC监听：`render-preview-init` / `render-preview-dataurl` / `render-preview-status` | 渲染进行中的帧预览显示                                       |
| `src/audio-render.js`      | `bakeAudio(history, p, stateNames)` — 唯一对外接口；`buildScaleNotes()` / `buildStateNoteMap()` — 音阶与状态映射；`parseSfz()` / `getSampleNote()` — SFZ音源加载；`synthPianoNote()` — 合成兜底；`encodeWav()` — WAV编码 | 音频烘焙全流程；调性/音域/随机种子逻辑；SFZ格式支持；合成器兜底；输出WAV文件 |
| `src/tm-editor.js`         | 图灵机代码文本框、高亮、自动补全、生成交互事件               | 图灵机代码编辑器                                             |
| `src/colormap-editor.js`   | 纸带风格风格代码文本框、高亮、生成交互事件                   | 纸带风格代码编辑器                                           |
| `src/vendor`               | 依赖库                                                       | 依赖库                                                       |

出于性能和高亮光晕绘制方便的考虑，有向图可视化有两套代码，一套是`svg`绘图（矢量绘图），在`graph.js`中，用于实时可视化；一套是`canvas`绘图（位图绘图），在`render-anim.js`中，用于渲染输出。如果要修改绘图内容，应该两套代码一起动。

## 链接

[Wolfram Atlas: Turing Machines](https://atlas.wolfram.com/TOC/TOC_103.html)是Wolfram公司展示图灵机的页面，你可以从中发现一些一直的具有有趣行为的图灵机。它们多是在空白纸带上工作，能够自发实现有趣的图案演变。

[The Cup | Turing cup](https://mdt.di.unipi.it/cup.html#past-editions)是意大利的一个高中生图灵机编程竞赛，你可以从中获取一些有趣的题目。

## TODO

- debug: 缩小时标签会掉
- debug: 保存工程时动画参数
- debug: 用户删除字符导致某个元为空时，不要显示补全框
- debug: 代码区行数过多时，会出现行号和文本错位
- 自动停机判断（超出纸带的已修改区域且程序陷入循环）
- 纸带最大长度限制（用于避免机头一直移动造成界面卡顿）
- 保存快捷键、另存为
- 输出视频倍速
- 手动设置机头初始位置
- 手动向左/向右拓宽纸带的功能
- 在有向图区下面加鼠标操作提示
- 渲染设置里试听手动停止播放
- 渲染设置窗口里加手动停止渲染功能
- 有向图增量更新
- 拖进工程文件以打开
- 结果表格换成假滚动以提升性能，承受数以百万行的表格
- 渲染动画时，如果用户选择了桌面，弹窗提示输出的是一个图像序列
- 编辑代码时，在结果表格中高亮相应的行
- 整理状态名称（将纯数格式的名称按在第一元出现的顺序重命名）
- 状态批量重命名
- 样式编辑器中整行复制的功能
- 在图中选中若干粒子然后构建群组
- 2维图灵机

