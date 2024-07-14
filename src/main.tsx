import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// "#root";
const rootPath = "div.rc-SplitPeerSubmissionPage div.rc-PeerReviewHeader";
// const rootPath = ".rc-PageHeader > div.rc";

const isElementLoaded = async (selector: any) => {
  while (document.querySelector(selector) === null) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return document.querySelector(selector);
};

isElementLoaded(rootPath).then((selector: any) => {
  if (location.href.includes("submit")) {
    const container = document.createElement("div");
    container.id = "coursera-link-getter";
    selector.appendChild(container);
    ReactDOM.createRoot(container).render(<App />);
  }
});
