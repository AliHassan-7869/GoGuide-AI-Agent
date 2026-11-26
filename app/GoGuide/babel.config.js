module.exports = function (api) {
  const production = api.env("production");
  return {
    presets: ["babel-preset-expo"],
    // Release builds carry no console output (messages and stack traces would be readable on the device).
    plugins: production ? ["transform-remove-console"] : [],
  };
};
