#!/usr/bin/env bash

# 无论你从项目哪个目录执行，都先进入真正的后端目录。
set -e
cd "$(dirname "$0")/backend"

# 使用后端专属的 Python 虚拟环境。
source .venv/bin/activate

# 本地开发时自动准备一个测试账号，避免手动注册。
python seed_dev.py

# 启动 FastAPI 开发服务器。
exec python -m uvicorn main:app --reload --port 8000
