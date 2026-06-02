// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title SanaaPayment
 * @notice Pay-per-generation contract for Sanaa AI Image Studio.
 *         Users pay 0.05 cUSD per image generation. Each payment is
 *         tied to a unique requestId so the backend can verify on-chain.
 */
contract SanaaPayment {
    address public owner;
    IERC20 public immutable cusd;

    // 0.05 cUSD (18 decimals)
    uint256 public constant PRICE = 0.05 ether;

    mapping(bytes32 => bool) public hasPaid;
    mapping(bytes32 => address) public payerOf;

    event GenerationPaid(address indexed payer, bytes32 indexed requestId, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    error AlreadyPaid();
    error TransferFailed();
    error NotOwner();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _cusd, address _owner) {
        if (_cusd == address(0) || _owner == address(0)) revert ZeroAddress();
        cusd = IERC20(_cusd);
        owner = _owner;
    }

    /**
     * @notice Pay for one image generation.
     * @param requestId Unique ID generated client-side (keccak256 of address + timestamp).
     */
    function pay(bytes32 requestId) external {
        if (hasPaid[requestId]) revert AlreadyPaid();

        hasPaid[requestId] = true;
        payerOf[requestId] = msg.sender;

        bool ok = cusd.transferFrom(msg.sender, address(this), PRICE);
        if (!ok) revert TransferFailed();

        emit GenerationPaid(msg.sender, requestId, PRICE);
    }

    /**
     * @notice Withdraw accumulated cUSD to owner.
     */
    function withdraw(uint256 amount) external onlyOwner {
        bool ok = cusd.transfer(owner, amount);
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner, amount);
    }

    /**
     * @notice Transfer contract ownership.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
