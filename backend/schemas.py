from datetime import date, datetime

from pydantic import BaseModel, Field


class AuthInput(BaseModel):
    # 注册和登录时，前端必须提交的数据格式。
    login: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    # 返回给前端的用户信息；故意不返回 password_hash。
    id: int
    login: str
    nickname: str | None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    nickname: str = Field(min_length=1, max_length=80)


class PasswordChange(BaseModel):
    old_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class SpaceCreate(BaseModel):
    name: str | None = Field(default=None, max_length=80)


class SpaceUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=80)


class SpaceJoin(BaseModel):
    invite_code: str = Field(min_length=6, max_length=6)


class SpaceResponse(BaseModel):
    id: int
    name: str | None
    invite_code: str

    model_config = {"from_attributes": True}


class DailyCheckInResponse(BaseModel):
    # 前端只需要知道今天两个人各自是否完成打卡。
    check_in_date: str
    my_checked_in: bool
    partner_checked_in: bool


class AnniversaryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    anniversary_date: date


class AnniversaryResponse(BaseModel):
    id: int
    title: str
    anniversary_date: date

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class MessageResponse(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MoodCreate(BaseModel):
    mood_type: str = Field(min_length=1, max_length=30)
    note: str | None = Field(default=None, max_length=200)


class MoodResponse(BaseModel):
    id: int
    user_id: int
    mood_date: date
    mood_type: str
    note: str | None

    model_config = {"from_attributes": True}


class MemoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)
    memory_date: date


class MemoryResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    image_url: str | None
    memory_date: date
    created_at: datetime

    model_config = {"from_attributes": True}
