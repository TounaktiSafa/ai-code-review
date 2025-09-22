from fastapi import FastAPI, HTTPException,Depends
from pydantic import BaseModel
from github import Github
from dotenv import load_dotenv
import os
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from auth import router as auth_router
from deps import get_current_user
import requests

# Load environment variables
load_dotenv()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

if not GITHUB_TOKEN:
    raise ValueError("❌ GitHub Token not found")

# Initialize GitHub client
g = Github(GITHUB_TOKEN)

# Ollama local API
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "codellama:7b-instruct"  # smaller, faster model

app = FastAPI()

class ReviewRequest(BaseModel):
    repo: str
    pr_number: int
app.include_router(auth_router, prefix="/auth", tags=["auth"])

@app.get("/")
def home():
    return {"message": "AI Code Review with Ollama/CodeLlama is running 🚀"}


@app.get("/secure-endpoint")
async def secure(current_user=Depends(get_current_user)):
    return {"message": f"Hello {current_user['name']}, you are authenticated ✅"}
@app.get("/my-repos")
async def get_user_repos(current_user=Depends(get_current_user)):
    github_token = current_user.get("github_token")
    if not github_token:
        raise HTTPException(status_code=400, detail="GitHub token not found for this user")

    headers = {"Authorization": f"token {github_token}"}
    url = "https://api.github.com/user/repos"
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())

    return response.json()
def analyze_code_with_ollama(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "temperature": 0.2,
        "max_tokens": 500,
        "stream": False
    }

    response = requests.post(OLLAMA_URL, json=payload)
    if response.status_code != 200:
        raise Exception(f"Ollama API error: {response.text}")

    data = response.json()
    if "response" in data:
        return data["response"]
    elif "results" in data and len(data["results"]) > 0:
        return data["results"][0]["content"]
    else:
        return str(data)

def analyze_file(repo, pr_sha, file):
    filename = file.filename

    # Skip very large files (>1000 lines)
    try:
        content_obj = repo.get_contents(filename, ref=pr_sha)
        file_content = content_obj.decoded_content.decode("utf-8")
        if file_content.count("\n") > 1000:
            return filename, "# File too large to analyze"
    except Exception:
        return filename, "# File could not be fetched (binary or deleted)"

    prompt = f"Review the following code in `{filename}`. Identify bugs,generate the corrected code, give improvements, and optimizations:\n\n{file_content}"
    review = analyze_code_with_ollama(prompt)
    return filename, review

@app.post("/review-pr")
def review_pr(request: ReviewRequest):
    try:
        repo = g.get_repo(request.repo)
        pr = repo.get_pull(request.pr_number)
        changed_files = list(pr.get_files())
        reviews = {}

        # Use ThreadPoolExecutor to analyze multiple files concurrently
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(analyze_file, repo, pr.head.sha, f) for f in changed_files]
            for future in as_completed(futures):
                filename, review = future.result()
                reviews[filename] = review

        return {
            "status": "success",
            "repo": request.repo,
            "pr_number": request.pr_number,
            "reviews": reviews
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

