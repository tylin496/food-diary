# 食物熱量記錄 (Food Diary)

一個簡單的個人食物紀錄工具：拍照記錄每餐的重量、蛋白質與熱量，並用**多選 + 即時加總**取代逐張翻照片、心算數字的麻煩。

🔗 **Live Demo**：https://tylin496.github.io/food-diary/

## 功能

- **新增 / 編輯 / 刪除紀錄**：食物名稱、照片、重量 (g)、蛋白質 (g)、熱量 (kcal)。
- **多選加總**：點擊卡片多選，畫面下方會浮出總重量 / 總蛋白質 / 總熱量。
- **搜尋**：依名稱即時篩選清單。
- **照片上傳**：透過 [Cloudinary](https://cloudinary.com/) 上傳並保存食物照片。
- **本機儲存**：紀錄資料存在瀏覽器 `localStorage`，單人使用、無需帳號、無後端。

## 技術棧

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) 建置工具
- [Lucide](https://lucide.dev/) icon 套件
- Cloudinary（圖片上傳與託管）
- GitHub Actions 自動部署至 GitHub Pages

## 開發

```bash
npm install
npm run dev
```

其他指令：

```bash
npm run build     # TypeScript 檢查 + 產生 dist/
npm run preview   # 本機預覽 build 結果
```

## 部署

推送到 `main` 分支會自動觸發 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，build 後部署到 GitHub Pages。
