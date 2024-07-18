const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // make the auto browsing less detectable
puppeteer.use(StealthPlugin());

const url = process.argv[2]; // since it would be 3rd argument passed in from the command line
const timeout = 5000;
// const url = "https://linkedin.com/in/jeff-jh-liu/details/";

(async () => {
    // launch a new browser

    // cannot use user-defined profile
    const browser = await puppeteer.launch( {
        headless: "new",
        executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google\ Chrome\ Canary',
        userDataDir: '/Users/jeffreyliu/Library/Application\ Support/Google/Chrome\ Canary/Default', // default profile
    } );

    const page = await browser.newPage();

    // screen size
    await page.setViewport( {
        width: 1200,
        height: 1200,
        deviceScaleFactor: 1,
    } );


    // wait until the HTML Page DOM is loaded
    await page.goto( url, {
        waitUntil: "domcontentloaded",
        timeout: timeout,
    } );

    // await page.waitForTimeout(timeout);
    await page.screenshot({
        path: "screenshot.jpg",
        fullPage: true, // useful for web content that requires scrolling
    });

    await browser.close();
})();