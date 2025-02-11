@echo off
chcp 65001 >nul
title DingMei Server Setup

:: ------------------------
:: 設定批次檔視窗永遠置頂
:: ------------------------
powershell -Command "$Host.UI.RawUI.WindowTitle='DingMei Server Setup'; Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinAPI { [DllImport(\"user32.dll\")] public static extern int SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, int uFlags); }' -Language CSharp; $hwnd = (Get-Process -Id $PID).MainWindowHandle; [WinAPI]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, 0, 0, 3)"

:: ------------------------
:: 檢查並安裝 Git
:: ------------------------
echo 🔄 正在檢查 Git...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未安裝 Git，正在下載並安裝...
    powershell -Command "Start-Process 'https://gitforwindows.org/' -Wait"
    echo 請安裝 Git 後重新執行此批次檔！
    exit /b
) else (
    echo ✅ Git 已安裝！
)

:: ------------------------
:: 檢查並安裝 Node.js
:: ------------------------
echo 🔄 正在檢查 Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未安裝 Node.js，正在下載...
    powershell -Command "Start-Process 'https://nodejs.org/en/download/' -Wait"
    echo 請安裝 Node.js 後重新執行此批次檔！
    exit /b
) else (
    echo ✅ Node.js 已安裝！
)

:: ------------------------
:: 下載專案
:: ------------------------
cd /d D:\
if not exist "dingmei" (
    echo 🔄 正在從 GitHub 克隆專案...
    git clone https://github.com/PcChenWang/dingmei-local.git
    echo ✅ 專案下載完成！
) else (
    echo ⚠️ 專案已存在，跳過下載！
)

:: 進入專案目錄
cd dingmei

:: ------------------------
:: 安裝後端套件
:: ------------------------
echo 🔄 正在安裝後端相依套件...
cd backend
npm install
cd ..

:: ------------------------
:: 安裝 http-server (用於前端)
:: ------------------------
echo 🔄 正在檢查 http-server...
where http-server >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未安裝 http-server，正在安裝...
    npm install -g http-server
) else (
    echo ✅ http-server 已安裝！
)

:: ------------------------
:: 啟動伺服器
:: ------------------------
echo 🚀 啟動後端...
start /min cmd /c "cd /d D:\dingmei\backend && node server.js"

echo 🚀 啟動前端...
start /min cmd /c "cd /d D:\dingmei\frontend && http-server -p 8081"

:: 等待伺服器啟動
ping 127.0.0.1 -n 6 >nul

:: ------------------------
:: 開啟瀏覽器
:: ------------------------
start "" "http://localhost:3000/"
start "" "http://localhost:8081/pages/login.html"

echo 🎉 環境已成功設置並啟動！
exit
