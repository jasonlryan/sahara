import { useState, useEffect } from 'react';
import './App.css'; // We'll add styles here

// Define the base URL for the backend API and static assets
// This assumes the backend runs on port 3000
const BACKEND_URL = 'http://localhost:3000'; 

function App() {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setMediaItems(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching media data:", error);
        setError(`Failed to load media data: ${error.message}`);
        setLoading(false);
      });
  }, []); // Empty dependency array means this runs once on mount

  // Helper function to get base filename
  const getBaseFilename = (fullPath) => {
      if (!fullPath) return '';
      return fullPath.split('/').pop();
  }

  // Helper to get thumbnail filename (base + .jpg)
  const getThumbnailFilename = (fullPath) => {
      const base = getBaseFilename(fullPath);
      if (!base) return '';
      const nameWithoutExt = base.substring(0, base.lastIndexOf('.')) || base;
      return `${nameWithoutExt}.jpg`;
  }

  if (loading) {
    return <div className="container">Loading media data...</div>;
  }

  if (error) {
    return <div className="container error">{error}</div>;
  }

  return (
    <div className="container">
      <h1>Media Items</h1>
      {mediaItems.length === 0 ? (
        <p>No media items found.</p>
      ) : (
        mediaItems.map((item, index) => {
          const sourceFilename = getBaseFilename(item.Filename);
          const sourceUrl = `${BACKEND_URL}/${item.Filename}`; // Use full path from CSV
          
          return (
            <div className="media-item" key={item.Filename || index}> 
              <h2>Author: {item.Author || 'N/A'}</h2>
              <p>Source File: {sourceFilename}</p>
              <p>DateTime: {item.DateTime || 'N/A'}</p>
              
              {/* Conditional Rendering based on MediaType (case-insensitive) */}
              {item.MediaType && item.MediaType.toLowerCase() === 'image' ? (
                <>
                  <p>Original Size: {item.full_size || 'N/A'}</p>
                  <div className="image-container">
                    {/* 400px Image */}
                    <div>
                      <p>400px Wide:</p>
                      <div className="image-wrapper">
                        <img src={`${BACKEND_URL}/web_media/400/${sourceFilename}`} alt={`${sourceFilename} - 400px wide`} style={{ maxWidth: '400px' }} />
                        <p className="credit">Photo by: {item.Author || 'Unknown'}</p> 
                      </div>
                    </div>
                    {/* 800px Image */}
                     <div>
                      <p>800px Wide:</p>
                      <div className="image-wrapper">
                        <img src={`${BACKEND_URL}/web_media/800/${sourceFilename}`} alt={`${sourceFilename} - 800px wide`} style={{ maxWidth: '800px' }} />
                        <p className="credit">Photo by: {item.Author || 'Unknown'}</p> 
                      </div>
                    </div>
                    {/* 1024px Image */}
                    <div>
                      <p>1024px Wide:</p>
                      <div className="image-wrapper">
                        <img src={`${BACKEND_URL}/web_media/1024/${sourceFilename}`} alt={`${sourceFilename} - 1024px wide`} style={{ maxWidth: '1024px' }} />
                        <p className="credit">Photo by: {item.Author || 'Unknown'}</p> 
                      </div>
                    </div>
                  </div>
                  <a href={sourceUrl} className="download-link" download={sourceFilename}>
                    Download Original ({item.full_size || 'N/A'})
                  </a>
                </>
              ) : item.MediaType && item.MediaType.toLowerCase() === 'video' ? (
                <>
                  {/* Display Video Player */}
                  <div className="video-container">
                     {/* Construct URL for the 480p version */}
                     {(() => {
                         const sourceFilename = getBaseFilename(item.Filename);
                         const video480pUrl = `${BACKEND_URL}/web_media/videos_480p/${sourceFilename}`;
                         const thumbnailUrl = `${BACKEND_URL}/web_media/thumbnails/${getThumbnailFilename(item.Filename)}`;
                         const originalUrl = `${BACKEND_URL}/${item.Filename}`; // Keep original URL for download

                         return (
                            <>
                                <video 
                                    controls 
                                    preload="metadata" 
                                    poster={thumbnailUrl} 
                                    style={{ maxWidth: '640px', width: '100%', height: 'auto', border:'1px solid #ddd' }} 
                                >
                                    {/* Point src to the 480p version */}
                                    <source src={video480pUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                                <p className="credit">Video by: {item.Author || 'Unknown'}</p>
                                <a href={originalUrl} className="download-link" download={sourceFilename}>
                                     Download Original Video
                                 </a>
                            </>
                         );
                     })()} 
                  </div>
                </>
              ) : (
                 <p>Unknown media type: {item.MediaType}</p> 
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default App;
