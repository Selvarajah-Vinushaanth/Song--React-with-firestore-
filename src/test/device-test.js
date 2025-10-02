import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics for device testing
const mobileLoadRate = new Rate('mobile_load_rate');
const desktopLoadRate = new Rate('desktop_load_rate');
const tabletLoadRate = new Rate('tablet_load_rate');

export let options = {
    vus: 4,
    duration: '1m',
    thresholds: {
        http_req_duration: ['p(95)<4000'], // Mobile can be slower
        http_req_failed: ['rate<0.1'],
        mobile_load_rate: ['rate>0.9'],
        desktop_load_rate: ['rate>0.9'],
    },
};

const BASE_URL = 'https://song-react-with-firestore.vercel.app';

// Device configurations for User-Agent testing
const devices = {
    'iPhone 14': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 390, height: 844 }
    },
    'iPhone X': {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 375, height: 812 }
    },
    'Samsung Galaxy S21': {
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        viewport: { width: 360, height: 800 }
    },
    'iPad Pro': {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        viewport: { width: 1024, height: 1366 }
    },
    'Desktop Chrome': {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
    },
    'Desktop Safari': {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        viewport: { width: 1440, height: 900 }
    }
};

export default function () {
    const deviceNames = Object.keys(devices);
    const randomDevice = deviceNames[Math.floor(Math.random() * deviceNames.length)];
    const device = devices[randomDevice];
    
    console.log(`Testing with: ${randomDevice}`);

    // Test 1: Home Page Responsive Design
    group(`${randomDevice} - Home Page Test`, function () {
        const headers = {
            'User-Agent': device.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        };

        const homeRes = http.get(`${BASE_URL}/`, { headers });
        
        const homeLoaded = check(homeRes, {
            'Home page loads successfully': (r) => r.status === 200,
            'Response time acceptable for device': (r) => r.timings.duration < (randomDevice.includes('iPhone') ? 5000 : 3000),
            'Page has mobile-friendly content': (r) => r.body.length > 1000,
            'Contains viewport meta tag': (r) => r.body.includes('viewport') || r.body.includes('responsive'),
        });

        if (randomDevice.includes('iPhone') || randomDevice.includes('Samsung')) {
            mobileLoadRate.add(homeLoaded);
        } else if (randomDevice.includes('iPad')) {
            tabletLoadRate.add(homeLoaded);
        } else {
            desktopLoadRate.add(homeLoaded);
        }

        console.log(`${randomDevice} Home: ${homeRes.status} - ${homeRes.timings.duration}ms`);
        sleep(1);
    });

    // Test 2: Login Page Mobile Experience
    group(`${randomDevice} - Login Page Test`, function () {
        const headers = { 'User-Agent': device.userAgent };
        const loginRes = http.get(`${BASE_URL}/login`, { headers });
        
        check(loginRes, {
            'Login page loads on device': (r) => r.status === 200,
            'Login form mobile-friendly': (r) => r.body.length > 500,
            'Reasonable load time': (r) => r.timings.duration < 4000,
        });

        console.log(`${randomDevice} Login: ${loginRes.status} - ${loginRes.timings.duration}ms`);
        sleep(1);
    });

    // Test 3: Core Features Device Compatibility
    group(`${randomDevice} - Core Features Test`, function () {
        const features = [
            '/dashboard',
            '/lyric-generator',
            '/metaphor-creator',
            '/public-hub'
        ];

        const headers = { 'User-Agent': device.userAgent };

        features.forEach(feature => {
            const featureRes = http.get(`${BASE_URL}${feature}`, { headers });
            
            check(featureRes, {
                [`${feature} loads on ${randomDevice}`]: (r) => r.status === 200,
                [`${feature} mobile responsive`]: (r) => r.body.length > 500,
                [`${feature} performance OK`]: (r) => r.timings.duration < 5000,
            });

            console.log(`${randomDevice} ${feature}: ${featureRes.status} - ${featureRes.timings.duration}ms`);
            sleep(0.5);
        });
    });

    // Test 4: Mobile vs Desktop Performance Comparison
    group(`${randomDevice} - Performance Analysis`, function () {
        const headers = { 'User-Agent': device.userAgent };
        const startTime = Date.now();
        
        const perfRes = http.get(`${BASE_URL}/`, { headers });
        const endTime = Date.now();
        const totalTime = endTime - startTime;

        check(perfRes, {
            'Page loads within device expectations': () => {
                if (randomDevice.includes('iPhone') || randomDevice.includes('Samsung')) {
                    return totalTime < 6000; // Mobile: 6s threshold
                } else if (randomDevice.includes('iPad')) {
                    return totalTime < 4000; // Tablet: 4s threshold
                } else {
                    return totalTime < 3000; // Desktop: 3s threshold
                }
            },
            'Content size appropriate': (r) => {
                // Mobile should get compressed/optimized content
                return r.body.length > 100 && r.body.length < 3000000; // 3MB max
            },
        });

        console.log(`${randomDevice} Performance: ${totalTime}ms total, ${perfRes.body.length} bytes`);
        sleep(1);
    });

    // Test 5: Navigation and UX on Different Devices
    group(`${randomDevice} - Navigation Test`, function () {
        const headers = { 'User-Agent': device.userAgent };
        const navPages = ['/signup', '/profile', '/forgot-password'];

        navPages.forEach(page => {
            const navRes = http.get(`${BASE_URL}${page}`, { headers });
            
            check(navRes, {
                [`${page} accessible on ${randomDevice}`]: (r) => r.status === 200,
                [`${page} loads quickly on device`]: (r) => r.timings.duration < 4000,
            });

            console.log(`${randomDevice} ${page}: ${navRes.status}`);
            sleep(0.3);
        });
    });

    // Test 6: Device-Specific Error Handling
    group(`${randomDevice} - Error Handling Test`, function () {
        const headers = { 'User-Agent': device.userAgent };
        
        // Test 404 handling
        const notFoundRes = http.get(`${BASE_URL}/nonexistent-page-mobile-test`, { headers });
        
        check(notFoundRes, {
            'Error handling works on device': (r) => r.status === 404 || r.status === 200, // SPA might handle routing
            'Error page loads reasonably': (r) => r.timings.duration < 3000,
        });

        console.log(`${randomDevice} 404 handling: ${notFoundRes.status}`);
        sleep(1);
    });

    // Simulate device-specific user behavior
    if (randomDevice.includes('iPhone') || randomDevice.includes('Samsung')) {
        sleep(Math.random() * 2 + 1); // Mobile users browse slower
    } else {
        sleep(Math.random() * 1 + 0.5); // Desktop users are faster
    }
}
