import { useState, useEffect } from 'react';
import './App.css'; // We'll add styles here

// Define the base URL for the backend API and static assets
// This assumes the backend runs on port 3000
const BACKEND_URL = 'http://localhost:3000'; 

// Simple Modal Component (Placeholder for now)
function MediaModal({ item, onClose }) {
  if (!item) return null;

  const sourceFilename = getBaseFilename(item.Filename);
  const originalUrl = `${BACKEND_URL}/${item.Filename}`;

  // Determine content based on media type
  let mediaContent;
  if (item.MediaType && item.MediaType.toLowerCase() === 'image') {
      const web800Url = `${BACKEND_URL}/web_media/800/${sourceFilename}`;
      const web1024Url = `${BACKEND_URL}/web_media/1024/${sourceFilename}`;
      mediaContent = (
          <div className="modal-image-viewer">
              <div>
                  <p>Medium (800px wide):</p>
                  <img src={web800Url} alt={`${sourceFilename} - 800px`} />
              </div>
              <div>
                  <p>Large (1024px wide):</p>
                  <img src={web1024Url} alt={`${sourceFilename} - 1024px`} />
              </div>
          </div>
      );
  } else if (item.MediaType && item.MediaType.toLowerCase() === 'video') {
      const video480pUrl = `${BACKEND_URL}/web_media/videos_480p/${sourceFilename}`;
      const thumbnailUrl = `${BACKEND_URL}/web_media/thumbnails/${getThumbnailFilename(item.Filename)}`;
      mediaContent = (
          <div className="modal-video-viewer">
              <video 
                  controls 
                  preload="metadata" 
                  poster={thumbnailUrl} 
                  style={{ maxWidth: '100%', maxHeight: '60vh' }} // Constrain video size in modal
              >
                  <source src={video480pUrl} type="video/mp4" />
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

function App() {
  const [mediaItems, setMediaItems] = useState([]);
  const [groupedMedia, setGroupedMedia] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // State for modal

  useEffect(() => {
    // Fetch data from the backend API
    fetch(`${BACKEND_URL}/api/media`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setMediaItems(data); // Keep original list if needed
        
        // Group data by Author
        const groups = data.reduce((acc, item) => {
          const author = item.Author || 'Unknown Author';
          if (!acc[author]) {
            acc[author] = [];
          }
          acc[author].push(item);
          return acc;
        }, {});
        setGroupedMedia(groups);
        
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching media data:", error);
        setError(`Failed to load media data: ${error.message}`);
        setLoading(false);
      });
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return <div className="container">Loading media data...</div>;
  }

  if (error) {
    return <div className="container error">{error}</div>;
  }

  return (
    <div className="container">
      <h1>Media Gallery</h1>
      {Object.keys(groupedMedia).length === 0 ? (
        <p>No media items found.</p>
      ) : (
        Object.entries(groupedMedia).map(([author, items]) => (
          <div key={author} className="author-group">
            <h2>{author}</h2>
            <div className="thumbnail-grid">
              {items.map((item, index) => {
                const sourceFilename = getBaseFilename(item.Filename);
                let thumbnailUrl = '';
                
                if (item.MediaType && item.MediaType.toLowerCase() === 'image') {
                    thumbnailUrl = `${BACKEND_URL}/web_media/400/${sourceFilename}`; // Use 400px as thumb
                } else if (item.MediaType && item.MediaType.toLowerCase() === 'video') {
                    thumbnailUrl = `${BACKEND_URL}/web_media/thumbnails/${getThumbnailFilename(item.Filename)}`;
                } else {
                     // Placeholder for unknown type - or skip
                     return <div key={index} className="thumbnail-item error-thumb">?</div>;
                }

                return (
                  <div 
                    key={item.Filename || index} 
                    className="thumbnail-item" 
                    onClick={() => setSelectedItem(item)} // Set selected item on click
                    title={`Filename: ${sourceFilename}\nDateTime: ${item.DateTime || 'N/A'}`} // Tooltip
                  >
                    <img src={thumbnailUrl} alt={sourceFilename} loading="lazy" />
                    {/* Optional: Add credit overlay on thumbnail? */}
                     {/* <span className="thumb-credit">{item.Author}</span> */}
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
