import { Feedback as FeedbackIcon, Help, Support } from './Icon';
import packageData from '../../../package.json';
import Mellowtel from 'mellowtel';
export default function Footer({ mellowtel }: { mellowtel: Mellowtel }) {
  // console.log('time: ', new Date().toLocaleTimeString());
  // console.log('time: ', new Date().toLocaleString());
  // console.log('time: ', new Date().toISOString());
  // console.log('time: ', new Date().toUTCString());
  // console.log('time: ', new Date().getUTCDate());
  // console.log('time: ', new Date().toLocaleDateString());
  // console.log('time: ', new Date().getTimezoneOffset());
  // console.log('time: ', new Date().toTimeString());
  // const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // const getOffset = (tz: any) =>
  //   Intl.DateTimeFormat('ia', {
  //     timeZoneName: 'shortOffset',
  //     timeZone: tz,
  //   })
  //     .formatToParts()
  //     .find((i) => i.type === 'timeZoneName')
  //     ?.value // => "GMT+/-hh:mm"
  //     .slice(3); //=> +/-hh:mm

  // console.log(tz + ' UTC' + getOffset(tz));

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
            <Help width={16} height={16} />
            How to use?
          </a>
          <a
            className="grow-0 flex gap-2 items-center hover:text-blue-700 hover:underline"
            target="_blank"
            href="https://chromewebstore.google.com/detail/coursera-tool/hdadbgohdjnhileochcldikbphbonalg/reviews"
          >
            <FeedbackIcon size={16} />
            Give Feedback
          </a>
          <a
            className="grow-0 flex gap-2 items-center hover:text-blue-700 hover:underline"
            target="_blank"
            href="https://www.facebook.com/au.kien.thanh.2307"
          >
            <Support width={16} height={16} />
            Support
          </a>
        </div>
      </div>
      {/* <div
        onClick={async () => {
          const settingsLink = await mellowtel.generateSettingsLink();
          console.log(settingsLink);
          window.open(settingsLink, '_blank');
        }}
        className="cursor-pointer text-xs grow-0 flex gap-2 items-center hover:text-blue-700 hover:underline mt-3 justify-end"
      >
        <Support width={16} height={16} />
        Support me by opt-in this extension
      </div> */}
    </div>
  );
}
