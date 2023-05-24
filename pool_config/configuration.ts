import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { join } from 'path';

export enum PoolTypeConfig {
    XEXCHANGE = "xexchange",
    ASHSWAP_V1 = "ashswap-poolv1",
    ASHSWAP_V2 = "ashswap-poolv2",
}

export class TokenConfig {
    id: string;
    decimal: number;
    coingeckoId: string;
}

export class PoolConfig {
    address: string;
    type: PoolTypeConfig;
    tokens: TokenConfig[];
}

// Load and parse the YAML data
const yamlData = yaml.load(fs.readFileSync(join(__dirname, 'pool.yaml'), 'utf8')) as any;

export const TOKEN_CONFIG: Map<string, TokenConfig> = new Map(
    yamlData.token.map((token: any) => {
        const tokenConfig = new TokenConfig();
        tokenConfig.id = token.id;
        tokenConfig.decimal = token.decimal;
        tokenConfig.coingeckoId = token.coingeckoId ?? "";
        return [tokenConfig.id, tokenConfig];
    })
);

// Convert the YAML data to a list of PoolConfig objects
export const POOL_CONFIGS: PoolConfig[] = yamlData.pool.map((pool: any) => {
    const poolConfig = new PoolConfig();
    poolConfig.address = pool.address;
    poolConfig.type = pool.type as PoolTypeConfig;
    poolConfig.tokens = pool.tokens.map((id: string) => {
        return TOKEN_CONFIG.get(id);
    });
    return poolConfig;
});
