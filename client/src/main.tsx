import { createRoot } from "react-dom/client";
import App from "./App";
import { handleChunkPreloadError } from "./lib/chunkReload";
import "./index.css";

// After a deploy, an open tab may request chunk files that no longer exist.
// Reload once (rate-limited via sessionStorage) to pick up the new build.
window.addEventListener("vite:preloadError", handleChunkPreloadError);

createRoot(document.getElementById("root")!).render(<App />);
