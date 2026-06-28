# portux — 專案背景與決策脈絡

> 這份檔案記錄**「為什麼」**：產品定位、設計取捨、被否決的選項與決策演進。
> 「是什麼」（檔案結構、套件版本、測試清單、實作狀態）請直接看程式碼。

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

1. **單純找「下一個可用 port」的 CLI**（`get-port-cli`、`detect-port`）：只吐一個數字或建議改埠，無全景對照表、無法挑選。
2. **側重「列出並砍掉 process」的工具**（`port-fix-cli`、`portfind-cli`、`ports-cli`）：目的是找 PID 並 kill，而非規劃／命名新 port，且缺乏「未占用但常用」的提示。
3. **以套件（module）形式存在，非 CLI**（`portfinder`、`portscanner`）：供程式內掃描 port 範圍，無開箱即用、給人看的高顏值 CLI。

### portux 的差異化切入點

1. **結構化對照（Table）**：左邊「目前已占用 port 與對應 PID/名稱」，右邊「常用工具預設 port（如 3000=React、5173=Vite、8080=Webpack）但目前仍空閒」。
2. **儀表板體驗**：一眼看出哪些「黃金 port」還留著，讓開發者能優雅地為新專案挑一個好記的 port。

## 功能需求與設計取捨

- npm 套件名稱：`portux`
- port 列顏色依**優先序**上色：**占用 → 紅**、**常見預設 port（有標籤）→ cyan**、**< 1024 保留埠 → 紅**、**其餘閒置 → 灰**
  - > **決策演進**：原規劃為「占用=紅、空閒=綠」二分；實作時細化為四色優先序（占用 > 常見預設 > <1024 > 閒置），讓「值得搶的常見空 port（cyan）」與「一般空 port（灰）」在視覺上分層，綠色退場、改用 cyan 突顯黃金位。
- 互動式 TUI 虛擬滾動列表（見下方）
- 三軸狀態 filter（`c` 常見 / `s` 占用·閒置 / `p` 隱藏保留埠），與四色互補：顏色標「值不值得搶」，filter 篩「現在只想看哪一類」。

### UI 模式決策：TUI 虛擬滾動列表（已確認）

**核心體驗**：像逛街一樣，不需要預先設定範圍，直接瀏覽所有常見 port，看到空著又看得上眼的就選下。

採用 **TUI 互動模式**（類似 `htop`、`lazygit`），而非分頁輸出，原因：

- 使用者在啟動時未必有明確的目標 port 或範圍
- 需要自由上下滾動，隨時暫停觀察
- 顏色狀態一覽讓快速篩選更直覺

> **決策演進：即時關鍵字篩選不做（改為狀態 toggle）**。原規劃用 `/` 即時篩選 port 名稱／號碼，但評估後發現：篩號碼與 goto 高度重疊、篩名稱情境薄弱（常見名稱在 `--common` 一覽無遺、占用程序少用名稱找），價值被 goto 吃掉。改以 `c`／`s`／`p` 三軸狀態 toggle 取代，更貼合「逛街挑黃金空位」定位，且字母鍵與裸數字 goto 無衝突。

> **分頁 vs 虛擬滾動的決策**：純分頁不採用——它會打斷「逛街」的連續性與空間記憶，且在 portux 的資料量下效能沒有優勢（分頁本身就是一種窗口化，與虛擬滾動同量級）。最終採「平滑捲動為主 + PgUp/PgDn 跳頁為輔」，與 htop / lazygit 一致。

### 瀏覽模式：full 為唯一基底 ＋ 狀態 filter（已實作）

不再有 common / full 兩個互斥 mode。基底永遠是 **full（0–65535 全部 65536 個 port，虛擬滾動只渲染可見 row）**，常見預設則收斂成一個可開關的 filter。三軸 filter 可疊加，亦可用 CLI flag 設開場初值（`--common`／`--used`／`--free`／`--no-privileged`，`--used` 與 `--free` 互斥）。切換任一 filter 時游標歸列表首。

> **決策演進：common/full 子指令 → full 基底 + filter**。原規劃 common / full 為兩個 CLI 子指令；改為 full 為唯一基底、common 降級為 `--common` filter，並新增狀態 toggle。理由：mode 互斥太硬，filter 可疊加才自然、也與 htop 式即時篩選一致。

> **決策演進：「黃金空位」概念退場（2026-06）**。原本把「範圍=常見 ∩ 狀態=閒置」（`portux --common --free`）包裝成旗艦賣點「黃金空位」。但回到真實使用情境後確認：使用者的心智其實是「**看 common 清單**」或「**看全部閒置 port**」二選一，不會想同時疊 `--common --free`——疊起來只剩窄切片。因此**不再主打「黃金空位」**，README 與對外說明都不出現 `--common --free` 範例。四個 filter 技術上仍可各自疊加（`applyFilters` 純函式組合不變），只是不再把這個交集當賣點宣傳。

> **goto × filter 行為**：goto 一個被當前 filter 隱藏的 port 時，**不動 filter、不跳轉**，只在 footer 短暫提示（約 2s）「該 port 被目前篩選隱藏」。

### 資料模型與架構決策（已確認）

針對「全範圍 65536 port」模式，**不採用 port-by-port 懶加載占用狀態**——占用狀態無法、也不該逐一探測（又慢又吵又不準）。正確模型：

- **占用狀態來源**：開場**一次**呼叫 `node-netstat` 取占用骨架（port + pid），再用 `ps-list` 一次撈全部 process 建 `Map<pid, name>`，**O(1) join** 補上程序名，做成 `Map<port, {pid, name}>`（總計約 130ms）。
- **渲染單一 port**：對 Map 做 O(1) 查詢；命中 → 紅色 + 程序名（開場即有）；未命中 → 依四色優先序上色。
- **大列表渲染**：虛擬滾動 / viewport culling，只渲染可見視窗的 row。
- **懶加載 + 快取的正確用途**：**僅用於昂貴的「程序細節 enrichment」**（完整 `cmd`、使用者、cwd…，Windows 上 ps-list 拿不到 cmd），且僅在游標**聚焦**該占用 port 時才用 `find-process` 抓、抓後快取。**程序名 `name` 不屬此列**——已於開場用 ps-list 一次撈齊。
- **資料新鮮度**：整張占用快照**定期 refresh**（類似 htop），避免快取過期顯示錯誤紅綠燈。

> **決策演進：name lazy load 被推翻（保留脈絡）**。曾一度因 `find-process` 逐 pid 反查太慢（序列 ~32s）而將 name 改為「捲動時背景 lazy load」；後實測 `ps-list` 一次撈全部僅 ~105ms（name 覆蓋 35/39，缺口為系統深層保護程序，退回顯示 PID），**推翻 lazy load 前提**，回到最初「開場即顯示程序名」的設計。lazy load 僅保留給更貴的 `cmd`／enrichment。

## 技術選型決策

| 項目      | 決定                                                      |
| --------- | --------------------------------------------------------- |
| Runtime   | Node.js                                                   |
| 語言      | TypeScript                                                |
| Build     | tsdown                                                    |
| Lint      | oxlint（含 oxlint-tsgolint type-aware 規則）              |
| Format    | oxfmt                                                     |
| TUI 渲染  | **Ink**                                                   |
| CLI 框架  | **cac**                                                   |
| Port 查詢 | **node-netstat ＋ ps-list ＋ find-process**（已實機驗證） |

各決策理由與被否決的替代方案（候選逐項比較表已移除，僅留結論與「為什麼不」）：

- **Ink**：現代宣告式（React/JSX）、生態系成熟、TypeScript 型別完整，與 Vue/React 元件思維相近。被否決：`neo-blessed`（原 blessed 已停維護、API 舊式）、`terminal-kit`（抽象層雜需自組滾動）、`opentui`（太新、穩定度待觀察）。
  - 注意：Ink 與 neo-blessed 終端狀態管理方式不同，**一個介面只選一種、不可混用**。
- **cac**：極輕量近乎零依賴、命令式鏈式 API 一看就懂、過去常用手感熟悉。被否決：`commander`／`yargs`（功能足夠但較重）、`citty`（風格現代但偏好命令式手感）。
- **Port 查詢三套分工**（皆跨平台、已在 Windows 實機驗證）：
  - `node-netstat` 取占用骨架（port + pid）；`ps-list` 開場一次撈建 `Map<pid, name>`；`find-process` 僅在聚焦時以單一 pid 反查完整 `cmd`。
  - **為什麼不**：直接呼叫 `ss`/`lsof` → 非跨平台（ss 限 Linux、lsof 無 Windows）；`netstat2` → npm 上不存在的幽靈套件；`netstat`（2013）／`netstats`（底層 lsof）→ 棄置或不跨平台；`tasklist` 補 name → 僅 Windows 且較慢（~380ms vs ps-list ~105ms）；`find-process` 批次補 name → 每筆 ~1.8s（內部 spawn WMIC）太慢，只適合單點聚焦。
