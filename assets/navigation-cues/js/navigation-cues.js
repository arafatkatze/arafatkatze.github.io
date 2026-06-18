/* Touch gesture helper (minified Touchy library) */
class TouchGesture {
  constructor(element, options) {
    this.element = element;
    this.touch1 = null;
    this.touch2 = null;
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchEndX = null;
    this.touchEndY = null;
    this.touchMove1 = null;
    this.touchMove2 = null;
    this.touchMoveX = null;
    this.touchMoveY = null;
    this.velocityX = null;
    this.velocityY = null;
    this.longPressTimer = null;
    this.doubleTapTimer = null;
    this.doubleTapWaiting = false;
    this.thresholdX = 0;
    this.thresholdY = 0;
    this.disregardVelocityThresholdX = 0;
    this.disregardVelocityThresholdY = 0;
    this.swipingHorizontal = false;
    this.swipingVertical = false;
    this.swipingDirection = null;
    this.swipedHorizontal = false;
    this.swipedVertical = false;
    this.originalDistance = null;
    this.newDistance = null;
    this.scale = null;
    this.originalAngle = null;
    this.newAngle = null;
    this.rotation = null;
    this.handlers = {
      panstart: [],
      panmove: [],
      panend: [],
      swipeleft: [],
      swiperight: [],
      swipeup: [],
      swipedown: [],
      tap: [],
      doubletap: [],
      longpress: [],
      pinch: [],
      pinchend: [],
      rotate: [],
      rotateend: [],
    };
    this._onTouchStart = this.onTouchStart.bind(this);
    this._onTouchMove = this.onTouchMove.bind(this);
    this._onTouchEnd = this.onTouchEnd.bind(this);
    this.opts = Object.assign({}, TouchGesture.defaults, options);
    this.element.addEventListener("touchstart", this._onTouchStart, passiveOption);
    this.element.addEventListener("touchmove", this._onTouchMove, passiveOption);
    this.element.addEventListener("touchend", this._onTouchEnd, passiveOption);
    if (this.opts.mouseSupport && !("ontouchstart" in window)) {
      this.element.addEventListener("mousedown", this._onTouchStart, passiveOption);
      document.addEventListener("mousemove", this._onTouchMove, passiveOption);
      document.addEventListener("mouseup", this._onTouchEnd, passiveOption);
    }
  }

  destroy() {
    this.element.removeEventListener("touchstart", this._onTouchStart);
    this.element.removeEventListener("touchmove", this._onTouchMove);
    this.element.removeEventListener("touchend", this._onTouchEnd);
    this.element.removeEventListener("mousedown", this._onTouchStart);
    document.removeEventListener("mousemove", this._onTouchMove);
    document.removeEventListener("mouseup", this._onTouchEnd);
    clearTimeout(this.longPressTimer ?? undefined);
    clearTimeout(this.doubleTapTimer ?? undefined);
  }

  on(type, fn) {
    if (!this.handlers[type]) return;
    this.handlers[type].push(fn);
    return { type, fn, cancel: () => this.off(type, fn) };
  }

  off(type, fn) {
    if (!this.handlers[type]) return;
    const index = this.handlers[type].indexOf(fn);
    if (index !== -1) this.handlers[type].splice(index, 1);
  }

  fire(type, event) {
    for (const handler of this.handlers[type]) handler(event);
  }

  onTouchStart(event) {
    let isFirstTouch = false;
    if (event.type !== "mousedown") {
      if (!this.touch1) {
        this.touch1 = event.changedTouches[0];
        isFirstTouch = true;
      }
      if ((isFirstTouch && event.changedTouches.length > 1) || !isFirstTouch) {
        if (!this.touch2) {
          this.touch2 =
            [...event.changedTouches].find(
              (touch) => touch.identifier !== this.touch1?.identifier,
            ) || null;
          return;
        }
      }
      if (!isFirstTouch) return;
    }

    if (isFirstTouch || event.type === "mousedown") {
      this.thresholdX = this.opts.threshold("x", this);
      this.thresholdY = this.opts.threshold("y", this);
      this.disregardVelocityThresholdX = this.opts.disregardVelocityThreshold("x", this);
      this.disregardVelocityThresholdY = this.opts.disregardVelocityThreshold("y", this);
      this.touchStartX =
        event.type === "mousedown" ? event.screenX : this.touch1?.screenX || 0;
      this.touchStartY =
        event.type === "mousedown" ? event.screenY : this.touch1?.screenY || 0;
      this.touchMoveX = null;
      this.touchMoveY = null;
      this.touchEndX = null;
      this.touchEndY = null;
      this.swipingDirection = null;
      this.longPressTimer = setTimeout(
        () => this.fire("longpress", event),
        this.opts.longPressTime,
      );
      this.scale = 1;
      this.rotation = 0;
      this.fire("panstart", event);
    }
  }

  onTouchMove(event) {
    if (event.type === "mousemove" && (!this.touchStartX || this.touchEndX !== null)) {
      return;
    }

    let primaryTouch;
    if (event.type !== "mousedown") {
      primaryTouch =
        [...event.changedTouches].find(
          (touch) => touch.identifier === this.touch1?.identifier,
        ) || this.touchMove1;
      this.touchMove1 = primaryTouch || this.touchMove1;
      const secondaryTouch =
        [...event.changedTouches].find(
          (touch) => touch.identifier === this.touch2?.identifier,
        ) || this.touchMove2;
      this.touchMove2 = secondaryTouch || this.touchMove2;
    }

    if (event.type === "mousemove" || primaryTouch) {
      const deltaX =
        (event.type === "mousemove" ? event.screenX : primaryTouch?.screenX || 0) -
        (this.touchStartX || 0);
      this.velocityX = deltaX - (this.touchMoveX || 0);
      this.touchMoveX = deltaX;

      const deltaY =
        (event.type === "mousemove" ? event.screenY : primaryTouch?.screenY || 0) -
        (this.touchStartY || 0);
      this.velocityY = deltaY - (this.touchMoveY || 0);
      this.touchMoveY = deltaY;

      if (Math.max(Math.abs(this.touchMoveX), Math.abs(this.touchMoveY)) > this.opts.pressThreshold) {
        clearTimeout(this.longPressTimer ?? undefined);
      }
      this.fire("panmove", event);
    }
  }

  onTouchEnd(event) {
    let primaryTouch;
    if (event.type !== "mouseup") {
      primaryTouch = [...event.changedTouches].find(
        (touch) => touch.identifier === this.touch1?.identifier,
      );
      if (![...event.touches].find((touch) => touch.identifier === this.touch1?.identifier)) {
        this.touch1 = null;
        this.touchMove1 = null;
      }
      if (![...event.touches].find((touch) => touch.identifier === this.touch2?.identifier)) {
        this.touch2 = null;
        this.touchMove2 = null;
      }
    }

    if (event.type === "mouseup" && (!this.touchStartX || this.touchEndX !== null)) return;

    if (event.type === "mouseup" || primaryTouch) {
      this.touchEndX =
        event.type === "mouseup" ? event.screenX : primaryTouch?.screenX || 0;
      this.touchEndY =
        event.type === "mouseup" ? event.screenY : primaryTouch?.screenY || 0;
      this.fire("panend", event);
      clearTimeout(this.longPressTimer ?? undefined);

      const deltaX = this.touchEndX - (this.touchStartX || 0);
      const deltaY = this.touchEndY - (this.touchStartY || 0);
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX < this.opts.pressThreshold && absY < this.opts.pressThreshold) {
        if (this.doubleTapWaiting) {
          this.doubleTapWaiting = false;
          clearTimeout(this.doubleTapTimer ?? undefined);
          this.fire("doubletap", event);
        } else {
          this.doubleTapWaiting = true;
          this.doubleTapTimer = setTimeout(() => {
            this.doubleTapWaiting = false;
          }, this.opts.doubleTapTime);
          this.fire("tap", event);
        }
      }
    }

    if (!this.touch1 && !this.touch2) {
      this.fire("pinchend", event);
      this.fire("rotateend", event);
    }
  }
}

TouchGesture.defaults = {
  threshold: (axis, instance) =>
    Math.max(
      25,
      Math.floor(
        0.15 *
          (axis === "x"
            ? window.innerWidth || document.body.clientWidth
            : window.innerHeight || document.body.clientHeight),
      ),
    ),
  velocityThreshold: 10,
  disregardVelocityThreshold: (axis, instance) =>
    Math.floor(
      0.5 *
        (axis === "x" ? instance.element.clientWidth : instance.element.clientHeight),
    ),
  pressThreshold: 8,
  diagonalSwipes: false,
  diagonalLimit: 15,
  longPressTime: 500,
  doubleTapTime: 300,
  mouseSupport: true,
};

let passiveOption = false;
try {
  window.addEventListener(
    "test",
    null,
    Object.defineProperty({}, "passive", {
      get() {
        passiveOption = { passive: true };
      },
    }),
  );
} catch {
  // ignore
}

const scrollContainer = document.querySelector(".js-scrollContainer");
const scrollMirror = document.querySelector(".js-scrollMirror");
const paragraphsRoot = document.querySelector(".js-paragraphs");

let currentIndex = null;
let topOffset = window.matchMedia("(min-width: 576px)").matches ? 16 : 9;
let bottomOffset = window.matchMedia("(min-width: 576px)").matches ? 14 : 8;
let paragraphsTemplate = null;

window.currentY = 0;
window.paragraphsList = [];

function createSpacer() {
  const spacer = document.createElement("div");
  spacer.className = "paragraphs__spacer";
  spacer.textContent = " ";
  return spacer;
}

function captureParagraphsTemplate() {
  if (!paragraphsTemplate) {
    paragraphsTemplate = paragraphsRoot.innerHTML.replace(/\n/g, "");
  }
}

function restoreParagraphsTemplate() {
  captureParagraphsTemplate();
  paragraphsRoot.innerHTML = paragraphsTemplate;
}

function reorderParagraphsDom(list) {
  const fragment = document.createDocumentFragment();

  list.forEach((item, index) => {
    if (index > 0) fragment.appendChild(createSpacer());
    fragment.appendChild(item);
  });

  paragraphsRoot.replaceChildren(fragment);
}

function buildParagraphsList() {
  restoreParagraphsTemplate();

  const allItems = [...paragraphsRoot.querySelectorAll(".js-paragraphsItem")];
  const middleTop = window.innerHeight / 2 + topOffset;
  const middleBottom = paragraphsRoot.offsetHeight - window.innerHeight / 2 - bottomOffset;

  const middleZone = allItems.filter(
    (item) =>
      item.offsetTop > middleTop && item.offsetTop + item.offsetHeight < middleBottom,
  );

  const list = [];
  for (let index = 0; index < window.pLength; index += 1) {
    const matches = middleZone.filter((item) => item.dataset.index == String(index));
    if (!matches.length) continue;
    list.push(matches[Math.floor(Math.random() * matches.length)]);
  }

  window.paragraphsList = list;
  reorderParagraphsDom(list);
}

function snapToParagraph(index = 0, position = "start") {
  if (index === 0 || index === window.pLength - 1) buildParagraphsList();

  const target = window.paragraphsList[index];
  if (!target) return;

  const scrollTop =
    position === "start"
      ? target.offsetTop - window.innerHeight / 2 + topOffset
      : target.offsetTop + target.offsetHeight - window.innerHeight / 2 - bottomOffset;

  scrollToPosition(scrollTop);

  document.querySelectorAll(".js-paragraphsItem").forEach((item) => {
    item.classList.remove("active");
  });
  target.classList.add("active");
  currentIndex = index;
  window.M = index;
}

function scrollToPosition(scrollTop) {
  scrollContainer.scrollTo({ top: scrollTop });
  scrollMirror.scrollTo({ top: scrollTop });
  window.currentY = scrollContainer.scrollTop + window.innerHeight / 2;
}

function updateProgress() {
  if (!window.paragraphsList.length) return;

  const totalHeight =
    window.paragraphsList.reduce((sum, item) => sum + item.offsetHeight - bottomOffset, 0) -
    topOffset;

  let progressOffset =
    window.paragraphsList
      .slice(0, currentIndex)
      .reduce((sum, item) => sum + item.offsetHeight - bottomOffset, 0) +
    window.currentY -
    window.paragraphsList[currentIndex].offsetTop -
    topOffset;

  progressOffset = Math.max(0, Math.min(progressOffset, totalHeight));
  const percent = totalHeight > 0 ? (progressOffset / totalHeight) * 100 : 0;
  document.querySelector(".js-progress").textContent = `${Math.round(percent)}%`;
}

function watchScrollPosition() {
  const active = document.querySelector(".js-paragraphsItem.active");
  updateProgress();

  if (active && window.currentY !== 0) {
    const start = active.offsetTop + topOffset;
    const end = active.offsetTop + active.offsetHeight - bottomOffset;

    if (Math.round(window.currentY) > end) {
      const nextIndex = currentIndex < window.pLength - 1 ? currentIndex + 1 : 0;
      snapToParagraph(nextIndex, "start");
    } else if (Math.round(window.currentY) < start) {
      const previousIndex = currentIndex > 0 ? currentIndex - 1 : window.pLength - 1;
      snapToParagraph(previousIndex, "end");
    }
  }

  requestAnimationFrame(watchScrollPosition);
}

function bindWheelScroll() {
  scrollContainer.addEventListener("wheel", (event) => {
    scrollToPosition(scrollContainer.scrollTop + event.deltaY);
  });
}

function bindTouchScroll() {
  const gesture = new TouchGesture(scrollContainer, { mouseSupport: false });
  let inertiaTimer;
  let velocity = 0;

  gesture.on("panmove", () => {
    scrollToPosition(scrollContainer.scrollTop - gesture.velocityY);
    velocity = gesture.velocityY;
    if (inertiaTimer) clearInterval(inertiaTimer);
  });

  gesture.on("panend", () => {
    inertiaTimer = setInterval(() => {
      if (Math.abs(velocity) < 0.01) {
        clearInterval(inertiaTimer);
        return;
      }
      scrollToPosition(scrollContainer.scrollTop - velocity);
      velocity *= 0.85;
    }, 16);
  });
}

function bindResize() {
  window.addEventListener("resize", () => {
    snapToParagraph(currentIndex);
    topOffset = window.matchMedia("(min-width: 576px)").matches ? 16 : 9;
    bottomOffset = window.matchMedia("(min-width: 576px)").matches ? 14 : 8;
  });
}

function bindMirrorResize() {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const height = entry.borderBoxSize[0].blockSize;
      document.querySelector(".js-scrollMirror > div").style.height = `${height}px`;
    }
  });
  observer.observe(paragraphsRoot);
}

function bindProgressReset() {
  document.querySelector(".js-progress").addEventListener("click", () => {
    snapToParagraph(0);
  });
}

function configureLinks() {
  document.querySelectorAll("a").forEach((link) => {
    if (link.target) return;
    if (link.host !== window.location.host) {
      link.target = "_blank";
      link.rel = "noopener";
    } else {
      link.target = "_self";
    }
  });
}

function configureViewportUnit() {
  const setViewportUnit = () => {
    const unit = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${unit}px`);
  };
  setViewportUnit();
  window.addEventListener("resize", setViewportUnit);
}

function configureDocumentClasses() {
  const isTouch = "ontouchstart" in window || navigator.msMaxTouchPoints > 0;
  const userAgent = window.navigator.userAgent;
  const isIOS = !!userAgent.match(/iP(ad|hone)/i);
  const isWebKit = !!userAgent.match(/WebKit/i);
  const isIOSWebKit = isIOS && isWebKit && !userAgent.match(/CriOS/i);

  document.documentElement.classList.remove("touch", "no-touch", "ios", "no-ios");
  document.documentElement.classList.add(isTouch ? "touch" : "no-touch");
  document.documentElement.classList.add(isIOSWebKit ? "ios" : "no-ios");
}

function startScrollLoop() {
  watchScrollPosition();
  bindWheelScroll();
  bindTouchScroll();
  bindResize();
}

async function init() {
  window.pLength = Number.parseInt(paragraphsRoot.dataset.length, 10);

  const template = document.getElementById("navigation-cues-template");
  if (template?.content?.firstChild) {
    paragraphsRoot.appendChild(template.content.cloneNode(true));
  } else if (template?.innerHTML) {
    paragraphsRoot.innerHTML = template.innerHTML.replace(/\n/g, "");
  }

  captureParagraphsTemplate();
  bindMirrorResize();
  bindProgressReset();

  setTimeout(() => {
    buildParagraphsList();
    snapToParagraph(0);
    document.body.classList.add("loaded");
    setTimeout(startScrollLoop, 100);
  }, 100);
}

document.addEventListener("DOMContentLoaded", () => {
  configureDocumentClasses();
  configureLinks();
  configureViewportUnit();
  init();
});
