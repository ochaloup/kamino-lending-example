// https://github.com/DefiLlama/DefiLlama-Adapters/blob/640e536032178a0d39ac3d4a39cf2f2513abc599/projects/kamino-lending/index.js

import { Connection, GetProgramAccountsResponse, PublicKey, RpcResponseAndContext, TokenAccountBalancePair } from '@solana/web3.js';
import { Program, Idl } from '@coral-xyz/anchor'
import LendingIdl from "./lending_idl.json";
import {Mint, getMint, TOKEN_PROGRAM_ID, unpackAccount} from '@solana/spl-token-3.x'
import {sumTokens} from './defilama'

export const MSOL_MINT = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';

export function endpoint() {
  return process.env.RPC_URL ?? 'https://api.mainnet-beta.solana.com'
}

export function getConnection() {
  return new Connection(endpoint());
}

export async function getTokenAccountsByOwner(owner: PublicKey, connection: Connection): Promise<RpcResponseAndContext<GetProgramAccountsResponse>> {
  const tokenAccounts = await connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
  console.log(
    `token accounts of owner ${owner.toBase58()}`,
    tokenAccounts.value.length, tokenAccounts.value.map((account) => account.pubkey.toBase58())
  )
  return tokenAccounts
}

export async function getTokenOwnersByMint(mint: PublicKey, connection: Connection): Promise<RpcResponseAndContext<Array<TokenAccountBalancePair>>> {
  const accounts = await connection.getTokenLargestAccounts(mint)
  console.log(`largest accounts of ${mint.toBase58()}`, accounts.value.length, accounts.value.map((account) => account.address.toBase58()))
  return accounts
}

export async function tvl(markets: string[]) {
  const connection = getConnection();
  const programId = new PublicKey('KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD');
  const lendingMarketAuthSeed = 'lma';
  const tokensAndOwners: [PublicKey, PublicKey][] = [];
  const ktokens: Record<string, boolean> = {};

  const kaminoLendProgram = new Program(LendingIdl as Idl, programId, { connection, publicKey: PublicKey.unique() });
  for (const market of markets) {
    const reserves = await kaminoLendProgram.account.reserve.all([
      { dataSize: 8624 },
      { memcmp: { offset: 32, bytes: market } },
    ]) as any[];
    
    for (const reserveData of reserves.filter((reserveData) => reserveData.account.liquidity.mintPubkey.toBase58() == MSOL_MINT)) {
      const reserve = reserveData.account as any;
      console.log('lending data', reserveData.publicKey.toBase58(), 'liquidity mint', reserve.liquidity.mintPubkey.toBase58())
      // await getTokenOwnersByMint(reserve.collateral.mintPubkey, connection)
      if (
        ktokens[reserve.liquidity.mintPubkey] ||
        (await isKToken(new PublicKey(reserve.liquidity.mintPubkey), connection))
      ) {
        ktokens[reserve.liquidity.mintPubkey] = true;
      } else {
        ktokens[reserve.liquidity.mintPubkey] = false;
        const [authority] = PublicKey.findProgramAddressSync(
          [Buffer.from(lendingMarketAuthSeed), new PublicKey(market).toBuffer()],
          programId
        );
        tokensAndOwners.push([reserve.liquidity.mintPubkey, authority]);
      }
    }
  }

  let sum: bigint = BigInt(0)
  for (const [mint, owner] of tokensAndOwners) {
    console.log('loading accounts for owner', mint.toBase58(), owner.toBase58())
    const ta = await getTokenAccountsByOwner(owner, connection)
    ta.value.forEach((account) => {
      const parsedAccount = unpackAccount(account.pubkey, account.account, TOKEN_PROGRAM_ID)
      console.log(
        'account', account.pubkey.toBase58(),
        'amount', parsedAccount.amount.toString(),
        'mint', parsedAccount.mint.toBase58(),
        'owner', parsedAccount.owner.toBase58()
      )
      sum += parsedAccount.amount
    })
  }
  console.log('sum by owners', sum.toString(), await sumTokens(tokensAndOwners))
  
  return tokensAndOwners.map(([mint, authority]) => { return [mint.toBase58(), authority.toBase58()] });
}

async function isKToken(mint: PublicKey, connection: Connection): Promise<boolean> {
  let mintData: Mint
  try {
    mintData = await getMint(connection, mint)
  } catch (e) {
    console.error(`address ${mint.toBase58()} is not a mint`, e.message)
    return false
  }
  const KAMINO_PROGRAM_ID = new PublicKey('6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc');
  const [expectedMintAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('authority'), mintData.address.toBuffer()],
    KAMINO_PROGRAM_ID
  );
  return mintData.mintAuthority !== null && mintData.mintAuthority.equals(expectedMintAuthority);
}