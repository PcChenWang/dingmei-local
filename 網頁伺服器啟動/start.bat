@echo off
chcp 65001 >nul
title DingMei Auto Start

:: ------------------------
:: 設定 start_project.bat 永遠置頂
:: ------------------------
powershell -Command "$Host.UI.RawUI.WindowTitle='DingMei Auto Start'; Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinAPI { [DllImport(\"user32.dll\")] public static extern int SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, int uFlags); }' -Language CSharp; $hwnd = (Get-Process -Id $PID).MainWindowHandle; [WinAPI]::SetWindowPos($hwnd, [IntPtr]::Zero, 0, 0, 0, 0, 3)"

:: 最大重試次數
set max_retries=3

:: 切換到 E: 磁碟
E:

:: ------------------------
:: 啟動後端並自動重試
:: ------------------------
set retry_count=0
:START_BACKEND
if %retry_count% GEQ %max_retries% (
    echo ❌ 後端啟動失敗，達到最大重試次數！
    exit /b 1
)
echo 🔄 正在啟動後端 (嘗試第 %retry_count% 次)...
start /min cmd /c "cd /d E:\project\dingmei\backend && node server.js"

:: 等待 5 秒確保後端啟動
ping 127.0.0.1 -n 6 >nul

:: 檢查後端是否啟動成功
curl -s http://localhost:3000 >nul
if %errorlevel% neq 0 (
    echo ❌ 後端未成功啟動，將重新嘗試...
    set /a retry_count+=1
    goto START_BACKEND
) else (
    echo ✅ 後端啟動成功！
)

:: ------------------------
:: 啟動前端並自動重試
:: ------------------------
set retry_count=0
:START_FRONTEND
if %retry_count% GEQ %max_retries% (
    echo ❌ 前端啟動失敗，達到最大重試次數！
    exit /b 1
)
echo 🔄 正在啟動前端 (嘗試第 %retry_count% 次)...
start /min cmd /c "cd /d E:\project\dingmei\frontend && http-server -p 8081"

:: 等待 3 秒確保前端啟動
ping 127.0.0.1 -n 4 >nul

:: 檢查前端是否啟動成功
curl -s http://localhost:8081 >nul
if %errorlevel% neq 0 (
    echo ❌ 前端未成功啟動，將重新嘗試...
    set /a retry_count+=1
    goto START_FRONTEND
) else (
    echo ✅ 前端啟動成功！
)

:: ------------------------
:: 開啟瀏覽器
:: ------------------------
start "" "http://localhost:3000/"
start "" "http://localhost:8081/pages/login.html"

echo 🎉 所有服務已成功啟動！


:: ------------------
:: 保持 CMD 視窗開啟
:: ------------------
pause
