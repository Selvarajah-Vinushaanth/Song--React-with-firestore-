import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,       // 10 virtual users
  duration: '30s', // run for 30 seconds
};

export default function () {
  const res = http.get('https://song-react-with-firestore.vercel.app/');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1); // wait 1s before next request
}
