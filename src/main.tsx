import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";

import "./index.css";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function updateDarkClass(e?: MediaQueryListEvent) {
  const isDark = e ? e.matches : darkQuery.matches;
  document.documentElement.classList.toggle("dark", isDark);
}

updateDarkClass();
darkQuery.addEventListener("change", updateDarkClass);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
