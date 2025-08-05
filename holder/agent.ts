import type { InitConfig } from "@credo-ts/core";
import { Agent, ConnectionsModule } from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { HttpOutboundTransport, WsOutboundTransport } from "@credo-ts/core";

import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";

import { OpenId4VcHolderModule } from "@credo-ts/openid4vc";

const initializeBobAgent = async () => {
  const config: InitConfig = {
    label: "demo-agent-bob",
    walletConfig: {
      id: "mainBob",
      key: "demoagentbob00000000000000000000",
    },
  };

  const agent = new Agent({
    config,
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({ ariesAskar }),
      connections: new ConnectionsModule({ autoAcceptConnections: true }),
      openId4VcHolderModule: new OpenId4VcHolderModule(),
    },
  });

  agent.registerOutboundTransport(new WsOutboundTransport());
  agent.registerOutboundTransport(new HttpOutboundTransport());

  await agent.initialize();

  return agent;
};

const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
  const { outOfBandRecord } = await agent.oob.receiveInvitationFromUrl(
    invitationUrl
  );

  return outOfBandRecord;
};
