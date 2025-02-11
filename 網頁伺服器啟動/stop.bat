@echo off
chcp 65001 >nul
title 停止 DingMei 伺服器

echo 🔴 停止後端 (Node.js)...
taskkill /F /IM node.exe /T

echo 🔴 停止前端 (http-server)...
taskkill /F /IM http-server.exe /T

echo ✅ 伺服器已成功停止！

