import base64
import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:
    # 为密码生成随机盐值，再使用 scrypt 计算加密摘要。
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
    )
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    # 登录时用同样的方法计算结果，再与数据库中的结果比较。
    try:
        salt_text, digest_text = stored_hash.split("$", 1)
        salt = base64.b64decode(salt_text)
        expected = base64.b64decode(digest_text)
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False
