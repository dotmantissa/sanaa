// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SanaaAgent
 * @notice Registers Sanaa as an ERC-8004 AI agent on Celo.
 *         The agent receives x402-style micropayments and orchestrates
 *         image generation, qualifying for the AI agent bonus pool.
 */
interface IAgentRegistry {
    function register(
        string calldata name,
        string calldata description,
        string calldata endpoint,
        address paymentToken,
        uint256 pricePerRequest
    ) external returns (uint256 agentId);
}

contract SanaaAgentRegistrar {
    address public constant AGENT_REGISTRY = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;

    uint256 public agentId;
    address public owner;

    event AgentRegistered(uint256 indexed agentId);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerAgent(
        string calldata endpoint,
        address cusdToken
    ) external onlyOwner returns (uint256) {
        agentId = IAgentRegistry(AGENT_REGISTRY).register(
            "Sanaa Image Agent",
            "Pay-per-request AI image generation for MiniPay users on Celo",
            endpoint,
            cusdToken,
            0.05 ether
        );
        emit AgentRegistered(agentId);
        return agentId;
    }
}
