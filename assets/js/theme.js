(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem("athgrow-theme");
  if (saved === "light") root.dataset.theme = "light";
  const button = document.querySelector(".theme-toggle");
  if (!button) return;
  const update = () => {
    const light = root.dataset.theme === "light";
    button.textContent = light ? "☾" : "☼";
    button.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
  };
  update();
  button.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    if (next === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    localStorage.setItem("athgrow-theme", next);
    update();
  });
})();
