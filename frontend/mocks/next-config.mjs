// Mock for next/config
const getConfig = () => ({
  publicRuntimeConfig: {},
  serverRuntimeConfig: {},
});

getConfig.default = getConfig;

export default getConfig;
