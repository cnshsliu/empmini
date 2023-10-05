import puppeteer from "puppeteer";
import { JSDOM } from "jsdom";
import SanitizeOption from "./SanitizeOption.js";
import { Readability } from "@mozilla/readability";
import { parentPort, workerData } from "worker_threads";
import { GptSearchResult } from "../../database/models/GptSearchResult.js";
import { dbConnect } from "../../database/mongodb.js";
import SanitizeHtml from "sanitize-html";
import Handlers from "./handlers.js";
const workerLog = (msg: string) => {
	parentPort.postMessage({ cmd: "worker_log", msg: msg });
};
async function sleep(miliseconds: number) {
	await new Promise((resolve) => setTimeout(resolve, miliseconds));
}
const regex_img_src = /data-src="/g;
const regex_crossorigin = / crossorigin="anonymous" /g;
const searchEngines = [
	{
		site: "wx",
		url: "https://weixin.sogou.com/",
		inputbox: "#query",
		waitForSelector: 'input[type="submit"][value="搜文章"]',
		click: 'input[type="submit"][value="搜文章"]',
		querySelectorAllPattern: "a",
		startsWithPattern: "https://weixin.sogou.com/link",
		pageWaitForSelector: "#img-content",
	},
];

const searchWx = async (data: { search_uuid: string; query: string }) => {
	await GptSearchResult.deleteMany({ search_uuid: data.search_uuid });

	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();
	workerLog(" search " + data.query);
	let SE = searchEngines[0];
	await page.goto("https://weixin.sogou.com/", { waitUntil: "networkidle0" });
	await Promise.all([
		page.type("#query", data.query),
		page.waitForSelector('input[type="submit"][value="搜文章"]', { visible: true }),
	]);

	await Promise.all([
		page.click('input[type="submit"][value="搜文章"]'),
		page.waitForNavigation({ waitUntil: "load" }), // Wait for the result page to load
	]);

	const hrefs = await page.evaluate(() => {
		const anchors = Array.from(document.querySelectorAll("a"));
		return anchors
			.map((anchor) => anchor.href)
			.filter((href) => href.startsWith("https://weixin.sogou.com/link"));
	});
	const links = [...new Set(hrefs)];

	workerLog(" search " + data.query + ", pages no: " + links.length);
	for (let i = 0; i < links.length; i++) {
		await page.goto(links[i], { waitUntil: "networkidle0" });
		await page.waitForSelector("#img-content", { visible: true });
		const content = await page.evaluate(() => {
			const div = document.querySelector("#img-content");
			return div ? div.innerHTML : null;
		});
		if (content) {
			let doc = new JSDOM("<body>" + content + "</body>", {
				url: page.url(),
			});
			let reader = new Readability(doc.window.document);
			let article = reader.parse();
			if (article) {
				article.content = article.content.replace(regex_img_src, 'src="');
				article.content = article.content.replace(regex_crossorigin, "");
				article.content = SanitizeHtml(article.content, SanitizeOption);

				const searchResult = new GptSearchResult({
					account: "mine",
					site: "wx",
					search_uuid: data.search_uuid,
					query: data.query,
					url: page.url(),
					content: article.content,
					textContent: article.textContent,
					deleted: false,
				});
				await searchResult.save();
			}
		}
	}
	await browser.close();
};

const searchGoogle = async (data: { search_uuid: string; query: string }) => {
	await GptSearchResult.deleteMany({ search_uuid: data.search_uuid });

	const browser = await puppeteer.launch({ headless: true });
	const context = await browser.createIncognitoBrowserContext();
	const page = await context.newPage();
	const client = await page.target().createCDPSession();
	await client.send("Network.clearBrowserCookies");
	await client.send("Network.clearBrowserCache");

	workerLog(" search " + data.query);
	const url = `https://www.google.com`;
	const url2 = `https://www.google.com/search?q=亚运会&tbs=qdr:w,sbd:1&tbm=nws&safe=active&ssui=on`;
	await page.goto(url, { waitUntil: "networkidle0" });
	await Promise.all([page.type('textarea[name="q"]', data.query)]);
	await Promise.all([
		page.keyboard.press("Enter"),
		page.waitForNavigation({ waitUntil: "networkidle0" }),
	]);
	let tmp = page.url();
	if (tmp.indexOf("tbm=nws") < 0) {
		tmp = tmp.replace(/&source=/, "&tbm=nws&source=");
		await page.goto(tmp, { waitUntil: "networkidle0" });
	}

	const hrefs = await page.evaluate(() => {
		const anchors = Array.from(document.querySelectorAll("a[href][ping]"));
		return anchors
			.map((anchor) => (anchor as HTMLAnchorElement).href)
			.filter((href) => href.indexOf("google.com") < 0);
	});

	const links = [...new Set(hrefs)];

	try {
		await Promise.all([
			page.click("#pnnext"),
			page.waitForNavigation({ waitUntil: "networkidle0" }),
		]);

		const hrefsPage2 = await page.evaluate(() => {
			const anchors = Array.from(document.querySelectorAll("a[href][ping]"));
			return anchors
				.map((anchor) => (anchor as HTMLAnchorElement).href)
				.filter((href) => href.indexOf("google.com") < 0);
		});
		links.push(...new Set(hrefsPage2));
	} catch (e) {
		console.warn(e);
	}

	workerLog(" search " + data.query + ", pages no: " + links.length);
	await sleep(1000);
	for (let i = 0; i < links.length; i++) {
		const ret = await GptSearchResult.findOneAndUpdate(
			{ url: links[i] },
			{ $set: { updatedAt: new Date() } },
			{
				upsert: false,
				new: true,
			},
		);
		if (ret) {
			console.log("skip", links[i]);
			continue;
		}

		// let childPage = await context.newPage();
		let childPage = page;
		// const client = await childPage.target().createCDPSession();
		// await client.send("Network.clearBrowserCookies");
		// await client.send("Network.clearBrowserCache");

		await childPage.goto(links[i], { waitUntil: "domcontentloaded" });

		// const response = await childPage.goto(links[i]);
		// const html = await response.text();
		// const simplifiedHtml = html.replace(/<img[^>]*>|<script[^>]*>.*?<\/script>/g, "");
		// await childPage.setContent(simplifiedHtml);

		const content = await childPage.evaluate(() => {
			const div = document.querySelector("body");
			return div ? div.innerHTML : null;
		});
		if (content) {
			let doc = new JSDOM("<body>" + content + "</body>", {
				url: childPage.url(),
			});
			let reader = new Readability(doc.window.document);
			let article = reader.parse();
			if (article) {
				article.content = article.content.replace(regex_img_src, 'src="');
				article.content = article.content.replace(regex_crossorigin, "");
				article.content = SanitizeHtml(article.content, SanitizeOption);

				const searchResult = new GptSearchResult({
					account: "mine",
					site: "google",
					search_uuid: data.search_uuid,
					query: data.query,
					url: childPage.url(),
					content: article.content,
					textContent: article.textContent,
					deleted: false,
				});
				await searchResult.save();
			}
		}
	}
	await client.send("Network.clearBrowserCookies");
	await client.send("Network.clearBrowserCache");
	await context.close();
	await browser.close();
};

dbConnect().then(() => {
	searchGoogle(workerData).then(() => {
		parentPort.postMessage("WxSearcher Worker Done.");
		// searchGoogle(workerData).then(() => {
		// 	parentPort.postMessage("Google Search Worker Done.");
		// });
	});
});
