import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { TokenInfo, DexType } from '../types';
import { encrypt, decrypt } from './security';

// Encrypted constants
const ENCRYPTED_CONSTANTS = {
  RPC_URLS: encrypt(JSON.stringify([
    "https://rpc.coredao.org",
    "https://rpc-core.icecreamswap.com",
    "https://rpc.coredao.org/",
    "https://core.drpc.org"
  ])),
  WCORE_ADDRESS: encrypt('0x40375C92d9FAf44d2f9db9Bd9ba41a3317a2404f'),
  BUGS_TOKEN_ADDRESS: encrypt('0x892CCdD2624ef09Ca5814661c566316253353820'),
  PIPI_LOL_TOKEN_ADDRESS: encrypt('0x892CCdD2624ef09Ca5814661c566316253353820'),
  FEE_COLLECTOR_ADDRESS: encrypt('0x969A222549c022AD0B262cB16B6770337373aA36'),
  DEX_ROUTERS: encrypt(JSON.stringify({
    falcoxswap: '0x2C34490b5E30f3C6838aE59c8c5fE88F9B9fBc8A'
  }))
};

// Decrypt and export constants
export const RPC_URLS: string[] = JSON.parse(decrypt(ENCRYPTED_CONSTANTS.RPC_URLS));
export const WCORE_ADDRESS = decrypt(ENCRYPTED_CONSTANTS.WCORE_ADDRESS);
export const BUGS_TOKEN_ADDRESS = decrypt(ENCRYPTED_CONSTANTS.BUGS_TOKEN_ADDRESS);
export const PIPI_LOL_TOKEN_ADDRESS = decrypt(ENCRYPTED_CONSTANTS.PIPI_LOL_TOKEN_ADDRESS);
export const FEE_COLLECTOR_ADDRESS = decrypt(ENCRYPTED_CONSTANTS.FEE_COLLECTOR_ADDRESS);
export const DEX_ROUTERS: Record<DexType, string> = JSON.parse(decrypt(ENCRYPTED_CONSTANTS.DEX_ROUTERS));
export const FEE_PERCENTAGE = 0.001; // 0.10%

// Extended TOKEN_ABI to include decimals and balanceOf
const TOKEN_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  }
] as AbiItem[];

const ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactETHForTokens",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForETH",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" }
    ],
    "name": "getAmountsOut",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  }
] as AbiItem[];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;
const GAS_PRICE_BUFFER = 1.5;
const NONCE_CACHE: { [address: string]: number } = {};

const DECIMALS_CACHE: { [address: string]: number } = {
  [WCORE_ADDRESS]: 18,
  [BUGS_TOKEN_ADDRESS]: 18
};

let currentRpcIndex = 0;
let web3Instance: Web3 | null = null;

const createWeb3Instance = (rpcUrl: string): Web3 => {
  return new Web3(new Web3.providers.HttpProvider(rpcUrl, {
    timeout: 10000,
    reconnect: {
      auto: true,
      delay: 1000,
      maxAttempts: 5,
      onTimeout: false
    }
  }));
};

export const initializeWeb3 = async (retries = MAX_RETRIES): Promise<Web3 | null> => {
  if (web3Instance) {
    try {
      await web3Instance.eth.net.isListening();
      return web3Instance;
    } catch (error) {
      web3Instance = null;
    }
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    for (let i = 0; i < RPC_URLS.length; i++) {
      const rpcIndex = (currentRpcIndex + i) % RPC_URLS.length;
      const rpcUrl = RPC_URLS[rpcIndex];

      try {
        const web3 = createWeb3Instance(rpcUrl);
        const isListening = await web3.eth.net.isListening();
        
        if (!isListening) {
          continue;
        }

        const networkId = await web3.eth.net.getId();
        if (networkId !== 1116) {
          continue;
        }

        currentRpcIndex = rpcIndex;
        web3Instance = web3;
        return web3;
      } catch (error) {
        console.warn(`RPC ${rpcUrl} failed:`, error);
        continue;
      }
    }

    if (attempt < retries - 1) {
      await sleep(RETRY_DELAY * (attempt + 1));
    }
  }
  
  return null;
};

const getTokenDecimals = async (web3: Web3, tokenAddress: string): Promise<number> => {
  if (DECIMALS_CACHE[tokenAddress] !== undefined) {
    return DECIMALS_CACHE[tokenAddress];
  }

  try {
    const contract = new web3.eth.Contract(TOKEN_ABI, tokenAddress);
    const decimals = await contract.methods.decimals().call();
    DECIMALS_CACHE[tokenAddress] = parseInt(decimals);
    return DECIMALS_CACHE[tokenAddress];
  } catch (error) {
    console.error('Error getting token decimals:', error);
    return 18;
  }
};

export const getTokenBalance = async (web3: Web3, tokenAddress: string, walletAddress: string): Promise<string> => {
  if (!web3.utils.isAddress(tokenAddress) || !web3.utils.isAddress(walletAddress)) {
    console.error('Invalid address provided');
    return '0';
  }

  try {
    const contract = new web3.eth.Contract(TOKEN_ABI, tokenAddress);
    const [balance, decimals] = await Promise.all([
      contract.methods.balanceOf(walletAddress).call(),
      getTokenDecimals(web3, tokenAddress)
    ]);
    return balance;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return '0';
  }
};

export const formatTokenAmount = (amount: string | number, decimals: number): string => {
  try {
    const web3 = new Web3();
    const amountBN = web3.utils.toBN(amount);
    const divisor = web3.utils.toBN(10).pow(web3.utils.toBN(decimals));
    const beforeDecimal = amountBN.div(divisor);
    const afterDecimal = amountBN.mod(divisor);
    
    let afterDecimalStr = afterDecimal.toString().padStart(decimals, '0');
    afterDecimalStr = afterDecimalStr.replace(/0+$/, '');
    
    return afterDecimalStr ? `${beforeDecimal}.${afterDecimalStr}` : beforeDecimal.toString();
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

const PRICE_ENDPOINTS = [
  'https://api.geckoterminal.com/api/v2',
  'https://alternate-api.falcox.net/api/v2',
  'https://price.falcox.net/api/v2',
  'https://backup-price.falcox.net/api/v2'
];

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const CORE_PRICE_ENDPOINTS = [
  'https://api.coingecko.com/api/v3/simple/price?ids=coredao&vs_currencies=usd',
  'https://api.falcox.net/v1/price/core',
  'https://price.icecreamswap.com/price/core'
];

const getCorePrice = async (retries = 3): Promise<number> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    for (const endpoint of CORE_PRICE_ENDPOINTS) {
      try {
        const response = await fetchWithTimeout(endpoint);
        if (!response.ok) continue;

        const data = await response.json();
        const price = endpoint.includes('coingecko') 
          ? data.coredao?.usd
          : data.price;

        if (price && !isNaN(price)) {
          return Number(price);
        }
      } catch (error) {
        continue;
      }
    }
    await sleep(1000 * (attempt + 1));
  }
  return 0;
};

export const getTokenPrice = async (tokenAddress: string, retries = 5): Promise<number> => {
  if (!tokenAddress || tokenAddress.length !== 42) {
    console.error('Invalid token address format');
    return 0;
  }

  if (tokenAddress.toLowerCase() === WCORE_ADDRESS.toLowerCase()) {
    return getCorePrice(retries);
  }

  const delay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000);
  let lastError: Error | null = null;
  let cachedPrice: number | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const baseUrl of PRICE_ENDPOINTS) {
      try {
        const poolsUrl = `${baseUrl}/networks/core/tokens/${tokenAddress}/pools`;
        const poolsResponse = await fetchWithTimeout(poolsUrl);

        if (poolsResponse.ok) {
          const poolsData = await poolsResponse.json();
          const pool = poolsData.data?.find((p: any) => 
            p.attributes?.token_price_usd && 
            !isNaN(parseFloat(p.attributes.token_price_usd))
          );

          if (pool) {
            const price = parseFloat(pool.attributes.token_price_usd);
            if (price > 0) {
              cachedPrice = price;
              return price;
            }
          }
        }

        const tokenUrl = `${baseUrl}/networks/core/tokens/${tokenAddress}`;
        const tokenResponse = await fetchWithTimeout(tokenUrl);

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          const tokenPrice = tokenData.data?.attributes?.price_usd;
          if (tokenPrice && !isNaN(parseFloat(tokenPrice))) {
            cachedPrice = parseFloat(tokenPrice);
            return cachedPrice;
          }
        }
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }

    if (attempt < retries - 1) {
      await sleep(delay(attempt));
    }
  }

  console.error('Failed to fetch price after all retries:', lastError);
  return cachedPrice || 0;
};

const checkLiquidity = async (
  web3: Web3,
  router: any,
  path: string[],
  amountIn: string
): Promise<boolean> => {
  try {
    const amountsOut = await router.methods.getAmountsOut(amountIn, path).call();
    return web3.utils.toBN(amountsOut[1]).gt(web3.utils.toBN('0'));
  } catch (error) {
    console.error('Liquidity check failed:', error);
    return false;
  }
};

const getNonce = async (web3: Web3, address: string): Promise<number> => {
  try {
    const currentNonce = await web3.eth.getTransactionCount(address, 'pending');
    const cachedNonce = NONCE_CACHE[address] || 0;
    const nonce = Math.max(currentNonce, cachedNonce);
    NONCE_CACHE[address] = nonce + 1;
    return nonce;
  } catch (error) {
    console.error('Error getting nonce:', error);
    throw error;
  }
};

const getGasPrice = async (web3: Web3): Promise<string> => {
  try {
    const currentGasPrice = await web3.eth.getGasPrice();
    const gasPriceBN = web3.utils.toBN(currentGasPrice);
    const bufferedGasPrice = gasPriceBN.muln(Math.floor(GAS_PRICE_BUFFER * 100)).divn(100);
    return bufferedGasPrice.toString();
  } catch (error) {
    console.error('Error getting gas price:', error);
    throw error;
  }
};

const approveToken = async (
  web3: Web3,
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  wallet: { address: string; privateKey: string }
) => {
  if (!web3.utils.isAddress(tokenAddress)) {
    throw new Error('Invalid token address');
  }

  if (!web3.utils.isAddress(spenderAddress)) {
    throw new Error('Invalid spender address');
  }

  const tokenContract = new web3.eth.Contract(TOKEN_ABI, tokenAddress);
  const amountWei = web3.utils.toWei(amount, 'ether');

  try {
    const currentAllowance = await tokenContract.methods
      .allowance(wallet.address, spenderAddress)
      .call();

    if (web3.utils.toBN(currentAllowance).gte(web3.utils.toBN(amountWei))) {
      console.log('Sufficient allowance already exists');
      return true;
    }

    console.log('Approving tokens...');
    const gasPrice = await getGasPrice(web3);
    const nonce = await getNonce(web3, wallet.address);

    const approveData = tokenContract.methods.approve(spenderAddress, amountWei).encodeABI();

    const tx = {
      from: wallet.address,
      to: tokenAddress,
      data: approveData,
      gasPrice,
      nonce,
    };

    const estimatedGas = await web3.eth.estimateGas(tx);
    tx.gas = Math.floor(estimatedGas * 1.2);

    const signedTx = await web3.eth.accounts.signTransaction(tx, wallet.privateKey);
    
    if (!signedTx.rawTransaction) {
      throw new Error('Failed to sign approval transaction');
    }

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log('Approval transaction receipt:', receipt);

    if (!receipt.status) {
      throw new Error('Approval transaction failed');
    }

    const newAllowance = await tokenContract.methods
      .allowance(wallet.address, spenderAddress)
      .call();

    if (web3.utils.toBN(newAllowance).lt(web3.utils.toBN(amountWei))) {
      throw new Error('Approval verification failed');
    }

    return true;
  } catch (error) {
    console.error('Error in token approval:', error);
    throw new Error(`Approval failed: ${error.message || 'Unknown error'}`);
  }
};

export const executeTrade = async (
  web3: Web3,
  dexType: DexType,
  type: 'buy' | 'sell',
  amount: string,
  slippage: number,
  wallet: { address: string; privateKey: string },
  tokenAddress: string
) => {
  if (!web3.utils.isAddress(tokenAddress)) {
    throw new Error('Invalid token address');
  }

  const routerAddress = DEX_ROUTERS[dexType];
  if (!web3.utils.isAddress(routerAddress)) {
    throw new Error('Invalid router address');
  }

  try {
    console.log(`Executing ${type} trade on ${dexType}...`);
    const router = new web3.eth.Contract(ROUTER_ABI, routerAddress);
    const path = type === 'buy' 
      ? [WCORE_ADDRESS, tokenAddress]
      : [tokenAddress, WCORE_ADDRESS];

    const amountWei = web3.utils.toWei(amount, 'ether');
    console.log('Amount in Wei:', amountWei);

    const hasLiquidity = await checkLiquidity(web3, router, path, amountWei);
    if (!hasLiquidity) {
      throw new Error('Insufficient liquidity for this trade');
    }

    if (type === 'sell') {
      console.log('Approving token for sell...');
      const approved = await approveToken(
        web3,
        tokenAddress,
        routerAddress,
        amount,
        wallet
      );
      if (!approved) {
        throw new Error('Token approval failed');
      }
      console.log('Token approved successfully');
    }

    console.log('Calculating expected output amount...');
    let amountsOut;
    try {
      amountsOut = await router.methods.getAmountsOut(
        amountWei,
        path
      ).call();
    } catch (error) {
      throw new Error(`Failed to get amounts out: ${error.message}. The token might not have enough liquidity.`);
    }

    if (!amountsOut || !amountsOut[1] || web3.utils.toBN(amountsOut[1]).isZero()) {
      throw new Error('Invalid output amount received. The token might not have enough liquidity.');
    }

    console.log('Expected output amounts:', amountsOut);

    const minOut = web3.utils.toBN(amountsOut[1])
      .mul(web3.utils.toBN(1000 - slippage))
      .div(web3.utils.toBN(1000));

    console.log('Minimum output amount:', minOut.toString());

    const deadline = Math.floor(Date.now() / 1000) + 300;
    console.log('Transaction deadline:', deadline);

    const gasPrice = await getGasPrice(web3);
    console.log('Current gas price:', gasPrice);

    const nonce = await getNonce(web3, wallet.address);
    console.log('Nonce:', nonce);

    const txData = type === 'buy'
      ? router.methods.swapExactETHForTokens(
          minOut.toString(),
          path,
          wallet.address,
          deadline
        )
      : router.methods.swapExactTokensForETH(
          amountWei,
          minOut.toString(),
          path,
          wallet.address,
          deadline
        );

    const tx = {
      from: wallet.address,
      to: routerAddress,
      data: txData.encodeABI(),
      value: type === 'buy' ? amountWei : '0',
      gasPrice,
      nonce,
    };

    console.log('Estimating gas...');
    let estimatedGas;
    try {
      estimatedGas = await web3.eth.estimateGas(tx);
    } catch (error) {
      throw new Error(`Gas estimation failed: ${error.message}. The transaction might fail.`);
    }

    tx.gas = Math.floor(estimatedGas * 1.2);
    console.log('Estimated gas (with buffer):', tx.gas);

    console.log('Signing transaction...');
    const signedTx = await web3.eth.accounts.signTransaction(tx, wallet.privateKey);
    
    if (!signedTx.rawTransaction) {
      throw new Error('Failed to sign transaction');
    }

    console.log('Sending transaction...');
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log('Transaction receipt:', receipt);

    if (!receipt.status) {
      throw new Error('Transaction failed');
    }

    return receipt;
  } catch (error) {
    console.error('Error executing trade:', error);
    throw new Error(`Trade failed: ${error.message || 'Unknown error'}`);
  }
};