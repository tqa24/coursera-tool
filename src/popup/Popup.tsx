import { useEffect } from 'react';
import './Popup.css';

export const Popup = () => {
  useEffect(() => {
    function openIndex() {
      chrome.tabs.create({ active: true, url: 'http://my_url' });
    }
    document.addEventListener('DOMContentLoaded', () => {
      var y = document.getElementById('ct_index_link');
      y!.addEventListener('click', openIndex);
    });
  }, []);
  return <></>;
};

export default Popup;
