/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import React, { useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom/client";

const App = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "Warming up the AI artists...",
    "This can take a few minutes...",
    "Rendering the digital canvas...",
    "Composing the video frames...",
    "Adding a touch of magic...",
    "Polishing the final pixels...",
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // remove data:image/jpeg;base64,
        const base64 = result.split(',')[1];
        setImageBase64(base64);
        setGeneratedVideoUrl(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    } else {
      setError("Please select a valid image file.");
    }
  };
  
  const triggerFileSelect = () => fileInputRef.current?.click();

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImageBase64(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleGenerateVideo = async () => {
    if (!imageBase64 || !imageFile) {
      setError("Please provide an image.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);
    
    let messageIndex = 0;
    setLoadingMessage(loadingMessages[messageIndex]);
    const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
    }, 5000);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const hardcodedPrompt = "Animate this image subtly. The camera must remain completely still, with no zoom, pan, or tilt. Create gentle, natural motion only within the scene itself, creating a cinemagraph effect.";
      
      let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: hardcodedPrompt,
        image: {
          imageBytes: imageBase64,
          mimeType: imageFile.type,
        },
        config: {
          numberOfVideos: 1,
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        const videoBlob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        setGeneratedVideoUrl(videoUrl);
      } else {
        throw new Error("Video generation did not return a valid link.");
      }

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
      clearInterval(messageInterval);
    }
  };

  const ImageUploader = () => (
    <div className="image-uploader" onClick={triggerFileSelect} role="button" tabIndex={0} aria-label="Upload an image">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        aria-hidden="true"
      />
      {imageBase64 ? (
        <div className="image-preview-container">
            <img src={`data:${imageFile?.type};base64,${imageBase64}`} alt="Preview" className="image-preview" />
            <div className="image-controls">
                <button onClick={removeImage} aria-label="Remove image">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M7 19q-.825 0-1.412-.587Q5 17.825 5 17V6h-.5q-.2 0-.35-.15t-.15-.35q0-.2.15-.35t.35-.15H8.5q0-.675.463-1.137Q9.425 3 10.1 3h3.8q.675 0 1.138.463Q15.5 3.825 15.5 4.5H19q.2 0 .35.15t.15.35q0 .2-.15.35t-.35.15H19v11q0 .825-.587 1.413Q17.825 19 17 19Zm10-13H7v11h10Z"></path></svg>
                </button>
            </div>
        </div>
      ) : (
        <div className="upload-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M19 20H5V6h10V4H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V10h-2v10z"></path><path d="M21 4h-4l-2-2h-4L9 4H5v2h16V4z"></path><path d="M14 14h-4v-4h4v4zm-2-6V6h-2v2h2zm4 2h2v2h-2v-2zm-6 4h2v2h-2v-2z"></path></svg>
            <span>Upload Image</span>
        </div>
      )}
    </div>
  );

  const OutputDisplay = () => {
    if (isLoading) {
      return (
        <div className="loading-indicator" aria-live="polite">
          <div className="spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      );
    }
    if (error) {
        return <div className="error-message" role="alert">{error}</div>
    }
    if (generatedVideoUrl) {
      return (
        <video id="generated-video" src={generatedVideoUrl} controls autoPlay loop aria-label="Generated video"></video>
      );
    }
    return (
      <div className="output-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="64" height="64"><path d="M10 15.5v-7l5.408 3.5L10 15.5zM4 21q-.825 0-1.412-.587Q2 19.825 2 19V5q0-.825.588-1.412Q3.175 3 4 3h16q.825 0 1.413.588Q22 4.175 22 5v14q0 .825-.587 1.413Q20.825 21 20 21Zm0-2h16V5H4v14Z"></path></svg>
        <p>Your generated video will appear here.</p>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header>
        <h1>AI Video Generator</h1>
      </header>
      <main className="main-content">
        <section className="input-section" aria-labelledby="input-heading">
          <h2 id="input-heading">Generate videos with Veo</h2>
          <ImageUploader />
          <button
            className="generate-button"
            onClick={handleGenerateVideo}
            disabled={!imageBase64 || isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </section>
        <section className="output-section" aria-labelledby="output-heading">
          <h2 id="output-heading" className="sr-only">Output</h2>
          <OutputDisplay/>
        </section>
      </main>
    </div>
  );
};

// Add a sr-only class for accessibility
const style = document.createElement('style');
style.textContent = '.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }';
document.head.append(style);

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);