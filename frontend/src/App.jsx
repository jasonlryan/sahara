import { useState, useEffect, useMemo } from 'react';
import './App.css'; // We'll add styles here

// Define the base URL for the backend API and static assets
const BACKEND_URL = ''; // Empty string means use relative URLs

// Simple Modal Component (Placeholder for now)
function MediaModal({ item, onClose }) {
  if (!item) return null;

  const sourceFilename = getBaseFilename(item.Filename);
  const originalUrl = item.URL; // Use the GitHub raw URL

  // Determine content based on media type
  let mediaContent;
  if (item.MediaType && item.MediaType.toLowerCase() === 'image') {
      mediaContent = (
          <div className="modal-image-viewer">
              <div>
                  <img src={item.URL} alt={sourceFilename} style={{ maxWidth: '100%', height: 'auto' }} />
              </div>
          </div>
      );
  } else if (item.MediaType && item.MediaType.toLowerCase() === 'video') {
      const thumbnailUrl = `${BACKEND_URL}/web_media/thumbnails/${getThumbnailFilename(item.Filename)}`;
      mediaContent = (
          <div className="modal-video-viewer">
              <video 
                  controls 
                  preload="metadata" 
                  poster={thumbnailUrl} 
                  style={{ maxWidth: '100%', maxHeight: '60vh' }}
                  playsInline
                  webkit-playsinline="true"
              >
                  <source src={item.URL} type="video/mp4" />
                  Your browser does not support the video tag.
              </video>
          </div>
      );
  } else {
      mediaContent = <p>Preview not available for this media type.</p>;
  }

  return (
    <div className="modal-overlay" onClick={onClose}> 
      <div className="modal-content" onClick={e => e.stopPropagation()}> 
        <button className="modal-close" onClick={onClose}>X</button>
        <h2>{item.Author || 'Unknown'} - {sourceFilename}</h2>
        <hr />
        {mediaContent}
        <hr />
        <a href={originalUrl} className="download-link" download={sourceFilename}>
          Download Original {item.MediaType === 'video' ? 'Video' : 'Image'}
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
    fetch(`${BACKEND_URL}/api/media`)
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
              <label htmlFor="author-select">Author:</label>
              <select 
                id="author-select" 
                value={selectedAuthor} 
                onChange={handleAuthorChange}
              >
                <option value="All">All Authors</option>
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
                    thumbnailUrl = item.URL; // Use the GitHub raw URL
                } else if (item.MediaType && item.MediaType.toLowerCase() === 'video') {
                    thumbnailUrl = `${BACKEND_URL}/web_media/thumbnails/${getThumbnailFilename(item.Filename)}`;
                    const video480pUrl = item.URL; // Use the GitHub raw URL
                    return (
                      <div
                        key={item.Filename || index}
                        className="thumbnail-item"
                        title={`Filename: ${sourceFilename}\nAuthor: ${item.Author || 'Unknown'}\nDay: ${item.filter_day || 'N/A'}`}
                      >
                        <video 
                            controls
                            preload="none"
                            poster={thumbnailUrl}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            playsInline
                            webkit-playsinline="true"
                        >
                            <source src={video480pUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
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
