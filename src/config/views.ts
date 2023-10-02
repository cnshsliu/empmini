/**
 * # views.ts
 *
 */
"use strict";

/**
 * ## Imports
 *
 */
import Hoek from "@hapi/hoek";
import Inert from "@hapi/inert";
import Path from "path";
import Vision from "@hapi/vision";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ### markdown view
 *
 * Use the GitHub Markdown css
 */

/**
 * ## init
 *
 */
const Views = {
	init: async function (server) {
		/**
		 * ### vision
		 *
		 * this establishes where the html is located
		 * and the engine to parse it
		 */
		await server
			.register({
				plugin: Vision,
			})
			.then(() => {
				console.log("Register views");
				server.views({
					relativeTo: __dirname,
					path: [Path.join(__dirname, "../views"), Path.join(__dirname, "../docs")],
				});
			})
			.catch((err) => {
				Hoek.assert(!err, err);
			});
		/**
		 * ### inert
		 *
		 * this says that any request for /assest/* will
		 * be served from the ../assests dir
		 *
		 * The resetpassword.js is located in ../assests
		 *
		 */
		await server
			.register({
				plugin: Inert,
			})
			.then(() => {
				//Load files located in ../assets
				server.route({
					method: "GET",
					path: "/assets/{param*}",
					handler: {
						directory: {
							path: Path.join(__dirname, "../assets"),
						},
					},
				});
			})
			.catch((err) => {
				//Confirm no err
				Hoek.assert(!err, err);
			});
	},
};

export default Views;
