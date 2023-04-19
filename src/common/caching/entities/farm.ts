export type CacheFarmContract = {
  address: string;
  farmTokenId: string;
  rewardTokenId: string;
  farmingTokenId: string;
  farmTokenSupply: string;
  state: boolean;
  rewardPerSec: string;
  rewardPerShare: string;
  lastRewardBlockTs: number;
  divisionSafetyConstant: string;
  farmingTokenBalance: string;
  produceRewardEnabled: boolean;
};

export type CacheFarmAccount = {
  slopeBoosted: string;
};
