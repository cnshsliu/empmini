"use strict";
import { ResponseToolkit } from "@hapi/hapi";
import { WxSearch } from "./WxSearch.js";
import suuid from "short-uuid";
import { GptSearchResult } from "../../database/models/GptSearchResult.js";

export default {
	WxSearch: async (req: any, h: ResponseToolkit) => {
		const PLD = req.payload as any;
		const Searcher = new WxSearch();
		const search_uuid = suuid.generate();
		await Searcher.search({ search_uuid, query: PLD.query });
		console.log("search_uuid", search_uuid);
		return h.response(search_uuid);
	},

	GetOneResult: async (req: any, h: ResponseToolkit) => {
		const PLD = req.payload as any;
		const date = new Date(PLD.ts);

		// const filter = { createdAt: { $gt: date } };
		const filter = {};
		const ret = await GptSearchResult.findOne(filter, { __v: 0, _id: 0, deleted: 0 }).lean();
		if (ret) {
			return h.response(ret);
		} else {
			return h.response({ error: "not found" });
		}
	},
};
