const PAPERS = ["img/paper-1.png", "img/paper-2.png", "img/paper-3.png"];

const select = document.getElementById("select");
const selectBox = document.getElementById("selectBox");
const selectValue = document.getElementById("selectValue");
const menu = document.getElementById("menu");
const options = Array.from(menu.querySelectorAll("li"));
const nextBtn = document.getElementById("next");
const bgEl = document.getElementById("bg");

const DEFAULT_VALUE = "Be friends"; // pre-selected + checkmarked

function setSelected(value) {
  selectValue.textContent = value;
  options.forEach(function (li) {
    li.classList.toggle("selected", li.dataset.value === value);
  });
}

function openMenu() {
  menu.hidden = false;
  select.classList.add("open");
  selectBox.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  menu.hidden = true;
  select.classList.remove("open");
  selectBox.setAttribute("aria-expanded", "false");
}

selectBox.addEventListener("click", function (e) {
  e.stopPropagation();
  if (menu.hidden) {
    openMenu();
  } else {
    closeMenu();
  }
});

options.forEach(function (li) {
  li.addEventListener("click", function (e) {
    e.stopPropagation();
    setSelected(li.dataset.value);
    closeMenu();
  });
});

// click anywhere outside closes the menu
document.addEventListener("click", function () {
  if (!menu.hidden) closeMenu();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closeMenu();
});

nextBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  window.location.href = "../you-didnt-know-that/";
});

setSelected(DEFAULT_VALUE);

// ---- the boil: cycle paper + shake the printed ink ----
const boilEls = Array.from(document.querySelectorAll(".boil")); // serif prompt: full boil
const jitterEls = Array.from(document.querySelectorAll(".jitter")); // dropdown: gentle nudge, stays crisp
let frame = 0;
window.setInterval(function () {
  frame++;
  bgEl.style.backgroundImage = "url(" + PAPERS[frame % PAPERS.length] + ")";

  const slot = frame % 3;
  const dx = (frame % 2 === 0 ? 0.4 : -0.4);
  const dy = (frame % 3 === 0 ? -0.4 : 0.3);

  boilEls.forEach(function (el) {
    el.style.filter = "url(#boil" + slot + ")";
    el.style.transform = "translate(" + dx + "px, " + dy + "px)";
  });
  jitterEls.forEach(function (el) {
    el.style.transform = "translate(" + dx * 0.6 + "px, " + dy * 0.6 + "px)";
  });
}, 130);
