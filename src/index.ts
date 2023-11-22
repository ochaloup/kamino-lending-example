
import fetch from "node-fetch"
import { loadLendingMarkets } from "./lendingSdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getConnection, getTokenAccountsByOwner, lendingMarketAuthority } from "./functions";
import { KaminoReserve, Reserve, getTokenOracleData } from "@hubbleprotocol/kamino-lending-sdk";

export async function getKaminoLendingMarketsJson() {
  const response = await fetch(
    'https://api.kamino.finance/kamino-market',
  );
  return await response.json();
}

export async function getKaminoLendingMarkets(): Promise<string[]> {
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

// example of reserve pubkey for msol: FBSyPnxtHKLBZ4UeeUyAnbtFuAmTHLtso9YtsqRDRWpM
// https://app.kamino.finance/lending/multiply/FBSyPnxtHKLBZ4UeeUyAnbtFuAmTHLtso9YtsqRDRWpM
export async function loadKaminoReserve(reservePubkey: PublicKey, connection: Connection = getConnection()): Promise<KaminoReserve> {
  const reserve = await Reserve.fetch(connection, reservePubkey)
  const oracleData = await getTokenOracleData(connection, [reserve], 'mainnet-beta')
  if (oracleData.length === 0 || oracleData[1] === undefined) {
    throw new Error('no oracle data for reserve '  + reservePubkey.toBase58())
  }
  return new KaminoReserve(oracleData[0][0], reservePubkey, oracleData[0][1], connection)
}

(async () => {
  const connection = getConnection()

  // const markets = await getKaminoLendingMarkets()
  // console.log(markets)
  // console.log('tvl:', await tvl(markets))
  // for (const market of markets) {
  //   const marketPubkey = new PublicKey(market)
  //   const authority = lendingMarketAuthority(marketPubkey)
  //   console.log('market', market, 'authority', authority.toBase58())
  //   // printing inside of the method
  //   await getTokenAccountsByOwner(authority, getConnection())
  // }

  const lending = await loadLendingMarkets(markets.map((market) => new PublicKey(market)))
  console.log('lending', lending.reduce((a, b) => a.add(b.amount), new BN(0)).toString())
})()
