import BigNumber from 'bignumber.js';
declare module 'bignumber.js' {
    interface BigNumber {
        toBigInt: () => bigint;
        add: (other: BigNumber.Value, base?: number) => BigNumber;
        sub: (other: BigNumber.Value, base?: number) => BigNumber;
        mul: (other: BigNumber.Value, base?: number) => BigNumber;
        mod: (other: BigNumber.Value, base?: number) => BigNumber;
    }
    namespace BigNumber {
        export function from(value: BigNumber.Value | BigInt): BigNumber;
    }
}
