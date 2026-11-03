import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("In index.html fehlt <div id=\"root\">");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
