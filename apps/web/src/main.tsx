import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { createAppRouter } from "./router";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
  <StrictMode>
    <App router={createAppRouter()} />
  </StrictMode>,
);
