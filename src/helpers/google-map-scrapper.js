// import * as cheerio from "cheerio";
import * as cheerio from 'cheerio';
const {chrome} = require('chrome-paths');
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { submitState } from '../enum';

export default class GoogleMapScrapper {
  constructor() {
    this.browser = null;
    this.scrollable = false;
  }
  async startScrapping(electronEvent, params) {
    try {
      const os = require('os');

      puppeteer.use(StealthPlugin());
  
      this.browser = await puppeteer.launch({
        headless: false,
        // headless: "new",
        // devtools: true,
        // userDataDir: `/Users/${username}/Library/Application\ Support/Google/Chrome`,
        executablePath: chrome,
        args: ['--no-sandbox', '--start-maximized' ],
        // executablePath: "", // your path here
      });
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.scrapping);
  
      // const this.browser = await puppeteer.launch({
      //   args: chromium.args,
      //   defaultViewport: chromium.defaultViewport,
      //   executablePath: await chromium.executablePath(),
      //   headless: "new",
      //   ignoreHTTPSErrors: true,
      // });
  
      const page = await this.browser.newPage();
  
      try {
        let url = null;
        if (params.query) {
          url = `https://www.google.com/maps/search/${params.query.split(" ").join("+")}`;
        } else {
          url = params.url;
        } 
        url = new URL(url);
        url.searchParams.append('hl', 'id'); // en = english
        await page.goto(url);
      } catch (error) {
        electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
        return Promise.reject(error)
      }

      this.scrollable = true;
      const listing = [];
      let processedListElement = 0;
      const mainProcess = async () => {
        while (this.scrollable) {
          // dapatkan listing yang sudah di load
          const html = await page.content();
          const $ = cheerio.load(html);
          let googleMapListElements = $('div[role="feed"] > div');
          googleMapListElements.splice(0, processedListElement);
  
          for await (const el of googleMapListElements) {
            const aElement = $(el).find("a");
            if (aElement.length) {
              const href = aElement.attr("href");
              if (href && href.includes("/maps/place/")) {
                // console.log('href', href)
                let data = this.htmlToObject(
                  aElement.parent()
                );
                if (!data.address || !data.phone) {
                  try {
                    await Promise.all([
                      page.click(`a[href="${data.googleUrl}"]`),
                      page.waitForNavigation({
                        waitUntil: 'domcontentloaded',
                      }),
                      page.waitForSelector('[data-item-id]', {
                        timeout: 15000
                      })
                    ]);
                    let phoneNumber = null;
                    let address = data.address;

                    const html = await page.content();
                    const $ = cheerio.load(html);

                    const dataItemAddress = $('[data-item-id="address"]');
                    console.log(dataItemAddress.length)
                    if (dataItemAddress) {
                      address = dataItemAddress.find('.fontBodyMedium');
                      if (address) {
                        address = dataItemAddress.text();
                      }
                    }
                    data.address = address;
                    
                    const dataItemPhone = $('[data-item-id^="phone:tel"]');
                    if (dataItemPhone) {
                      phoneNumber = dataItemPhone.attr('data-item-id');
                      if (phoneNumber) {
                        phoneNumber = phoneNumber.replace('phone:tel:', '')
                      }
                    }
                    data.phone = phoneNumber;
  
                    const dataWebsite = $('[aria-label^="Situs Web:"]');
                    if (dataWebsite) {
                      data.bizWebsite = dataWebsite.attr('href');
                    }
  
                    const promise = new Promise(async (resolve) => {
                      try {
                        await page.click('div[role="main"][aria-label] .VfPpkd-kBDsod')
                      } catch (e) {
                        // console.log('error on close', e)
                      }
                      return setTimeout(resolve, 500, null);
                    });
                    await Promise.all([
                      promise
                    ]);
                  } catch (e) {
                    // console.log(e)
                  }
                }
                listing.push(data);
                electronEvent.sender.send('receiveGoogleMapScrappingResult', data);
              }
            }
          }
          processedListElement += googleMapListElements.length;
  
          // cek jika telah mencarapai akhir halaman
          const lastElementWrapper = $('div[role="feed"] > div:last-child');
          if (lastElementWrapper.length && (
            lastElementWrapper.html().toLowerCase().includes("anda telah mencapai akhir daftar") ||
            lastElementWrapper.html().toLowerCase().includes("you've reached the end of the list")
          )) {
            this.scrollable = false;
          } else {
            await page.evaluate(() => {
              const wrapper = document.querySelector('div[role="feed"]');
              wrapper.scrollBy(0, 1000);
            });
          }
        }
  
        return Promise.resolve(true)
      }
  
      await mainProcess();
  
      if (page.isClosed()) {
        electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
        return Promise.resolve(listing);
      }
      await this.processCompleted(this.browser);
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
      return Promise.resolve(listing);
  
    } catch (error) {
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
      return Promise.reject(error)
    }
  }

  async stopScrapping () {
    this.scrollable = false;
    // electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
  }

  async processCompleted () {
    try {
        // close all page
        const pages = await this.browser.pages();
        await Promise.all(pages.map((page) => page.close()));
        // // close browser
        await this.browser.close();
        return Promise.resolve(null);
    } catch (e) {
      // electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
      return Promise.reject(e)
    }
  }

  htmlToObject (item) {
    const url = item.find("a").attr("href");
    const website = item.find('a[data-value="Website"]').attr("href");
    let storeName = item.find("div.fontHeadlineSmall").text();
    if (item.find("div.fontHeadlineSmall").length > 1) {
      storeName = item.find("div.fontHeadlineSmall:first").text();
    }
    // console.log(item.find("div.fontHeadlineSmall").length)
    const ratingText = item
      .find("span.fontBodyMedium > span")
      .attr("aria-label");
    const ratingNumber = item
      .find("span.MW4etd").text();
      const reviewCounter = item
        .find("span.UY7F9").text();
      const phoneNumber = item
        .find("span.UsdlK").text();
  
    const bodyDiv = item.find("div.fontBodyMedium").first();
    const children = bodyDiv.children();
    const lastChild = children.last();
    const firstOfLast = lastChild.children().first();
  
    return {
      placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
      address: firstOfLast?.text()?.split("·")?.[1]?.trim(),
      category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
      phone: phoneNumber ? phoneNumber : null,
      googleUrl: url,
      bizWebsite: website,
      storeName,
      ratingText,
      stars: ratingNumber,
      numberOfReviews: reviewCounter ? reviewCounter.replace(/[{()}]/g, '') : null,
    };
  }
}