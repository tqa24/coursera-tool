import { useState } from "react";

export default function App() {
  const [url, setUrl] = useState("");
  const [copy, setCopy] = useState(false);

  const handleCopy = () => {
    // Get the current link
    const data: string =
      document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute("content") || "";

    // Get the current id
    const id: string =
      document
        .querySelector(
          ".rc-PeerSubmissionWithReviewsBody > .rc-CommentsSection label.cds-formLabel-root"
        )
        ?.getAttribute("for") || "";

    // Set the assignment link
    setUrl(data.replace("submit", "review/") + id.split("~")[0]);
    navigator.clipboard.writeText(
      data.replace("submit", "review/") + id.split("~")[0]
    );
  };

  return (
    <div className="w-full">
      <div
        className="flex justify-between mt-4 p-2 w-full border bg-blue-100 border-black cursor-pointer"
        onClick={handleCopy}
      >
        {url == "" ? "Click here to get link" : url}
        {url != "" && (
          <div
            className="rounded-lg flex items-center p-2 bg-slate-400 text-white hover:bg-slate-500 active:bg-slate-600"
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopy(true);
            }}
          >
            {!copy ? "Copy" : "Copied"}
          </div>
        )}
      </div>
    </div>
  );
}
