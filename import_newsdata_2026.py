
import os
import re
import json
import pandas as pd

from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_FILE = os.path.join(
    BASE_DIR,
    "Newsdata_Records_2026_07_20_09_20_47.csv"
)

load_dotenv(os.path.join(BASE_DIR, ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")

BATCH_SIZE = 1000


# ============================================================
# CONNECT TO MONGODB
# ============================================================

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=120000
)

db = client["NewsPulse"]
articles = db["articles"]

client.admin.command("ping")

print("Connected to MongoDB Atlas")
print("Database: NewsPulse")
print("Collection: articles")


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def clean(value):
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def get_column(row, *names):
    """Find a column without depending on capitalization."""
    for name in names:
        for column in row.index:
            if str(column).strip().lower() == name.lower():
                return row[column]
    return None


def parse_date(value):
    """Normalize a publication date to YYYY-MM-DD."""
    value = clean(value)

    if not value:
        return None

    # Handles values such as:
    # 2026-07-19 00:00:00 Europe/London
    match = re.search(r"\d{4}-\d{2}-\d{2}", value)

    if match:
        return match.group(0)

    parsed = pd.to_datetime(value, errors="coerce", utc=True)

    if pd.isna(parsed):
        return None

    return parsed.strftime("%Y-%m-%d")


def normalize_category(value, headline=""):
    """Map NewsData categories to existing NewsPulse categories."""
    value = clean(value).lower()
    text = value + " " + clean(headline).lower()

    if any(word in text for word in [
        "soccer", "football", "cricket", "sports",
        "sport", "t20", "fifa", "world cup"
    ]):
        return "SPORTS"

    if any(word in text for word in [
        "technology", "tech", "artificial intelligence",
        "software", "smartphone"
    ]):
        return "TECH"

    if any(word in text for word in [
        "politics", "political", "election", "government"
    ]):
        return "POLITICS"

    if any(word in text for word in [
        "health", "healthcare", "medical", "wellness"
    ]):
        return "HEALTHY LIVING"

    if any(word in text for word in [
        "business", "economy", "economic", "company",
        "finance", "market", "stock"
    ]):
        return "BUSINESS"

    if any(word in text for word in [
        "entertainment", "movie", "music", "celebrity"
    ]):
        return "ENTERTAINMENT"

    if any(word in text for word in [
        "travel", "tourism", "holiday"
    ]):
        return "TRAVEL"

    if any(word in text for word in [
        "science", "research", "space"
    ]):
        return "SCIENCE"

    if any(word in text for word in [
        "education", "school", "university", "student"
    ]):
        return "EDUCATION"

    if any(word in text for word in [
        "food", "restaurant", "cooking"
    ]):
        return "FOOD & DRINK"

    # Use an existing category as the fallback.
    return "WORLD NEWS"


def normalize_sentiment(value):
    value = clean(value).lower()

    if value in ("positive", "negative", "neutral"):
        return value

    return "neutral"


# ============================================================
# VALIDATE INPUT FILE
# ============================================================

if not os.path.isfile(CSV_FILE):
    raise FileNotFoundError(
        f"CSV file not found:\n{CSV_FILE}"
    )

print("\nReading:", os.path.basename(CSV_FILE))

# Read in chunks so the entire file isn't loaded into memory.
reader = pd.read_csv(
    CSV_FILE,
    chunksize=BATCH_SIZE,
    low_memory=False
)

total_read = 0
inserted = 0
skipped_invalid = 0
invalid_dates = 0
batch_number = 0

required_link_names = {"link", "article_url", "url"}

try:
    for chunk in reader:

        if total_read == 0:
            print("Columns:", list(chunk.columns))

            normalized_columns = {
                str(column).strip().lower()
                for column in chunk.columns
            }

            if not normalized_columns.intersection(
                required_link_names
            ):
                raise ValueError(
                    "Could not identify the article URL column. "
                    f"Available columns: {list(chunk.columns)}"
                )

        operations = []
        batch_links = set()

        for _, row in chunk.iterrows():

            total_read += 1

            link = clean(
                get_column(
                    row,
                    "link",
                    "article_url",
                    "url"
                )
            )

            headline = clean(
                get_column(
                    row,
                    "title",
                    "headline",
                    "name"
                )
            )

            if not link or not headline:
                skipped_invalid += 1
                continue

            # Avoid duplicate links within the same batch.
            if link in batch_links:
                continue

            batch_links.add(link)

            raw_date = get_column(
                row,
                "pubDate",
                "pub_date",
                "published_at",
                "published",
                "date"
            )

            date = parse_date(raw_date)

            # This import is specifically for 2026 records.
            if not date or not date.startswith("2026-"):
                invalid_dates += 1
                continue

            description = clean(
                get_column(
                    row,
                    "description",
                    "content",
                    "short_description",
                    "summary"
                )
            )

            raw_category = clean(
                get_column(
                    row,
                    "category",
                    "categories",
                    "ai_tag"
                )
            )

            category = normalize_category(
                raw_category,
                headline
            )

            sentiment = normalize_sentiment(
                get_column(
                    row,
                    "sentiment",
                    "ai_sentiment"
                )
            )

            # Source sentiment percentages are not necessarily
            # the same scale as VADER compound scores.
            sentiment_score = None

            sentiment_stats = clean(
                get_column(
                    row,
                    "sentiment_stats",
                    "sentiment_score"
                )
            )

            if sentiment_stats:
                try:
                    if sentiment_stats.startswith("{"):
                        stats = json.loads(
                            sentiment_stats.replace("'", '"')
                        )
                        positive = float(
                            stats.get("positive", 0)
                        )
                        negative = float(
                            stats.get("negative", 0)
                        )

                        sentiment_score = (
                            positive - negative
                        ) / 100.0
                    else:
                        sentiment_score = float(
                            sentiment_stats
                        )
                except (ValueError, TypeError, json.JSONDecodeError):
                    sentiment_score = None

            document = {
                "category": category,
                "headline": headline,
                "authors": clean(
                    get_column(
                        row,
                        "creator",
                        "authors",
                        "author"
                    )
                ),
                "link": link,
                "short_description": description,
                "date": date,
                "sentiment": sentiment,
                "source": "NewsData.io"
            }

            if sentiment_score is not None:
                document["sentiment_score"] = sentiment_score

            # Insert only new URLs; existing articles are unchanged.
            operations.append(
                UpdateOne(
                    {"link": link},
                    {"$setOnInsert": document},
                    upsert=True
                )
            )

        if operations:

            result = articles.bulk_write(
                operations,
                ordered=False
            )

            inserted += result.upserted_count

        batch_number += 1

        print(
            f"Batch {batch_number} | "
            f"Read: {total_read:,} | "
            f"Newly inserted: {inserted:,}"
        )

    print("\n======================================")
    print("2026 NEWS IMPORT FINISHED")
    print("======================================")
    print(f"Rows read:          {total_read:,}")
    print(f"New articles added: {inserted:,}")
    print(f"Invalid rows:       {skipped_invalid:,}")
    print(f"Non-2026/invalid dates skipped: {invalid_dates:,}")
    print(
        "Total articles now:",
        f"{articles.count_documents({}):,}"
    )
    print("======================================")

finally:
    client.close()
    print("MongoDB connection closed.")
