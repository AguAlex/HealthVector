from fastapi import APIRouter, HTTPException, status
from app.core.database import get_supabase_client
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegisterRequest):
 
    if req.password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parolele nu se potrivesc."
        )
        
    supabase = get_supabase_client()

    existing_user = supabase.table("users").select("id").eq("email", req.email.lower()).execute()
    if existing_user.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Există deja un cont cu această adresă de e-mail."
        )
        
    hashed_pw = hash_password(req.password)
    res = supabase.table("users").insert({
        "email": req.email.lower(),
        "password_hash": hashed_pw
    }).execute()
    
    created_user = res.data[0]
    user_id = str(created_user["id"])
    
    access_token = create_access_token(data={"sub": user_id, "email": created_user["email"]})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user_id, email=created_user["email"])
    )

@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest):
    supabase = get_supabase_client()
    
    res = supabase.table("users").select("*").eq("email", req.email.lower()).execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail sau parolă incorectă."
        )
        
    user = res.data[0]
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail sau parolă incorectă."
        )
        
    user_id = str(user["id"])
    access_token = create_access_token(data={"sub": user_id, "email": user["email"]})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user_id, email=user["email"])
    )