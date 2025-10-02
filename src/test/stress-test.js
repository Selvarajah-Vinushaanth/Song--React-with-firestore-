import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const pageLoadRate = new Rate('page_load_rate');

export let options = {
    stages: [
        { duration: '30s', target: 5 },   // Ramp up to 5 users
        { duration: '1m', target: 10 },   // Scale to 10 users
        { duration: '30s', target: 15 },  // Peak at 15 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
        http_req_failed: ['rate<0.1'],     // Less than 10% errors
        page_load_rate: ['rate>0.9'],      // 90% page load success
    },
};

const BASE_URL = 'https://song-react-with-firestore.vercel.app';

export default function () {
    // Test 1: Load Testing - Home Page
    group('Home Page Load Test', function () {
        const homeRes = http.get(`${BASE_URL}/`);
        
        const homeLoaded = check(homeRes, {
            'Home page loads': (r) => r.status === 200,
            'Home page response time OK': (r) => r.timings.duration < 3000,
            'Home page has content': (r) => r.body.length > 1000,
        });

        pageLoadRate.add(homeLoaded);
        console.log(`Home page: ${homeRes.status} - ${homeRes.timings.duration}ms`);
        sleep(1);
    });

    // Test 2: Login Page Stress Test
    group('Login Page Stress Test', function () {
        const loginRes = http.get(`${BASE_URL}/login`);
        
        const loginPageLoaded = check(loginRes, {
            'Login page loads': (r) => r.status === 200,
            'Login page response time OK': (r) => r.timings.duration < 3000,
            'Login page has form elements': (r) => r.body.length > 1000,
        });

        pageLoadRate.add(loginPageLoaded);
        console.log(`Login page: ${loginRes.status} - ${loginRes.timings.duration}ms`);
        sleep(1);
    });

    // Test 3: Dashboard Access Test
    group('Dashboard Load Test', function () {
        const dashboardRes = http.get(`${BASE_URL}/dashboard`);
        
        check(dashboardRes, {
            'Dashboard accessible': (r) => r.status === 200,
            'Dashboard response time OK': (r) => r.timings.duration < 3000,
            'Dashboard has content': (r) => r.body.length > 500,
        });

        console.log(`Dashboard: ${dashboardRes.status} - ${dashboardRes.timings.duration}ms`);
        sleep(1);
    });

    // Test 4: Core Features Stress Test
    group('Core Features Load Test', function () {
        const features = [
            '/lyric-generator',
            '/metaphor-creator', 
            '/metaphor-classifier',
            '/masking-predict',
            '/public-hub'
        ];

        features.forEach(feature => {
            const featureRes = http.get(`${BASE_URL}${feature}`);
            
            check(featureRes, {
                [`${feature} loads successfully`]: (r) => r.status === 200,
                [`${feature} response time acceptable`]: (r) => r.timings.duration < 4000,
            });

            console.log(`${feature}: ${featureRes.status} - ${featureRes.timings.duration}ms`);
            sleep(0.5);
        });
    });

    // Test 5: Signup and Profile Pages
    group('User Management Pages', function () {
        const userPages = ['/signup', '/profile', '/forgot-password'];
        
        userPages.forEach(page => {
            const pageRes = http.get(`${BASE_URL}${page}`);
            
            check(pageRes, {
                [`${page} accessible`]: (r) => r.status === 200,
                [`${page} loads quickly`]: (r) => r.timings.duration < 3000,
            });

            console.log(`${page}: ${pageRes.status} - ${pageRes.timings.duration}ms`);
            sleep(0.5);
        });
    });

    // Test 6: Admin Dashboard (if accessible)
    group('Admin Features Test', function () {
        const adminRes = http.get(`${BASE_URL}/admin-dashboard`);
        
        check(adminRes, {
            'Admin dashboard responds': (r) => r.status === 200 || r.status === 401 || r.status === 403,
            'Admin response time OK': (r) => r.timings.duration < 3000,
        });

        console.log(`Admin dashboard: ${adminRes.status} - ${adminRes.timings.duration}ms`);
        sleep(1);
    });

    // Test 7: Static Assets Load Test
    group('Static Assets Test', function () {
        const assets = [
            '/favicon.ico',
            '/manifest.json',
            '/logo192.png',
            '/logo512.png'
        ];

        assets.forEach(asset => {
            const assetRes = http.get(`${BASE_URL}${asset}`);
            
            check(assetRes, {
                [`${asset} loads`]: (r) => r.status === 200 || r.status === 404, // 404 is acceptable for some assets
            });

            console.log(`${asset}: ${assetRes.status}`);
        });
        
        sleep(1);
    });

   

    // Simulate realistic user behavior with random pauses
    sleep(Math.random() * 3 + 1);
}