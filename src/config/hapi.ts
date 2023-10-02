"use strict";

import { Server, Request, ResponseObject, ResponseToolkit } from "@hapi/hapi";
import Routes from "./routes.js";
import Inert from "@hapi/inert";
import Vision from "@hapi/vision";
const theHapiServer = {
	server_initialized: false,
	server: new Server({
		port: process.env.EMP_MINI_PORT,
		address: process.env.EMP_MINI_ADDR,
		/*
		 * https://morioh.com/p/3d5ffc21ace4
		 * headers - a strings array of allowed headers (‘Access-Control-Allow-Headers’). Defaults to [‘Accept’, ‘Authorization’, ‘Content-Type’, ‘If-None-Match’].
		 * exposedHeaders - a strings array of exposed headers (‘Access-Control-Expose-Headers’). Defaults to [‘WWW-Authenticate’, ‘Server-Authorization’].

additionalExposedHeaders - a strings array of additional headers to exposedHeaders. Use this to keep the default headers in place.
		 */
		/*
		 * https://stackoverflow.com/questions/57653272/how-to-allow-cors-in-hapi-js
		 * const server = Hapi.server({
				port: 3000,
				host: '192.168.1.13',        
				"routes": {
						"cors": {
								"origin": ["http://192.168.1.13:4200"],
								"headers": ["Accept", "Content-Type"],
								"additionalHeaders": ["X-Requested-With"]
						}
				}
				});
		 */
		routes: {
			//Allow CORS for all
			// cors: true,
			cors: {
				origin: ["*"],
				credentials: true,
				additionalExposedHeaders: ["ETag", "X-Content-Type-Options"],
			},
			validate: {
				failAction: (request: Request, h: ResponseToolkit, err) => {
					console.error(err);
					if (request.method === "post") {
						console.error(request.path, JSON.stringify(request.payload));
					}
					throw err;
				},
			},
		},
	}),

	starter: async () => {
		if (theHapiServer.server_initialized) {
			return theHapiServer.server;
		}

		await Routes.init(theHapiServer.server);
		await theHapiServer.server.start();
		console.debug("Server is running: " + theHapiServer.server.info.uri);
		theHapiServer.server.events.on("response", function (request: Request) {
			switch (request.method.toUpperCase()) {
				case "POST":
					break;
				case "GET":
			}
		});
		theHapiServer.server_initialized = true;
		return theHapiServer.server;
	},
	init: async () => {
		if (theHapiServer.server_initialized) {
			return theHapiServer.server;
		}
		await Routes.init(theHapiServer.server);
		await theHapiServer.server.initialize();
		console.debug("Server is initializing: " + theHapiServer.server.info.uri);
		theHapiServer.server_initialized = true;
		return theHapiServer.server;
	},
};

export default theHapiServer;
