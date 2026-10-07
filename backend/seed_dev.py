"""仅用于本地开发的测试账号初始化脚本。"""

from sqlalchemy import select

from database import Base, SessionLocal, engine
from models import User
from security import hash_password


DEV_LOGIN = "test@chenlun.local"
DEV_PASSWORD = "chenlun123"


def seed_dev_user() -> None:
    # 确保本地开发时 users 表已经存在。
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_user = db.scalar(select(User).where(User.login == DEV_LOGIN))
        if existing_user:
            print(f"开发测试账号已存在：{DEV_LOGIN}")
            return

        db.add(User(login=DEV_LOGIN, password_hash=hash_password(DEV_PASSWORD)))
        db.commit()
        print(f"开发测试账号已创建：{DEV_LOGIN}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_dev_user()
