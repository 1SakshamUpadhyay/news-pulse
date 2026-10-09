import csv
import os
import multiprocessing
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime

from pymongo import MongoClient
from dotenv import load_dotenv
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


# ============================================================
# PATH
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_FILES = [
    "economic_times_headlines_2022.csv",
    "economic_times_headlines_2023.csv",
    "economic_times_headlines_2024.csv",
    "economic_times_headlines_2025.csv",
]

BATCH_SIZE = 5000


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv(os.path.join(BASE_DIR, ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")


# ============================================================
# WORKER SENTIMENT ANALYZER
# ============================================================

analyzer = None


def initialize_worker():
    global analyzer
    analyzer = SentimentIntensityAnalyzer()


def analyze_headlines(headlines):
    global analyzer

    results = []

    for headline in headlines:

        scores = analyzer.polarity_scores(headline)
        compound = scores["compound"]

        if compound >= 0.05:
            sentiment = "positive"
        elif compound <= -0.05:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        results.append(
            (sentiment, compound)
        )

    return results


# ============================================================
# DATE CONVERSION
# ============================================================

def convert_date(date_string):

    try:

        date_obj = datetime.strptime(
            date_string.strip(),
            "%d-%m-%Y"
        )

        return date_obj.strftime("%Y-%m-%d")

    except ValueError:

        return date_string.strip()


# ============================================================
# PROCESS ONE CSV FILE
# ============================================================

def process_file(
    csv_file,
    articles,
    existing_links,
    pool
):

    file_path = os.path.join(BASE_DIR, csv_file)

    print("\n========================================")
    print(f"Processing: {csv_file}")
    print("========================================")

    if not os.path.exists(file_path):

        print(f"File not found: {csv_file}")
        return 0, 0, 0

    total_read = 0
    total_inserted = 0
    total_skipped = 0

    rows_batch = []
    headlines_batch = []

    with open(
        file_path,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            total_read += 1

            headline = (
                row.get("Headline") or ""
            ).strip()

            link = (
                row.get("Headline link") or ""
            ).strip()

            date = (
                row.get("Date") or ""
            ).strip()

            if not headline or not link or not date:

                total_skipped += 1
                continue

            # Skip records already imported
            if link in existing_links:

                total_skipped += 1
                continue

            rows_batch.append(
                {
                    "headline": headline,
                    "link": link,
                    "date": convert_date(date)
                }
            )

            headlines_batch.append(headline)

            # Process a large batch
            if len(rows_batch) >= BATCH_SIZE:

                inserted = process_batch(
                    rows_batch,
                    headlines_batch,
                    articles,
                    pool,
                    existing_links
                )

                total_inserted += inserted

                print(
                    f"Rows read: {total_read:,} | "
                    f"Inserted: {total_inserted:,} | "
                    f"Skipped: {total_skipped:,}"
                )

                rows_batch = []
                headlines_batch = []

    # Process remaining records
    if rows_batch:

        inserted = process_batch(
            rows_batch,
            headlines_batch,
            articles,
            pool,
            existing_links
        )

        total_inserted += inserted

    print("\nFinished:", csv_file)
    print(f"Rows read:       {total_read:,}")
    print(f"Newly inserted:  {total_inserted:,}")
    print(f"Skipped:         {total_skipped:,}")

    return (
        total_read,
        total_inserted,
        total_skipped
    )


# ============================================================
# PROCESS BATCH
# ============================================================

def process_batch(
    rows,
    headlines,
    articles,
    pool,
    existing_links
):

    # Run sentiment analysis in parallel
    sentiment_results = pool.submit(
        analyze_headlines,
        headlines
    ).result()

    documents = []

    for row, sentiment_result in zip(
        rows,
        sentiment_results
    ):

        sentiment, sentiment_score = sentiment_result

        document = {
            "category": "INDIA NEWS",
            "headline": row["headline"],
            "authors": "",
            "link": row["link"],
            "short_description": "",
            "date": row["date"],
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "source": "Economic Times"
        }

        documents.append(document)

    if not documents:
        return 0

    # Insert the whole batch at once
    result = articles.insert_many(
        documents,
        ordered=False
    )

    inserted_count = len(
        result.inserted_ids
    )

    # Remember newly inserted links
    for document in documents:
        existing_links.add(
            document["link"]
        )

    return inserted_count


# ============================================================
# MAIN
# ============================================================

def main():

    print("========================================")
    print("NewsPulse - Economic Times Import")
    print("========================================")

    # --------------------------------------------------------
    # MongoDB
    # --------------------------------------------------------

    client = MongoClient(
        MONGODB_URI,
        maxPoolSize=20
    )

    db = client["NewsPulse"]
    articles = db["articles"]

    print("\nConnected to MongoDB Atlas")
    print("Database: NewsPulse")
    print("Collection: articles")

    # --------------------------------------------------------
    # Get already imported Economic Times links
    # --------------------------------------------------------

    print("\nChecking existing Economic Times records...")

    existing_links = set()

    cursor = articles.find(
        {
            "source": "Economic Times"
        },
        {
            "_id": 0,
            "link": 1
        }
    )

    for document in cursor:

        link = document.get("link")

        if link:
            existing_links.add(link)

    print(
        f"Existing Economic Times articles: "
        f"{len(existing_links):,}"
    )

    # --------------------------------------------------------
    # CPU workers
    # --------------------------------------------------------

    cpu_count = multiprocessing.cpu_count()

    workers = max(
        1,
        cpu_count - 1
    )

    print(
        f"CPU cores detected: {cpu_count}"
    )

    print(
        f"Sentiment workers: {workers}"
    )

    # --------------------------------------------------------
    # Process all CSV files
    # --------------------------------------------------------

    total_read = 0
    total_inserted = 0
    total_skipped = 0

    with ProcessPoolExecutor(
        max_workers=workers,
        initializer=initialize_worker
    ) as pool:

        for csv_file in CSV_FILES:

            read_count, inserted_count, skipped_count = (
                process_file(
                    csv_file,
                    articles,
                    existing_links,
                    pool
                )
            )

            total_read += read_count
            total_inserted += inserted_count
            total_skipped += skipped_count

    # --------------------------------------------------------
    # Final result
    # --------------------------------------------------------

    final_count = articles.count_documents({})

    print("\n========================================")
    print("Economic Times import completed")
    print("========================================")

    print(
        f"Total rows read:      {total_read:,}"
    )

    print(
        f"Total newly inserted: {total_inserted:,}"
    )

    print(
        f"Total skipped:        {total_skipped:,}"
    )

    print(
        f"Total documents now:  {final_count:,}"
    )

    client.close()

    print("\nMongoDB connection closed.")


# ============================================================
# WINDOWS ENTRY POINT
# ============================================================

if __name__ == "__main__":

    multiprocessing.freeze_support()

    main()