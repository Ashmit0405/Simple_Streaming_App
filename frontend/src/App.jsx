import React, { useState, useRef } from "react";
import axios from "axios"; // For making HTTP requests
import VideoPlayer from "./VideoPlayer"; // Import your custom video player component
import videojs from "video.js"; // Import videojs

function App() {
  const [videoLink, setVideoLink] = useState(""); // To store the video link dynamically
  const playerRef = useRef(null);

  const handleFileUpload = async (event) => {
    event.preventDefault();
    const file = event.target.fileInput.files[0]; // Access the uploaded file

    // Create form data
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Send the file to the server (update the endpoint accordingly)
      const response = await axios.post("http://localhost:8000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Assuming the response contains the video URL
      const videoURL = response.data.video_url;
      setVideoLink(videoURL); // Set the video link dynamically
    } catch (error) {
      console.error("Error uploading the file:", error);
    }
  };

  const videoPlayerOptions = {
    controls: true,
    responsive: true,
    fluid: true,
    sources: videoLink
      ? [
          {
            src: videoLink,
            type: "application/x-mpegURL",
          },
        ]
      : [],
  };

  const handlePlayerReady = (player) => {
    playerRef.current = player;

    player.on("waiting", () => {
      videojs.log("player is waiting");
    });

    player.on("dispose", () => {
      videojs.log("player will dispose");
    });
  };

  return (
    <>
      <div>
        <h1>Video Player</h1>
        {/* File upload form */}
        <form onSubmit={handleFileUpload}>
          <input type="file" name="fileInput" accept="video/*" />
          <button type="submit">Upload Video</button>
        </form>

        {/* Conditionally render the video player only if a video link is available */}
        {videoLink && (
          <VideoPlayer options={videoPlayerOptions} onReady={handlePlayerReady} />
        )}
      </div>
    </>
  );
}

export default App;
