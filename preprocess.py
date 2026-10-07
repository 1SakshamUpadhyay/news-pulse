import json

input_file = "News_Category_Dataset_v3.json"
output_file = "news_cleaned.json"

seen_links = set()
cleaned_count = 0
duplicate_count = 0

with open(input_file, "r", encoding="utf-8") as f, \
     open(output_file, "w", encoding="utf-8") as out:

    for line in f:
        article = json.loads(line)

        if article["link"] in seen_links:
            duplicate_count += 1
            continue

        seen_links.add(article["link"])

        article["headline"] = article.get("headline", "").strip()
        article["short_description"] = article.get("short_description", "").strip()
        article["authors"] = article.get("authors", "").strip()

        out.write(json.dumps(article) + "\n")
        cleaned_count += 1

print("Original articles:", cleaned_count + duplicate_count)
print("Cleaned articles:", cleaned_count)
print("Duplicates removed:", duplicate_count)
print("Output:", output_file)