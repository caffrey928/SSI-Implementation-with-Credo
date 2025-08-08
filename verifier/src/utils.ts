export const createBaseAgent = async (config: {
  name: string;
  port: number;
  endpoints?: string[];
}) => {
  const { name, port, endpoints = [`http://localhost:${port}`] } = config;

  return {
    config: {
      label: name,
      walletConfig: {
        id: `${name.toLowerCase()}-wallet`,
        key: `${name.toLowerCase()}-key`,
      },
      endpoints,
    },
    port,
  };
};