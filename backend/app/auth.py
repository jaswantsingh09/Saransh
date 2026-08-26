"""Authentication for the internal-org MVP.

Two pieces:
  1. Verifying a Google **ID token** obtained by the desktop app's OAuth flow,
     restricted to the org's Google Workspace domain via the `hd` claim.
  2. Issuing / validating our own short-lived **session JWT** used as a
     Bearer token on every subsequent API call.

Configuration (all via environment / .env):
  GOOGLE_CLIENT_ID        OAuth 2.0 client id the desktop app authenticates with.
  ALLOWED_HOSTED_DOMAINS  Comma-separated Workspace domains allowed to sign in
                          (e.g. "yourcompany.com"). Empty = allow any domain
                          (NOT recommended — set it in production).
  JWT_SECRET              Secret used to sign session tokens (long random string).
  JWT_EXP_HOURS           Session lifetime in hours (default 168 = 7 days).
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt  # PyJWT
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
ALLOWED_HOSTED_DOMAINS: List[str] = [
    d.strip() for d in os.getenv("ALLOWED_HOSTED_DOMAINS", "").split(",") if d.strip()
]
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "168"))

# Reused transport for Google's token verification (fetches/caches Google certs).
_google_request = google_requests.Request()

# auto_error=False so we can return our own 401 with a helpful message.
bearer_scheme = HTTPBearer(auto_error=False)


class AuthError(Exception):
    """Raised when a Google token or session token fails validation."""


class CurrentUser(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    is_admin: bool = False


# ----------------------------------------------------------------------
# Google ID token
# ----------------------------------------------------------------------
def verify_google_id_token(token: str) -> dict:
    """Verify a Google ID token and enforce the org-domain restriction.

    Returns the verified claims dict. Raises AuthError on any problem.
    """
    if not GOOGLE_CLIENT_ID:
        raise AuthError("Server is missing GOOGLE_CLIENT_ID configuration")

    try:
        # Verifies signature, expiry, and that aud == GOOGLE_CLIENT_ID and
        # iss is a Google issuer. Raises ValueError otherwise.
        claims = google_id_token.verify_oauth2_token(
            token, _google_request, GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        raise AuthError(f"Invalid Google ID token: {e}")

    if not claims.get("email"):
        raise AuthError("Google token has no email")
    if not claims.get("email_verified", False):
        raise AuthError("Google account email is not verified")

    # Domain restriction (defense-in-depth on top of the OAuth app being
    # configured as "Internal"). hd is the Workspace hosted domain.
    if ALLOWED_HOSTED_DOMAINS:
        hd = claims.get("hd")
        if hd not in ALLOWED_HOSTED_DOMAINS:
            raise AuthError("This account is outside the allowed organization")

    return claims


# ----------------------------------------------------------------------
# Session JWT
# ----------------------------------------------------------------------
def create_session_jwt(user_id: str, email: str, name: Optional[str],
                       is_admin: bool = False) -> str:
    """Issue a signed session token for an authenticated user."""
    if not JWT_SECRET:
        raise AuthError("Server is missing JWT_SECRET configuration")
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "is_admin": is_admin,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_jwt(token: str) -> dict:
    """Decode and validate a session token. Raises jwt.PyJWTError on failure."""
    if not JWT_SECRET:
        raise AuthError("Server is missing JWT_SECRET configuration")
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ----------------------------------------------------------------------
# FastAPI dependencies
# ----------------------------------------------------------------------
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    """Resolve the current user from the Authorization: Bearer <jwt> header."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = decode_session_jwt(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired",
                            headers={"WWW-Authenticate": "Bearer"})
    except (jwt.PyJWTError, AuthError):
        raise HTTPException(status_code=401, detail="Invalid session token",
                            headers={"WWW-Authenticate": "Bearer"})

    return CurrentUser(
        id=claims["sub"],
        email=claims.get("email", ""),
        name=claims.get("name"),
        is_admin=bool(claims.get("is_admin", False)),
    )


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency that additionally requires the user to be an org admin."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user
