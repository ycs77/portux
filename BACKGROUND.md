# portux — 專案背景與緣起

## 命名由來

`portux` 取自拉丁文 **Portus**（港口），結尾加上 `x` 帶有現代開源工具的俐落感，發音簡短好記。

## 目的

建立一個 CLI 工具，可以：
- 列出當前主機上已占用的 port 及對應的程序名稱
- 列出常見工具的預設 port，並標示占用 / 未占用狀態
- 協助快速選出可使用的 port

## 市場現況（競品分析）

npm 生態系中有功能相近的工具，但沒有一個整合「漂亮對照 Table + 常見未占用 port 預設清單」的儀表板體驗。現有工具多半太「功能導向」（急著找空位或殺進程），缺乏**規劃感**，這正是 portux 的切入點。

現有工具可分三類，各有盲點：

1. **單純找「下一個可用 port」的 CLI**
   - `get-port-cli`：`get-port` 套件的 CLI 版，只吐出一個數字，無視覺化、無法選擇
   - `detect-port`：阿里巴巴開源，`detect 8080` 被占用時提示改用 8081，缺乏全景對照表

2. **側重「列出並砍掉 process」的工具**
   - `port-fix-cli` / `portfind-cli`：可列出占用中的 port，但目的是找 PID 並 kill，而非規劃/命名新 port
   - `ports-cli`：提供互動式 TUI 檢視/刪除 TCP port，但缺乏「未占用但常用 port」的提示

3. **以套件（module）形式存在，非 CLI**
   - `portfinder` / `portscanner`：老牌底層套件，供程式內掃描 port 範圍（如 Webpack Dev Server 背後使用），無開箱即用、給人看的高顏值 CLI

### portux 的差異化切入點

1. **結構化對照（Table）**：左邊「目前已占用 port 與對應 PID/名稱」，右邊「常用工具預設 port（如 3000=React、5173=Vite、8080=Webpack）但目前仍空閒」
2. **儀表板體驗**：一眼看出哪些「黃金 port」還留著，讓開發者能優雅地為新專案挑一個好記的 port
