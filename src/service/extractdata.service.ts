import { apifyClient } from "../config/apifyClient.js";

export const extractFromLink = (url: string, type: string): Promise<string> => {
  switch (type) {
    case "youtube":
      return extractYoutube(url);
    case "x":
      return extractTweet(url);
    case "links":
      return extractWebsite(url);
    default:
      throw new Error(`unexpected types ${type}`);
  }
};

async function extractYoutube(link: string): Promise<string> {
    const run = await apifyClient
      .actor("scrape-creators/best-youtube-transcripts-scraper")
      .call({
        videoUrls: [link],
      });

    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    if (!items.length) {
      throw new Error("No transcript extracted");
    }

    return items.map((item) => item.transcript_only_text).join(" ");

}

async function extractTweet(link: string): Promise<string> {
  const xId = getIdfromLink(link);
  const run = await apifyClient
    .actor("kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest")
    .call({
      tweetIDs: [xId],
      maxItems: 1,
      queryType: "Latest",
    });

  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

  if (!items.length) {
    throw new Error("No tweet data extracted");
  }

  return items
    .map((item) => {
      if (item.id !== -1) {
        return item.text;
      }
    })
    .join(".");
}

async function extractWebsite(link: string): Promise<string> {
  const run = await apifyClient.actor("apify/website-content-crawler").call({
    startUrls: [{ url: link }],
    crawlerType: "playwright:adaptive",
    readableText: true,
    htmlTransformer: "readableText",
    saveMarkdown: true,
    expandIframes: true,
    removeCookieWarnings: true,
    blockMedia: true,
    maxCrawlDepth: 1,
    maxCrawlPages: 1,
    dynamicContentWaitSecs: 10,
    proxyConfiguration: {
      useApifyProxy: true,
    },
    removeElementsCssSelector: "nav, footer, script, style, noscript, svg",
  });

  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

  if (!items.length) {
    throw new Error("No content extracted from website");
  }
  return items.map((item) => item.markdown || item.text || "").join("\n\n");
}

function getIdfromLink(link:string):string{
     const regex = /\/status\/(\d+)/;
     const match = link.match(regex);
     return match ? `${match[1]}`: "null";
}
