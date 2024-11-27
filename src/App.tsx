import { useState } from "react";

function replaceLast(x: string, y: string, z: string) {
  var a = x.split("");
  var length = y.length;
  if (x.lastIndexOf(y) != -1) {
    for (var i = x.lastIndexOf(y); i < x.lastIndexOf(y) + length; i++) {
      if (i == x.lastIndexOf(y)) {
        a[i] = z;
      } else {
        delete a[i];
      }
    }
  }
  return a.join("");
}

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
    setUrl(replaceLast(data, "submit", "review/") + id.split("~")[0]);
    navigator.clipboard.writeText(
      replaceLast(data, "submit", "review/") + id.split("~")[0]
    );
  };

  return (
    <div className="w-full">
      <div
        className={`relative transition-all duration-200 rounded-md flex text-white text-base justify-between mt-4 p-3 w-full border bg-blue-400 cursor-pointer hover:shadow-md hover:bg-blue-500 ${
          url == "" ? "font-semibold" : "font-semibold"
        }`}
        onClick={handleCopy}
      >
        {url == "" ? "Click here to get link" : url}
        {url != "" && (
          <div
            className="absolute top-2 right-2 rounded-lg flex items-center p-2 bg-slate-400 text-white hover:bg-slate-500 active:bg-slate-600 text-sm"
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
