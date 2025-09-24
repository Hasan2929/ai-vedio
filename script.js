import { GoogleGenAI } from "https://aistudiocdn.com/@google/genai@^1.20.0";

// --- DOM Element Selection ---
const imageUploader = document.querySelector('.image-uploader');
const fileInput = document.getElementById('file-input');
const generateButton = document.querySelector('.generate-button');
const outputSection = document.querySelector('.output-section');

// --- State Variables ---
let imageFile = null;
let imageBase64 = null;
const apiKey = "AIzaSyDvBOnU7VoBIlO5R4Roapyr7aA6akrgduA"; 

const loadingMessages = [
  "Warming up the AI artists...",
  "This can take a few minutes...",
  "Rendering the digital canvas...",
  "Composing the video frames...",
  "Adding a touch of magic...",
  "Polishing the final pixels...",
];
let messageInterval;

// --- UI Update Functions ---
function showLoading(isLoading) {
  if (isLoading) {
    let messageIndex = 0;
    outputSection.innerHTML = `
      <div class="loading-indicator" aria-live="polite">
        <div class="spinner"></div>
        <p id="loading-message">${loadingMessages[messageIndex]}</p>
      </div>`;
    messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        const msgElement = document.getElementById('loading-message');
        if (msgElement) {
            msgElement.textContent = loadingMessages[messageIndex];
        }
    }, 5000);
    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';
  } else {
    clearInterval(messageInterval);
    generateButton.disabled = false;
    generateButton.textContent = 'Generate';
  }
}

function showError(message) {
  outputSection.innerHTML = `<div class="error-message" role="alert">${message}</div>`;
}

function showVideo(videoUrl) {
  outputSection.innerHTML = `
    <video id="generated-video" src="${videoUrl}" controls autoPlay loop aria-label="Generated video"></video>
  `;
}

function showPlaceholder() {
    outputSection.innerHTML = `
        <div class="output-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="64" height="64"><path d="M10 15.5v-7l5.408 3.5L10 15.5zM4 21q-.825 0-1.412-.587Q2 19.825 2 19V5q0-.825.588-1.412Q3.175 3 4 3h16q.825 0 1.413.588Q22 4.175 22 5v14q0 .825-.587 1.413Q20.825 21 20 21Zm0-2h16V5H4v14Z"></path></svg>
            <p>Your generated video will appear here.</p>
        </div>
    `;
}

function updateImagePreview() {
  if (imageBase64 && imageFile) {
    imageUploader.innerHTML = `
      <div class="image-preview-container">
        <img src="data:${imageFile.type};base64,${imageBase64}" alt="Preview" class="image-preview" />
        <div class="image-controls">
          <button id="remove-image-btn" aria-label="Remove image">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M7 19q-.825 0-1.412-.587Q5 17.825 5 17V6h-.5q-.2 0-.35-.15t-.15-.35q0-.2.15-.35t.35-.15H8.5q0-.675.463-1.137Q9.425 3 10.1 3h3.8q.675 0 1.138.463Q15.5 3.825 15.5 4.5H19q.2 0 .35.15t.15.35q0 .2-.15.35t-.35-.15H19v11q0 .825-.587 1.413Q17.825 19 17 19Zm10-13H7v11h10Z"></path></svg>
          </button>
        </div>
      </div>`;
    document.getElementById('remove-image-btn').addEventListener('click', removeImage);
  } else {
    imageUploader.innerHTML = `
      <div class="upload-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M19 20H5V6h10V4H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V10h-2v10z"></path><path d="M21 4h-4l-2-2h-4L9 4H5v2h16V4z"></path><path d="M14 14h-4v-4h4v4zm-2-6V6h-2v2h2zm4 2h2v2h-2v-2zm-6 4h2v2h-2v-2z"></path></svg>
        <span>Upload Image</span>
      </div>`;
  }
}

// --- Event Handlers ---
function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    imageFile = file;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      imageBase64 = result.split(',')[1];
      updateImagePreview();
      showPlaceholder();
      generateButton.disabled = false;
    };
    reader.readAsDataURL(file);
  } else {
    alert("Please select a valid image file.");
  }
}

function triggerFileSelect() {
  fileInput.click();
}

function removeImage(e) {
  e.stopPropagation();
  imageFile = null;
  imageBase64 = null;
  fileInput.value = "";
  generateButton.disabled = true;
  updateImagePreview();
}

async function handleGenerateVideo() {
  if (!imageBase64 || !imageFile) {
    alert("Please provide an image.");
    return;
  }

  showLoading(true);

  try {
    const ai = new GoogleGenAI({ apiKey });
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
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
      if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }
      const videoBlob = await videoResponse.blob();
      const videoUrl = URL.createObjectURL(videoBlob);
      showVideo(videoUrl);
    } else {
      throw new Error("Video generation did not return a valid link.");
    }
  } catch (err) {
    console.error("Full API Error:", err);
    let userMessage = "An error occurred during video generation. This could be due to an invalid API key or service restrictions on your Google Cloud project. Please check the console for details.";
    if (err.message.includes('400')) {
        userMessage = "API Key is not valid. Please ensure you have a valid key from a Google Cloud project with billing enabled and the Generative Language API active.";
    }
    showError(userMessage);
  } finally {
    showLoading(false);
  }
}

// --- Initial Setup ---
imageUploader.addEventListener('click', triggerFileSelect);
fileInput.addEventListener('change', handleFileChange);
generateButton.addEventListener('click', handleGenerateVideo);
generateButton.disabled = true; // Initially disabled
