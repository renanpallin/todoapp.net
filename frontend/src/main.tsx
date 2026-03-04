import React from "react";
import ReactDOM from "react-dom/client";

// Apply dark mode before first render to avoid flash
const theme = localStorage.getItem("theme");
if (theme !== "light") {
  document.documentElement.classList.add("dark");
}
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
