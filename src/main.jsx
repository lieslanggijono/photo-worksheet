import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { installChalkDraw, installPaperTaps, installTypewriter } from "./sound.js";
import "./fonts.css";
import "./styles.css";

installPaperTaps();
installTypewriter();
installChalkDraw();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
