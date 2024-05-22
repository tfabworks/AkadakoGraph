const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
	productionSourceMap: process.env.NODE_ENV === "production" ? false : true,
	devServer: {
		port: 3000,
	},
	pages: {
		index: {
			entry: "src/main.js",
			template: "templates/index.html",
			filename: "index.html",
		},
	},
	configureWebpack: {
		resolve: {
			fallback: {
				fs: false,
				child_process: false,
			},
		},
		plugins: [new NodePolyfillPlugin()],
	},
};
