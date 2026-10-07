from pymongo import MongoClient, UpdateOne
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from dotenv import load_dotenv
import os

load_dotenv()

uri = os.getenv("MONGODB_URI")

client = MongoClient(uri)
collection = client["NewsPulse"]["articles"]

analyzer = SentimentIntensityAnalyzer()

batch = []
batch_size = 1000
processed = 0

cursor = collection.find(
    {"sentiment": {"$exists": False}},
    {"_id": 1, "headline": 1, "short_description": 1}
)

for article in cursor:

    text = (
        article.get("headline", "") + " " +
        article.get("short_description", "")
    )

    score = analyzer.polarity_scores(text)["compound"]

    if score >= 0.05:
        sentiment = "positive"
    elif score <= -0.05:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    batch.append(
        UpdateOne(
            {"_id": article["_id"]},
            {"$set": {
                "sentiment": sentiment,
                "sentiment_score": score
            }}
        )
    )

    if len(batch) == batch_size:
        collection.bulk_write(batch)
        processed += len(batch)
        print("Processed:", processed)
        batch = []

if batch:
    collection.bulk_write(batch)
    processed += len(batch)

print("Total newly processed:", processed)

client.close()