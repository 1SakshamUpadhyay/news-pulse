import { useEffect, useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import "./App.css";


const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";


const SENTIMENT_COLORS = {
    positive: "#22c55e",
    neutral: "#fbbf24",
    negative: "#ef4444"
};


function App() {

    // =====================================================
    // STATE
    // =====================================================

    const [data, setData] = useState(null);
    const [trendingKeywords, setTrendingKeywords] = useState([]);

    const [error, setError] = useState("");

    const [searchText, setSearchText] = useState("");

    const [selectedCategory, setSelectedCategory] =
        useState("All");

    const [selectedSentiment, setSelectedSentiment] =
        useState("All");

    const [selectedYear, setSelectedYear] =
        useState("All");

    const [searchResults, setSearchResults] = useState([]);

    const [searching, setSearching] = useState(false);

    const [searchPerformed, setSearchPerformed] =
        useState(false);


    // =====================================================
    // LOAD DASHBOARD DATA
    // =====================================================

    useEffect(() => {

        const loadData = async () => {

            try {

                const [
                    dashboardResponse,
                    trendingResponse
                ] = await Promise.all([

                    axios.get(
                        `${API_URL}/api/analytics/dashboard`
                    ),

                    axios.get(
                        `${API_URL}/api/analytics/trending-keywords`
                    )

                ]);


                setData(dashboardResponse.data);

                setTrendingKeywords(
                    trendingResponse.data
                );

            } catch (error) {

                console.error(
                    "NewsPulse API error:",
                    error
                );

                setError(
                    "Failed to load NewsPulse data"
                );

            }

        };


        loadData();

    }, []);


    // =====================================================
    // SEARCH
    // =====================================================

    const handleSearch = async () => {

        try {

            setSearching(true);
            setSearchPerformed(true);

            const response = await axios.get(
                `${API_URL}/api/analytics/search`,
                {
                    params: {
                        search: searchText,
                        category: selectedCategory,
                        sentiment: selectedSentiment,
                        year: selectedYear
                    }
                }
            );


            setSearchResults(
                response.data.articles || []
            );

        } catch (error) {

            console.error(
                "Search error:",
                error
            );

            setSearchResults([]);

        } finally {

            setSearching(false);

        }

    };


    // =====================================================
    // RESET SEARCH
    // =====================================================

    const handleReset = () => {

        setSearchText("");

        setSelectedCategory("All");

        setSelectedSentiment("All");

        setSelectedYear("All");

        setSearchResults([]);

        setSearchPerformed(false);

    };


    // =====================================================
    // NAVIGATION
    // =====================================================

    const scrollToDashboard = () => {

        document
            .getElementById("dashboard-section")
            ?.scrollIntoView({
                behavior: "smooth"
            });

    };


    const scrollToExplorer = () => {

        document
            .getElementById("news-explorer")
            ?.scrollIntoView({
                behavior: "smooth"
            });

    };


    // =====================================================
    // LOADING
    // =====================================================

    if (error) {

        return (
            <div className="error-page">

                <div className="error-icon">
                    ⚠️
                </div>

                <h2>
                    {error}
                </h2>

                <p>
                    Make sure the NewsPulse backend is running
                    on port 5000.
                </p>

            </div>
        );

    }


    if (!data) {

        return (
            <div className="loading-page">

                <div className="loading-spinner"></div>

                <h2>
                    Loading NewsPulse...
                </h2>

            </div>
        );

    }


    // =====================================================
    // KPI DATA
    // =====================================================

    const totalArticles =
        data.totalArticles || 0;


    const totalCategories =
        data.categories?.length || 0;


    const totalYears =
        data.years?.length || 0;


    const positive =
        data.sentiment?.find(
            item => item._id === "positive"
        )?.totalArticles || 0;


    const neutral =
        data.sentiment?.find(
            item => item._id === "neutral"
        )?.totalArticles || 0;


    const negative =
        data.sentiment?.find(
            item => item._id === "negative"
        )?.totalArticles || 0;


    // =====================================================
    // TOP 10 CATEGORIES
    // =====================================================

    const topCategories =
        (data.categories || []).slice(0, 10);


    const topCategoryNames =
        topCategories.map(
            item => item._id
        );


    const topCategoryCounts =
        topCategories.map(
            item => item.totalArticles
        );


    // =====================================================
    // YEAR DATA
    // =====================================================

    const years =
        (data.years || []).map(
            item => item._id
        );


    const yearCounts =
        (data.years || []).map(
            item => item.totalArticles
        );


    // =====================================================
    // CATEGORY SENTIMENT
    // =====================================================

    const sentimentMap = {};


    (data.categorySentiment || []).forEach(
        item => {

            const category =
                item._id.category;

            const sentiment =
                item._id.sentiment;


            if (!sentimentMap[category]) {

                sentimentMap[category] = {
                    positive: 0,
                    neutral: 0,
                    negative: 0
                };

            }


            sentimentMap[category][sentiment] =
                item.totalArticles;

        }
    );


    const categoryPositive =
        topCategoryNames.map(
            category =>
                sentimentMap[category]?.positive || 0
        );


    const categoryNeutral =
        topCategoryNames.map(
            category =>
                sentimentMap[category]?.neutral || 0
        );


    const categoryNegative =
        topCategoryNames.map(
            category =>
                sentimentMap[category]?.negative || 0
        );


    // =====================================================
    // CATEGORY TRENDS
    // =====================================================

    const topFiveCategories =
        (data.categories || [])
            .slice(0, 5)
            .map(item => item._id);


    const trendMap = {};


    (data.categoryTrends || []).forEach(
        item => {

            const year =
                item._id.year;

            const category =
                item._id.category;


            if (!trendMap[category]) {

                trendMap[category] = {};

            }


            trendMap[category][year] =
                item.totalArticles;

        }
    );


    const trendTraces =
        topFiveCategories.map(
            category => ({

                x: years,

                y: years.map(
                    year =>
                        trendMap[category]?.[year] || 0
                ),

                type: "scatter",

                mode: "lines+markers",

                name: category,

                line: {
                    width: 3
                },

                marker: {
                    size: 7
                },

                hovertemplate:
                    `<b>${category}</b>` +
                    `<br>Year: %{x}` +
                    `<br>Articles: %{y:,}` +
                    `<extra></extra>`

            })
        );


    // =====================================================
    // TRENDING KEYWORDS
    // =====================================================

    const keywordNames =
        trendingKeywords.map(
            item => item._id
        );


    const keywordCounts =
        trendingKeywords.map(
            item => item.count
        );


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="dashboard">


            {/* =================================================
                HEADER
            ================================================= */}

            <header className="top-header">

                <div className="brand">

                    <div className="brand-icon">
                        📰
                    </div>

                    <div>

                        <h1>
                            NewsPulse
                        </h1>

                        <p>
                            News Analytics & Trend Detection
                        </p>

                    </div>

                </div>


                <nav className="navigation">

                    <button
                        className="nav-button active"
                        onClick={scrollToDashboard}
                    >
                        Dashboard
                    </button>

                    <button
                        className="nav-button"
                        onClick={scrollToExplorer}
                    >
                        News Explorer
                    </button>

                </nav>

            </header>


            <main>


                {/* =================================================
                    HERO
                ================================================= */}

                <section className="hero">

                    <div className="hero-content">

                        <div className="hero-label">
                            BIG DATA NEWS ANALYTICS
                        </div>

                        <h2>
                            Understand the News.
                            <br />
                            Discover the Trends.
                        </h2>

                        <p>
                            Explore large-scale news data,
                            sentiment patterns, categories
                            and emerging topics.
                        </p>

                    </div>


                    <div className="hero-stat">

                        <span>
                            ARTICLES ANALYZED
                        </span>

                        <strong>
                            {totalArticles.toLocaleString()}
                        </strong>

                    </div>

                </section>


                {/* =================================================
                    NEWS EXPLORER
                ================================================= */}

                <section
                    id="news-explorer"
                    className="news-explorer"
                >

                    <div className="section-heading">

                        <div>

                            <div className="section-label">
                                EXPLORE
                            </div>

                            <h2>
                                News Explorer
                            </h2>

                        </div>

                        <p>
                            Search and filter articles from
                            the NewsPulse dataset.
                        </p>

                    </div>


                    {/* SEARCH */}

                    <div className="search-box">

                        <div className="search-input-wrapper">

                            <span className="search-icon">
                                🔍
                            </span>

                            <input
                                type="text"
                                placeholder="Search headline or description..."
                                value={searchText}
                                onChange={
                                    e =>
                                        setSearchText(
                                            e.target.value
                                        )
                                }
                                onKeyDown={
                                    e => {

                                        if (
                                            e.key === "Enter"
                                        ) {
                                            handleSearch();
                                        }

                                    }
                                }
                            />

                        </div>


                        <button
                            className="search-button"
                            onClick={handleSearch}
                            disabled={searching}
                        >
                            {searching
                                ? "Searching..."
                                : "Search"
                            }
                        </button>

                    </div>


                    {/* FILTERS */}

                    <div className="filters">


                        <select
                            value={selectedCategory}
                            onChange={
                                e =>
                                    setSelectedCategory(
                                        e.target.value
                                    )
                            }
                        >

                            <option value="All">
                                All Categories
                            </option>

                            {(
                                data.categories || []
                            ).map(category => (

                                <option
                                    key={category._id}
                                    value={category._id}
                                >
                                    {category._id}
                                </option>

                            ))}

                        </select>


                        <select
                            value={selectedYear}
                            onChange={
                                e =>
                                    setSelectedYear(
                                        e.target.value
                                    )
                            }
                        >

                            <option value="All">
                                All Years
                            </option>

                            {years.map(year => (

                                <option
                                    key={year}
                                    value={year}
                                >
                                    {year}
                                </option>

                            ))}

                        </select>


                        <select
                            value={selectedSentiment}
                            onChange={
                                e =>
                                    setSelectedSentiment(
                                        e.target.value
                                    )
                            }
                        >

                            <option value="All">
                                All Sentiments
                            </option>

                            <option value="positive">
                                Positive
                            </option>

                            <option value="neutral">
                                Neutral
                            </option>

                            <option value="negative">
                                Negative
                            </option>

                        </select>


                        <button
                            className="reset-button"
                            onClick={handleReset}
                        >
                            Reset
                        </button>

                    </div>


                    {/* SEARCH STATUS */}

                    {searching && (

                        <div className="search-status">
                            Searching the NewsPulse dataset...
                        </div>

                    )}


                    {/* SEARCH RESULTS */}

                    {searchPerformed && !searching && (

                        <div className="results-section">

                            <div className="results-heading">

                                <h3>
                                    Search Results
                                </h3>

                                <span>
                                    {searchResults.length}
                                    {" "}
                                    articles found
                                </span>

                            </div>


                            {searchResults.length > 0 ? (

                                <div className="results-grid">

                                    {searchResults.map(
                                        (article, index) => (

                                            <article
                                                className="article-card"
                                                key={
                                                    article._id ||
                                                    index
                                                }
                                            >

                                                <div className="article-meta">

                                                    <span className="category-tag">
                                                        {article.category}
                                                    </span>

                                                    <span
                                                        className={
                                                            `sentiment-tag ${
                                                                article.sentiment ||
                                                                "neutral"
                                                            }`
                                                        }
                                                    >
                                                        {
                                                            article.sentiment
                                                        }
                                                    </span>

                                                    <span className="date-tag">
                                                        {article.date}
                                                    </span>

                                                </div>


                                                <h3>
                                                    {
                                                        article.headline ||
                                                        "No headline available"
                                                    }
                                                </h3>


                                                <p>
                                                    {
                                                        article.short_description ||
                                                        "No description available."
                                                    }
                                                </p>


                                                {article.authors && (

                                                    <small>
                                                        Author:
                                                        {" "}
                                                        {article.authors}
                                                    </small>

                                                )}


                                                {article.link && (

                                                    <a
                                                        href={
                                                            article.link
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Read Article →
                                                    </a>

                                                )}

                                            </article>

                                        )
                                    )}

                                </div>

                            ) : (

                                <div className="no-results">

                                    No articles found
                                    matching your search.

                                </div>

                            )}

                        </div>

                    )}

                </section>


                {/* =================================================
                    DASHBOARD
                ================================================= */}

                <section
                    id="dashboard-section"
                    className="dashboard-section"
                >

                    <div className="section-heading dashboard-heading">

                        <div>

                            <div className="section-label">
                                ANALYTICS
                            </div>

                            <h2>
                                Dashboard Overview
                            </h2>

                        </div>

                        <p>
                            Insights generated from the
                            NewsPulse MongoDB dataset.
                        </p>

                    </div>


                    {/* =================================================
                        KPI CARDS
                    ================================================= */}

                    <div className="cards">


                        <div className="card">

                            <div className="card-icon blue">
                                📰
                            </div>

                            <div className="card-content">

                                <span>
                                    Total Articles
                                </span>

                                <strong>
                                    {totalArticles.toLocaleString()}
                                </strong>

                            </div>

                        </div>


                        <div className="card">

                            <div className="card-icon blue">
                                🏷️
                            </div>

                            <div className="card-content">

                                <span>
                                    Categories
                                </span>

                                <strong>
                                    {totalCategories}
                                </strong>

                            </div>

                        </div>


                        <div className="card">

                            <div className="card-icon blue">
                                🗓️
                            </div>

                            <div className="card-content">

                                <span>
                                    Years
                                </span>

                                <strong>
                                    {totalYears}
                                </strong>

                            </div>

                        </div>


                        <div className="card positive">

                            <div className="card-icon green">
                                😊
                            </div>

                            <div className="card-content">

                                <span>
                                    Positive
                                </span>

                                <strong>
                                    {positive.toLocaleString()}
                                </strong>

                            </div>

                        </div>


                        <div className="card negative">

                            <div className="card-icon red">
                                😞
                            </div>

                            <div className="card-content">

                                <span>
                                    Negative
                                </span>

                                <strong>
                                    {negative.toLocaleString()}
                                </strong>

                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        MAIN CHARTS
                    ================================================= */}

                    <div className="charts-grid">


                        {/* TOP CATEGORIES */}

                        <div className="chart-card">

                            <div className="chart-title">

                                <div>

                                    <span>
                                        CATEGORY ANALYSIS
                                    </span>

                                    <h3>
                                        Top 10 News Categories
                                    </h3>

                                </div>

                            </div>


                            <Plot
                                data={[
                                    {
                                        x: topCategoryNames,
                                        y: topCategoryCounts,
                                        type: "bar",
                                        marker: {
                                            color: "#3b82f6"
                                        },
                                        hovertemplate:
                                            "<b>%{x}</b>" +
                                            "<br>Articles: %{y:,}" +
                                            "<extra></extra>"
                                    }
                                ]}
                                layout={{
                                    autosize: true,
                                    height: 410,
                                    margin: {
                                        l: 55,
                                        r: 20,
                                        t: 10,
                                        b: 105
                                    },
                                    paper_bgcolor: "white",
                                    plot_bgcolor: "white",
                                    font: {
                                        family:
                                            "Arial, Helvetica, sans-serif",
                                        color: "#172554"
                                    },
                                    xaxis: {
                                        tickangle: -45,
                                        gridcolor: "#e5edf5"
                                    },
                                    yaxis: {
                                        gridcolor: "#e5edf5",
                                        zeroline: false
                                    }
                                }}
                                config={{
                                    displayModeBar: false,
                                    responsive: true
                                }}
                                style={{
                                    width: "100%"
                                }}
                            />

                        </div>


                        {/* ARTICLES BY YEAR */}

                        <div className="chart-card">

                            <div className="chart-title">

                                <div>

                                    <span>
                                        TIME ANALYSIS
                                    </span>

                                    <h3>
                                        Articles by Year
                                    </h3>

                                </div>

                            </div>


                            <Plot
                                data={[
                                    {
                                        x: years,
                                        y: yearCounts,
                                        type: "scatter",
                                        mode: "lines+markers",
                                        line: {
                                            color: "#3b82f6",
                                            width: 4
                                        },
                                        marker: {
                                            color: "#06b6d4",
                                            size: 8
                                        },
                                        hovertemplate:
                                            "<b>Year: %{x}</b>" +
                                            "<br>Articles: %{y:,}" +
                                            "<extra></extra>"
                                    }
                                ]}
                                layout={{
                                    autosize: true,
                                    height: 410,
                                    margin: {
                                        l: 60,
                                        r: 20,
                                        t: 10,
                                        b: 65
                                    },
                                    paper_bgcolor: "white",
                                    plot_bgcolor: "white",
                                    font: {
                                        family:
                                            "Arial, Helvetica, sans-serif",
                                        color: "#172554"
                                    },
                                    xaxis: {
                                        gridcolor: "#e5edf5"
                                    },
                                    yaxis: {
                                        gridcolor: "#e5edf5",
                                        zeroline: false
                                    }
                                }}
                                config={{
                                    displayModeBar: false,
                                    responsive: true
                                }}
                                style={{
                                    width: "100%"
                                }}
                            />

                        </div>


                        {/* SENTIMENT DISTRIBUTION */}

                        <div className="chart-card">

                            <div className="chart-title">

                                <div>

                                    <span>
                                        SENTIMENT ANALYSIS
                                    </span>

                                    <h3>
                                        Sentiment Distribution
                                    </h3>

                                </div>

                            </div>


                            <Plot
                                data={[
                                    {
                                        labels: [
                                            "Positive",
                                            "Neutral",
                                            "Negative"
                                        ],
                                        values: [
                                            positive,
                                            neutral,
                                            negative
                                        ],
                                        type: "pie",
                                        hole: 0.58,
                                        marker: {
                                            colors: [
                                                SENTIMENT_COLORS.positive,
                                                SENTIMENT_COLORS.neutral,
                                                SENTIMENT_COLORS.negative
                                            ]
                                        },
                                        textinfo: "label+percent",
                                        textposition: "inside",
                                        hovertemplate:
                                            "<b>%{label}</b>" +
                                            "<br>Articles: %{value:,}" +
                                            "<br>Percentage: %{percent}" +
                                            "<extra></extra>"
                                    }
                                ]}
                                layout={{
                                    autosize: true,
                                    height: 430,
                                    margin: {
                                        l: 20,
                                        r: 20,
                                        t: 10,
                                        b: 75
                                    },
                                    paper_bgcolor: "white",
                                    showlegend: true,
                                    legend: {
                                        orientation: "h",
                                        x: 0.5,
                                        xanchor: "center",
                                        y: -0.05
                                    }
                                }}
                                config={{
                                    displayModeBar: false,
                                    responsive: true
                                }}
                                style={{
                                    width: "100%"
                                }}
                            />

                        </div>


                        {/* CATEGORY VS SENTIMENT */}

                        <div className="chart-card">

                            <div className="chart-title">

                                <div>

                                    <span>
                                        SENTIMENT BY CATEGORY
                                    </span>

                                    <h3>
                                        Category vs Sentiment
                                    </h3>

                                </div>

                            </div>


                            <Plot
                                data={[

                                    {
                                        x: topCategoryNames,
                                        y: categoryPositive,
                                        name: "Positive",
                                        type: "bar",
                                        marker: {
                                            color:
                                                SENTIMENT_COLORS.positive
                                        },
                                        hovertemplate:
                                            "<b>%{x}</b>" +
                                            "<br>Positive: %{y:,}" +
                                            "<extra></extra>"
                                    },

                                    {
                                        x: topCategoryNames,
                                        y: categoryNeutral,
                                        name: "Neutral",
                                        type: "bar",
                                        marker: {
                                            color:
                                                SENTIMENT_COLORS.neutral
                                        },
                                        hovertemplate:
                                            "<b>%{x}</b>" +
                                            "<br>Neutral: %{y:,}" +
                                            "<extra></extra>"
                                    },

                                    {
                                        x: topCategoryNames,
                                        y: categoryNegative,
                                        name: "Negative",
                                        type: "bar",
                                        marker: {
                                            color:
                                                SENTIMENT_COLORS.negative
                                        },
                                        hovertemplate:
                                            "<b>%{x}</b>" +
                                            "<br>Negative: %{y:,}" +
                                            "<extra></extra>"
                                    }

                                ]}
                                layout={{
                                    autosize: true,
                                    height: 430,
                                    barmode: "stack",
                                    margin: {
                                        l: 55,
                                        r: 20,
                                        t: 10,
                                        b: 125
                                    },
                                    paper_bgcolor: "white",
                                    plot_bgcolor: "white",
                                    font: {
                                        family:
                                            "Arial, Helvetica, sans-serif",
                                        color: "#172554"
                                    },
                                    xaxis: {
                                        tickangle: -45,
                                        gridcolor: "#e5edf5"
                                    },
                                    yaxis: {
                                        gridcolor: "#e5edf5",
                                        zeroline: false
                                    },
                                    legend: {
                                        orientation: "h",
                                        x: 0,
                                        y: -0.34
                                    }
                                }}
                                config={{
                                    displayModeBar: false,
                                    responsive: true
                                }}
                                style={{
                                    width: "100%"
                                }}
                            />

                        </div>

                    </div>


                    {/* =================================================
                        CATEGORY TRENDS
                    ================================================= */}

                    <div className="full-chart-card">

                        <div className="chart-title">

                            <div>

                                <span>
                                    TREND ANALYSIS
                                </span>

                                <h3>
                                    Top Category Trends Over Time
                                </h3>

                            </div>

                        </div>


                        <Plot
                            data={trendTraces}
                            layout={{
                                autosize: true,
                                height: 450,
                                margin: {
                                    l: 60,
                                    r: 30,
                                    t: 10,
                                    b: 75
                                },
                                paper_bgcolor: "white",
                                plot_bgcolor: "white",
                                font: {
                                    family:
                                        "Arial, Helvetica, sans-serif",
                                    color: "#172554"
                                },
                                xaxis: {
                                    title: "Year",
                                    gridcolor: "#e5edf5"
                                },
                                yaxis: {
                                    title: "Articles",
                                    gridcolor: "#e5edf5",
                                    zeroline: false
                                },
                                legend: {
                                    orientation: "h",
                                    x: 0,
                                    y: -0.20
                                }
                            }}
                            config={{
                                displayModeBar: false,
                                responsive: true
                            }}
                            style={{
                                width: "100%"
                            }}
                        />

                    </div>


                    {/* =================================================
                        TRENDING TOPICS
                    ================================================= */}

                    <div className="full-chart-card">

                        <div className="chart-title">

                            <div>

                                <span>
                                    TOPIC ANALYSIS
                                </span>

                                <h3>
                                    Trending Topics
                                </h3>

                            </div>

                        </div>


                        <Plot
                            data={[
                                {
                                    x: keywordNames,
                                    y: keywordCounts,
                                    type: "bar",
                                    marker: {
                                        color: "#2563eb"
                                    },
                                    hovertemplate:
                                        "<b>%{x}</b>" +
                                        "<br>Occurrences: %{y:,}" +
                                        "<extra></extra>"
                                }
                            ]}
                            layout={{
                                autosize: true,
                                height: 430,
                                margin: {
                                    l: 60,
                                    r: 25,
                                    t: 10,
                                    b: 110
                                },
                                paper_bgcolor: "white",
                                plot_bgcolor: "white",
                                font: {
                                    family:
                                        "Arial, Helvetica, sans-serif",
                                    color: "#172554"
                                },
                                xaxis: {
                                    tickangle: -45,
                                    gridcolor: "#e5edf5"
                                },
                                yaxis: {
                                    title: "Occurrences",
                                    gridcolor: "#e5edf5",
                                    zeroline: false
                                }
                            }}
                            config={{
                                displayModeBar: false,
                                responsive: true
                            }}
                            style={{
                                width: "100%"
                            }}
                        />

                    </div>

                </section>

            </main>

        </div>

    );

}


export default App;