
import fetch from "node-fetch"
import { loadLending } from "./lendingSdk";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

async function getKaminoLendingMarketsJson() {
  const response = await fetch(
    'https://api.kamino.finance/kamino-market',
  );
  return await response.json();
}

async function getKaminoLendingMarkets(): Promise<string[]> {
  type KaminoLendingMarket = {
    lendingMarket: string;
    isPrimary: boolean;
    name: string;
    description: string;
  };

  const lendingMarkets = await getKaminoLendingMarketsJson() as KaminoLendingMarket[]

  return lendingMarkets
    .map((market: KaminoLendingMarket) => market.lendingMarket);
}

(async () => {
  const markets = await getKaminoLendingMarkets()
  // console.log(markets)
  // console.log('tvl:', await tvl(markets))

  for (const market of markets) {
    console.log('market', market)
    const lending = await loadLending(new PublicKey(market))
    console.log('lending', lending.reduce((a, b) => a.add(b.amount), new BN(0)).toString())
  }
})()
