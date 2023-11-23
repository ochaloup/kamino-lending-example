import { KaminoMarket, KaminoReserve, DepositObligationCollateralAccounts } from "@hubbleprotocol/kamino-lending-sdk";
import {MSOL_MINT, getConnection} from './functions'
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";


export async function loadLendingMarkets(markets: PublicKey[]): Promise<{owner: PublicKey, amount: BN}[]> {
    return (await Promise.all(markets.map(async (market) => loadLending(market))))
        .flat()
        .reduce((acc, {owner, amount}) => {
            const existing = acc.find((item) => item.owner.equals(owner))
            if (existing) {
                existing.amount = existing.amount.add(amount)
            } else {
                acc.push({owner, amount})
            }
            return acc
        }, [])
}

export async function loadLending(market: PublicKey): Promise<{owner: PublicKey, amount: BN}[]> {
    const connection = getConnection();
    const marketData = await KaminoMarket.load(
        connection,
        market
    );
    await marketData.loadReserves();

    // reserve.getTokenSymbol() === "MSOL"
    const msolReserves: KaminoReserve[] = marketData.reserves.filter((reserve) => reserve.state.liquidity.mintPubkey.toBase58() == MSOL_MINT);
    console.log('loan to value pct', msolReserves.map((reserve) => {return { addr: reserve.address.toBase58(), loanPct: reserve.state.config.loanToValuePct, symbol: reserve.getTokenSymbol() }}));
    console.log(
        'Kamino Lending reserves',
        msolReserves.map((reserve) => {
          return {
            address: reserve.address.toBase58(),
            token: reserve.getTokenSymbol(),
            collateralMintTotalSupply: reserve.state.collateral.mintTotalSupply.toString(),
            liquidityAvailableAmount: reserve.state.liquidity.availableAmount.toString(),
            getTotalSupply: reserve.getTotalSupply().toString(),
          };
        }),
        'stats',
        msolReserves.map((reserve) => {
            return {
                totalLiquidity: reserve.stats.totalLiquidity,
                totalSupply: reserve.stats.totalSupply,
                mintTotalSupply: reserve.stats.mintTotalSupply,
                totalBorrows: reserve.stats.totalBorrows
            }
        }),
    );

    const obligations = await marketData.getAllObligationsForMarket()
    // const uniqBy = (arr, selector = (item) => item) => {
    //     const map = new Map();
    //     arr.forEach((item) => {
    //         const prop = selector(item);
    //         if (!map.has(prop)) map.set(prop, item);
    //     });
    //     return [...map.values()];
    // }
    // const uniqObligations = uniqBy(obligations, (o: KaminoObligation) => o.obligationAddress.toBase58());

    const owners: {owner: PublicKey, amount: BN}[] = []
    for (const reserve of msolReserves) {
        const ownerToObligationDeposits = obligations.map((obligation) => {
            const obligationDepositAmount: BN =
                // OLD WRONG(?) approach
                // obligation.state.deposits.filter(
                //     (deposit) => reserve.address.equals(deposit.depositReserve)
                // )
                // NEW APPROACH recommended by Andrei Hrs from Kamino team
                // while stats hold the processed data, which we transform back into base tokens (msol in this case). so it makes sense you got that result initially
                obligation.deposits.filter(
                    (deposit) => deposit.mintAddress === MSOL_MINT
                )
                .map((deposit) => deposit.amount)
                .reduce((a, b) => a.add(new BN(b.toString())), new BN(0))
            if (Math.random() < 0.01 && obligationDepositAmount.gtn(0)) {
                // logging purposes to get some obligation addresses
                console.log(
                    ' - obligation example:', obligation.obligationAddress.toBase58(),
                    'obligation deposit', obligationDepositAmount.toString()
                )
            }
            return {owner: obligation.state.owner, amount: obligationDepositAmount}
        })
        .filter(({amount}) => amount.gt(new BN(0)))

        const ownerToMsol = ownerToObligationDeposits.map(({owner, amount}) => {
            return {
                owner: owner,
                // amount is denominated in the mSOLs, no other calculation is needed here when using `obligation.deposits for filtering`
                amount,
                // amountCollateral: amount
                //     .mul(reserve.state.liquidity.availableAmount)
                //     .div(reserve.state.collateral.mintTotalSupply),
            }
        })
        owners.push(...ownerToMsol)
        // collateral in deposit is msol, i.e., both numbers down below should be the same
        console.log(
            'reserve',
            reserve.address.toBase58(),
            // 'sum owner to collateral',
            // ownerToMsol.reduce((a, b) => a.add(b.amountCollateral), new BN(0)).toString(),
            'sum owner to msol',
            ownerToMsol.reduce((a, b) => a.add(b.amount), new BN(0)).toString(),
        )
    }
    return owners
}