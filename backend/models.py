from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    # 这个 Python 类对应 MySQL 中的 users 表。
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)  # 用户编号
    login: Mapped[str] = mapped_column(String(160), unique=True, index=True)  # 手机号或邮箱
    password_hash: Mapped[str] = mapped_column(String(255))  # 加密后的密码
    nickname: Mapped[str | None] = mapped_column(String(80), nullable=True)  # 昵称，可为空
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)  # 注册时间


class CoupleSpace(Base):
    # 一个情侣空间对应 MySQL 中的一条记录。
    __tablename__ = "couple_spaces"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    invite_code: Mapped[str] = mapped_column(String(6), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # 一个空间可以有多个成员；第一版业务规则限制为两人。
    members: Mapped[list["SpaceMember"]] = relationship(back_populates="space")


class SpaceMember(Base):
    # 这张关系表记录“哪个用户加入了哪个情侣空间”。
    __tablename__ = "space_members"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("couple_spaces.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    space: Mapped[CoupleSpace] = relationship(back_populates="members")


class DailyCheckIn(Base):
    # 每一条记录代表：某个用户在某个情侣空间完成了一天的打卡。
    __tablename__ = "daily_check_ins"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("couple_spaces.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    check_in_date: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Anniversary(Base):
    # 一个情侣空间可以保存多个纪念日，例如在一起、生日、旅行日。
    __tablename__ = "anniversaries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("couple_spaces.id"), index=True)
    title: Mapped[str] = mapped_column(String(80))
    anniversary_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Message(Base):
    # 留言属于情侣空间，但要记录是谁写的，另一半才能看到来源。
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("couple_spaces.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Mood(Base):
    # 每个人每天在同一个情侣空间里保存一条心情。
    __tablename__ = "moods"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("couple_spaces.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    mood_date: Mapped[date] = mapped_column(Date, index=True)
    mood_type: Mapped[str] = mapped_column(String(30))
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Memory(Base):
    # 回忆属于情侣空间，两个人都可以看到。
    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("couple_spaces.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(100))
    content: Mapped[str] = mapped_column(String(1000))
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    memory_date: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
