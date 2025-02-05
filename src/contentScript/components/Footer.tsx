import React from 'react';
import { Feedback as FeedbackIcon, Help } from './Icon';

export default function Footer() {
  return (
    <div>
      <div className="text-xs font-semibold pt-3 flex">
        <div className="grow"></div>
        <div className="flex gap-4">
          <a
            className="grow-0 flex gap-1 items-center hover:text-blue-700 hover:underline"
            target="_blank"
            href="https://ecec123ecec.github.io/coursera-db/how-to-use.html"
          >
            <Help width={20} height={20} />
            How to use?
          </a>
          <a
            className="grow-0 flex gap-1 items-center hover:text-blue-700 hover:underline"
            target="_blank"
            href="https://chromewebstore.google.com/detail/coursera-tool/hdadbgohdjnhileochcldikbphbonalg/reviews"
          >
            <FeedbackIcon size={20} />
            Give Feedback
          </a>
        </div>
      </div>
    </div>
  );
}
