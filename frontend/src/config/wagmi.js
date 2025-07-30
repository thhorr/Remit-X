import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { MORPH_TESTNET } from './contracts';

export const wagmiConfig = createConfig({
  chains: [MORPH_TESTNET],
  connectors: [
    injected(),
    walletConnect({
      projectId: 'c0a78f901e5b4bfbd49afa602bf57178',
    }),
  ],
  transports: {
    [MORPH_TESTNET.id]: http(),
  },
});
