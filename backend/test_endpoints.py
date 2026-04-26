import httpx
import asyncio

async def test():
    async with httpx.AsyncClient(base_url="http://localhost:8000/api") as client:
        # Register and login
        await client.post("/auth/register", json={"email": "test2@test.com", "username": "test2", "password": "password"})
        res = await client.post("/auth/login", json={"username": "test2@test.com", "password": "password"}, headers={"Content-Type": "application/x-www-form-urlencoded"})
        print("Login status:", res.status_code)
        
        # We need the cookie for auth
        cookies = res.cookies
        
        # Upload data
        with open("sample_dataset.csv", "rb") as f:
            files = {"file": ("sample_dataset.csv", f, "text/csv")}
            res = await client.post("/upload", files=files, cookies=cookies)
            print("Upload status:", res.status_code)

        # EDA
        res = await client.get("/data/eda", cookies=cookies)
        print("EDA status:", res.status_code)
        if res.status_code == 200:
            print("EDA keys:", res.json().keys())

        # Clean
        res = await client.post("/data/clean", json={"drop_duplicates": True, "drop_null_rows": True}, cookies=cookies)
        print("Clean status:", res.status_code)
        
        # Insights
        res = await client.get("/insights?role=analyst", cookies=cookies)
        print("Insights status:", res.status_code)

asyncio.run(test())
