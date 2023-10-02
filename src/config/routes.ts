"use strict";
import GeneralRoutes from "../routes/general/endpoints.js";
import MiniRoutes from "../routes/mini/endpoints.js";

const Routes = {
	//Concatentate the routes into one array
	//set the routes for the server
	init: async function (server: any) {
		let allRoutes = [].concat(
			GeneralRoutes.endpoints,
			MiniRoutes.endpoints,
		);
		await server.route(allRoutes);
	},
};

export default Routes;
