
import {PublicKey} from '@solana/web3.js'
import fetch from "node-fetch"

async function getKaminoLendingMarketsJson() {
  const response = await fetch(
    'https://api.kamino.finance/kamino-market',
  );
  return await response.json();
}

async function getKaminoLendingMarkets(): Promise<PublicKey[]> {
  type KaminoLendingMarket = {
    lendingMarket: string;
    isPrimary: boolean;
    name: string;
    description: string;
  };

  const lendingMarkets = await getKaminoLendingMarketsJson() as KaminoLendingMarket[]

  return lendingMarkets
    .map((market: KaminoLendingMarket) => new PublicKey(market.lendingMarket));
}

(async () => {
  console.log(await getKaminoLendingMarketsJson())
})()
