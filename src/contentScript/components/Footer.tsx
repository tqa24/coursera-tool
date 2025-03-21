import { Feedback as FeedbackIcon, Help, Support } from './Icon';
import packageData from '../../../package.json';

export default function Footer() {
  return (
    <div>
      <div className="text-xs font-semibold pt-3 flex">
        <div className="grow flex justify-start items-center">v{packageData.version}</div>
        <div className="flex gap-6">
          <a
            className="grow-0 flex gap-2 items-center hover:text-blue-700 hover:underline"
            target="_blank"
            href="https://ecec123ecec.github.io/coursera-db/how-to-use.html"
          >
            <Help width={20} height={20} />
            How to use?
          </a>
          <a
            className="grow-0 flex gap-2 items-center hover:text-blue-700 hover:underline"
            target="_blank"
            href="https://chromewebstore.google.com/detail/coursera-tool/hdadbgohdjnhileochcldikbphbonalg/reviews"
          >
            <FeedbackIcon size={20} />
            Give Feedback
          </a>
          <a
            className="grow-0 flex gap-2 items-center hover:text-blue-700 hover:underline"
            target="_blank"
            href="https://www.facebook.com/au.kien.thanh.2307"
          >
            <Support width={20} height={20} />
            Support
          </a>
        </div>
      </div>
    </div>
  );
}
