# fh6-hub/tray.py
import os
import sys
import winreg

from PIL import Image, ImageDraw

REG_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
APP_NAME = "Time4ttack_FH6_Hub"


def create_default_icon():
    # 動態繪製一個簡約的賽車紅 (FF0055) T 圖示作為 System Tray Icon
    image = Image.new("RGB", (64, 64), color="#111216")
    dc = ImageDraw.Draw(image)
    dc.rectangle([16, 16, 48, 24], fill="#FF0055")
    dc.rectangle([28, 24, 36, 48], fill="#FF0055")
    return image


def set_autostart(enabled: bool):
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_SET_VALUE
        )
        if enabled:
            # 取得當前執行的 Python 或 Exe 路徑
            script_path = os.path.abspath(sys.argv[0])
            if script_path.endswith(".py"):
                # 如果是開發環境 .py，使用 pythonw 啟動防彈黑窗
                cmd = f'pythonw "{script_path}"'
            else:
                cmd = f'"{script_path}"'
            winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, cmd)
            print("[Tray] 已成功開啟開機自動啟動。")
        else:
            try:
                winreg.DeleteValue(key, APP_NAME)
                print("[Tray] 已成功關閉開機自動啟動。")
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception as e:
        print(f"[Tray] 設定自啟動失敗: {e}")


def is_autostart_enabled() -> bool:
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_READ)
        winreg.QueryValueEx(key, APP_NAME)
        winreg.CloseKey(key)
        return True
    except FileNotFoundError:
        return False
