const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting Puppeteer test...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--window-size=1200,900']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    // Collect console logs and errors
    const logs = [];
    const errors = [];

    page.on('console', msg => {
        const text = msg.text();
        logs.push(`[${msg.type()}] ${text}`);
        if (msg.type() === 'error') {
            errors.push(text);
        }
    });

    page.on('pageerror', err => {
        errors.push(`Page error: ${err.message}`);
    });

    page.on('requestfailed', request => {
        errors.push(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    });

    try {
        console.log('1. Navigating to http://localhost:8000...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
        console.log('   Page loaded successfully\n');

        // Take screenshot of initial state
        await page.screenshot({ path: 'test-screenshots/1-initial.png' });
        console.log('2. Clicking "Load Test Data" button...');

        // Click the Load Test Data button
        await page.click('#btn-load-test');
        console.log('   Button clicked\n');

        // Wait a moment for files to load
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-screenshots/2-files-loaded.png' });

        console.log('3. Waiting for analysis to complete (up to 60s)...');

        // Wait for either results or error to appear
        try {
            await page.waitForFunction(
                () => {
                    const results = document.getElementById('results-section');
                    const error = document.getElementById('error-section');
                    const loading = document.getElementById('loading-section');
                    return (results && results.style.display !== 'none') ||
                           (error && error.style.display !== 'none') ||
                           (loading && loading.style.display === 'none');
                },
                { timeout: 60000 }
            );
        } catch (e) {
            console.log('   Timeout waiting for results\n');
        }

        await page.screenshot({ path: 'test-screenshots/3-results.png' });

        // Check what happened
        const state = await page.evaluate(() => {
            const results = document.getElementById('results-section');
            const error = document.getElementById('error-section');
            const loading = document.getElementById('loading-section');
            const errorText = document.getElementById('error-text');

            return {
                resultsVisible: results && results.style.display !== 'none',
                resultsContent: results ? results.innerHTML.substring(0, 500) : '',
                errorVisible: error && error.style.display !== 'none',
                errorText: errorText ? errorText.textContent : '',
                loadingVisible: loading && loading.style.display !== 'none',
                filesLoaded: document.querySelectorAll('.file-card').length
            };
        });

        console.log('4. Results:');
        console.log(`   Files loaded: ${state.filesLoaded}`);
        console.log(`   Loading visible: ${state.loadingVisible}`);
        console.log(`   Results visible: ${state.resultsVisible}`);
        console.log(`   Error visible: ${state.errorVisible}`);

        if (state.errorVisible) {
            console.log(`\n   ERROR: ${state.errorText}`);
        }

        if (state.resultsVisible) {
            console.log(`\n   Results preview: ${state.resultsContent.substring(0, 300)}...`);
        }

        if (errors.length > 0) {
            console.log('\n5. Console Errors:');
            errors.forEach(e => console.log(`   - ${e}`));
        }

        if (logs.length > 0) {
            console.log('\n6. Console Logs:');
            logs.slice(-10).forEach(l => console.log(`   ${l}`));
        }

        // Keep browser open for manual inspection
        console.log('\n\nTest complete. Browser will stay open for 30 seconds for inspection...');
        await page.waitForTimeout(30000);

    } catch (err) {
        console.error('Test error:', err.message);
        await page.screenshot({ path: 'test-screenshots/error.png' });
    } finally {
        await browser.close();
    }
})();
