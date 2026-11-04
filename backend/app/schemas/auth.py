from pydantic import BaseModel, EmailStr, Field

class UserRegisterRequest(BaseModel):
    email: EmailStr = Field(..., example="pacient@example.com")
    password: str = Field(..., min_length=6, example="Parola123!")
    confirm_password: str = Field(..., min_length=6, example="Parola123!")

class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., example="pacient@example.com")
    password: str = Field(..., example="Parola123!")

class UserResponse(BaseModel):
    id: str
    email: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse