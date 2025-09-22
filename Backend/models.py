# models.py
from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str
    username: str
    password: str
    github_token: str

class UserLogin(BaseModel):
    username: str
    password: str
