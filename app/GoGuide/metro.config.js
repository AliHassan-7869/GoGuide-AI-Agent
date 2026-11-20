// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// jspdf's "node" build contains an AMD `require(["html2canvas"], ...)` call that
// Metro cannot bundle, which breaks the web server-render (static output) bundle.
// Always resolve to the browser ES build; jspdf is only loaded lazily on the client.
const jspdfBrowserEntry = path.resolve(__dirname, "node_modules/jspdf/dist/jspdf.es.min.js");
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "jspdf") {
    return { type: "sourceFile", filePath: jspdfBrowserEntry };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
