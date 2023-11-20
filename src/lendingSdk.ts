import { KaminoMarket, KaminoObligation } from "@hubbleprotocol/kamino-lending-sdk";
import {MSOL_MINT, getConnection} from './functions'
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export async function loadLending(market: PublicKey): Promise<{owner: string, amount: BN}[]> {
    const connection = getConnection();
    const marketData = await KaminoMarket.load(
        connection,
        market
    );
    await marketData.loadReserves();

    // reserve.getTokenSymbol() === "MSOL"
    const msolReserves = marketData.reserves.filter((reserve) => reserve.state.liquidity.mintPubkey.toBase58() == MSOL_MINT);
    const msolReservesKeys = msolReserves.map((reserve) => reserve.address.toBase58());
    console.log('loan to value pct', msolReserves.map((reserve) => {return { addr: reserve.address.toBase58(), loanPct: reserve.state.config.loanToValuePct, symbol: reserve.getTokenSymbol() }}));
    console.log('msol reserves supplies', msolReserves.map((reserve) => reserve.state.liquidity.availableAmount.toString()));

    const obligations = await marketData.getAllObligationsForMarket()
    const uniqBy = (arr, selector = (item) => item) => {
        const map = new Map();
        arr.forEach((item) => {
            const prop = selector(item);
            if (!map.has(prop)) map.set(prop, item);
        });
        return [...map.values()];
    }
    const uniqObligations = uniqBy(obligations, (o: KaminoObligation) => o.obligationAddress.toBase58());

    return uniqObligations.map((obligation) => {
        const msolDepositAmount = obligation.state.deposits.filter((deposit) =>
                msolReservesKeys.includes(deposit.depositReserve.toBase58())
            )
            .map((deposit) => deposit.depositedAmount)
            .reduce((a, b) => a.add(b), new BN(0))
        return {owner: obligation.state.owner.toBase58(), amount: msolDepositAmount}
    })
    .filter(({amount}) => amount.gt(new BN(0)))
}