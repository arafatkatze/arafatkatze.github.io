(() => {
  const canvas = document.getElementById("pixel-board-canvas");
  const paletteContainer = document.getElementById("pixel-palette");
  const colorPicker = document.getElementById("pixel-custom-color");
  const zoomInput = document.getElementById("pixel-zoom");
  const zoomValue = document.getElementById("pixel-zoom-value");
  const selectedValue = document.getElementById("pixel-selected-value");
  const filledCount = document.getElementById("pixel-filled-count");
  const hoverCell = document.getElementById("pixel-hover-cell");
  const clearButton = document.getElementById("pixel-clear");
  const randomizeButton = document.getElementById("pixel-randomize");
  const downloadButton = document.getElementById("pixel-download");

  if (
    !canvas ||
    !paletteContainer ||
    !colorPicker ||
    !zoomInput ||
    !zoomValue ||
    !selectedValue ||
    !filledCount ||
    !hoverCell ||
    !clearButton ||
    !randomizeButton ||
    !downloadButton
  ) {
    return;
  }

  const BOARD_SIZE = 64;
  const EMPTY_COLOR = "#ffffff";
  const STORAGE_KEY = "pixel_board_state_v1";
  const QUICK_COLORS = [
    "#7f5af0",
    "#2cb67d",
    "#ef4565",
    "#f59e0b",
    "#3da9fc",
    "#14b8a6",
    "#a855f7",
    "#f97316",
    "#22c55e",
    "#0ea5e9",
    "#111827",
    "#ffffff",
  ];
  const MIN_PIXEL_SIZE = 8;
  const MAX_PIXEL_SIZE = 24;
  const ctx = canvas.getContext("2d");

  let selectedColor = normalizeHexColor(colorPicker.value) || QUICK_COLORS[0];
  let pixelSize = clamp(Number.parseInt(zoomInput.value, 10) || 12, MIN_PIXEL_SIZE, MAX_PIXEL_SIZE);
  let pixels = new Array(BOARD_SIZE * BOARD_SIZE).fill(EMPTY_COLOR);
  let isDrawing = false;
  let lastPaintedIndex = -1;
  let persistTimer = null;

  createPalette();
  hydrateState();
  setSelectedColor(selectedColor);
  setPixelSize(pixelSize);
  renderBoard();
  updateFilledCount();

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", onMouseLeave);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("mouseup", stopDrawing);

  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", stopDrawing);
  canvas.addEventListener("touchcancel", stopDrawing);

  colorPicker.addEventListener("input", (event) => {
    setSelectedColor(event.target.value);
    schedulePersist();
  });

  zoomInput.addEventListener("input", (event) => {
    const nextSize = Number.parseInt(event.target.value, 10) || 12;
    setPixelSize(nextSize);
    schedulePersist();
  });

  clearButton.addEventListener("click", () => {
    const shouldClear = window.confirm("Clear the entire board?");
    if (!shouldClear) return;

    pixels = new Array(BOARD_SIZE * BOARD_SIZE).fill(EMPTY_COLOR);
    renderBoard();
    updateFilledCount();
    schedulePersist();
  });

  randomizeButton.addEventListener("click", () => {
    const colorPool = QUICK_COLORS.filter((color) => color !== EMPTY_COLOR);

    for (let index = 0; index < pixels.length; index += 1) {
      const useEmpty = Math.random() < 0.2;
      if (useEmpty) {
        pixels[index] = EMPTY_COLOR;
      } else {
        pixels[index] = colorPool[Math.floor(Math.random() * colorPool.length)];
      }
    }

    renderBoard();
    updateFilledCount();
    schedulePersist();
  });

  downloadButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = `pixel-board-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  function onMouseDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    isDrawing = true;
    lastPaintedIndex = -1;
    paintFromPoint(event.clientX, event.clientY);
  }

  function onMouseMove(event) {
    const cell = getCellFromPoint(event.clientX, event.clientY);
    hoverCell.textContent = cell ? `${cell.x}, ${cell.y}` : "--";

    if (!isDrawing) return;
    paintFromPoint(event.clientX, event.clientY);
  }

  function onMouseLeave() {
    hoverCell.textContent = "--";
    lastPaintedIndex = -1;
  }

  function onTouchStart(event) {
    if (!event.touches || event.touches.length === 0) return;
    event.preventDefault();
    isDrawing = true;
    lastPaintedIndex = -1;

    const touch = event.touches[0];
    paintFromPoint(touch.clientX, touch.clientY);
  }

  function onTouchMove(event) {
    if (!event.touches || event.touches.length === 0) return;
    event.preventDefault();

    const touch = event.touches[0];
    const cell = getCellFromPoint(touch.clientX, touch.clientY);
    hoverCell.textContent = cell ? `${cell.x}, ${cell.y}` : "--";

    if (!isDrawing) return;
    paintFromPoint(touch.clientX, touch.clientY);
  }

  function stopDrawing() {
    isDrawing = false;
    lastPaintedIndex = -1;
  }

  function paintFromPoint(clientX, clientY) {
    const cell = getCellFromPoint(clientX, clientY);
    if (!cell) return;

    const changed = paintCell(cell.index, selectedColor);
    if (!changed) return;

    renderBoard();
    updateFilledCount();
    schedulePersist();
  }

  function paintCell(index, color) {
    if (index === lastPaintedIndex) return false;
    lastPaintedIndex = index;
    if (pixels[index] === color) return false;

    pixels[index] = color;
    return true;
  }

  function getCellFromPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaledX = (clientX - rect.left) * (canvas.width / rect.width);
    const scaledY = (clientY - rect.top) * (canvas.height / rect.height);
    const x = Math.floor(scaledX / pixelSize);
    const y = Math.floor(scaledY / pixelSize);

    if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) {
      return null;
    }

    return { x, y, index: y * BOARD_SIZE + x };
  }

  function createPalette() {
    paletteContainer.innerHTML = "";

    QUICK_COLORS.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pixel-swatch";
      button.style.backgroundColor = color;
      button.setAttribute("aria-label", `Use ${color}`);
      button.setAttribute("title", color);
      button.dataset.color = color;

      button.addEventListener("click", () => {
        setSelectedColor(color);
        schedulePersist();
      });

      paletteContainer.appendChild(button);
    });
  }

  function setSelectedColor(nextColor) {
    const normalized = normalizeHexColor(nextColor);
    if (!normalized) return;

    selectedColor = normalized;
    colorPicker.value = selectedColor;
    selectedValue.textContent = selectedColor;

    const swatches = paletteContainer.querySelectorAll(".pixel-swatch");
    swatches.forEach((swatch) => {
      const isActive = swatch.dataset.color === selectedColor;
      swatch.classList.toggle("is-active", isActive);
    });
  }

  function setPixelSize(nextSize) {
    pixelSize = clamp(nextSize, MIN_PIXEL_SIZE, MAX_PIXEL_SIZE);
    zoomInput.value = String(pixelSize);
    zoomValue.textContent = `${pixelSize}x`;
    canvas.width = BOARD_SIZE * pixelSize;
    canvas.height = BOARD_SIZE * pixelSize;
    renderBoard();
  }

  function renderBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const index = y * BOARD_SIZE + x;
        ctx.fillStyle = pixels[index];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    if (pixelSize >= 10) {
      const gridColor = getComputedStyle(document.documentElement).getPropertyValue("--global-divider-color").trim() || "rgba(0, 0, 0, 0.18)";
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = 0; x <= BOARD_SIZE; x += 1) {
        const lineX = x * pixelSize + 0.5;
        ctx.moveTo(lineX, 0);
        ctx.lineTo(lineX, canvas.height);
      }

      for (let y = 0; y <= BOARD_SIZE; y += 1) {
        const lineY = y * pixelSize + 0.5;
        ctx.moveTo(0, lineY);
        ctx.lineTo(canvas.width, lineY);
      }

      ctx.stroke();
    }
  }

  function updateFilledCount() {
    let count = 0;

    for (let index = 0; index < pixels.length; index += 1) {
      if (pixels[index] !== EMPTY_COLOR) {
        count += 1;
      }
    }

    filledCount.textContent = String(count);
  }

  function schedulePersist() {
    if (persistTimer) {
      window.clearTimeout(persistTimer);
    }

    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      persistState();
    }, 100);
  }

  function persistState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          size: BOARD_SIZE,
          pixelSize,
          selectedColor,
          pixels,
        })
      );
    } catch (error) {
      // Ignore write failures in private mode or restricted environments.
    }
  }

  function hydrateState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.size !== BOARD_SIZE) return;
      if (!Array.isArray(parsed.pixels) || parsed.pixels.length !== BOARD_SIZE * BOARD_SIZE) return;

      const normalizedPixels = parsed.pixels.map(normalizeHexColor);
      if (normalizedPixels.some((value) => value === null)) return;

      pixels = normalizedPixels;

      const restoredColor = normalizeHexColor(parsed.selectedColor);
      if (restoredColor) {
        selectedColor = restoredColor;
      }

      const restoredSize = Number.parseInt(parsed.pixelSize, 10);
      if (!Number.isNaN(restoredSize)) {
        pixelSize = clamp(restoredSize, MIN_PIXEL_SIZE, MAX_PIXEL_SIZE);
      }
    } catch (error) {
      // Ignore malformed local state.
    }
  }

  function normalizeHexColor(input) {
    if (typeof input !== "string") return null;

    let value = input.trim().toLowerCase();
    if (!value.startsWith("#")) return null;

    if (/^#[0-9a-f]{3}$/.test(value)) {
      value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    }

    if (!/^#[0-9a-f]{6}$/.test(value)) return null;
    return value;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
