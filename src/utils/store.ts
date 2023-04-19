import store from 'store2';
export type ShardHealth = {
  erd_nonce: number;
  shard: number;
  timestamp: number;
};
export type GatewayHealth = {
  url: string;
  shardHealths: ShardHealth[];
  timestamp: number;
};
export class Storage {
  static setGatewayHealth(healthMap: Record<string, GatewayHealth>) {
    const old: Record<string, GatewayHealth> = store.get('gatewayHealth', {});
    const entries: Array<[string, GatewayHealth]> = Object.entries(
      healthMap,
    ).map(([k, v]) => {
      const shardHealths = v.shardHealths.map(
        (shard, i) => shard || old[k]?.shardHealths[i],
      );
      return [k, { ...v, shardHealths }];
    });

    store.set('gatewayHealth', Object.fromEntries(entries));
    const selectedUrl = Storage._getGatewayUrl();
    store.set('gatewayUrl', selectedUrl);
  }
  private static _getGatewayUrl() {
    const map: Record<string, GatewayHealth> = store.get('gatewayHealth', {});
    const entries = Object.entries(map);

    if (entries.length === 0) return '';
    const shards = entries[0][1].shardHealths.length;
    const latestShardData = entries[0][1].shardHealths.map((health) => ({
      urls: [entries[0][0]],
      timestamp: health.timestamp,
    }));

    for (let i = 1; i < entries.length; i++) {
      const [url, gatewayHealth] = entries[i];
      for (let j = 0; j < shards; j++) {
        const shardHealth = gatewayHealth.shardHealths[j];
        if (shardHealth.timestamp > latestShardData[j].timestamp) {
          latestShardData[j] = {
            urls: [url],
            timestamp: shardHealth.timestamp,
          };
        } else if (shardHealth.timestamp === latestShardData[j].timestamp) {
          latestShardData[j] = {
            urls: [...latestShardData[j].urls, url],
            timestamp: shardHealth.timestamp,
          };
        }
      }
    }
    const weightMap: Record<string, number> = Object.fromEntries(
      entries.map(([k, v]) => [k, 0]),
    );
    latestShardData.map((data) => {
      data.urls.map((url) => {
        weightMap[url] = weightMap[url] + 1;
      });
    });
    return Object.entries(weightMap).sort(([_, a], [__, b]) => b - a)[0][0];
  }

  static getGatewayUrl() {
    return store.get('gatewayUrl');
  }
}
