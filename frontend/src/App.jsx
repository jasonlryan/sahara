import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './App.css'; // We'll add styles here

// Define the base URL for the backend API and static assets
const LOCAL_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BACKEND_URL = LOCAL_DEV ? 'http://localhost:3000' : ''; // Use localhost URL for development

// Simple Modal Component (Placeholder for now)
function MediaModal({ item, onClose }) {
  if (!item) return null;

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filteredItems, setFilteredItems] = useState([]);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const contentRef = useRef(null);
  
  // Check if we're on a mobile device
  const isMobileDevice = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.matchMedia('(max-width: 768px)').matches;
  }, []);
  
  // Find the current item in the filtered items on mount
  useEffect(() => {
    // Get all media items that match the current filter criteria
    const currentItems = window.filteredMediaItems || [];
    setFilteredItems(currentItems);
    
    // Find the index of the current item
    const index = currentItems.findIndex(i => i.Filename === item.Filename);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  }, [item]);
  
  // Handle swipe events
  const minSwipeDistance = 50;
  
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setSwiping(true);
  };
  
  const onTouchMove = (e) => {
    if (!touchStart) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    // Calculate swipe direction for visual feedback
    const diff = touchStart - currentTouch;
    
    // Only show visual feedback if swiping significantly
    if (Math.abs(diff) > 20) {
      setSwipeDirection(diff > 0 ? 'left' : 'right');
      
      // Apply transform to the content for visual feedback
      if (contentRef.current) {
        // Limit the movement to prevent excessive sliding
        const maxTransform = 100;
        const transform = Math.min(Math.abs(diff) * 0.5, maxTransform);
        contentRef.current.style.transform = `translateX(${diff > 0 ? -transform : transform}px)`;
      }
    }
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      // Reset state even if not a complete swipe
      setSwiping(false);
      setSwipeDirection(null);
      if (contentRef.current) {
        contentRef.current.style.transform = '';
      }
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < filteredItems.length - 1) {
      // Navigate to next item
      setCurrentIndex(prev => prev + 1);
    } else if (isRightSwipe && currentIndex > 0) {
      // Navigate to previous item
      setCurrentIndex(prev => prev - 1);
    }
    
    // Reset transform
    if (contentRef.current) {
      contentRef.current.style.transform = '';
    }
    
    setSwiping(false);
    setSwipeDirection(null);
  };
  
  // Reset touch state if user cancels the gesture
  const onTouchCancel = () => {
    setSwiping(false);
    setSwipeDirection(null);
    if (contentRef.current) {
      contentRef.current.style.transform = '';
    }
  };
  
  // Update displayed item when currentIndex changes
  useEffect(() => {
    if (filteredItems.length > 0 && currentIndex >= 0 && currentIndex < filteredItems.length) {
      // We don't actually change the item prop, but render based on the index
      const sourceFilename = getBaseFilename(filteredItems[currentIndex].Filename);
      const originalUrl = filteredItems[currentIndex].URL.replace('/sahara/media/', '/sahara/main/media/');
      
      // Update mediaContent based on current index (done in render)
    }
  }, [currentIndex, filteredItems]);

  const sourceFilename = getBaseFilename(filteredItems[currentIndex]?.Filename || item.Filename);
  const originalUrl = (filteredItems[currentIndex]?.URL || item.URL).replace('/sahara/media/', '/sahara/main/media/');

  // Determine content based on media type
  let mediaContent;
  const currentItem = filteredItems[currentIndex] || item;
  
  if (currentItem.MediaType && currentItem.MediaType.toLowerCase() === 'image') {
      mediaContent = (
          <div className="modal-image-viewer">
              <div>
                  <img src={originalUrl} alt={sourceFilename} style={{ maxWidth: '100%', height: 'auto' }} />
              </div>
          </div>
      );
  } else if (currentItem.MediaType && currentItem.MediaType.toLowerCase() === 'video') {
      const thumbnailUrl = `${BACKEND_URL}/web_media/thumbnails/${getThumbnailFilename(currentItem.Filename)}`;
      const videoUrl = `${BACKEND_URL}/web_media/videos_480p/${getBaseFilename(currentItem.Filename)}`;
      
      mediaContent = (
          <div className="modal-video-viewer">
              <video 
                  controls 
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  x-webkit-airplay="allow"
                  disablePictureInPicture
                  disableRemotePlayback
                  width="100%"
                  height="auto"
                  style={{ opacity: 1 }}
              >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
              </video>
          </div>
      );
  } else {
      mediaContent = <p>Preview not available for this media type.</p>;
  }

  // Add handlers for mouse/trackpad events
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(null);
  const [endX, setEndX] = useState(null);
  
  const onMouseDown = (e) => {
    // Only handle primary mouse button (left click)
    if (e.button !== 0) return;
    
    setStartX(e.clientX);
    setEndX(null);
    setIsDragging(true);
    e.preventDefault(); // Prevent text selection
  };
  
  const onMouseMove = (e) => {
    if (!isDragging || !startX) return;
    
    setEndX(e.clientX);
    
    // Calculate direction for visual feedback
    const diff = startX - e.clientX;
    
    // Only show visual feedback if dragging significantly
    if (Math.abs(diff) > 20) {
      setSwipeDirection(diff > 0 ? 'left' : 'right');
      
      // Apply transform to the content for visual feedback
      if (contentRef.current) {
        // Limit the movement to prevent excessive sliding
        const maxTransform = 100;
        const transform = Math.min(Math.abs(diff) * 0.5, maxTransform);
        contentRef.current.style.transform = `translateX(${diff > 0 ? -transform : transform}px)`;
      }
    }
  };
  
  const onMouseUp = () => {
    if (!isDragging || !startX || !endX) {
      setIsDragging(false);
      setSwipeDirection(null);
      if (contentRef.current) {
        contentRef.current.style.transform = '';
      }
      return;
    }
    
    const distance = startX - endX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < filteredItems.length - 1) {
      // Navigate to next item
      setCurrentIndex(prev => prev + 1);
    } else if (isRightSwipe && currentIndex > 0) {
      // Navigate to previous item
      setCurrentIndex(prev => prev - 1);
    }
    
    // Reset transform
    if (contentRef.current) {
      contentRef.current.style.transform = '';
    }
    
    setIsDragging(false);
    setSwipeDirection(null);
  };
  
  // Cancel dragging if mouse leaves the element
  const onMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setSwipeDirection(null);
      if (contentRef.current) {
        contentRef.current.style.transform = '';
      }
    }
  };

  return (
    <div 
      className={`modal-overlay ${swiping || isDragging ? 'swiping' : ''} ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    > 
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        ref={contentRef}
      > 
        <button className="modal-close" onClick={onClose}>X</button>
        
        {filteredItems.length > 1 && (
          <div className="modal-pagination">
            {currentIndex + 1}/{filteredItems.length}
          </div>
        )}
        
        {mediaContent}
        <div className="modal-author">Photo by: {currentItem.Author || 'Unknown'}</div>
        
        <a href={originalUrl} className="download-link" download={sourceFilename}>
          Download Original {currentItem.MediaType === 'video' ? 'Video' : 'Image'}
        </a>
      </div>
    </div>
  );
}

// Helper function outside component
const getBaseFilename = (fullPath) => {
  if (!fullPath) return '';
  return fullPath.split('/').pop();
};

// Helper to get thumbnail filename (base + .jpg)
const getThumbnailFilename = (fullPath) => {
  const base = getBaseFilename(fullPath);
  if (!base) return '';
  const nameWithoutExt = base.substring(0, base.lastIndexOf('.')) || base;
  return `${nameWithoutExt}.jpg`;
};

// Helper to create a thumbnail URL from the video URL
const createThumbnailUrlFromVideo = (videoUrl) => {
  if (!videoUrl) return '';
  // For GitHub raw URLs (or any URLs ending in .mp4), replace .mp4 with .jpg
  if (videoUrl.endsWith('.mp4')) {
    return videoUrl.replace(/\.mp4$/, '.jpg');
  }
  // For other cases, just append .jpg (should not happen, but as fallback)
  return `${videoUrl}.jpg`;
};

// Helper to parse YYYY:MM:DD HH:MM:SS to Date object
const parseDateTime = (dateTimeStr) => {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return null;
  // Format: "YYYY:MM:DD HH:MM:SS"
  const parts = dateTimeStr.match(/(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})/);
  if (!parts) {
    console.warn('Could not parse date string format:', dateTimeStr);
    return null;
  }
  // parts[0] is the full match, parts[1] is Year, parts[2] is Month, etc.
  // Note: Month in JS Date is 0-indexed (0-11), so subtract 1 from month part.
  const year = parseInt(parts[1], 10);
  const month = parseInt(parts[2], 10) - 1; 
  const day = parseInt(parts[3], 10);
  const hour = parseInt(parts[4], 10);
  const minute = parseInt(parts[5], 10);
  const second = parseInt(parts[6], 10);

  const date = new Date(Date.UTC(year, month, day, hour, minute, second)); // Use UTC to avoid timezone issues

  // Check if the constructed date is valid
  if (isNaN(date.getTime())) {
     console.warn('Constructed invalid date for:', dateTimeStr);
     return null;
  }
  return date; 
};

// Helper to format Date object to YYYY-MM-DD string
const formatDateToYYYYMMDD = (date) => {
  if (!date || isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // +1 because months are 0-indexed, padStart for leading zero
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function App() {
  const [mediaItems, setMediaItems] = useState([]);
  const [groupedMedia, setGroupedMedia] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // State for modal

  // State for filters
  const [selectedType, setSelectedType] = useState('All');
  const [selectedAuthor, setSelectedAuthor] = useState('All');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState('All'); // Renamed from selectedDateString

  // State for filter options
  const [authors, setAuthors] = useState([]);
  const [dayOfWeekOptions, setDayOfWeekOptions] = useState([]); // Renamed from dateOptions

  useEffect(() => {
    const apiUrl = `${BACKEND_URL}/api/media`;
    console.log("Fetching media data from:", apiUrl);
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Fetched data (should include filter_day):", data);

        // Assuming backend now sends data with the 'filter_day' column
        // If not, the backend API route needs to be updated to read and send it.
        
        // No need to process dates here anymore if 'filter_day' is provided
        // const processedData = data.map(item => ...)

        // Extract unique authors and day names for filters
        // Use Set to get unique values, filter out null/empty strings, then sort.
        const uniqueAuthors = [...new Set(data.map(item => item.Author || 'Unknown Author'))].sort();
        const uniqueDays = [...new Set(data.map(item => item.filter_day).filter(day => day))];
        
        // Optional: Sort days logically (Sunday, Monday, ...) instead of alphabetically
        const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        uniqueDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

        console.log("Unique Authors:", uniqueAuthors);
        console.log("Unique Days of Week:", uniqueDays);

        setMediaItems(data); // Store raw data as fetched (assuming it has filter_day)
        setAuthors(uniqueAuthors);
        setDayOfWeekOptions(uniqueDays); // Set day options state
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching or processing media data:", error);
        setError(`Failed to load media data: ${error.message}`);
        setLoading(false);
        setAuthors([]);
        setDayOfWeekOptions([]); // Reset options on error
      });
  }, []);

  // Filter media items based on selected filters
  const filteredItems = useMemo(() => {
    console.log('Filtering with:', { selectedType, selectedAuthor, selectedDayOfWeek });
    const filtered = mediaItems.filter(item => {
      let keep = true;
      // Type filter
      if (selectedType !== 'All' && (!item.MediaType || item.MediaType.toLowerCase() !== selectedType.toLowerCase())) {
        keep = false;
      }
      // Author filter
      if (keep && selectedAuthor !== 'All' && (item.Author || 'Unknown Author') !== selectedAuthor) {
        keep = false;
      }
      // Day of Week filter
      if (keep && selectedDayOfWeek !== 'All') {
         // Directly compare with the 'filter_day' field from the data
         if (item.filter_day !== selectedDayOfWeek) {
             keep = false;
         }
      }
      return keep;
    });
    console.log('Filtered items count:', filtered.length);
    return filtered;
  }, [mediaItems, selectedType, selectedAuthor, selectedDayOfWeek]); // Dependency updated

  // Group filtered items by author
  const groupedFilteredMedia = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const author = item.Author || 'Unknown Author';
      if (!acc[author]) {
        acc[author] = [];
      }
      acc[author].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  // Event Handlers for filters
  const handleTypeChange = (event) => {
    console.log('Setting selected type:', event.target.value);
    setSelectedType(event.target.value);
  }
  const handleAuthorChange = (event) => {
     console.log('Setting selected author:', event.target.value);
     setSelectedAuthor(event.target.value);
  }
  const handleDayOfWeekChange = (event) => { // Renamed from handleDateStringChange
     console.log('Setting selected day of week:', event.target.value);
     setSelectedDayOfWeek(event.target.value);
  }

  // Store filtered items in window for use by modal
  useEffect(() => {
    window.filteredMediaItems = filteredItems;
  }, [filteredItems]);

  if (loading) {
    return <div className="container">Loading media data...</div>;
  }

  if (error) {
    return <div className="container error">{error}</div>;
  }

  return (
    <div className="container">
      <h1>Squeezy's Sahara Safari</h1>

      {/* --- Filter UI Area --- */}
      {!loading && !error && (
          <div className="filter-controls">
            {/* Type Filter Dropdown (Changed from Buttons) */}
            <div className="filter-group">
              <label htmlFor="type-select">Media:</label>
              <select 
                id="type-select" 
                value={selectedType} 
                onChange={handleTypeChange}
              >
                <option value="All">All Types</option>
                <option value="Image">Image</option>
                <option value="Video">Video</option>
              </select>
            </div>

            {/* Author Filter Dropdown (Remains the same) */}
            <div className="filter-group">
              <label htmlFor="author-select">Photo by:</label>
              <select 
                id="author-select" 
                value={selectedAuthor} 
                onChange={handleAuthorChange}
              >
                <option value="All">All Photos</option>
                {authors.map(author => (
                  <option key={author} value={author}>{author}</option>
                ))}
              </select>
            </div>

            {/* Day of Week Filter Dropdown */}
            <div className="filter-group">
              <label htmlFor="day-of-week-select">Day:</label> {/* Changed label */} 
              {console.log("Rendering DayOfWeek dropdown, dayOfWeekOptions state:", dayOfWeekOptions)} 
              <select 
                id="day-of-week-select" // Changed id
                value={selectedDayOfWeek} // Use new state variable
                onChange={handleDayOfWeekChange} // Use new handler
              >
                <option value="All">All Days</option> 
                {/* Use dayOfWeekOptions array */}
                {Array.isArray(dayOfWeekOptions) && dayOfWeekOptions.length > 0 ? (
                  dayOfWeekOptions.map(dayName => (
                    <option key={dayName} value={dayName}>{dayName}</option> // Use day name directly
                  ))
                ) : (
                  <option value="All" disabled>No days found</option> 
                )}
              </select>
            </div>
          </div>
      )}
      {/* --- End Filter UI Area --- */}

      {loading && <p>Loading media data...</p>} 
      {error && <p className="error">{error}</p>} 
      {!loading && !error && Object.keys(groupedFilteredMedia).length === 0 && (
        <p>No media items match the current filters.</p>
      )}
      {!loading && !error && (
        Object.entries(groupedFilteredMedia)
          .sort(([authorA], [authorB]) => authorA.localeCompare(authorB))
          .map(([author, items]) => ( 
          <div key={author} className="author-group">
            <h2>{author}</h2>
            <div className="thumbnail-grid">
              {items.map((item, index) => {
                const sourceFilename = getBaseFilename(item.Filename);
                let thumbnailUrl = '';
                
                if (item.MediaType && item.MediaType.toLowerCase() === 'image') {
                    thumbnailUrl = item.URL.replace('/sahara/media/', '/sahara/main/media/');
                } else if (item.MediaType && item.MediaType.toLowerCase() === 'video') {
                    // Use paths that work in both environments
                    thumbnailUrl = `${BACKEND_URL}/web_media/thumbnails/${getThumbnailFilename(item.Filename)}`;
                    const videoUrl = `${BACKEND_URL}/web_media/videos_480p/${getBaseFilename(item.Filename)}`;
                    
                    return (
                      <div
                        key={item.Filename || index}
                        className="thumbnail-item"
                        onClick={() => setSelectedItem(item)}
                        title={`Filename: ${sourceFilename}\nAuthor: ${item.Author || 'Unknown'}\nDay: ${item.filter_day || 'N/A'}`}
                      >
                        <div className="video-thumbnail-container">
                            <img src={thumbnailUrl} alt={`Thumbnail for ${sourceFilename}`} />
                            <div className="play-button-overlay"></div>
                        </div>
                      </div>
                    );
                } else {
                    // Placeholder for unknown type
                    return <div key={index} className="thumbnail-item error-thumb">?</div>;
                }

                const tooltipText = `Filename: ${sourceFilename}\nAuthor: ${item.Author || 'Unknown'}\nDay: ${item.filter_day || 'N/A'}`;

                return (
                  <div
                    key={item.Filename || index}
                    className="thumbnail-item"
                    onClick={() => setSelectedItem(item)}
                    title={tooltipText}
                  >
                    <img src={thumbnailUrl} alt={sourceFilename} loading="lazy" />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      
      {/* Render Modal when an item is selected */}
      <MediaModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      
    </div>
  );
}

export default App;
