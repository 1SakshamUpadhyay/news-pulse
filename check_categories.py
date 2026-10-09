import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load .env
load_dotenv(".env")

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")

# Connect
client = MongoClient(MONGODB_URI)

db = client["NewsPulse"]
articles = db["articles"]

print("\nConnected to MongoDB Atlas")
print("Database: NewsPulse\n")

# Get category counts
results = articles.aggregate([
    {
        "$group": {
            "_id": "$category",
            "count": {
                "$sum": 1
            }
        }
    },
    {
        "$sort": {
            "count": -1
        }
    }
])

print("========================================")
print("CATEGORY DISTRIBUTION")
print("========================================")

total = 0

for result in results:

    category = result["_id"]
    count = result["count"]

    print(f"{str(category):25} {count:,}")

    total += count

print("----------------------------------------")
print(f"{'TOTAL':25} {total:,}")
print("========================================")

client.close()

print("\nMongoDB connection closed.")