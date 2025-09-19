'use client';

import { useState } from 'react';

// Make sure your backend URL is correct
const BACKEND_URL = 'http://localhost:8000';

export default function HomePage() {
  // 'source' will hold the full URL for the video stream
  const [source, setSource] = useState(null);
  
  // State for managing file uploads
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 'mode' determines which UI to show: 'webcam' or 'upload'
  const [mode, setMode] = useState('webcam');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a video file first!');
      return;
    }

    setIsLoading(true);
    setSource(null); // Clear previous source

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const response = await fetch(`${BACKEND_URL}/upload_video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Video upload failed');
      }

      const data = await response.json();
      // Set the source to the new streaming URL for the uploaded video
      setSource(`${BACKEND_URL}/video_feed/${data.filename}`);

    } catch (error) {
      console.error('Error uploading video:', error);
      alert('An error occurred during upload.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const startWebcam = () => {
    setIsLoading(false);
    // Point the source to the webcam feed endpoint
    setSource(`${BACKEND_URL}/webcam_feed`);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Live YOLO Inference 🚀</h1>
      <p style={styles.subtitle}>Choose a source to begin processing.</p>
      
      <div style={styles.controls}>
        <button 
          onClick={() => setMode('webcam')}
          style={mode === 'webcam' ? styles.activeButton : styles.button}
        >
          Use Webcam
        </button>
        <button 
          onClick={() => setMode('upload')}
          style={mode === 'upload' ? styles.activeButton : styles.button}
        >
          Upload Video
        </button>
      </div>

      {mode === 'upload' && (
        <div style={styles.uploadSection}>
          <input type="file" accept="video/*" onChange={handleFileChange} style={styles.fileInput} />
          <button onClick={handleUpload} disabled={!selectedFile || isLoading} style={styles.button}>
            {isLoading ? 'Uploading...' : 'Process Uploaded Video'}
          </button>
        </div>
      )}
      
      {mode === 'webcam' && (
        <div style={styles.webcamSection}>
          <button onClick={startWebcam} style={styles.button}>Start Webcam Feed</button>
        </div>
      )}

      <div style={styles.videoContainer}>
        {isLoading && <p>Processing video, please wait...</p>}
        {source ? (
          <img src={source} alt="Video Stream" style={styles.videoStream} />
        ) : (
          <div style={styles.placeholder}>
            <p>Your video stream will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Basic CSS-in-JS for styling
const styles = {
  container: { fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem', color: '#333' },
  title: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  subtitle: { fontSize: '1.2rem', color: '#666', marginBottom: '2rem' },
  controls: { display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' },
  button: { padding: '0.8rem 1.5rem', fontSize: '1rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f0f0f0' },
  activeButton: { padding: '0.8rem 1.5rem', fontSize: '1rem', cursor: 'pointer', border: '1px solid #0070f3', borderRadius: '8px', backgroundColor: '#0070f3', color: 'white' },
  uploadSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
  webcamSection: { display: 'flex', justifyContent: 'center', marginTop: '1rem' },
  fileInput: { border: '1px solid #ccc', padding: '0.5rem', borderRadius: '8px' },
  videoContainer: { marginTop: '2rem', border: '2px dashed #ccc', borderRadius: '8px', minHeight: '480px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  videoStream: { maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px' },
  placeholder: { color: '#888' },
};