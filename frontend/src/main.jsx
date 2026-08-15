import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import "@astryxdesign/theme-neutral/theme.css";
import "./index.css";
import App from "./App.jsx";
import { ToastProvider } from "./components/ToastProvider";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Theme theme={neutralTheme}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </Theme>
  </StrictMode>
);
