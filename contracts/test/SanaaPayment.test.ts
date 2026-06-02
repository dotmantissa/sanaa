import { expect } from "chai";
import { ethers } from "hardhat";
import { SanaaPayment } from "../typechain-types";

const PRICE = ethers.parseEther("0.05");

describe("SanaaPayment", function () {
  let payment: SanaaPayment;
  let cusd: Awaited<ReturnType<typeof ethers.getContractFactory>> extends infer F
    ? F extends { deploy: (...args: unknown[]) => Promise<infer C> }
      ? C
      : never
    : never;
  let owner: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let user: Awaited<ReturnType<typeof ethers.getSigners>>[0];

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // Deploy mock cUSD
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    cusd = await MockERC20.deploy("Celo Dollar", "cUSD", 18);
    await cusd.waitForDeployment();

    const SanaaPayment = await ethers.getContractFactory("SanaaPayment");
    payment = (await SanaaPayment.deploy(
      await cusd.getAddress(),
      owner.address
    )) as SanaaPayment;
    await payment.waitForDeployment();

    // Fund user
    await cusd.mint(user.address, ethers.parseEther("1"));
    await cusd.connect(user).approve(await payment.getAddress(), ethers.parseEther("1"));
  });

  it("accepts payment and marks requestId as paid", async () => {
    const requestId = ethers.keccak256(ethers.toUtf8Bytes("req-1"));
    await payment.connect(user).pay(requestId);
    expect(await payment.hasPaid(requestId)).to.equal(true);
    expect(await payment.payerOf(requestId)).to.equal(user.address);
  });

  it("reverts on double payment", async () => {
    const requestId = ethers.keccak256(ethers.toUtf8Bytes("req-2"));
    await payment.connect(user).pay(requestId);
    await expect(payment.connect(user).pay(requestId)).to.be.revertedWithCustomError(
      payment,
      "AlreadyPaid"
    );
  });

  it("allows owner to withdraw", async () => {
    const requestId = ethers.keccak256(ethers.toUtf8Bytes("req-3"));
    await payment.connect(user).pay(requestId);
    await payment.withdraw(PRICE);
    const ownerBal = await cusd.balanceOf(owner.address);
    expect(ownerBal).to.equal(PRICE);
  });

  it("emits GenerationPaid event", async () => {
    const requestId = ethers.keccak256(ethers.toUtf8Bytes("req-4"));
    await expect(payment.connect(user).pay(requestId))
      .to.emit(payment, "GenerationPaid")
      .withArgs(user.address, requestId, PRICE);
  });
});
