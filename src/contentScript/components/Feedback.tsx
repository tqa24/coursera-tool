import React from 'react';
import { Feedback as FeedbackIcon } from './Icon';

export default function Feedback() {
  return (
    <div>
      <div className="text-sm font-semibold pt-3 flex">
        <a
          className="grow-0 flex gap-1 items-center hover:text-blue-700 hover:underline"
          target="_blank"
          href="https://chromewebstore.google.com/detail/coursera-tool/hdadbgohdjnhileochcldikbphbonalg/reviews"
        >
          <FeedbackIcon size={20} />
          Give Feedback
        </a>
        <div className="grow"></div>
      </div>
    </div>
  );
}
