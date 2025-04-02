import Mellowtel from 'mellowtel';

let mellowtel;

(async () => {
  mellowtel = new Mellowtel('24e87438', {
    MAX_DAILY_RATE: 400,
    disableLogs: false,
  });
  await mellowtel.initBurke();
})();
