import { useEffect, useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import "./App.css";

function App() {

    // =====================================================
    // STATE
    // =====================================================

    const [data, setData] = useState(null);
    const [trendingKeywords, setTrendingKeywords] = useState([]);
    const [error, setError] = useState("");

    const [searchText, setSearchText] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedSentiment, setSelectedSentiment] = useState("All");
    const [selectedYear, setSelectedYear] = useState("All");

    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);


    // =====================================================
    // LOAD DASHBOARD + TRENDING KEYWORDS
    // =====================================================

    useEffect(() => {

        const loadData = async () => {

            try {

                const [
                    dashboardResponse,
                    trendingResponse
                ] = await Promise.all([

                    axios.get(
                        "http://localhost:5000/api/analytics/dashboard"
                    ),

                    axios.get(
                        "http://localhost:5000/api/analytics/trending-keywords"
                    )

                ]);

                setData(dashboardResponse.data);

                setTrendingKeywords(
                    trendingResponse.data
                );

            } catch (error) {

                console.error(error);

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
                "http://localhost:5000/api/analytics/search",
                {
                    params: {
                        search: searchText,
                        category: selectedCategory,
                        sentiment: selectedSentiment,
                        year: selectedYear
                    }
                }
            );

            /*
             Backend returns:
             {
                 total: ...,
                 articles: [...]
             }
            */

            setSearchResults(
                response.data.articles || []
            );

        } catch (error) {

            console.error(error);

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
    // LOADING / ERROR
    // =====================================================

    if (error) {
        return (
            <h2 className="error">
                {error}
            </h2>
        );
    }

    if (!data) {
        return (
            <h2 className="loading">
                Loading NewsPulse...
            </h2>
        );
    }


    // =====================================================
    // KPI DATA
    // =====================================================

    const totalArticles =
        data.totalArticles;

    const totalCategories =
        data.categories.length;

    const positive =
        data.sentiment.find(
            item => item._id === "positive"
        )?.totalArticles || 0;

    const neutral =
        data.sentiment.find(
            item => item._id === "neutral"
        )?.totalArticles || 0;

    const negative =
        data.sentiment.find(
            item => item._id === "negative"
        )?.totalArticles || 0;


    // =====================================================
    // TOP 10 CATEGORIES
    // =====================================================

    const topCategories =
        data.categories.slice(0, 10);

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
        data.years.map(
            item => item._id
        );

    const yearCounts =
        data.years.map(
            item => item.totalArticles
        );


    // =====================================================
    // SENTIMENT DATA
    // =====================================================

    const sentimentNames =
        data.sentiment.map(
            item => item._id
        );

    const sentimentCounts =
        data.sentiment.map(
            item => item.totalArticles
        );


    // =====================================================
    // CATEGORY SENTIMENT
    // =====================================================

    const sentimentMap = {};

    data.categorySentiment.forEach(item => {

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

    });


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
        data.categories
            .slice(0, 5)
            .map(item => item._id);

    const trendMap = {};

    data.categoryTrends.forEach(item => {

        const year =
            item._id.year;

        const category =
            item._id.category;

        if (!trendMap[category]) {
            trendMap[category] = {};
        }

        trendMap[category][year] =
            item.totalArticles;

    });


    const trendTraces =
        topFiveCategories.map(category => {

            return {

                x: years,

                y: years.map(
                    year =>
                        trendMap[category]?.[year] || 0
                ),

                type: "scatter",

                mode: "lines+markers",

                name: category,

                hovertemplate:
                    "<b>" +
                    category +
                    "</b><br>" +
                    "Year: %{x}<br>" +
                    "Articles: %{y}" +
                    "<extra></extra>"
            };

        });


    // =====================================================
    // TRENDING KEYWORD DATA
    // =====================================================

    const keywordNames =
        trendingKeywords.map(
            item => item._id
        );

    const keywordCounts =
        trendingKeywords.map(
            item => item.count
        );


    return (

        <div className="dashboard">

            {/* =================================================
                HEADER
            ================================================= */}

            <header className="header">

                <h1>
                    NewsPulse
                </h1>

                <p>
                    News Analytics & Trend Detection Platform
                </p>

            </header>


            <main>

                {/* =================================================
                    NEWS EXPLORER
                ================================================= */}

                <div className="news-explorer">

                    <h2>
                        News Explorer
                    </h2>

                    <p className="explorer-description">
                        Search and filter news articles
                        from the NewsPulse dataset.
                    </p>


                    {/* SEARCH */}

                    <div className="search-box">

                        <input
                            type="text"
                            placeholder="Search headline or description..."
                            value={searchText}

                            onChange={(e) =>
                                setSearchText(
                                    e.target.value
                                )
                            }

                            onKeyDown={(e) => {

                                if (
                                    e.key === "Enter"
                                ) {
                                    handleSearch();
                                }

                            }}
                        />


                        <button
                            onClick={handleSearch}
                        >
                            Search
                        </button>

                    </div>


                    {/* FILTERS */}

                    <div className="filters">

                        <select
                            value={
                                selectedCategory
                            }

                            onChange={(e) =>
                                setSelectedCategory(
                                    e.target.value
                                )
                            }
                        >

                            <option value="All">
                                All Categories
                            </option>

                            {data.categories.map(
                                item => (

                                    <option
                                        key={item._id}
                                        value={item._id}
                                    >
                                        {item._id}
                                    </option>

                                )
                            )}

                        </select>


                        <select
                            value={
                                selectedSentiment
                            }

                            onChange={(e) =>
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


                        <select
                            value={
                                selectedYear
                            }

                            onChange={(e) =>
                                setSelectedYear(
                                    e.target.value
                                )
                            }
                        >

                            <option value="All">
                                All Years
                            </option>

                            {years
                                .slice()
                                .reverse()
                                .map(year => (

                                    <option
                                        key={year}
                                        value={year}
                                    >
                                        {year}
                                    </option>

                                )
                            )}

                        </select>


                        <button
                            className="reset-button"
                            onClick={handleReset}
                        >
                            Reset
                        </button>

                    </div>


                    {/* SEARCHING */}

                    {searching && (

                        <p className="search-status">
                            Searching news...
                        </p>

                    )}


                    {/* RESULTS */}

                    {!searching &&
                        searchPerformed && (

                            <div className="results-section">

                                <h3>
                                    Search Results
                                    {" "}
                                    ({searchResults.length})
                                </h3>


                                {searchResults.length === 0 ? (

                                    <div className="no-results">
                                        No articles found.
                                    </div>

                                ) : (

                                    <div className="results-grid">

                                        {searchResults.map(
                                            (article, index) => (

                                                <div
                                                    className="article-card"
                                                    key={
                                                        article._id ||
                                                        index
                                                    }
                                                >

                                                    <h3>
                                                        {
                                                            article.headline ||
                                                            "Untitled Article"
                                                        }
                                                    </h3>


                                                    <div className="article-meta">

                                                        <span className="category-tag">
                                                            {
                                                                article.category
                                                            }
                                                        </span>


                                                        <span
                                                            className={
                                                                `sentiment-tag ${
                                                                    article.sentiment
                                                                }`
                                                            }
                                                        >
                                                            {
                                                                article.sentiment
                                                            }
                                                        </span>


                                                        <span>
                                                            {
                                                                article.date
                                                            }
                                                        </span>

                                                    </div>


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
                                                            {
                                                                article.authors
                                                            }
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

                                                </div>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>

                        )}

                </div>


                {/* =================================================
                    DASHBOARD OVERVIEW
                ================================================= */}

                <h2>
                    Dashboard Overview
                </h2>


                {/* =================================================
                    KPI CARDS
                ================================================= */}

                <div className="cards">

                    <div className="card">

                        <h3>
                            Total Articles
                        </h3>

                        <p>
                            {totalArticles.toLocaleString()}
                        </p>

                    </div>


                    <div className="card">

                        <h3>
                            Categories
                        </h3>

                        <p>
                            {totalCategories}
                        </p>

                    </div>


                    <div className="card positive">

                        <h3>
                            Positive
                        </h3>

                        <p>
                            {positive.toLocaleString()}
                        </p>

                    </div>


                    <div className="card neutral">

                        <h3>
                            Neutral
                        </h3>

                        <p>
                            {neutral.toLocaleString()}
                        </p>

                    </div>


                    <div className="card negative">

                        <h3>
                            Negative
                        </h3>

                        <p>
                            {negative.toLocaleString()}
                        </p>

                    </div>

                </div>


                {/* =================================================
                    TOP CATEGORIES + YEAR
                ================================================= */}

                <div className="charts-row">


                    <div className="chart-card">

                        <h2>
                            Top 10 News Categories
                        </h2>

                        <Plot

                            data={[
                                {

                                    x: topCategoryNames,

                                    y: topCategoryCounts,

                                    type: "bar",

                                    hovertemplate:
                                        "<b>%{x}</b><br>" +
                                        "Articles: %{y}" +
                                        "<extra></extra>"

                                }

                            ]}

                            layout={{

                                height: 500,

                                margin: {
                                    l: 60,
                                    r: 20,
                                    t: 20,
                                    b: 120
                                },

                                xaxis: {
                                    title: "Category",
                                    tickangle: -45
                                },

                                yaxis: {
                                    title: "Articles"
                                }

                            }}

                            config={{
                                displayModeBar: false
                            }}

                            style={{
                                width: "100%"
                            }}

                            useResizeHandler={true}

                        />

                    </div>


                    <div className="chart-card">

                        <h2>
                            Articles by Year
                        </h2>

                        <Plot

                            data={[
                                {

                                    x: years,

                                    y: yearCounts,

                                    type: "scatter",

                                    mode:
                                        "lines+markers",

                                    hovertemplate:
                                        "<b>Year: %{x}</b><br>" +
                                        "Articles: %{y}" +
                                        "<extra></extra>"

                                }

                            ]}

                            layout={{

                                height: 500,

                                margin: {
                                    l: 60,
                                    r: 20,
                                    t: 20,
                                    b: 60
                                },

                                xaxis: {
                                    title: "Year"
                                },

                                yaxis: {
                                    title: "Articles"
                                }

                            }}

                            config={{
                                displayModeBar: false
                            }}

                            style={{
                                width: "100%"
                            }}

                            useResizeHandler={true}

                        />

                    </div>

                </div>


                {/* =================================================
                    TRENDING TOPICS
                ================================================= */}

                <div className="chart-card full-width-chart">

                    <h2>
                        Trending Topics
                    </h2>

                    <p className="chart-description">
                        Most frequently occurring keywords
                        across news headlines and descriptions.
                    </p>

                    <Plot

                        data={[
                            {

                                x: keywordNames,

                                y: keywordCounts,

                                type: "bar",

                                hovertemplate:
                                    "<b>%{x}</b><br>" +
                                    "Frequency: %{y}" +
                                    "<extra></extra>"

                            }

                        ]}

                        layout={{

                            height: 500,

                            margin: {
                                l: 60,
                                r: 30,
                                t: 20,
                                b: 120
                            },

                            xaxis: {
                                title: "Keyword",
                                tickangle: -45
                            },

                            yaxis: {
                                title: "Frequency"
                            }

                        }}

                        config={{
                            displayModeBar: false
                        }}

                        style={{
                            width: "100%"
                        }}

                        useResizeHandler={true}

                    />

                </div>


                {/* =================================================
                    SENTIMENT
                ================================================= */}

                <div className="chart-card full-width-chart">

                    <h2>
                        Sentiment Distribution
                    </h2>

                    <Plot

                        data={[
                            {

                                labels: sentimentNames,

                                values: sentimentCounts,

                                type: "pie",

                                hole: 0.45,

                                textinfo:
                                    "label+percent",

                                hovertemplate:
                                    "<b>%{label}</b><br>" +
                                    "Articles: %{value}<br>" +
                                    "Percentage: %{percent}" +
                                    "<extra></extra>"

                            }

                        ]}

                        layout={{

                            height: 500,

                            margin: {
                                l: 20,
                                r: 20,
                                t: 20,
                                b: 20
                            },

                            showlegend: true

                        }}

                        config={{
                            displayModeBar: false
                        }}

                        style={{
                            width: "100%"
                        }}

                        useResizeHandler={true}

                    />

                </div>


                {/* =================================================
                    CATEGORY SENTIMENT
                ================================================= */}

                <div className="chart-card full-width-chart">

                    <h2>
                        Sentiment by Top 10 Categories
                    </h2>

                    <Plot

                        data={[

                            {

                                x: topCategoryNames,

                                y: categoryPositive,

                                name: "Positive",

                                type: "bar"

                            },

                            {

                                x: topCategoryNames,

                                y: categoryNeutral,

                                name: "Neutral",

                                type: "bar"

                            },

                            {

                                x: topCategoryNames,

                                y: categoryNegative,

                                name: "Negative",

                                type: "bar"

                            }

                        ]}

                        layout={{

                            height: 550,

                            barmode: "stack",

                            margin: {
                                l: 60,
                                r: 20,
                                t: 20,
                                b: 130
                            },

                            xaxis: {
                                title: "Category",
                                tickangle: -45
                            },

                            yaxis: {
                                title: "Articles"
                            }

                        }}

                        config={{
                            displayModeBar: false
                        }}

                        style={{
                            width: "100%"
                        }}

                        useResizeHandler={true}

                    />

                </div>


                {/* =================================================
                    CATEGORY TRENDS
                ================================================= */}

                <div className="chart-card full-width-chart">

                    <h2>
                        Top Category Trends Over Time
                    </h2>

                    <Plot

                        data={trendTraces}

                        layout={{

                            height: 550,

                            margin: {
                                l: 60,
                                r: 30,
                                t: 20,
                                b: 60
                            },

                            xaxis: {
                                title: "Year"
                            },

                            yaxis: {
                                title: "Articles"
                            },

                            legend: {
                                orientation: "h"
                            }

                        }}

                        config={{
                            displayModeBar: false
                        }}

                        style={{
                            width: "100%"
                        }}

                        useResizeHandler={true}

                    />

                </div>

            </main>

        </div>
    );
}

export default App;