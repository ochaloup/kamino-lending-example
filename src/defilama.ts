// https://github.com/DefiLlama/DefiLlama-Adapters/blob/30652606c99128795a7b477d67d2df17b718e330/projects/helper/solana.js#L348
import axios from 'axios'
import {TOKEN_PROGRAM_ID} from '@solana/spl-token'
import {BigNumber} from 'bignumber.js'

let coreAssets = require('./coreAssets.json')
const ADDRESSES = coreAssets

const blacklistedTokens_default = [
    'CowKesoLUaHSbAMaUxJUj7eodHHsaLsS65cy8NFyRDGP',
    '674PmuiDtgKx3uKuJ1B16f9m5L84eFvNwj3xDMvHcbo7', // $WOOD
    'SNSNkV9zfG5ZKWQs6x4hxvBRV6s8SqMfSGCtECDvdMd', // SNS
    'A7rqejP8LKN8syXMr4tvcKjs2iJ4WtZjXNs1e6qP3m9g', // ZION
    '2HeykdKjzHKGm2LKHw8pDYwjKPiFEoXAz74dirhUgQvq', // SAO
    'EP2aYBDD4WvdhnwWLUMyqU69g1ePtEjgYK6qyEAFCHTx', //KRILL
    'C5xtJBKm24WTt3JiXrvguv7vHCe7CknDB7PNabp4eYX6', //TINY
    '5fTwKZP2AK39LtFN9Ayppu6hdCVKfMGVm79F2EgHCtsi', //WHEY
  ]

  function endpoint() {
    return process.env.RPC_URL ?? 'https://api.mainnet-beta.solana.com'
  }
  
  function formOwnerBalanceQuery(owner, programId = TOKEN_PROGRAM_ID) {
    return {
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        owner,
        { programId: String(programId) },
        { encoding: "jsonParsed", },
      ],
    }
  }

  async function getOwnerAllAccount(owner) {
    const tokenBalance = await axios.post(endpoint(), formOwnerBalanceQuery(owner));
    return tokenBalance.data.result.value.map(i => ({
      account: i.pubkey,
      mint: i.account.data.parsed.info.mint,
      amount: i.account.data.parsed.info.tokenAmount.amount,
      uiAmount: i.account.data.parsed.info.tokenAmount.uiAmount,
      decimals: i.account.data.parsed.info.tokenAmount.decimals,
    }))
  }

  export type StringNumber = string;
  export type Balances = {
    [address: string]: StringNumber | number;
  };

  export function sumSingleBalance(
    balances: Balances,
    token: string,
    balance: string | number | BigNumber,
    chain?: string,
  ) {
    isValidNumber(balance)
  
    if (+balance === 0) return;
    
    if (chain)
      token = `${chain}:${token}`
    
    if (typeof balance === 'object') {
      if (typeof balance.toString === 'function')
        balance = balance.toString()
      else
        throw new Error('Invalid balance value:' + balance)
    }
    
    if (typeof balance === 'number' || (balances[token] && typeof balances[token] === 'number')) {
      const prevBalance = +(balances.hasOwnProperty(token) ? balances[token] : 0)
      if (typeof prevBalance !== 'number' || isNaN(prevBalance))
        throw new Error(`Trying to merge token balance and coingecko amount for ${token} current balance: ${balance} previous balance: ${balances[token]}`)
      const value = prevBalance + +balance
      isValidNumber(value)
      balances[token] = value
    } else {
      const prevBalance = new BigNumber(balances.hasOwnProperty(token) ? balances[token] : '0');
      const value = prevBalance.plus(new BigNumber(balance)).toString();
      isValidNumber(+value)
      balances[token] = value
    }
  
    function isValidNumber(value: any) {
      if ([null, undefined].includes(value) || isNaN(+value))
        throw new Error(`Invalid balance: ${balance}`)
    }
  }

  export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const ibcChains = ['ibc', 'terra', 'terra2', 'crescent', 'osmosis', 'kujira', 'stargaze', 'juno', 'injective', 'cosmos', 'comdex', 'umee', 'orai', 'persistence', 'fxcore', 'neutron', 'quasar', 'chihuahua', 'sei', 'archway', 'migaloo', 'secret', 'aura', 'xpla', 'bostrom']
  const caseSensitiveChains = [...ibcChains, 'solana', 'tezos', 'ton', 'algorand', 'aptos', 'near', 'bitcoin', 'waves', 'tron', 'litecoin', 'polkadot', 'ripple', 'elrond', 'cardano', 'stacks', 'sui', 'ergo', 'mvc', 'renec',]
  function getUniqueAddresses(addresses, chain) {
    const toLowerCase = !caseSensitiveChains.includes(chain)
    const set = new Set()
    addresses.forEach(i => set.add(toLowerCase ? i.toLowerCase() : i))
    return [...set]
  }

  function sliceIntoChunks(arr, chunkSize = 100) {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.slice(i, i + chunkSize);
      res.push(chunk);
    }
    return res;
  }

  const distressedAssts = new Set(Object.values({
    CRK: '0x065de42e28e42d90c2052a1b49e7f83806af0e1f',
    aBNBc: ADDRESSES.bsc.ankrBNB,
    aBNBb: ADDRESSES.bsc.aBNBb,
    XRPC: '0xd4ca5c2aff1eefb0bea9e9eab16f88db2990c183',
    FLEET: '0xfd56a3dcfc0690881a466ae432d71bb2db588083',
    YAKU: 'NGK3iHqqQkyRZUj4uhJDQqEyKKcZ7mdawWpqwMffM3s',
    JEFE: '0x80fa6d5384bdde296a28a321f73ab70977575129',
    BONK: ADDRESSES.solana.BONK
  }).map(i => i.toLowerCase()))

  function transformChainAddress(
    mapping = {},
    chain,
    { skipUnmapped = false, chainName = "" } = {}
  ) {
  
    return addr => {
      if (distressedAssts.has(addr.toLowerCase())) return 'ethereum:0xbad'
      if (['solana'].includes(chain)) {
        return mapping[addr] ? mapping[addr] : `${chain}:${addr}`
      }
      if (!addr.startsWith('0x')) return addr
      addr = addr.toLowerCase();
      if (!mapping[addr] && skipUnmapped) {
        console.log("Mapping for addr %s not found in chain %s, returning garbage address", addr, chain);
        return "0x1000000000000000000000000000000000000001";
      }
      if (chain === 'ethereum') return mapping[addr] ? mapping[addr] : addr
      return mapping[addr] || `${chain}:${addr}`;
    };
  }

  const chainTransforms = {
    injective: transformInjectiveAddress,
  };

  async function transformInjectiveAddress() {
    return addr => {
      if (addr.includes('ibc/')) return addr.replace(/.*ibc\//, 'ibc/').replace(/\//g, ':')
      addr = addr.replace(/\//g, ':')
      if (addr.startsWith('peggy0x'))
        return `ethereum:${addr.replace('peggy', '')}`
      return `injective:${addr}`;
    };
  }

  const transformTokens = {
    // Sample Code
    // cronos: {
    //   "0x065de42e28e42d90c2052a1b49e7f83806af0e1f": "0x123", // CRK token is mispriced
    //   [ADDRESSES.cronos.TUSD]: ADDRESSES.ethereum.TUSD,
    // },
  
    lightlink_phoenix: {
      [ADDRESSES.lightlink_phoenix.USDC]: ADDRESSES.ethereum.USDC,
      [ADDRESSES.lightlink_phoenix.USDT]: ADDRESSES.ethereum.USDT,
      [ADDRESSES.lightlink_phoenix.WBTC]: ADDRESSES.ethereum.WBTC,
      [ADDRESSES.lightlink_phoenix.WETH]: ADDRESSES.ethereum.WETH,
    }
  }

  async function getChainTransform(chain) {
    if (chainTransforms[chain])
      return chainTransforms[chain]()
  
    if (transformTokens[chain])
      return transformChainAddress(transformTokens[chain], chain)
  
    return addr => {
      if (addr.includes('ibc/')) return addr.replace(/.*ibc\//, 'ibc/').replace(/\//g, ':')
      if (addr.startsWith('coingecko:')) return addr
      if (addr.startsWith(chain + ':') || addr.startsWith('ibc:')) return addr
      if (distressedAssts.has(addr.toLowerCase())) return 'ethereum:0xbad'
  
      addr = normalizeAddress(addr, chain).replace(/\//g, ':')
      const chainStr = `${chain}:${addr}`
      if ([...ibcChains, 'ton', 'mvc', 'defichain', 'waves'].includes(chain)) return chainStr
      if (chain === 'cardano' && addr === 'ADA') return 'coingecko:cardano'
      if (chain === 'near' && addr.endsWith('.near')) return chainStr
      if (chain === 'tron' && addr.startsWith('T')) return chainStr
      if (chain === 'stacks' && addr.startsWith('SP')) return chainStr
      if (chain === 'tezos' && addr.startsWith('KT1')) return chainStr
      if (chain === 'terra2' && addr.startsWith('terra1')) return chainStr
      if (chain === 'aura' && addr.startsWith('aura')) return chainStr
      if (chain === 'algorand' && /^\d+$/.test(addr)) return chainStr
      if (addr.startsWith('0x') || ['solana', 'kava', 'renec'].includes(chain)) return chainStr
      return addr
    };
  }

  function normalizeAddress(address, chain, extractChain = false) {
    if (!chain && extractChain && address.includes(':')) chain = address.split(':')[0]
    if (caseSensitiveChains.includes(chain)) return address
    return address.toLowerCase()
  }

  async function getFixBalances(chain) {
    return getFixBalancesSync(chain)
  }

  const fixBalancesTokens = {
    ethf: {
      [ADDRESSES.ethf.WETH]: { coingeckoId: 'ethereumfair', decimals: 18 },
      [ADDRESSES.null]: { coingeckoId: 'ethereumfair', decimals: 18 },
    },
    chz: {
      [ADDRESSES.null]: { coingeckoId: 'chiliz', decimals: 18 },
    },
    // Sample Code
    ozone: {
      // '0x83048f0bf34feed8ced419455a4320a735a92e9d': { coingeckoId: "ozonechain", decimals: 18 }, // was mapped to wrong chain
    },
    radixdlt: {
      [ADDRESSES.radixdlt.XRD]: { coingeckoId: 'radix', decimals: 0 },
      [ADDRESSES.radixdlt.WETH]: { coingeckoId: 'ethereum', decimals: 0 },
    },
    meer: {
      [ADDRESSES.null]: { coingeckoId: 'qitmeer-network', decimals: 18 },
      '0x470cBFB236860eb5257bBF78715FB5bd77119C2F': { coingeckoId: 'qitmeer-network', decimals: 18 },
      '0x457dE4e275A6b3C0D3750519221dD1dF19d54f01': { coingeckoId: 'qitmeer-network', decimals: 18 },
    },
    edg: {
      [ADDRESSES.null]: { coingeckoId: 'edgeware', decimals: 18 },
      '0x457dE4e275A6b3C0D3750519221dD1dF19d54f01': { coingeckoId: 'edgeware', decimals: 18 },
    },
    elsm: {
      [ADDRESSES.null]: { coingeckoId: 'lava', decimals: 18 },
      '0xd80Ef77B0289732e13D1769850B5A70eCC196777': { coingeckoId: 'lava', decimals: 18 },
      '0xa801b1a7846156d4c81bd188f96bfcb621517611': { coingeckoId: 'vulcan-forged', decimals: 18 },
    },
    arbitrum: {
      '0x4e7e5023656863E26f50E2E6E59489A852C212c1': { coingeckoId: 'changer', decimals: 18 },
    },
    xdai: {
      '0xD4fdec44DB9D44B8f2b6d529620f9C0C7066A2c1': { coingeckoId: 'xdai:0xD057604A14982FE8D88c5fC25Aac3267eA142a08', decimals: 0 },
    },
    bfc: {
      [ADDRESSES.bfc.WBFC]: { coingeckoId: 'bifrost', decimals: 18 },
      [ADDRESSES.bfc.BIFI]: { coingeckoId: 'bifi', decimals: 18 },
      '0xB1f3A83597Bce2AD842c29bD750AE17afc474137': { coingeckoId: 'witch-token', decimals: 18 },
      '0x17102AC78a02a98fC78B0c29B7b0506f035A99E5': { coingeckoId: 'super-athletes-token', decimals: 18 }
    },
    eon: {
      '0xF5cB8652a84329A2016A386206761f455bCEDab6': { coingeckoId: 'zencash', decimals: 18 },
      '0x1d7fb99AED3C365B4DEf061B7978CE5055Dfc1e7': { coingeckoId: 'wrapped-bitcoin', decimals: 8 },
    },
    nos: {
      '0x43bDa480DE297A14cec95bFb1C6A313615f809Ef': { coingeckoId: 'ethereum', decimals: 18 },
      '0xf1612388D43A6b00316CA05ca358BC1a2e7b8E97': { coingeckoId: 'tether', decimals: 18 },
    }
  }

  function stripTokenHeader(token, chain) {
    if (chain === 'aptos') return token.replace(/^aptos:/, '')
    token = normalizeAddress(token, chain);
    if (chain && !token.startsWith(chain)) return token;
    return token.indexOf(":") > -1 ? token.split(":")[1] : token;
  }

  function fixBalances(balances, mapping, { chain, } = {chain: undefined, }) {
    const removeUnmapped = false
  
    Object.keys(balances).forEach(token => {
      let tokenKey = stripTokenHeader(token, chain)
      tokenKey = normalizeAddress(tokenKey, chain)
      const { coingeckoId, decimals } = mapping[tokenKey] || {};
      if (!coingeckoId) {
        if (removeUnmapped && (tokenKey.startsWith('0x') || token.startsWith(chain + ':'))) {
          console.log(`Removing token from balances, it is not part of whitelist: ${tokenKey}`);
          delete balances[token];
        }
        return;
      }
      const currentBalance = balances[token];
      delete balances[token];
      sumSingleBalance(
        balances,
        coingeckoId,
        +BigNumber(currentBalance).shiftedBy(-1 * decimals)
      );
    });
  
    return balances;
  }

  const fixBalancesMapping = {};

  for (const chain of Object.keys(fixBalancesTokens)) {
    if (!fixBalancesMapping[chain])
      fixBalancesMapping[chain] = b => fixBalances(b, fixBalancesTokens[chain], { chain })
  }
  
  function getFixBalancesSync(chain) {
    const dummyFn = i => i;
    return fixBalancesMapping[chain] || dummyFn;
  }

  async function transformBalancesOrig(chain, balances) {
    const transform = await getChainTransform(chain)
    const fixBalances = await getFixBalances(chain)
    Object.entries(balances).forEach(([token, value]) => {
      delete balances[token]
      sumSingleBalance(balances, transform(token), value as unknown as any)
    })
    fixBalances(balances)
    return balances
  }
  
  async function getTokenAccountBalances(tokenAccounts, { individual = false, chunkSize = 99, allowError = false, chain = 'solana' } = {}) {
    console.log('total token accounts: ', tokenAccounts.length)
    const formBody = account => ({ method: "getAccountInfo", jsonrpc: "2.0", params: [account, { encoding: "jsonParsed", commitment: "confirmed" }], id: account })
    const balancesIndividual = []
    const balances = {}
    const chunks = sliceIntoChunks(tokenAccounts, chunkSize)
    for (const chunk of chunks) {
      const body = chunk.map(formBody)
      const data = await axios.post(endpoint(), body);
      if(data.data.length !== chunk.length){
        console.log(tokenAccounts, data)
        throw new Error(`Mismatched returned for getTokenAccountBalances()`)
      }
      data.data.forEach(({ result: { value } }, i) => {
        if (!value || !value.data?.parsed) {
          if (tokenAccounts[i].toString() === '11111111111111111111111111111111') {
            console.log('Null account: skipping it')
            return;
          }
          if (allowError) return;
        }
        const { data: { parsed: { info: { mint, tokenAmount: { amount } } } } } = value
        sumSingleBalance(balances, mint, amount)
        balancesIndividual.push({ mint, amount })
      })
      if (chunks.length > 4) {
        console.log('waiting before more calls')
        await sleep(300)
      }
    }
    if (individual) return balancesIndividual
    return balances
  }

  async function transformBalances({ tokenBalances, balances = {}, }) {
    await transformBalancesOrig('solana', tokenBalances)
    for (const [token, balance] of Object.entries(tokenBalances))
      sumSingleBalance(balances, token, balance as unknown as any)
    return balances
  }

  async function getSolBalances(accounts) {
    const formBody = key => ({ "jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [key] })
    const tokenBalances = []
    const chunks = sliceIntoChunks(accounts, 99)
    for (let chunk of chunks) {
      const bal = await axios.post(endpoint(), chunk.map(formBody))
      tokenBalances.push(...bal.data)
    }
    return tokenBalances.reduce((a, i) => a + i.result.value, 0)
  }

  function formTokenBalanceQuery(token, account) {
    return {
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        account,
        { mint: token, },
        { encoding: "jsonParsed", },
      ],
    }
  }

  async function getTokenBalances(tokensAndAccounts) {
    const body = tokensAndAccounts.map(([token, account]) => formTokenBalanceQuery(token, account))
    const tokenBalances = await axios.post(endpoint(), body);
    const balances = {}
    // tokenBalances.data.forEach((v, i )=> {
    //   if (!v.result) console.log('>>', v, tokensAndAccounts[i])
    // } )
    tokenBalances.data.forEach(({ result: { value } }) => {
      // console.log('token balances of', value)
      value.forEach(({ pubkey, account: { data: { parsed: { info: { mint, tokenAmount: { amount } } } } } }) => {
        console.log('token balance', pubkey, mint, amount)
        sumSingleBalance(balances, mint, amount)
      })
    })
    return balances
  }

  export async function sumTokens2({
    balances = {},
    tokensAndOwners = [],
    tokens = [],
    owners = [],
    owner,
    tokenAccounts = [],
    solOwners = [],
    blacklistedTokens = [],
    allowError = false,
    getAllTokenAccounts = false,
  }) {
    blacklistedTokens.push(...blacklistedTokens_default)
    if (!tokensAndOwners.length) {
      if (owner) tokensAndOwners = tokens.map(t => [t, owner])
      if (owners.length) tokensAndOwners = tokens.map(t => owners.map(o => [t, o])).flat()
    }
    if (!tokensAndOwners.length && !tokens.length && (owner || owners.length > 0) && getAllTokenAccounts) {
      for (const _owner of [...owners, owner]) {
        const data = await getOwnerAllAccount(_owner)
        for (const item of data) {
          if (blacklistedTokens.includes(item.mint) || +item.amount < 1e6) continue;
          sumSingleBalance(balances, 'solana:' + item.mint, item.amount)
        }
      }
    }
  
    tokensAndOwners = tokensAndOwners.filter(([token]) => !blacklistedTokens.includes(token))
  
    if (tokensAndOwners.length) {
      tokensAndOwners = getUnique(tokensAndOwners)
      console.log('total balance queries: ', tokensAndOwners.length)
      const chunks = sliceIntoChunks(tokensAndOwners, 99)
      for (const chunk of chunks) {
        await _sumTokens(chunk)
        if (chunks.length > 2) {
          console.log('waiting before more calls')
          await sleep(300)
        }
      }
    }
  
    if (tokenAccounts.length) {
      tokenAccounts = getUniqueAddresses(tokenAccounts, 'solana')
      const tokenBalances = await getTokenAccountBalances(tokenAccounts, { allowError })
      await transformBalances({ tokenBalances, balances, })
    }
  
    if (solOwners.length) {
      const solBalance = await getSolBalances(solOwners)
      sumSingleBalance(balances, 'solana:' + ADDRESSES.solana.SOL, solBalance)
    }
  
    blacklistedTokens.forEach(i => delete balances['solana:'+i])
  
    return balances
  
    async function _sumTokens(tokensAndAccounts) {
      const tokenBalances = await getTokenBalances(tokensAndAccounts)
      console.log('tokenBalances', tokenBalances)
      return transformBalances({ tokenBalances, balances, })
    }
  
    function getUnique(tokensAndOwners) {
      const set = new Set()
      tokensAndOwners.forEach(i => {
        set.add(i.join('$'))
      })
      return [...set].map(i => (i as string).split('$'))
    }
  }

// Example: [[token1, account1], [token2, account2], ...]
export async function sumTokens(tokensAndOwners, balances = {}) {
    return sumTokens2({ balances: balances as unknown as any, tokensAndOwners: tokensAndOwners as unknown as any, owner: undefined, })
}