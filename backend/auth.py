import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import User


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY") or ""
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7

if not SECRET_KEY:
    raise RuntimeError("缺少 SECRET_KEY，请在 backend/.env 中配置")


# 告诉 FastAPI：后续受保护接口从 Authorization 请求头读取令牌。
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(user_id: int) -> str:
    # 令牌里只保存用户编号和过期时间，不保存密码。
    expires_at = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    # 解析令牌，并根据其中的用户编号查询当前用户。
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="登录状态无效或已过期",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_error
    except (JWTError, ValueError):
        raise credentials_error

    user = db.scalar(select(User).where(User.id == int(user_id)))
    if not user:
        raise credentials_error
    return user
