import Mellowtel from 'mellowtel';

let mellowtel;

(async () => {
  console.log('Pascoli');
  mellowtel = new Mellowtel('24e87438');
  await mellowtel.initPascoli();
})();
