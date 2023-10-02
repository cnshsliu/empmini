/*jshint node: true */
"use strict";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import HapiServer from "./config/hapi.js";
import { Mongoose, dbConnect } from "./database/mongodb.js";

dbConnect().then(() => {
	HapiServer.starter();
});
