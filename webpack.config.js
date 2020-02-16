const path = require("path");
const entry = "./src/js/App.js";

let config = {
  entry: path.resolve(__dirname, entry),
  output: {
    filename: "bundle.js"
  },
  module: {
    rules: [{
      test: /\.m?js$/,
      exclude: /(node_modules|bower_components)/,
      use: {
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env"]
        }
      }
    }]
  }
};

module.exports = { config };