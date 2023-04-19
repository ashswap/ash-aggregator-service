import * as yaml from 'js-yaml';
import * as fs from 'fs';

class TokenConfig {
    id: string;
    decimal: number;
}

class PoolConfig {
    address: string;
    type: string;
    tokens: TokenConfig[];
}

// Load and parse the YAML data
const yamlData = yaml.load(fs.readFileSync('pool.yaml', 'utf8')) as any;

// Convert the YAML data to a list of PoolConfig objects
const poolConfigs: PoolConfig[] = yamlData.pool.map((pool: any) => {
    const poolConfig = new PoolConfig();
    poolConfig.address = pool.address;
    poolConfig.type = pool.type;
    poolConfig.tokens = pool.tokens.map((token: any) => {
        const tokenConfig = new TokenConfig();
        tokenConfig.id = token.id;
        tokenConfig.decimal = token.decimal;
        return tokenConfig;
    });
    return poolConfig;
});

export default poolConfigs;