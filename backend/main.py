from datetime import date

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import and_, inspect, select, text
from sqlalchemy.orm import Session
from pathlib import Path
from uuid import uuid4

from database import Base, engine, get_db
from auth import create_access_token, get_current_user
import models  # noqa: F401
from models import Anniversary, CoupleSpace, DailyCheckIn, Memory, Message, Mood, SpaceMember, User
from schemas import AnniversaryCreate, AnniversaryResponse, AuthInput, DailyCheckInResponse, MemoryCreate, MemoryResponse, MessageCreate, MessageResponse, MoodCreate, MoodResponse, PasswordChange, ProfileUpdate, SpaceCreate, SpaceJoin, SpaceResponse, SpaceUpdate, TokenResponse, UserResponse
from security import hash_password, verify_password
import secrets
import string


# 创建 FastAPI 应用对象；它是后端服务的入口。
app = FastAPI(title="沉沦 API", version="0.1.0")

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads" / "memories"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR.parent)), name="uploads")

# 允许 React 前端访问 FastAPI。前后端端口不同，所以需要跨域配置。
app.add_middleware(
    CORSMiddleware,
    # 本地开发时 Vite 可能使用 5173 或 5174。
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],#允许所有 HTTP 请求方法，这里的 * 就是全部允许。
    allow_headers=["*"],#允许请求携带任意 HTTP 请求头
)

# 根据 models.py 自动创建还不存在的数据库表。
Base.metadata.create_all(bind=engine)

# create_all 不会修改已经存在的表，所以给旧版 memories 表补上图片地址字段。
if "image_url" not in {column["name"] for column in inspect(engine).get_columns("memories")}:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE memories ADD COLUMN image_url VARCHAR(500) NULL"))


@app.get("/")
def read_root():
    # 根接口，用来确认后端能正常返回内容。
    return {"message": "沉沦后端已启动"}


@app.get("/health")
def health_check():
    # 只检查 FastAPI 服务是否运行。
    return {"status": "ok"}


@app.get("/health/database")
def database_health_check():
    # 检查数据库配置和连接是否正常。
    return {"status": "ok", "database": "connected"}


@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: AuthInput, db: Session = Depends(get_db)):
    # payload 是前端传来的账号和密码，db 是本次请求的数据库会话。
    existing_user = db.scalar(select(User).where(User.login == payload.login))
    if existing_user:
        raise HTTPException(status_code=400, detail="该账号已经注册")

    # 密码先加密，再保存到数据库，不能保存明文密码。
    user = User(login=payload.login, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: AuthInput, db: Session = Depends(get_db)):
    # 先查询账号，再验证密码。
    user = db.scalar(select(User).where(User.login == payload.login))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码不正确")
    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@app.get("/auth/me", response_model=UserResponse)
def current_user(user: User = Depends(get_current_user)):
    # 受保护接口示例：只有携带有效令牌才能获取当前用户。
    return user


@app.patch("/auth/me", response_model=UserResponse)
def update_profile(payload: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.nickname = payload.nickname.strip()
    db.commit()
    db.refresh(user)
    return user


@app.patch("/auth/password")
def change_password(payload: PasswordChange, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="旧密码不正确")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "密码已修改"}


def create_invite_code(db: Session) -> str:
    # 使用大写字母和数字生成易复制的 6 位邀请码。
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(6))
        if not db.scalar(select(CoupleSpace).where(CoupleSpace.invite_code == code)):
            return code


def get_user_space(db: Session, user_id: int) -> CoupleSpace | None:
    membership = db.scalar(select(SpaceMember).where(SpaceMember.user_id == user_id))
    if not membership:
        return None
    return db.get(CoupleSpace, membership.space_id)


@app.post("/spaces", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
def create_space(
    payload: SpaceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 一个用户第一版只能加入一个情侣空间。
    if get_user_space(db, user.id):
        raise HTTPException(status_code=400, detail="你已经加入情侣空间")

    space = CoupleSpace(name=payload.name, invite_code=create_invite_code(db))
    db.add(space)
    db.flush()
    db.add(SpaceMember(space_id=space.id, user_id=user.id))
    db.commit()
    db.refresh(space)
    return space


@app.post("/spaces/join", response_model=SpaceResponse)
def join_space(
    payload: SpaceJoin,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if get_user_space(db, user.id):
        raise HTTPException(status_code=400, detail="你已经加入情侣空间")

    space = db.scalar(select(CoupleSpace).where(CoupleSpace.invite_code == payload.invite_code.upper()))
    if not space:
        raise HTTPException(status_code=404, detail="邀请码不存在")

    member_count = len(space.members)
    if member_count >= 2:
        raise HTTPException(status_code=400, detail="这个情侣空间已经绑定两个人")

    db.add(SpaceMember(space_id=space.id, user_id=user.id))
    db.commit()
    db.refresh(space)
    return space


@app.get("/spaces/me", response_model=SpaceResponse)
def my_space(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="你还没有情侣空间")
    return space


@app.patch("/spaces/me", response_model=SpaceResponse)
def update_space(payload: SpaceUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")
    space.name = payload.name.strip() if payload.name else None
    db.commit()
    db.refresh(space)
    return space


@app.post("/spaces/me/regenerate-invite", response_model=SpaceResponse)
def regenerate_invite(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")
    space.invite_code = create_invite_code(db)
    db.commit()
    db.refresh(space)
    return space


@app.get("/checkins/today", response_model=DailyCheckInResponse)
def today_check_in(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 先找到当前用户所在的情侣空间。
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")

    today = date.today()
    records = db.scalars(
        select(DailyCheckIn).where(
            and_(DailyCheckIn.space_id == space.id, DailyCheckIn.check_in_date == today)
        )
    ).all()
    checked_user_ids = {record.user_id for record in records}
    return DailyCheckInResponse(
        check_in_date=today.isoformat(),
        my_checked_in=user.id in checked_user_ids,
        partner_checked_in=any(member.user_id != user.id for member in space.members if member.user_id in checked_user_ids),
    )


@app.post("/checkins/today", response_model=DailyCheckInResponse, status_code=status.HTTP_201_CREATED)
def complete_today_check_in(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 打卡前先检查今天是否已经打过，避免重复写入。
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")

    today = date.today()
    existing = db.scalar(
        select(DailyCheckIn).where(
            and_(
                DailyCheckIn.space_id == space.id,
                DailyCheckIn.user_id == user.id,
                DailyCheckIn.check_in_date == today,
            )
        )
    )
    if not existing:
        db.add(DailyCheckIn(space_id=space.id, user_id=user.id, check_in_date=today))
        db.commit()

    return today_check_in(user, db)


@app.get("/anniversaries/me", response_model=list[AnniversaryResponse])
def my_anniversaries(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 只返回当前用户所在空间的纪念日，避免不同情侣空间的数据串在一起。
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")
    return db.scalars(
        select(Anniversary).where(Anniversary.space_id == space.id).order_by(Anniversary.anniversary_date)
    ).all()


@app.post("/anniversaries", response_model=AnniversaryResponse, status_code=status.HTTP_201_CREATED)
def create_anniversary(
    payload: AnniversaryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")

    anniversary = Anniversary(
        space_id=space.id,
        title=payload.title.strip(),
        anniversary_date=payload.anniversary_date,
    )
    db.add(anniversary)
    db.commit()
    db.refresh(anniversary)
    return anniversary


@app.get("/messages/me", response_model=list[MessageResponse])
def my_messages(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")
    return db.scalars(
        select(Message).where(Message.space_id == space.id).order_by(Message.created_at.desc()).limit(50)
    ).all()


@app.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    payload: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")

    message = Message(space_id=space.id, user_id=user.id, content=payload.content.strip())
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@app.get("/moods/today", response_model=list[MoodResponse])
def today_moods(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")
    return db.scalars(
        select(Mood).where(Mood.space_id == space.id, Mood.mood_date == date.today())
    ).all()


@app.post("/moods/today", response_model=MoodResponse)
def save_today_mood(
    payload: MoodCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")

    mood = db.scalar(select(Mood).where(
        Mood.space_id == space.id,
        Mood.user_id == user.id,
        Mood.mood_date == date.today(),
    ))
    if mood:
        mood.mood_type = payload.mood_type
        mood.note = payload.note
    else:
        mood = Mood(
            space_id=space.id,
            user_id=user.id,
            mood_date=date.today(),
            mood_type=payload.mood_type,
            note=payload.note,
        )
        db.add(mood)
    db.commit()
    db.refresh(mood)
    return mood


@app.get("/memories/me", response_model=list[MemoryResponse])
def my_memories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")
    return db.scalars(
        select(Memory).where(Memory.space_id == space.id).order_by(Memory.memory_date.desc(), Memory.created_at.desc())
    ).all()


@app.post("/memories", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    payload: MemoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")
    memory = Memory(
        space_id=space.id,
        user_id=user.id,
        title=payload.title.strip(),
        content=payload.content.strip(),
        memory_date=payload.memory_date,
        image_url=None,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


@app.post("/memories/upload", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory_with_image(
    title: str = Form(..., min_length=1, max_length=100),
    content: str = Form(..., min_length=1, max_length=1000),
    memory_date: date = Form(...),
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """保存一条带图片的回忆；图片先存本地，数据库只存图片地址。"""
    space = get_user_space(db, user.id)
    if not space:
        raise HTTPException(status_code=404, detail="请先加入情侣空间")

    allowed_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if image.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="只支持 JPG、PNG、WEBP 图片")

    file_bytes = await image.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片不能超过 5MB")

    filename = f"{uuid4().hex}{allowed_types[image.content_type]}"
    (UPLOAD_DIR / filename).write_bytes(file_bytes)
    memory = Memory(
        space_id=space.id,
        user_id=user.id,
        title=title.strip(),
        content=content.strip(),
        memory_date=memory_date,
        image_url=f"/uploads/memories/{filename}",
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


@app.get("/hello")
def hello():
    # /hello 是接口地址，不是文件名；访问它会执行这个函数。
    return {"message": "你好，沉沦"}
