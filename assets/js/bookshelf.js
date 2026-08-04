(() => {
  const root = document.querySelector("[data-bookshelf]");
  if (!root) return;

  const viewport = root.querySelector("[data-shelf-viewport]");
  const scene = root.querySelector(".bookshelf-scene");
  const track = root.querySelector("[data-shelf-track]");
  const books = [...root.querySelectorAll("[data-shelf-book]")];
  const jumps = [...root.querySelectorAll("[data-shelf-jump]")];
  const status = root.querySelector("[data-shelf-status]");
  const previous = root.querySelector("[data-shelf-previous]");
  const next = root.querySelector("[data-shelf-next]");
  const inspector = root.querySelector("[data-book-inspector]");
  const inspectorStage = root.querySelector("[data-inspector-stage]");
  const inspectBook = root.querySelector("[data-inspect-book]");
  const closeButton = root.querySelector("[data-inspector-close]");

  if (!viewport || !scene || !track || !books.length || !inspector || !inspectBook) return;

  let offset = 0;
  let activeIndex = 0;
  let pickedBook = null;
  let shelfPointer = null;
  let shelfStartX = 0;
  let shelfStartOffset = 0;
  let shelfMoved = false;
  let rotatePointer = null;
  let rotateStartX = 0;
  let rotateStartY = 0;
  let startRotationX = -8;
  let startRotationY = 24;
  let rotationX = -8;
  let rotationY = 24;
  let zoom = 1;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function limits() {
    const sceneWidth = scene.clientWidth;
    const padding = Math.max(24, sceneWidth * 0.08);
    const min = Math.min(0, sceneWidth - track.scrollWidth - padding * 2);
    return { min, max: 0 };
  }

  function clampOffset(value) {
    const { min, max } = limits();
    return Math.min(max, Math.max(min, value));
  }

  function closestIndex() {
    const center = scene.clientWidth / 2;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;

    books.forEach((book, index) => {
      const bookCenter = book.offsetLeft + book.offsetWidth / 2 + offset;
      const nextDistance = Math.abs(center - bookCenter);
      if (nextDistance < distance) {
        distance = nextDistance;
        nearest = index;
      }
    });
    return nearest;
  }

  function updateShelf(nextOffset, announce = false) {
    offset = clampOffset(nextOffset);
    track.style.setProperty("--shelf-offset", `${offset}px`);
    activeIndex = closestIndex();

    books.forEach((book, index) => book.classList.toggle("is-active", index === activeIndex));
    jumps.forEach((jump, index) => {
      jump.classList.toggle("is-active", index === activeIndex);
      if (index === activeIndex) jump.setAttribute("aria-current", "true");
      else jump.removeAttribute("aria-current");
    });

    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex === books.length - 1;
    if (announce) {
      const book = books[activeIndex];
      status.textContent = `${activeIndex + 1} of ${books.length}: ${book.dataset.title} by ${book.dataset.author}`;
    }
  }

  function focusIndex(index, announce = true) {
    const book = books[index];
    if (!book) return;
    const target = scene.clientWidth / 2 - (book.offsetLeft + book.offsetWidth / 2);
    updateShelf(target, announce);
  }

  function browse(direction) {
    focusIndex(Math.min(books.length - 1, Math.max(0, activeIndex + direction)));
  }

  function renderInspection() {
    inspectBook.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg) scale(${zoom})`;
  }

  function resetInspection() {
    rotationX = -8;
    rotationY = 24;
    zoom = 1;
    renderInspection();
  }

  function openBook(book) {
    pickedBook = book;
    book.classList.add("is-picked");
    root.querySelector("[data-inspector-cover]").src = book.dataset.cover;
    root.querySelector("[data-inspector-cover]").alt = `${book.dataset.title} cover`;
    root.querySelector("[data-inspector-title]").textContent = book.dataset.title;
    root.querySelector("[data-inspector-author]").textContent = book.dataset.author;
    root.querySelector("[data-inspector-status]").textContent = book.dataset.status;
    root.querySelector("[data-inspector-link]").href = book.dataset.link;
    resetInspection();
    inspector.showModal();
    status.textContent = `Inspecting ${book.dataset.title}. Drag to spin the book.`;
  }

  function closeInspector() {
    if (inspector.open) inspector.close();
  }

  function returnBook() {
    pickedBook?.classList.remove("is-picked");
    pickedBook?.focus({ preventScroll: true });
    pickedBook = null;
    status.textContent = "Book returned. Drag or scroll to keep browsing.";
  }

  viewport.addEventListener(
    "wheel",
    (event) => {
      if (inspector.open) return;
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      updateShelf(offset - delta * 0.9, true);
    },
    { passive: false },
  );

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button")) return;
    shelfPointer = event.pointerId;
    shelfStartX = event.clientX;
    shelfStartOffset = offset;
    shelfMoved = false;
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-dragging");
  });

  viewport.addEventListener("pointermove", (event) => {
    if (event.pointerId !== shelfPointer) return;
    const distance = event.clientX - shelfStartX;
    shelfMoved ||= Math.abs(distance) > 5;
    updateShelf(shelfStartOffset + distance);
  });

  function finishShelfDrag(event) {
    if (event.pointerId !== shelfPointer) return;
    shelfPointer = null;
    viewport.classList.remove("is-dragging");
    if (shelfMoved) focusIndex(closestIndex(), true);
  }

  viewport.addEventListener("pointerup", finishShelfDrag);
  viewport.addEventListener("pointercancel", finishShelfDrag);

  books.forEach((book, index) => {
    book.addEventListener("click", () => {
      if (shelfMoved) return;
      activeIndex = index;
      openBook(book);
    });

    book.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        browse(event.key === "ArrowLeft" ? -1 : 1);
        books[activeIndex].focus();
      }
    });
  });

  jumps.forEach((jump, index) => jump.addEventListener("click", () => focusIndex(index)));
  previous.addEventListener("click", () => browse(-1));
  next.addEventListener("click", () => browse(1));
  closeButton.addEventListener("click", closeInspector);
  inspector.addEventListener("close", returnBook);
  inspector.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeInspector();
  });
  inspector.addEventListener("click", (event) => {
    if (event.target === inspector) closeInspector();
  });

  inspectorStage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    rotatePointer = event.pointerId;
    rotateStartX = event.clientX;
    rotateStartY = event.clientY;
    startRotationX = rotationX;
    startRotationY = rotationY;
    inspectorStage.setPointerCapture(event.pointerId);
    inspectorStage.classList.add("is-dragging");
  });

  inspectorStage.addEventListener("pointermove", (event) => {
    if (event.pointerId !== rotatePointer) return;
    rotationY = startRotationY + (event.clientX - rotateStartX) * 0.55;
    rotationX = Math.min(70, Math.max(-70, startRotationX - (event.clientY - rotateStartY) * 0.4));
    renderInspection();
  });

  function finishRotation(event) {
    if (event.pointerId !== rotatePointer) return;
    rotatePointer = null;
    inspectorStage.classList.remove("is-dragging");
  }

  inspectorStage.addEventListener("pointerup", finishRotation);
  inspectorStage.addEventListener("pointercancel", finishRotation);
  inspectorStage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoom = Math.min(1.35, Math.max(0.72, zoom - event.deltaY * 0.001));
      renderInspection();
    },
    { passive: false },
  );
  inspectorStage.addEventListener("dblclick", resetInspection);

  document.addEventListener("keydown", (event) => {
    if (inspector.open) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      browse(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Home") {
      focusIndex(0);
    } else if (event.key === "End") {
      focusIndex(books.length - 1);
    } else if (event.key === "Enter" && document.activeElement === viewport) {
      openBook(books[activeIndex]);
    }
  });

  const resizeObserver = new ResizeObserver(() => updateShelf(offset));
  resizeObserver.observe(scene);

  requestAnimationFrame(() => {
    updateShelf(0);
    if (!reducedMotion.matches) focusIndex(0, false);
  });
})();
