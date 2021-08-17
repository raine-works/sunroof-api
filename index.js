const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const PORT = 3030 || process.env.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
})

app.post('/roof-data', async (req, res) => {
    try {
        if (req.body.lat != null && req.body.long != null) {
            res.status(200).json({
                success: true, 
                data: await getSolarData(req.body.lat, req.body.long)
            })
        } else {
            res.status(400).json({
                success: false, 
                data: 'lat and long required!'
            })
        }
    } catch(err) {
        res.status(500).json({
            success: false, 
            data: err
        })
    }
})

const getSolarData = async (lat, long) => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const deviceWidth = 1920;
        const deviceHeight = 1080;
        const imgWidth = 300;
        const imgHeight = 300;
        await page.setViewport({width: deviceWidth, height: deviceHeight})
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
        await page.goto(`https://www.google.com/get/sunroof/building/${lat}/${long}/#?f=buy`, {
            waitUntil: 'networkidle0'
        });   
        const map = await page.$('body > div.view-wrap > address-view > div.main-content-wrapper > div > div > section.section.section-map > sun-map > div > div > div > div:nth-child(1) > div:nth-child(3)');
        const pin = await page.$('body > div.view-wrap > address-view > div.main-content-wrapper > div > div > section.section.section-map > sun-map > div > div > div > div:nth-child(1) > div > div:nth-child(4)');
        pin.evaluate((el) => el.style.display = 'none');
        const roofDetails = await page.$('body > div.view-wrap > address-view > div.main-content-wrapper > div > div > section.section.section-map > div.address-map-panel > md-card:nth-child(2) > ul > li:nth-child(1) > div.panel-fact-text.md-body');
        const panelDetails = await page.$('body > div.view-wrap > address-view > div.main-content-wrapper > div > div > section.section.section-map > div.address-map-panel > md-card:nth-child(2) > ul > li:nth-child(2) > div.panel-fact-text.md-body');
        let sunLight = await roofDetails.evaluate((el) => { return el.innerHTML });
        let arraySize = await panelDetails.evaluate((el) => { return el.innerHTML });

        let size = await map.boundingBox();   
        let image = await map.screenshot({
            path: './roof_image/roof.png', 
            clip: {
                x: (size.width / 2) + 80,
                y: (size.height / 2) - 100,
                width: imgWidth, 
                height: imgHeight
            }
        });   
        await browser.close(); 

        return {
            hours: {
                description: 'Estimated hours of usable sunlight per year.',
                value: parseInt(sunLight.trim().split(' ')[0].split(',').join('')),
            },
            roof: {
                description: 'Estimated square footage of usable roof space.',
                value: parseInt(arraySize.trim().split(' ')[0].split(',').join(''))
            }, 
            image: image
        }
    } catch (err) {
        console.log(err);
    }
}