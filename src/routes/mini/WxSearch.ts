import { Worker, parentPort, isMainThread, SHARE_ENV } from "worker_threads";
import { fileURLToPath } from "url";
import path from "path";
import suuid from "short-uuid";
const __filename = fileURLToPath(import.meta.url);

export class WxSearch {
	constructor() {}

	public search = async (workerData: { search_uuid: string; query: string }) => {
		this.callWxSearcher(workerData);
	};

	private callWxSearcher = async function (workerData: { search_uuid: string; query: string }) {
		try {
			workerData = JSON.parse(JSON.stringify(workerData));
			return new Promise((resolve, reject) => {
				try {
					const workerPath = path.dirname(__filename) + "/WxSearchWorker.js";
					console.log("new Worker", workerPath, "data:", workerData);
					const worker = new Worker(workerPath, {
						env: SHARE_ENV,
						workerData: workerData,
					});
					worker.on("message", async (message) => {
						if (message.cmd && message.cmd === "worker_log") {
							console.log("\tWorker Log:", message.msg);
						} else {
							console.log("\t" + message);
							console.log("\t====>Now Resolve WxSearch Worker ");
							resolve(message);
						}
					});
					worker.on("error", reject);
					worker.on("exit", (code) => {
						if (code !== 0) reject(new Error(`WxSearcher Worker stopped with exit code ${code}`));
					});
				} catch (error) {
					console.error(error);
					console.log(JSON.stringify(workerData));
				}
			});
		} catch (err) {
			console.error(err);
		}
	};
}
