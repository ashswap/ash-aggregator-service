import { BigNumber } from 'bignumber.js';
BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: 1,
    DECIMAL_PLACES: 18,
});
// declare interface BigNumber {
//     toBigInt: () => bigint;
// }
BigNumber.prototype.toBigInt = function () {
    return BigInt(this.toString());
};
BigNumber.prototype.add = BigNumber.prototype.plus;
BigNumber.prototype.sub = BigNumber.prototype.minus;
BigNumber.prototype.mul = BigNumber.prototype.multipliedBy;
BigNumber.prototype.mod = BigNumber.prototype.modulo;

BigNumber.ROUND_DOWN;
BigNumber.from = function (value) {
    return new BigNumber(value.toString());
};

export const ZERO = bnum(0);
export const Zero = bnum(0);
export const ONE = bnum(1);
export const WeiPerEGLD = new BigNumber(1e18);
export const INFINITY = bnum('Infinity');

// get wad unit from EGLD unit
export function scale(
    input: BigNumber.Value,
    decimalPlaces: BigNumber.Value = 0
): BigNumber {
    const scaleMul = new BigNumber(10).pow(decimalPlaces);
    return new BigNumber(input).times(scaleMul);
}

// get EGLD unit from wad unit
export function scaleDown(
    input: BigNumber.Value,
    decimalPlaces: BigNumber.Value
): BigNumber {
    const scaleMul = new BigNumber(10).pow(decimalPlaces);
    return new BigNumber(input).div(scaleMul);
}

export function bnum(val: BigNumber.Value): BigNumber {
    return new BigNumber(val.toString());
}

export { BigNumber };

export function formatFixed(
    value: BigNumber.Value,
    decimals: BigNumber.Value = 0
): string {
    return scaleDown(value, decimals).toString(10);
}

export function parseFixed(
    value: BigNumber.Value,
    decimals?: BigNumber.Value
): BigNumber {
    return scale(value, decimals);
}
