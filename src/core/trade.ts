export type Position = {
  id: string;
  type: "LONG" | "SHORT";
  entryPrice: number;
  entryTime: number;
  size: number;
  status: "OPEN" | "CLOSED";
  exitPrice?: number;
  pnl?: number;
};

export const calculatePnL = (position: Position, currentPrice: number) => {
  if (position.type === "LONG") {
    const diff = (currentPrice - position.entryPrice) / position.entryPrice;
    return position.size * diff;
  } else {
    const diff = (position.entryPrice - currentPrice) / position.entryPrice;
    return position.size * diff;
  }
};
