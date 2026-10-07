import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# 从 backend/.env 读取数据库地址和密码。
load_dotenv()

database_url = os.getenv("DATABASE_URL")

if not database_url:
    # 没有数据库配置时，启动阶段就明确报错。
    raise RuntimeError("缺少 DATABASE_URL，请在 backend/.env 中配置数据库连接")


class Base(DeclarativeBase):
    # 所有数据库模型都继承这个 Base。
    pass


engine = create_engine(database_url, pool_pre_ping=True)
# 每个请求通过 SessionLocal 获得一个数据库会话。
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    # 请求结束后关闭数据库会话，释放连接。
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
