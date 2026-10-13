
// MINI PHOTOSHOP STUDIO
// HTML5 Canvas + JavaScript


const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");

const canvasArea = document.getElementById("canvasArea");
const emptyState = document.getElementById("emptyState");
const statusText = document.getElementById("status");
const documentName = document.getElementById("documentName");
const dimensionsText = document.getElementById("imageDimensions");
const zoomValue = document.getElementById("zoomValue");
const toast = document.getElementById("toast");

// Separate transparent layer for drawing and text.
const overlay = document.createElement("canvas");
const overlayCtx = overlay.getContext("2d");

let originalImage = null;
let currentTool = "select";
let isDrawing = false;
let lastPoint = null;
let zoom = 1;
let toastTimer;

const defaults = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  opacity: 100,
  grayscale: 0,
  sepia: 0
};

let settings = { ...defaults };
let currentFilter = "normal";

let history = [];
let historyIndex = -1;
const MAX_HISTORY = 25;

const sliderIds = [
  "brightness",
  "contrast",
  "saturation",
  "blur",
  "opacity",
  "grayscale",
  "sepia"
];


function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function setStatus(message) {
  statusText.textContent = message;
}

function updateHistoryButtons() {
  document.getElementById("undoBtn").disabled =
    historyIndex <= 0;

  document.getElementById("redoBtn").disabled =
    historyIndex < 0 || historyIndex >= history.length - 1;
}

function updateZoomLabel() {
  zoomValue.textContent = Math.round(zoom * 100) + "%";
}



const uploadInputs = [
  document.getElementById("imageUpload"),
  document.getElementById("imageUploadSecondary"),
  document.getElementById("imageUploadEmpty")
];

uploadInputs.forEach(input => {
  input.addEventListener("change", event => {
    const file = event.target.files?.[0];

    // Allow selecting the same image again later.
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file.");
      return;
    }

    
    if (file.size > 25 * 1024 * 1024) {
      showToast("Image is too large. Choose an image under 25 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      showToast("Could not read the selected image.");
    };

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        try {
          loadImage(image, file.name);
        } catch (error) {
          console.error(error);
          showToast("Could not open this image.");
        }
      };

      image.onerror = () => {
        showToast("This image format could not be opened.");
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
});

function loadImage(image, filename) {
  originalImage = image;

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  overlay.width = image.naturalWidth;
  overlay.height = image.naturalHeight;

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  settings = { ...defaults };
  currentFilter = "normal";
  zoom = 1;

  sliderIds.forEach(id => {
    document.getElementById(id).value = defaults[id];
    updateSliderLabel(id);
  });

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === "normal"
    );
  });

  canvas.hidden = false;
  emptyState.hidden = true;

  documentName.textContent = filename;
  dimensionsText.textContent =
    `${image.naturalWidth} × ${image.naturalHeight} px`;

  canvas.style.width = "";
  canvas.style.height = "";
  canvas.style.maxWidth = "100%";
  canvas.style.maxHeight = "100%";

  render();
  saveHistory();
  fitCanvas();

  setStatus("Image loaded successfully");
  showToast("Image uploaded successfully!");
}

function requireImage() {
  if (originalImage) return true;

  showToast("First upload an image to start editing.");
  return false;
}



function getCanvasFilter() {
  return [
    `brightness(${settings.brightness}%)`,
    `contrast(${settings.contrast}%)`,
    `saturate(${settings.saturation}%)`,
    `blur(${settings.blur}px)`,
    `opacity(${settings.opacity}%)`,
    `grayscale(${settings.grayscale}%)`,
    `sepia(${settings.sepia}%)`
  ].join(" ");
}

function render() {
  if (!originalImage) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.filter = getCanvasFilter();
  ctx.drawImage(
    originalImage,
    0,
    0,
    canvas.width,
    canvas.height
  );
  ctx.restore();

  
  ctx.save();
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(overlay, 0, 0);
  ctx.restore();

  setStatus("Editing canvas");
}

// ---------- SLIDER ADJUSTMENTS ----------

function updateSliderLabel(id) {
  const value = Number(document.getElementById(id).value);
  const output = document.getElementById(id + "Value");

  if (!output) return;

  output.textContent =
    id === "blur" ? `${value}px` : `${value}%`;
}

sliderIds.forEach(id => {
  document.getElementById(id).addEventListener("input", event => {
    settings[id] = Number(event.target.value);
    updateSliderLabel(id);
    render();
  });

  document.getElementById(id).addEventListener("change", () => {
    if (!originalImage) return;

    saveHistory();
    setStatus("Adjustment applied");
  });
});


const filterPresets = {
  normal: {
    ...defaults
  },

  vintage: {
    ...defaults,
    brightness: 105,
    contrast: 90,
    saturation: 75,
    sepia: 38
  },

  bw: {
    ...defaults,
    contrast: 115,
    saturation: 0,
    grayscale: 100
  },

  warm: {
    ...defaults,
    brightness: 105,
    saturation: 125,
    sepia: 20
  },

  cool: {
    ...defaults,
    brightness: 105,
    contrast: 105,
    saturation: 110,
    sepia: 0
  },

  dramatic: {
    ...defaults,
    contrast: 150,
    saturation: 80,
    brightness: 95
  }
};

document.querySelectorAll(".filter-btn").forEach(button => {
  button.addEventListener("click", () => {
    if (!requireImage()) return;

    const filterName = button.dataset.filter;
    currentFilter = filterName;
    settings = { ...filterPresets[filterName] };

    sliderIds.forEach(id => {
      document.getElementById(id).value = settings[id];
      updateSliderLabel(id);
    });

    document.querySelectorAll(".filter-btn").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    render();
    saveHistory();
    showToast(`${button.textContent.trim()} filter applied`);
  });
});



document.querySelectorAll(".tool[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    currentTool = button.dataset.tool;

    document.querySelectorAll(".tool[data-tool]").forEach(tool => {
      tool.classList.toggle("active", tool === button);
    });

    canvas.style.cursor =
      currentTool === "brush" ? "crosshair" :
      currentTool === "eraser" ? "cell" :
      currentTool === "text" ? "text" :
      currentTool === "hand" ? "grab" :
      "default";

    if (currentTool === "text") {
      document.getElementById("textInput").focus();
    }

    showToast(`${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)} tool selected`);
  });
});



const brushSizeInput = document.getElementById("brushSize");
const brushColorInput = document.getElementById("brushColor");

brushSizeInput.addEventListener("input", () => {
  document.getElementById("brushSizeValue").textContent =
    brushSizeInput.value + "px";
});

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height
  };
}

function startStroke(event) {
  if (!originalImage) return;

  if (currentTool !== "brush" && currentTool !== "eraser") {
    return;
  }

  event.preventDefault();
  isDrawing = true;
  lastPoint = getPointerPosition(event);

  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (_) {
    // Pointer capture is optional.
  }

  overlayCtx.save();
  overlayCtx.lineWidth = Number(brushSizeInput.value);
  overlayCtx.lineCap = "round";
  overlayCtx.lineJoin = "round";

  if (currentTool === "eraser") {
    overlayCtx.globalCompositeOperation = "destination-out";
    overlayCtx.strokeStyle = "rgba(0,0,0,1)";
    overlayCtx.fillStyle = "rgba(0,0,0,1)";
  } else {
    overlayCtx.globalCompositeOperation = "source-over";
    overlayCtx.strokeStyle = brushColorInput.value;
    overlayCtx.fillStyle = brushColorInput.value;
  }

  
  overlayCtx.beginPath();
  overlayCtx.arc(
    lastPoint.x,
    lastPoint.y,
    Number(brushSizeInput.value) / 2,
    0,
    Math.PI * 2
  );
  overlayCtx.fill();

  overlayCtx.restore();
  render();
}

function continueStroke(event) {
  if (!isDrawing || !lastPoint) return;

  event.preventDefault();

  const point = getPointerPosition(event);

  overlayCtx.save();
  overlayCtx.lineWidth = Number(brushSizeInput.value);
  overlayCtx.lineCap = "round";
  overlayCtx.lineJoin = "round";

  if (currentTool === "eraser") {
    overlayCtx.globalCompositeOperation = "destination-out";
    overlayCtx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    overlayCtx.globalCompositeOperation = "source-over";
    overlayCtx.strokeStyle = brushColorInput.value;
  }

  overlayCtx.beginPath();
  overlayCtx.moveTo(lastPoint.x, lastPoint.y);
  overlayCtx.lineTo(point.x, point.y);
  overlayCtx.stroke();
  overlayCtx.restore();

  lastPoint = point;
  render();
}

function finishStroke() {
  if (!isDrawing) return;

  isDrawing = false;
  lastPoint = null;
  saveHistory();
}

canvas.addEventListener("pointerdown", startStroke);
canvas.addEventListener("pointermove", continueStroke);
canvas.addEventListener("pointerup", finishStroke);
canvas.addEventListener("pointercancel", finishStroke);
canvas.addEventListener("lostpointercapture", finishStroke);

// ---------- TEXT TOOL ----------

document.getElementById("addTextBtn").addEventListener("click", addText);

document.getElementById("textInput").addEventListener("keydown", event => {
  if (event.key === "Enter") addText();
});

function addText() {
  if (!requireImage()) return;

  const text = document.getElementById("textInput").value.trim();

  if (!text) {
    showToast("Please enter some text first.");
    return;
  }

  const fontSize = Math.max(
    8,
    Math.min(200, Number(document.getElementById("fontSize").value) || 36)
  );

  const color = document.getElementById("textColor").value;

  overlayCtx.save();
  overlayCtx.globalCompositeOperation = "source-over";
  overlayCtx.globalAlpha = 1;
  overlayCtx.fillStyle = color;
  overlayCtx.font = `700 ${fontSize}px Arial, sans-serif`;
  overlayCtx.textAlign = "center";
  overlayCtx.textBaseline = "middle";

  
  overlayCtx.shadowColor = "rgba(0,0,0,0.65)";
  overlayCtx.shadowBlur = Math.max(2, fontSize / 10);
  overlayCtx.shadowOffsetX = 1;
  overlayCtx.shadowOffsetY = 2;

  overlayCtx.fillText(
    text,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.9
  );

  overlayCtx.restore();

  render();
  saveHistory();
  setStatus("Text added");
  showToast("Text added to your image!");
}


function saveHistory() {
  if (!originalImage) return;

  
  history = history.slice(0, historyIndex + 1);

  history.push({
    overlay: overlayCtx.getImageData(
      0,
      0,
      overlay.width,
      overlay.height
    ),
    settings: { ...settings },
    filter: currentFilter
  });

  if (history.length > MAX_HISTORY) {
    history.shift();
  }

  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;

  const state = history[index];

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  overlayCtx.putImageData(state.overlay, 0, 0);

  settings = { ...state.settings };
  currentFilter = state.filter;

  sliderIds.forEach(id => {
    document.getElementById(id).value = settings[id];
    updateSliderLabel(id);
  });

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === currentFilter
    );
  });

  historyIndex = index;
  render();
  updateHistoryButtons();
  setStatus("History restored");
}

document.getElementById("undoBtn").addEventListener("click", () => {
  if (!requireImage()) return;

  if (historyIndex > 0) {
    restoreHistory(historyIndex - 1);
    showToast("Undo successful");
  } else {
    showToast("Nothing to undo.");
  }
});

document.getElementById("redoBtn").addEventListener("click", () => {
  if (!requireImage()) return;

  if (historyIndex < history.length - 1) {
    restoreHistory(historyIndex + 1);
    showToast("Redo successful");
  } else {
    showToast("Nothing to redo.");
  }
});



document.getElementById("resetBtn").addEventListener("click", () => {
  if (!requireImage()) return;

  const confirmed = confirm(
    "Reset all edits and return to the original image?"
  );

  if (!confirmed) return;

  settings = { ...defaults };
  currentFilter = "normal";

  sliderIds.forEach(id => {
    document.getElementById(id).value = defaults[id];
    updateSliderLabel(id);
  });

  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === "normal"
    );
  });

  render();
  saveHistory();
  showToast("Image edits have been reset.");
});



function setZoom(value) {
  if (!requireImage()) return;

  zoom = Math.max(0.1, Math.min(3, value));

  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  canvas.style.width = `${canvas.width * zoom}px`;
  canvas.style.height = `${canvas.height * zoom}px`;

  updateZoomLabel();
}

document.getElementById("zoomIn").addEventListener("click", () => {
  setZoom(zoom + 0.1);
});

document.getElementById("zoomOut").addEventListener("click", () => {
  setZoom(zoom - 0.1);
});

function fitCanvas() {
  if (!originalImage) return;

  const availableWidth = Math.max(100, canvasArea.clientWidth - 50);
  const availableHeight = Math.max(100, canvasArea.clientHeight - 50);

  zoom = Math.min(
    availableWidth / canvas.width,
    availableHeight / canvas.height,
    1
  );

  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
  canvas.style.width = `${canvas.width * zoom}px`;
  canvas.style.height = `${canvas.height * zoom}px`;

  updateZoomLabel();
}

document.getElementById("fitBtn").addEventListener("click", fitCanvas);



function downloadImage(format) {
  if (!requireImage()) return;

  try {
    render();

    const mimeType =
      format === "jpg" ? "image/jpeg" : "image/png";

    const extension =
      format === "jpg" ? "jpg" : "png";

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const exportCtx = exportCanvas.getContext("2d");

    
    if (format === "jpg") {
      exportCtx.fillStyle = "#ffffff";
      exportCtx.fillRect(
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
      );
    }

    exportCtx.drawImage(canvas, 0, 0);

    exportCanvas.toBlob(blob => {
      if (!blob) {
        showToast("Export failed. Please try again.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const baseName = documentName.textContent
        .replace(/\.[^.]+$/, "")
        .replace(/[<>:"/\\|?*]/g, "_")
        .trim() || "edited-image";

      link.href = url;
      link.download = `${baseName}-edited.${extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1500);

      setStatus("Image exported");
      showToast(`Image exported as ${extension.toUpperCase()}!`);
    }, mimeType, format === "jpg" ? 0.92 : undefined);

  } catch (error) {
    console.error("Export error:", error);
    showToast("Could not export the image.");
  }
}

document.getElementById("downloadPng").addEventListener("click", () => {
  downloadImage("png");
});

document.getElementById("downloadPngPanel").addEventListener("click", () => {
  downloadImage("png");
});

document.getElementById("downloadJpg").addEventListener("click", () => {
  downloadImage("jpg");
});



updateHistoryButtons();
updateZoomLabel();