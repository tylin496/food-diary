# 食物營養資料庫 (FoodBook)

一個簡單的個人食物營養資料庫：把常吃的食物拍照建檔，記下重量、蛋白質與熱量，要組一餐時**多選 + 即時加總**，取代逐張翻照片、心算數字的麻煩。

🔗 **Live Demo**：https://tylin496.github.io/foodbook/

## 功能

- **新增 / 編輯 / 刪除紀錄**：食物名稱、照片、重量 (g)、蛋白質 (g)、熱量 (kcal)。
- **多選加總**：點擊卡片多選，畫面下方會浮出總重量 / 總蛋白質 / 總熱量。
- **搜尋**：依名稱即時篩選清單。
- **照片上傳**：透過 [Cloudinary](https://cloudinary.com/) 上傳並保存食物照片。
- **雲端儲存**：紀錄資料存在 Firebase Firestore，用 Google 帳號登入即可跨裝置同步；`localStorage` 只作為離線快取，清瀏覽器資料不會遺失紀錄。

## 技術棧

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) 建置工具
- [Lucide](https://lucide.dev/) icon 套件
- Cloudinary（圖片上傳與託管）
- Firebase（Google 登入 + Firestore 資料庫）
- GitHub Actions 自動部署至 GitHub Pages

## 開發

```bash
npm install
cp .env.example .env   # 填入 Firebase 專案設定
npm run dev
```

### Firebase 設定

1. 到 [Firebase Console](https://console.firebase.google.com) 建立新專案。
2. **Build > Authentication > Get started**，啟用 Google 登入方式。
3. **Build > Firestore Database > Create database**，選一個地區建立。
4. 到 **Firestore Database > Rules**，貼上（把 uid 換成你自己的，見下方說明）：
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read: if uid == '你的 Google 帳號 uid';
         allow write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
   這份規則讓**任何人（含未登入訪客）都能讀**擁有者那份資料，Live Demo 才看得到內容；
   **寫入則只有擁有者本人**（uid 相符）才過得了，其他帳號登入後只會是唯讀畫面，
   直接呼叫 Firestore API 也一樣被擋。同一組 uid 也要填進 `src/App.tsx` 的 `OWNER_UID`
   （前端用它決定要不要顯示編輯 UI）；uid 可在 **Authentication > Users** 查到。
5. **專案設定（齒輪圖示）> 一般 > 你的應用程式 > 新增應用程式（網頁）**，複製產生的 `firebaseConfig`，填進 `.env`。
6. 若透過 GitHub Pages 部署，把同樣六個值加進 repo 的 **Settings > Secrets and variables > Actions**（名稱要對應 `.env.example` 裡的變數名）。
7. **Authentication > Settings > Authorized domains**，加入部署網域（例如 `tylin496.github.io`），Google 登入才能在正式環境運作。

其他指令：

```bash
npm run build     # TypeScript 檢查 + 產生 dist/
npm run preview   # 本機預覽 build 結果
```

## 部署

推送到 `main` 分支會自動觸發 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，build 後部署到 GitHub Pages。
