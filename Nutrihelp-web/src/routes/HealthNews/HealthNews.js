import React, { useState, useEffect } from 'react';
import './HealthNews.css';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { supabase } from '../../utils/supabase';
import { useNavigate } from 'react-router-dom';
import newsBg1 from '../../images/HealthNews_background_image/news_background_image_1.png';
import newsBg2 from '../../images/HealthNews_background_image/news_background_image_2.png';
import newsBg3 from '../../images/HealthNews_background_image/news_background_image_3.png';
import newsBg4 from '../../images/HealthNews_background_image/news_background_image_4.png';
import newsBg5 from '../../images/HealthNews_background_image/news_background_image_5.png';
import newsBg6 from '../../images/HealthNews_background_image/news_background_image_6.png';
import newsBg7 from '../../images/HealthNews_background_image/news_background_image_7.png';
import newsBg8 from '../../images/HealthNews_background_image/news_background_image_8.png';
import newsBg9 from '../../images/HealthNews_background_image/news_background_image_9.png';
import newsBg10 from '../../images/HealthNews_background_image/news_background_image_10.png';
import newsBg11 from '../../images/HealthNews_background_image/news_background_image_11.png';
import newsBg12 from '../../images/HealthNews_background_image/news_background_image_12.png';

const HealthNews = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  // Search news
  const [searchQuery, setSearchQuery] = useState('');
  // Track viewing page 
  const [currentPage, setCurrentPage] = useState(1);
  // Set the maximum news number
  const itemsPerPage = 6;
  // Current slider news index
  const [currentSliderIndex, setCurrentSliderIndex] = useState(0);
  // Add favorites state
  const [favorites, setFavorites] = useState([]);

  // Add test API search states
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Add Supabase database test states
  const [dbNews, setDbNews] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbError, setDbError] = useState('');
  const [hasLoadedDb, setHasLoadedDb] = useState(false);
  // Add pagination states for daily news
  const [currentDbPage, setCurrentDbPage] = useState(1);
  const [dbFavorites, setDbFavorites] = useState([]);
  const navigate = useNavigate();

  const sampleNews = [
    {
      id: 1,
      title: "VIDEO: Plant Protein: Turning grains and legumes into protein rich powder",
      category: "research",
      url: "https://www.abc.net.au/news/rural/programs/landline/2021-08-22/plant-protein:-turning-grains-and-legumes-into/13509448",
      backgroundImage: newsBg1
    },
    {
      id: 2,
      title: "784 ideas about healthy breakfast",
      category: "tips",
      url: "https://www.taste.com.au/search-recipes/?q=healthy+breakfast",
      backgroundImage: newsBg2
    },
    {
      id: 3,
      title: "Australians on track to eat less fruit and veg, more junk food by 2030",
      category: "diet",
      url: "https://www.abc.net.au/news/2025-03-19/less-fruit-vegetables-more-discretionary-food-by-2030-study/105061998",
      backgroundImage: newsBg3
    },
    {
      id: 4,
      title: "Heart-healthy cooking tips",
      category: "tips",
      url: "https://www.heartfoundation.org.au/healthy-living/healthy-eating/skills/heart-healthy-cooking-tips",
      backgroundImage: newsBg4
    },
    {
      id: 5,
      title: "NSW Health doctors announce industrial action from Tuesday for three days",
      category: "research",
      url: "https://www.abc.net.au/news/2025-04-02/nsw-health-doctors-three-day-strike/105125372",
      backgroundImage: newsBg5
    },
    {
      id: 6,
      title: "How to order Australian dietary",
      category: "diet",
      url: "https://www.eatforhealth.gov.au/guidelines",
      backgroundImage: newsBg6
    },
    {
      id: 7,
      title: "Food insecurity stemming from cost-of-living crisis can fuel disordered eating habits",
      category: "diet",
      url: "https://www.abc.net.au/news/2025-03-23/food-insecurity-due-to-living-costs-can-cause-disordered-eating/104776474",
      backgroundImage: newsBg7
    },
    {
      id: 8,
      title: "Translating the science behind eating well and staying healthy",
      category: "research",
      url: "https://www.eatforhealth.gov.au/news-media/translating-science-behind-eating-well-and-staying-healthy",
      backgroundImage: newsBg8
    },
    {
      id: 9,
      title: "Heart-healthy meal planning",
      category: "tips",
      url: "https://www.heartfoundation.org.au/healthy-living/healthy-eating/skills/heart-healthy-meal-planning",
      backgroundImage: newsBg9
    },
    {
      id: 10,
      title: "How to understand food labels",
      category: "tips",
      url: "https://www.eatforhealth.gov.au/eating-well/how-understand-food-labels",
      backgroundImage: newsBg10
    },
    {
      id: 11,
      title: "Cottage cheese demand booms as TikTok trend drives popularity online",
      category: "diet",
      url: "https://www.abc.net.au/news/2025-04-23/tiktok-videos-cottage-cheese-sales-boom/105200556",
      backgroundImage: newsBg11
    },
    {
      id: 12,
      title: "How Geelong's green waste is feeding its most vulnerable residents",
      category: "research",
      url: "https://www.abc.net.au/news/2025-04-24/green-waste-to-plate-food-share-compost-organic-material/105180292",
      backgroundImage: newsBg12
    }
  ];

  // Select random news items for slider
  const sliderNews = [sampleNews[1], sampleNews[4], sampleNews[7], sampleNews[2], sampleNews[8]];

  // Auto-rotate slider news
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSliderIndex(prevIndex => 
        prevIndex === sliderNews.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Add toggle favorite function
  const toggleFavorite = (newsId) => {
    setFavorites(prevFavorites => {
      if (prevFavorites.includes(newsId)) {
        return prevFavorites.filter(id => id !== newsId);
      } else {
        return [...prevFavorites, newsId];
      }
    });
  };

  // Modify filtered news to include favorites
  const filteredNews = activeCategory === 'all' 
    ? sampleNews 
    : activeCategory === 'favorites'
    ? sampleNews.filter(news => favorites.includes(news.id))
    : sampleNews.filter(news => news.category === activeCategory);

  const searchedAndFilteredNews = filteredNews.filter(news => 
    news.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = searchedAndFilteredNews.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(searchedAndFilteredNews.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Open news link in a new web
  const handleReadMore = (url) => {
    window.open(url, '_blank');
  };

  // Handle slider navigation
  const goToSlide = (index) => {
    setCurrentSliderIndex(index);
  };

  // Function to search articles using Supabase API
  const searchArticles = async () => {
    if (!apiSearchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError('');
    setHasSearched(false);
    try {
      const response = await fetch(`https://mdauzoueyzgtqsojttkp.supabase.co/functions/v1/search-articles?q=${encodeURIComponent(apiSearchQuery)}`);
      const data = await response.json();
      setApiSearchResults(data);
      setHasSearched(true);
    } catch (error) {
      setSearchError('Failed to fetch search results.');
      console.error('Error searching articles:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Function to fetch news from Supabase database
  const fetchDbNews = async () => {
    setIsLoadingDb(true);
    setDbError('');
    setHasLoadedDb(false);
    
    try {
      const { data, error } = await supabase
        .from('health_news')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setDbNews(data || []);
      setHasLoadedDb(true);
      console.log('Fetched news from database:', data);
    } catch (error) {
      setDbError('Failed to fetch news from database: ' + error.message);
      console.error('Error fetching from database:', error);
    } finally {
      setIsLoadingDb(false);
    }
  };

  // Navigate to detail page for a database article
  const openArticleDetail = (article) => {
    if (!article?.id) return;
    navigate(`/healthnews/${article.id}`);
  };

  // Function to generate a random image URL using Picsum
  const getRandomImage = () => {
    const randomId = Math.floor(Math.random() * 1000) + 1;
    const width = 400;
    const height = 300;
    return `https://picsum.photos/${width}/${height}?random=${randomId}`;
  };

  // Toggle favorite for database articles
  const toggleDbFavorite = (articleId) => {
    setDbFavorites(prevFavorites => {
      if (prevFavorites.includes(articleId)) {
        return prevFavorites.filter(id => id !== articleId);
      } else {
        return [...prevFavorites, articleId];
      }
    });
  };

  // Pagination logic for daily news
  const dbItemsPerPage = 6;
  const indexOfLastDbItem = currentDbPage * dbItemsPerPage;
  const indexOfFirstDbItem = indexOfLastDbItem - dbItemsPerPage;
  const currentDbItems = dbNews.slice(indexOfFirstDbItem, indexOfLastDbItem);
  const totalDbPages = Math.ceil(dbNews.length / dbItemsPerPage);

  const handleDbPageChange = (pageNumber) => {
    setCurrentDbPage(pageNumber);
  };

  return (
    <>
      <div className="health-news-page-wrapper"></div>
      <div className="health-news-container">
        {/* Smaller header */}
        <div className="news-header">
          <h1 className="news-title">Health News</h1>
        </div>

        {/* Enhanced News Slider */}
        <div className="news-slider-wrapper">
          <div className="news-slider">
            {sliderNews.map((news, index) => (
              <div 
                key={news.id}
                className={`slider-item ${index === currentSliderIndex ? 'active' : ''}`}
                onClick={() => handleReadMore(news.url)}
              >
                <div className="slider-image-container">
                  <img src={news.backgroundImage} alt={news.title} />
                  <div className="slider-overlay"></div>
                </div>
                <div className="slider-content">
                  <div className="slider-category-badge">{news.category}</div>
                  <h3 className="slider-title">{news.title}</h3>
                  <div className="slider-read-more">
                    <span>Read More</span>
                    <div className="slider-arrow">→</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Enhanced Slider navigation */}
          <div className="slider-navigation">
            <div className="slider-dots">
              {sliderNews.map((_, index) => (
                <span 
                  key={index} 
                  className={`dot ${index === currentSliderIndex ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
            <div className="slider-arrows">
              <button 
                className="slider-arrow-btn prev"
                onClick={() => goToSlide(currentSliderIndex === 0 ? sliderNews.length - 1 : currentSliderIndex - 1)}
              >
                ←
              </button>
              <button 
                className="slider-arrow-btn next"
                onClick={() => goToSlide(currentSliderIndex === sliderNews.length - 1 ? 0 : currentSliderIndex + 1)}
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div className="search-container">
        <span className="input-icon">🔍</span>
          <input
            type="text"
            placeholder="Enter to search news ..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="news-categories">
          <button 
            className={activeCategory === 'all' ? 'active' : ''}
            onClick={() => setActiveCategory('all')}
          >
            All Articles
          </button>
          <button 
            className={activeCategory === 'tips' ? 'active' : ''}
            onClick={() => setActiveCategory('tips')}
          >
            Daily Tips
          </button>
          <button 
            className={activeCategory === 'diet' ? 'active' : ''}
            onClick={() => setActiveCategory('diet')}
          >
            Diet Advice
          </button>
          <button 
            className={activeCategory === 'research' ? 'active' : ''}
            onClick={() => setActiveCategory('research')}
          >
            Latest Research
          </button>
          <button 
            className={activeCategory === 'favorites' ? 'active' : ''}
            onClick={() => setActiveCategory('favorites')}
          >
            Favorites
          </button>
        </div>

        {/* Show news cards */}
        <div className="news-list">
          {currentItems.map(news => (
            <div key={news.id} className="news-card">
              <div className="news-card-image" style={{
                backgroundImage: `url(${news.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }} />
              <div className="news-card-content">
                <h3>{news.title}</h3>
                <div className="news-card-actions">
                  <button 
                    className="read-more"
                    onClick={() => handleReadMore(news.url)}
                  >
                    Read More
                  </button>
                  <button 
                    className="favorite-button"
                    onClick={() => toggleFavorite(news.id)}
                  >
                    {favorites.includes(news.id) ? (
                      <FaHeart className="heart-icon filled" />
                    ) : (
                      <FaRegHeart className="heart-icon" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show page numbers */}
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index + 1}
              onClick={() => handlePageChange(index + 1)}
              className={`page-button ${currentPage === index + 1 ? 'active' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Test API Search Section */}
        <div className="test-api-section">
          <div className="test-badge">
            TEST FEATURE
          </div>
          <h3 className="test-title">Search Articles API Test</h3>
          <p className="test-description">
            To test the Supabase API integration for searching health articles (Collaborate with QINGDA MENG).
          </p>
          
          <div className="test-search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Enter keywords ... (e.g., diet, nutrition, health, well-being)"
                value={apiSearchQuery}
                onChange={(e) => setApiSearchQuery(e.target.value)}
                className="test-search-input"
                onKeyPress={(e) => e.key === 'Enter' && searchArticles()}
                disabled={isSearching}
              />
              {isSearching && (
                <div className="search-spinner">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
            <button 
              className="test-search-button"
              onClick={searchArticles}
              disabled={isSearching || !apiSearchQuery.trim()}
            >
              {isSearching ? (
                <>
                  <span className="button-spinner"></span>
                  Searching...
                </>
              ) : (
                <>
                  Search
                </>
              )}
            </button>
          </div>
          
          {hasSearched && (
            <div className="test-results">
              <div className="results-header">
                <h4>Search Results</h4>
                <span className="results-count">
                  {searchError ? 'Error' : `${apiSearchResults.length} article${apiSearchResults.length !== 1 ? 's' : ''} found`}
                </span>
              </div>
              
              {searchError ? (
                <div className="error-container">
                  <p className="error-message">{searchError}</p>
                  <button 
                    className="retry-button"
                    onClick={searchArticles}
                    disabled={isSearching}
                  >
                    Try Again
                  </button>
                </div>
              ) : apiSearchResults.length === 0 ? (
                <div className="no-results">
                  <p>No articles found for "{apiSearchQuery}"</p>
                  <p className="no-results-suggestion">Try different keywords or check your search terms.</p>
                </div>
              ) : (
                <div className="results-grid">
                  {apiSearchResults.map((article, index) => (
                    <div key={article.id || index} className="test-result-card">
                      <div className="result-card-header">
                        <h5 className="result-title">{article.title || 'Untitled Article'}</h5>
                        <span className="result-number">#{index + 1}</span>
                      </div>
                      <div className="result-content">
                        <p className="result-text">
                          {article.content ? 
                            (article.content.length > 150 ? 
                              `${article.content.substring(0, 150)}...` : 
                              article.content
                            ) : 
                            'No content available'
                          }
                        </p>
                      </div>
                      {article.author && (
                        <div className="result-footer">
                          <span className="result-author">
                            By: {article.author}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Daily Health News Section (Collaborate with ZEYU)*/}
        <div className="test-api-section">
          <div className="test-badge">
            DAILY NEWS
          </div>
          <h3 className="test-title">Daily Health News</h3>
          <p className="test-description">
            A small daily pick from the health_news supabase collection.
          </p>
          
          <div className="test-search-container">
            <button 
              className="test-search-button"
              onClick={fetchDbNews}
              disabled={isLoadingDb}
            >
              {isLoadingDb ? (
                <>
                  <span className="button-spinner"></span>
                  Fetching today's news...
                </>
              ) : (
                <>
                  Get Today's News
                </>
              )}
            </button>
          </div>
          
          {hasLoadedDb && (
            <div className="test-results">
              <div className="results-header">
                <h4>Today's News</h4>
                <span className="results-count">
                  {dbError ? 'Error' : `${dbNews.length} article${dbNews.length !== 1 ? 's' : ''} found`}
                </span>
              </div>
              
              {dbError ? (
                <div className="error-container">
                  <p className="error-message">{dbError}</p>
                  <button 
                    className="retry-button"
                    onClick={fetchDbNews}
                    disabled={isLoadingDb}
                  >
                    Try Again
                  </button>
                </div>
              ) : dbNews.length === 0 ? (
                <div className="no-results">
                  <p>No articles found in the database</p>
                  <p className="no-results-suggestion">The health_news table might be empty or not accessible.</p>
                </div>
              ) : (
                <>
                  <div className="results-grid">
                    {currentDbItems.map((article, index) => (
                      <div key={article.id || index} className="test-result-card">
                        <div className="result-card-image">
                          <img 
                            src={article.image_url || getRandomImage()} 
                            alt={article.title || 'Article image'}
                            onError={(e) => {
                              e.target.src = getRandomImage();
                            }}
                          />
                        </div>
                        <div className="result-card-header">
                          <h5 className="result-title">{article.title || 'Untitled Article'}</h5>
                          <div className="result-header-actions">
                            <span className="result-number">#{indexOfFirstDbItem + index + 1}</span>
                            <button 
                              className="favorite-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDbFavorite(article.id);
                              }}
                            >
                              {dbFavorites.includes(article.id) ? (
                                <FaHeart className="heart-icon filled" />
                              ) : (
                                <FaRegHeart className="heart-icon" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="result-content" onClick={() => openArticleDetail(article)} style={{ cursor: 'pointer' }}>
                          <p className="result-text">
                            {article.summary ? 
                              (article.summary.length > 150 ? 
                                `${article.summary.substring(0, 150)}...` : 
                                article.summary
                              ) : 
                              'No summary available'
                            }
                          </p>
                          {article.content && (
                            <p className="result-content-full">
                              {article.content.length > 200 ? 
                                `${article.content.substring(0, 200)}...` : 
                                article.content
                              }
                            </p>
                          )}
                        </div>
                        <div className="result-footer">
                          <span className="result-date">
                            {article.created_at ? new Date(article.created_at).toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination for daily news */}
                  {totalDbPages > 1 && (
                    <div className="pagination">
                      {Array.from({ length: totalDbPages }, (_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => handleDbPageChange(index + 1)}
                          className={`page-button ${currentDbPage === index + 1 ? 'active' : ''}`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HealthNews;