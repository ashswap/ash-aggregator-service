export type CacheVEContract = {
  address: string;
  lockedTokenId: string;
  totalLock: string;
  veSupply: string;
};

export type CacheVEAccount = {
  locked: {
    amount: string;
    end: string;
  };
};
