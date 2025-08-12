export const createBaseAgent = async (config: {
  name: string;
  port: number;
  endpoints?: string[];
}) => {
  const { name, port, endpoints = [`http://localhost:${port}`] } = config;

  // Base agent configuration - will be extended by each component
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
