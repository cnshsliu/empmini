import Joi from "joi";
import Handlers from "./handlers.js";

const internals = {
	endpoints: [
		{
			method: "POST",
			path: "/caishen/wxSearch",
			handler: Handlers.WxSearch,
			config: {
				cors: {
					origin: ["*"],
					credentials: true,
					additionalExposedHeaders: ["ETag", "X-Content-Type-Options"],
				},
				description: "Search Weixin",
				tags: ["api"],
				validate: {
					payload: { query: Joi.string().required() },
					validator: Joi,
				},
			},
		},
		{
			method: "POST",
			path: "/caishen/getOneResult",
			handler: Handlers.GetOneResult,
			config: {
				cors: {
					origin: ["*"],
					credentials: true,
					additionalExposedHeaders: ["ETag", "X-Content-Type-Options"],
				},
				description: "Get One Search Weixin Result",
				tags: ["api"],
				validate: {
					payload: { search_uuid: Joi.string().required(), ts: Joi.number().required() },
					validator: Joi,
				},
			},
		},
	],
};

export default internals;
