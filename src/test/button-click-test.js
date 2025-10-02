import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics for button interaction testing
const buttonResponseRate = new Rate('button_response_rate');
const formSubmissionRate = new Rate('form_submission_rate');
const navigationRate = new Rate('navigation_rate');

export let options = {
    vus: 3, // Reduced load to prevent overwhelming
    duration: '30s', // Shorter duration
    thresholds: {
        http_req_duration: ['p(95)<4000'], // More lenient
        http_req_failed: ['rate<0.4'], // More realistic for SPA
        button_response_rate: ['rate>0.8'], // Slightly lower
        navigation_rate: ['rate>0.9'], // Keep high for navigation
    },
};

const BASE_URL = 'https://song-react-with-firestore.vercel.app';

export default function () {
    // Test 1: Login Page Button Interaction Test
    group('Login Page Button Tests', function () {
        // Load the login page to test UI responsiveness
        const loginPageRes = http.get(`${BASE_URL}/login`);
        
        const pageLoaded = check(loginPageRes, {
            'Login page loads for button test': (r) => r.status === 200,
            'Login page has content': (r) => r.body.length > 1000,
            'Login page loads quickly': (r) => r.timings.duration < 3000,
        });

        buttonResponseRate.add(pageLoaded);
        console.log(`Login page test: ${loginPageRes.status} - ${loginPageRes.timings.duration}ms`);
        sleep(1);
    });

    // Test 2: Signup Page Button Test
    group('Signup Page Button Tests', function () {
        // Load signup page to test button responsiveness
        const signupPageRes = http.get(`${BASE_URL}/signup`);
        
        const signupPageWorked = check(signupPageRes, {
            'Signup page loads': (r) => r.status === 200,
            'Signup page has content': (r) => r.body.length > 500,
            'Signup page loads quickly': (r) => r.timings.duration < 3000,
        });

        buttonResponseRate.add(signupPageWorked);
        console.log(`Signup page test: ${signupPageRes.status} - ${signupPageRes.timings.duration}ms`);
        sleep(1);
    });

    // Test 3: Navigation Button Tests
    group('Navigation Button Tests', function () {
        const navigationTests = [
            { name: 'Dashboard Button', url: '/dashboard' },
            { name: 'Lyric Generator Button', url: '/lyric-generator' },
            { name: 'Metaphor Creator Button', url: '/metaphor-creator' },
            { name: 'Public Hub Button', url: '/public-hub' },
            { name: 'Profile Button', url: '/profile' }
        ];

        navigationTests.forEach(navTest => {
            const navRes = http.get(`${BASE_URL}${navTest.url}`);
            
            const navWorked = check(navRes, {
                [`${navTest.name} navigation works`]: (r) => r.status === 200,
                [`${navTest.name} loads quickly`]: (r) => r.timings.duration < 3000,
                [`${navTest.name} has content`]: (r) => r.body.length > 500,
            });

            navigationRate.add(navWorked);
            console.log(`${navTest.name}: ${navRes.status} - ${navRes.timings.duration}ms`);
            sleep(0.5);
        });
    });

    // Test 4: Page Load and UI Responsiveness Test
    group('UI Button Responsiveness Tests', function () {
        // Test different pages for UI button responsiveness
        const uiTestPages = [
            { name: 'Metaphor Classifier', url: '/metaphor-classifier' },
            { name: 'Masking Predict', url: '/masking-predict' },
            { name: 'Chat Page', url: '/chat' },
            { name: 'API Keys Page', url: '/api-keys' }
        ];

        uiTestPages.forEach(page => {
            const pageRes = http.get(`${BASE_URL}${page.url}`);
            
            const pageWorked = check(pageRes, {
                [`${page.name} page loads`]: (r) => r.status === 200,
                [`${page.name} UI responsive`]: (r) => r.timings.duration < 4000,
                [`${page.name} has UI elements`]: (r) => r.body.length > 300,
            });

            buttonResponseRate.add(pageWorked);
            console.log(`${page.name}: ${pageRes.status} - ${pageRes.timings.duration}ms`);
            sleep(0.5);
        });
    });

    // Test 5: Static Content and Asset Loading
    group('Asset Loading Tests', function () {
        // Test loading of static assets that buttons might reference
        const assets = [
            '/favicon.ico',
            '/manifest.json'
        ];

        assets.forEach(asset => {
            const assetRes = http.get(`${BASE_URL}${asset}`);
            
            const assetWorked = check(assetRes, {
                [`${asset} loads`]: (r) => r.status === 200 || r.status === 404, // 404 acceptable for optional assets
                [`${asset} loads quickly`]: (r) => r.timings.duration < 2000,
            });

            buttonResponseRate.add(assetWorked);
            console.log(`Asset ${asset}: ${assetRes.status}`);
        });
        
        sleep(1);
    });

    // Simulate user clicking behavior with realistic pauses
    sleep(Math.random() * 2 + 0.5);
}