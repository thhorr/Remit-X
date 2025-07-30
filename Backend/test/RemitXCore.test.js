const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RemitXCore", function () {
  async function deployRemitXFixture() {
    const [owner, sender, recipient, otherAccount] = await ethers.getSigners();

    // Deploy mock tokens
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy(owner.address);

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy(owner.address);

    const MockDAI = await ethers.getContractFactory("MockDAI");
    const mockDAI = await MockDAI.deploy(owner.address);

    // Deploy RemitXCore
    const RemitXCore = await ethers.getContractFactory("RemitXCore");
    const ccipRouter = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
    const linkToken = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
    const remitXCore = await RemitXCore.deploy(ccipRouter, linkToken, owner.address);

    // Deploy RemitXAutomation
    const RemitXAutomation = await ethers.getContractFactory("RemitXAutomation");
    const remitXAutomation = await RemitXAutomation.deploy(remitXCore.address, owner.address);

    // Setup tokens
    const priceFeed = "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E";
    
    await remitXCore.addSupportedToken(
      mockUSDC.address,
      priceFeed,
      ethers.utils.parseUnits("1", 6),
      ethers.utils.parseUnits("10000", 6)
    );

    await remitXCore.addSupportedToken(
      mockUSDT.address,
      priceFeed,
      ethers.utils.parseUnits("1", 6),
      ethers.utils.parseUnits("10000", 6)
    );

    await remitXCore.addSupportedChain(2810);

    // Give tokens to sender
    await mockUSDC.transfer(sender.address, ethers.utils.parseUnits("1000", 6));
    await mockUSDT.transfer(sender.address, ethers.utils.parseUnits("1000", 6));

    return {
      remitXCore,
      remitXAutomation,
      mockUSDC,
      mockUSDT,
      mockDAI,
      owner,
      sender,
      recipient,
      otherAccount,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { remitXCore, owner } = await loadFixture(deployRemitXFixture);
      expect(await remitXCore.owner()).to.equal(owner.address);
    });

    it("Should have correct initial settings", async function () {
      const { remitXCore } = await loadFixture(deployRemitXFixture);
      expect(await remitXCore.remittanceFee()).to.equal(50); // 0.5%
    });
  });

  describe("Token Management", function () {
    it("Should add supported tokens", async function () {
      const { remitXCore, mockUSDC } = await loadFixture(deployRemitXFixture);
      
      const tokenConfig = await remitXCore.supportedTokens(mockUSDC.address);
      expect(tokenConfig.isSupported).to.be.true;
    });

    it("Should remove supported tokens", async function () {
      const { remitXCore, mockUSDC, owner } = await loadFixture(deployRemitXFixture);
      
      await remitXCore.connect(owner).removeSupportedToken(mockUSDC.address);
      
      const tokenConfig = await remitXCore.supportedTokens(mockUSDC.address);
      expect(tokenConfig.isSupported).to.be.false;
    });
  });

  describe("Remittances", function () {
    it("Should create a remittance", async function () {
      const { remitXCore, mockUSDC, mockUSDT, sender, recipient } = await loadFixture(deployRemitXFixture);
      
      const amount = ethers.utils.parseUnits("100", 6);
      
      // Approve tokens
      await mockUSDC.connect(sender).approve(remitXCore.address, amount);
      
      // Create remittance
      await expect(
        remitXCore.connect(sender).createRemittance(
          recipient.address,
          amount,
          mockUSDC.address,
          mockUSDT.address,
          2810
        )
      ).to.emit(remitXCore, "RemittanceCreated");
      
      // Check remittance count
      expect(await remitXCore.getRemittanceCount()).to.equal(1);
    });

    it("Should fail with unsupported token", async function () {
      const { remitXCore, mockDAI, sender, recipient } = await loadFixture(deployRemitXFixture);
      
      const amount = ethers.utils.parseUnits("100", 18);
      
      await expect(
        remitXCore.connect(sender).createRemittance(
          recipient.address,
          amount,
          mockDAI.address, // Not supported
          mockDAI.address,
          2810
        )
      ).to.be.revertedWith("Source token not supported");
    });
  });

  describe("Token Swaps", function () {
    it("Should swap tokens", async function () {
      const { remitXCore, mockUSDC, mockUSDT, sender } = await loadFixture(deployRemitXFixture);
      
      const amountIn = ethers.utils.parseUnits("100", 6);
      
      // Give contract some USDT for swapping
      await mockUSDT.transfer(remitXCore.address, ethers.utils.parseUnits("1000", 6));
      
      // Approve tokens
      await mockUSDC.connect(sender).approve(remitXCore.address, amountIn);
      
      // Perform swap
      await expect(
        remitXCore.connect(sender).swapTokens(
          mockUSDC.address,
          mockUSDT.address,
          amountIn,
          ethers.utils.parseUnits("95", 6) // Min amount out
        )
      ).to.emit(remitXCore, "TokenSwapped");
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to add tokens", async function () {
      const { remitXCore, mockDAI, sender } = await loadFixture(deployRemitXFixture);
      
      await expect(
        remitXCore.connect(sender).addSupportedToken(
          mockDAI.address,
          "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
          ethers.utils.parseUnits("1", 18),
          ethers.utils.parseUnits("10000", 18)
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should only allow owner to set fees", async function () {
      const { remitXCore, sender } = await loadFixture(deployRemitXFixture);
      
      await expect(
        remitXCore.connect(sender).setRemittanceFee(100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
