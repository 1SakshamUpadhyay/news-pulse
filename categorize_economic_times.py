import os
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(os.path.join(BASE_DIR, ".env"))

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")


DATABASE_NAME = "NewsPulse"
COLLECTION_NAME = "articles"

SOURCE_NAME = "Economic Times"

TARGET_CATEGORIZED = 149000

BATCH_SIZE = 5000


# ============================================================
# MONGODB CONNECTION
# ============================================================

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=180000
)

db = client[DATABASE_NAME]
articles = db[COLLECTION_NAME]

print("Connected to MongoDB Atlas")
print("Database:", DATABASE_NAME)
print("Collection:", COLLECTION_NAME)


# ============================================================
# CATEGORY RULES
# ============================================================

RULES = {

    "POLITICS": [
        "election", "politics", "political", "government",
        "minister", "prime minister", "chief minister",
        "parliament", "lok sabha", "rajya sabha",
        "bjp", "congress", "aap", "politician",
        "vote", "voting", "poll", "assembly",
        "president", "governor", "cabinet",
        "opposition", "mla", "mp"
    ],

    "TECH": [
        "technology", "tech", "artificial intelligence",
        "software", "startup", "startups", "digital",
        "internet", "cyber", "smartphone", "iphone",
        "android", "google", "microsoft", "apple",
        "meta", "amazon", "semiconductor", "chip",
        "robot", "robotics", "cloud computing",
        "gadget", "5g", "6g"
    ],

    "SPORTS": [
        "cricket", "football", "tennis", "hockey",
        "badminton", "olympics", "sports", "ipl",
        "world cup", "match", "player", "players",
        "athlete", "championship", "fifa",
        "formula 1", "wrestling", "kabaddi",
        "tournament"
    ],

    "ENTERTAINMENT": [
        "movie", "movies", "film", "films", "actor",
        "actress", "bollywood", "cinema", "music",
        "singer", "celebrity", "entertainment",
        "web series", "netflix", "ott",
        "television", "tv show", "director",
        "box office"
    ],

    "HEALTHY LIVING": [
        "health", "healthcare", "hospital", "doctor",
        "medical", "medicine", "disease", "cancer",
        "covid", "fitness", "wellness", "diet",
        "nutrition", "mental health", "therapy",
        "vaccine", "vaccination", "patients",
        "treatment"
    ],

    "TRAVEL": [
        "travel", "tourism", "tourist", "flight",
        "flights", "hotel", "hotels", "airport",
        "holiday", "holidays", "destination",
        "vacation", "tour", "visa", "airline"
    ],

    "SCIENCE": [
        "science", "scientist", "scientists", "research",
        "space", "isro", "nasa", "satellite",
        "astronomy", "physics", "biology", "chemistry",
        "discovery", "experiment"
    ],

    "EDUCATION": [
        "education", "school", "schools", "college",
        "colleges", "university", "universities",
        "student", "students", "exam", "exams",
        "iit", "neet", "jee", "academic",
        "degree", "campus", "teacher", "teachers",
        "learning"
    ],

    "MONEY": [
        "bank", "banks", "banking", "loan", "loans",
        "finance", "financial", "rupee", "rbi",
        "interest rate", "tax", "taxes",
        "income tax", "mutual fund", "mutual funds",
        "stock", "stocks", "shares", "sensex",
        "nifty", "ipo", "investment", "investor",
        "investors", "insurance", "cryptocurrency",
        "crypto", "gold", "forex"
    ],

    "BUSINESS": [
        "business", "company", "companies", "corporate",
        "corporation", "industry", "industries",
        "revenue", "profit", "profits", "funding",
        "merger", "mergers", "acquisition",
        "acquisitions", "manufacturing", "economy",
        "economic", "trade", "exports", "imports",
        "market", "markets", "enterprise", "retail",
        "automobile", "automotive", "real estate",
        "infrastructure"
    ],

    "FOOD & DRINK": [
        "food", "restaurant", "restaurants", "recipe",
        "recipes", "cooking", "cuisine", "dining",
        "chef", "drink", "drinks", "coffee", "tea"
    ],

    "STYLE & BEAUTY": [
        "fashion", "beauty", "makeup", "skincare",
        "clothing", "dress", "designer", "model",
        "style", "luxury", "jewellery", "jewelry"
    ],

    "HOME & LIVING": [
        "home", "house", "housing", "interior",
        "interiors", "furniture", "decor",
        "decoration", "property"
    ],

    "WOMEN": [
        "women", "woman", "female", "women's"
    ],

    "PARENTING": [
        "parenting", "parent", "parents", "mother",
        "mothers", "father", "fathers", "child",
        "children", "baby", "babies", "pregnancy",
        "pregnant"
    ],

    "CRIME": [
        "crime", "criminal", "police", "murder",
        "murdered", "arrest", "arrested", "fraud",
        "scam", "scandal", "court", "jail",
        "prison", "theft", "robbery", "investigation"
    ],

    "ENVIRONMENT": [
        "environment", "climate", "pollution",
        "weather", "global warming", "carbon",
        "emission", "emissions", "renewable energy",
        "solar energy", "green energy",
        "sustainability", "sustainable",
        "forest", "forests"
    ],

    "GREEN": [
        "green", "renewable", "clean energy",
        "solar", "wind energy", "electric vehicle",
        "electric vehicles"
    ],

    "RELIGION": [
        "religion", "religious", "temple", "church",
        "mosque", "hindu", "muslim", "christian",
        "islam", "festival", "spiritual"
    ],

    "ARTS & CULTURE": [
        "culture", "cultural", "heritage", "art",
        "arts", "artist", "artists", "museum",
        "literature", "literary"
    ],

    "MEDIA": [
        "media", "journalist", "journalists",
        "newspaper", "news channel", "broadcast",
        "editor"
    ],

    "COMEDY": [
        "comedy", "comedian", "humour", "humor",
        "satire"
    ],

    "DIVORCE": [
        "divorce", "divorced", "separation",
        "marriage breakdown"
    ],

    "WEDDINGS": [
        "wedding", "weddings", "marriage",
        "bride", "groom"
    ],

    "WORLD NEWS": [
        "international", "global", "foreign",
        "ukraine", "russia", "china",
        "america", "united states", "europe"
    ]
}


# ============================================================
# CATEGORY DETECTION
# ============================================================

def detect_category(headline, link):

    text = (
        (headline or "") +
        " " +
        (link or "")
    ).lower()

    scores = {}

    for category, keywords in RULES.items():

        score = 0

        for keyword in keywords:

            if keyword in text:

                if " " in keyword:
                    score += 3
                else:
                    score += 1

        if score > 0:
            scores[category] = score

    if scores:
        return max(scores, key=scores.get)

    # Economic Times is primarily business/economics,
    # so use BUSINESS as fallback instead of INDIA NEWS.
    return "BUSINESS"


# ============================================================
# CHECK CURRENT PROGRESS
# ============================================================

already_categorized = articles.count_documents(
    {
        "source": SOURCE_NAME,
        "category": {
            "$ne": "INDIA NEWS"
        }
    }
)

print()
print("Already categorized ET articles:", f"{already_categorized:,}")

remaining_target = TARGET_CATEGORIZED - already_categorized

if remaining_target <= 0:

    print()
    print("Target of 149,000 categorized ET articles already reached.")
    client.close()
    exit()


print(
    "Still need to categorize:",
    f"{remaining_target:,}"
)


# ============================================================
# PROCESS ONLY INDIA NEWS ARTICLES
# ============================================================

cursor = articles.find(
    {
        "source": SOURCE_NAME,
        "category": "INDIA NEWS"
    },
    {
        "_id": 1,
        "headline": 1,
        "link": 1
    }
)


operations = []

processed = 0
updated = 0


# ============================================================
# PROCESS IN LARGE BATCHES
# ============================================================

for article in cursor:

    if updated >= remaining_target:
        break

    processed += 1

    category = detect_category(
        article.get("headline", ""),
        article.get("link", "")
    )

    operations.append(
        UpdateOne(
            {
                "_id": article["_id"],
                "category": "INDIA NEWS"
            },
            {
                "$set": {
                    "category": category
                }
            }
        )
    )

    if len(operations) >= BATCH_SIZE:

        result = articles.bulk_write(
            operations,
            ordered=False
        )

        updated += result.modified_count

        operations = []

        print(
            f"Processed: {processed:,} | "
            f"Newly categorized: {updated:,} | "
            f"Total categorized: "
            f"{already_categorized + updated:,}"
        )


# ============================================================
# FINAL BATCH
# ============================================================

if operations:

    result = articles.bulk_write(
        operations,
        ordered=False
    )

    updated += result.modified_count


# ============================================================
# FINAL STATUS
# ============================================================

total_categorized = already_categorized + updated

remaining_india_news = articles.count_documents(
    {
        "source": SOURCE_NAME,
        "category": "INDIA NEWS"
    }
)

print()
print("============================================")
print("CATEGORIZATION COMPLETED")
print("============================================")

print(
    "Previously categorized:",
    f"{already_categorized:,}"
)

print(
    "Newly categorized:",
    f"{updated:,}"
)

print(
    "Total categorized:",
    f"{total_categorized:,}"
)

print(
    "ET still INDIA NEWS:",
    f"{remaining_india_news:,}"
)

print("============================================")


client.close()

print("MongoDB connection closed.")