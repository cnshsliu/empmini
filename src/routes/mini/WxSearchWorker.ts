import puppeteer from "puppeteer";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { parentPort, workerData } from "worker_threads";
import { GptSearchResult } from "../../database/models/GptSearchResult.js";
import { dbConnect } from "../../database/mongodb.js";

const workerLog = (msg) => {
	parentPort.postMessage({ cmd: "worker_log", msg: msg });
};
const regex_img_src = /data-src="/g;

const search2 = async (data: { search_uuid: string; query: string }) => {
	const ret = await GptSearchResult.find({});
	console.log(ret.length);
	await GptSearchResult.deleteMany({ search_uuid: data.search_uuid });

	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();
	workerLog(" search " + data.query);
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

	workerLog(" search " + data.query + ", pages " + links.length);
	for (let i = 0; i < links.length; i++) {
		await page.goto(links[i], { waitUntil: "networkidle0" });
		await page.waitForSelector("#js_content", { visible: true });
		const content = await page.evaluate(() => {
			const div = document.querySelector("#js_content");
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
				article.content =
					`<html><head><base href="https://mp.weixin.qq.com/" /></head><body>` +
					article.content +
					`</body></html>`;
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

dbConnect().then(() => {
	search2(workerData).then(() => {
		parentPort.postMessage("WxSearcher Worker Done.");
	});
});
