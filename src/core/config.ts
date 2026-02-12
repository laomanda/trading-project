export const APP_CONFIG = {
  initialBalance: 10000,
  tradeSize: 1000,
  defaultSymbol: "BTCUSDT",
  defaultInterval: "1m",
};

export interface AssetConfig {
  symbol: string;
  label: string;
  name: string;
  icon: string;
  color: string;
  type: "spot" | "futures";
}

export const ASSETS: AssetConfig[] = [
  { symbol: "BTCUSDT", label: "BTC/USDT", name: "Bitcoin", icon: "₿", color: "emerald", type: "spot" },
  { symbol: "ETHUSDT", label: "ETH/USDT", name: "Ethereum", icon: "Ξ", color: "blue", type: "spot" },
  { symbol: "BNBUSDT", label: "BNB/USDT", name: "BNB", icon: "B", color: "yellow", type: "spot" },
  { symbol: "SOLUSDT", label: "SOL/USDT", name: "Solana", icon: "S", color: "violet", type: "spot" },
  { symbol: "HYPEUSDT", label: "HYPE/USDT", name: "Hyperliquid", icon: "H", color: "cyan", type: "futures" },
  { symbol: "FARTCOINUSDT", label: "FARTCOIN/USDT", name: "Fartcoin", icon: "F", color: "teal", type: "futures" },
];

export function getAssetConfig(symbol: string): AssetConfig | undefined {
  return ASSETS.find(a => a.symbol === symbol);
}

export function getAssetType(symbol: string): "spot" | "futures" {
  return getAssetConfig(symbol)?.type || "spot";
}
