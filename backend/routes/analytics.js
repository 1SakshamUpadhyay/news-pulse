const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const articles = mongoose.connection.collection("articles");


// ======================================================
// 1. CATEGORY-WISE ARTICLES
// ======================================================

router.get("/categories", async (req, res) => {
    try {
        const result = await articles.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    totalArticles: -1
                }
            }
        ]).toArray();

        res.json(result);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// 2. YEAR-WISE ARTICLES
// ======================================================

router.get("/years", async (req, res) => {
    try {
        const result = await articles.aggregate([
            {
                $group: {
                    _id: {
                        $substr: ["$date", 0, 4]
                    },
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]).toArray();

        res.json(result);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// 3. SENTIMENT DISTRIBUTION
// ======================================================

router.get("/sentiment", async (req, res) => {
    try {
        const result = await articles.aggregate([
            {
                $group: {
                    _id: "$sentiment",
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    totalArticles: -1
                }
            }
        ]).toArray();

        res.json(result);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// 4. CATEGORY-WISE SENTIMENT
// ======================================================

router.get("/category-sentiment", async (req, res) => {
    try {
        const result = await articles.aggregate([
            {
                $group: {
                    _id: {
                        category: "$category",
                        sentiment: "$sentiment"
                    },
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    "_id.category": 1,
                    totalArticles: -1
                }
            }
        ]).toArray();

        res.json(result);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// 5. CATEGORY TRENDS BY YEAR
// ======================================================

router.get("/category-trends", async (req, res) => {
    try {
        const result = await articles.aggregate([
            {
                $group: {
                    _id: {
                        year: {
                            $substr: ["$date", 0, 4]
                        },
                        category: "$category"
                    },
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    totalArticles: -1
                }
            }
        ]).toArray();

        res.json(result);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// 6. TOP 10 NEWS CATEGORIES
// ======================================================

router.get("/top-categories", async (req, res) => {
    try {
        const result = await articles.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    totalArticles: -1
                }
            },
            {
                $limit: 10
            }
        ]).toArray();

        res.json(result);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// 7. DASHBOARD - ALL MAIN ANALYTICS
// ======================================================

router.get("/dashboard", async (req, res) => {
    try {

        const totalArticles = await articles.countDocuments();

        const categories = await articles.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    totalArticles: -1
                }
            }
        ]).toArray();


        const years = await articles.aggregate([
            {
                $group: {
                    _id: {
                        $substr: ["$date", 0, 4]
                    },
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]).toArray();


        const sentiment = await articles.aggregate([
            {
                $group: {
                    _id: "$sentiment",
                    totalArticles: { $sum: 1 }
                }
            }
        ]).toArray();


        const categorySentiment = await articles.aggregate([
            {
                $group: {
                    _id: {
                        category: "$category",
                        sentiment: "$sentiment"
                    },
                    totalArticles: { $sum: 1 }
                }
            }
        ]).toArray();


        const categoryTrends = await articles.aggregate([
            {
                $group: {
                    _id: {
                        year: {
                            $substr: ["$date", 0, 4]
                        },
                        category: "$category"
                    },
                    totalArticles: { $sum: 1 }
                }
            },
            {
                $sort: {
                    "_id.year": 1
                }
            }
        ]).toArray();


        res.json({
            totalArticles,
            categories,
            years,
            sentiment,
            categorySentiment,
            categoryTrends
        });

    } catch (error) {
        console.error("Dashboard error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// 8. NEWS SEARCH + FILTER
// ======================================================

router.get("/search", async (req, res) => {
    try {

        const {
            search = "",
            category = "",
            sentiment = "",
            year = ""
        } = req.query;


        const filter = {};


        // Search headline + description

        if (search.trim() !== "") {

            filter.$or = [
                {
                    headline: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                },
                {
                    short_description: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                }
            ];
        }


        // Category filter
        // Frontend sends "All"

        if (
            category.trim() !== "" &&
            category !== "All"
        ) {
            filter.category = category;
        }


        // Sentiment filter
        // Frontend sends "All"

        if (
            sentiment.trim() !== "" &&
            sentiment !== "All"
        ) {
            filter.sentiment = sentiment.toLowerCase();
        }


        // Year filter
        // Frontend sends "All"

        if (
            year.trim() !== "" &&
            year !== "All"
        ) {
            filter.date = {
                $regex: `^${year}`
            };
        }


        const total = await articles.countDocuments(filter);


        const result = await articles
            .find(filter)
            .sort({
                date: -1
            })
            .limit(50)
            .toArray();


        res.json({
            total,
            articles: result
        });

    } catch (error) {

        console.error("Search error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// 9. TRENDING KEYWORDS
// ======================================================

router.get("/trending-keywords", async (req, res) => {
    try {

        const result = await articles.aggregate([

            // Combine headline and description

            {
                $project: {
                    words: {
                        $split: [
                            {
                                $toLower: {
                                    $concat: [
                                        {
                                            $ifNull: [
                                                "$headline",
                                                ""
                                            ]
                                        },
                                        " ",
                                        {
                                            $ifNull: [
                                                "$short_description",
                                                ""
                                            ]
                                        }
                                    ]
                                }
                            },
                            " "
                        ]
                    }
                }
            },


            // Separate every word

            {
                $unwind: "$words"
            },


            // Keep alphabetic words with 4+ characters

            {
                $match: {
                    words: {
                        $regex: "^[a-zA-Z]{4,}$"
                    }
                }
            },


            // Remove common words

            {
                $match: {
                    words: {
                        $nin: [
                            "this",
                            "that",
                            "with",
                            "from",
                            "have",
                            "they",
                            "their",
                            "there",
                            "about",
                            "which",
                            "would",
                            "could",
                            "should",
                            "after",
                            "before",
                            "while",
                            "where",
                            "when",
                            "what",
                            "were",
                            "been",
                            "will",
                            "more",
                            "than",
                            "into",
                            "your",
                            "just",
                            "over",
                            "also",
                            "some",
                            "other",
                            "news",
                            "said",
                            "says"
                        ]
                    }
                }
            },


            // Count occurrences

            {
                $group: {
                    _id: "$words",
                    count: {
                        $sum: 1
                    }
                }
            },


            // Highest frequency first

            {
                $sort: {
                    count: -1
                }
            },


            // Top 15

            {
                $limit: 15
            }

        ]).toArray();


        res.json(result);

    } catch (error) {

        console.error(
            "Trending keywords error:",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
});


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;