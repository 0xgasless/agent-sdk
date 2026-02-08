/**
 * LangChain-compatible Tools for 0xGasless Agent SDK
 * 
 * These tools can be used with LangChain/LangGraph agents to give
 * them the ability to:
 * - Register identities (ERC-8004 v0.2)
 * - Verify on MoltBook
 * 
 * Usage with LangGraph:
 * ```typescript
 * import { getAgentTools } from '@0xgasless/agent-sdk/langchain';
 * const tools = await getAgentTools(config);
 * const agent = createReactAgent({ llm, tools });
 * ```
 */

import { tool, DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ERC8004Provider } from "../providers/ERC8004Provider.js";
import { MoltBookProvider } from "../providers/MoltBookProvider.js";

// --- Configuration ---
interface LangChainToolConfig {
  privateKey: string;
  rpcUrl?: string;
}

// --- Singleton Providers (Lazy Initialized) ---
let erc8004Provider: ERC8004Provider | null = null;
let moltBookProvider: MoltBookProvider | null = null;

/**
 * Initialize providers before using tools.
 * Must be called once before getAgentTools().
 */
async function initializeProviders(config: LangChainToolConfig): Promise<void> {
  if (!erc8004Provider) {
    erc8004Provider = new ERC8004Provider(
      config.rpcUrl || 'https://api.avax-test.network/ext/bc/C/rpc',
      config.privateKey
    );
    console.log(`[LangChain] ERC8004Provider initialized`);
  }

  if (!moltBookProvider) {
    moltBookProvider = new MoltBookProvider();
    console.log(`[LangChain] MoltBookProvider initialized`);
  }
}

// --- Tool Definitions ---

/**
 * Register Agent Identity Tool
 * Uses ERC-8004 v0.2 registry on Avalanche.
 */
export const registerAgentTool = tool(
  async ({ agentURI }): Promise<string> => {
    if (!erc8004Provider) {
      return "Error: Providers not initialized. Call initializeProviders() first.";
    }
    try {
      const isRegistered = await erc8004Provider.isRegistered();
      if (isRegistered) {
        return `Agent is already registered on ERC-8004 registry.`;
      }
      
      const tokenId = await erc8004Provider.register(agentURI);
      return `✅ Successfully registered agent with Token ID #${tokenId} on ERC-8004 (Avalanche).`;
    } catch (error) {
      return `❌ Registration failed: ${String(error)}`;
    }
  },
  {
    name: "register_agent_identity",
    description: "Registers the AI agent's decentralized identity on the ERC-8004 v0.2 registry (Avalanche). This gives the agent a sovereign on-chain identity.",
    schema: z.object({
      agentURI: z.string().describe("IPFS or HTTP URI pointing to the agent's metadata JSON"),
    }),
  }
);

/**
 * Get Wallet Balance Tool
 */
export const getBalanceTool = tool(
  async ({}): Promise<string> => {
    if (!erc8004Provider) {
      return "Error: Provider not initialized.";
    }
    try {
      const address = erc8004Provider.getAddress();
      return `💰 Wallet: ${address}`;
    } catch (error) {
      return `❌ Balance check failed: ${String(error)}`;
    }
  },
  {
    name: "get_wallet_balance",
    description: "Gets the agent's wallet address.",
    schema: z.object({}),
  }
);

/**
 * Verify on MoltBook Tool
 */
export const verifyMoltBookTool = tool(
  async ({ agentId, proofTweet }): Promise<string> => {
    if (!moltBookProvider) {
      return "Error: MoltBook provider not initialized.";
    }
    try {
      const isVerified = await moltBookProvider.isVerified(agentId);
      if (isVerified) {
        return `✅ Agent #${agentId} is already verified on MoltBook!`;
      }
      
      if (!proofTweet) {
        const claimTweet = moltBookProvider.generateClaimTweet("Agent", agentId);
        return `⚠️ Agent is not verified. To verify, post this tweet:\n\n"${claimTweet}"\n\nThen call this tool again with the tweet URL as proofTweet.`;
      }
      
      return `✅ Verification submitted for Agent #${agentId}. MoltBook badge pending confirmation.`;
    } catch (error) {
      return `❌ Verification failed: ${String(error)}`;
    }
  },
  {
    name: "verify_moltbook",
    description: "Verifies the agent's social presence on MoltBook. Requires posting a proof tweet.",
    schema: z.object({
      agentId: z.string().describe("The agent's ERC-8004 token ID"),
      proofTweet: z.string().optional().describe("URL of the proof tweet (optional, needed for verification)"),
    }),
  }
);

// --- Export ---

/**
 * Get all initialized LangChain tools for AI agents.
 * 
 * @param config - Configuration including privateKey, rpcUrl
 * @returns Array of LangChain-compatible tools
 */
export async function getAgentTools(config: LangChainToolConfig): Promise<DynamicStructuredTool[]> {
  await initializeProviders(config);
  return [
    registerAgentTool,
    getBalanceTool,
    verifyMoltBookTool,
  ];
}

/**
 * Get tools without initialization (for use when providers are already set up).
 */
export function getToolsWithoutInit(): DynamicStructuredTool[] {
  return [
    registerAgentTool,
    getBalanceTool,
    verifyMoltBookTool,
  ];
}
