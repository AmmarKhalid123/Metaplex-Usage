import React, { useState } from 'react';
import './App.css';
import { clusterApiUrl, Connection, PublicKey, AccountInfo,
   SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction, Keypair, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { calculate } from '@metaplex/arweave-cost';
import crypto from 'crypto';
import { MintLayout, Token } from '@solana/spl-token';
import { deserializeUnchecked, serialize } from 'borsh';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import BN from 'bn.js';

const ARWEAVE_UPLOAD_ENDPOINT = 'https://us-central1-metaplex-studios.cloudfunctions.net/uploadFile';

const uploadToArweave = async (data) => {
  const resp = await fetch(
    ARWEAVE_UPLOAD_ENDPOINT,
    {
      method: 'POST',
      // @ts-ignore
      body: data,
    },
  );

  if (!resp.ok) {
    return Promise.reject(
      new Error(
        'Unable to upload the artwork to Arweave. Please wait and then try again.',
      ),
    );
  }

  const result = await resp.json();

  if (result.error) {
    return Promise.reject(new Error(result.error));
  }

  return result;
};

const PubKeysInternedMap = new Map();

const toPublicKey = (key) => {
  if (typeof key !== 'string') {
    return key;
  }

  let result = PubKeysInternedMap.get(key);
  if (!result) {
    result = new PublicKey(key);
    PubKeysInternedMap.set(key, result);
  }

  return result;
};

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
)

const findProgramAddress = async (
  seeds,
  programId,
) => {
  const localStorage = window.localStorage;
  const key =
    'pda-' +
    seeds.reduce((agg, item) => agg + item.toString('hex'), '') +
    programId.toString();
  const cached = localStorage.getItem(key);
  if (cached) {
    const value = JSON.parse(cached);

    return [value.key, parseInt(value.nonce)];
  }

  const result = await PublicKey.findProgramAddress(seeds, programId);

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        key: result[0].toBase58(),
        nonce: result[1],
      }),
    );
  } catch {
    // ignore
  }

  return [result[0].toBase58(), result[1]];
};

const associatedToken = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
function createUninitializedMint(
  instructions,
  payer,
  amount,
  signers,
) {
  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  signers.push(account);

  return account.publicKey;
}
function createMint(
  instructions,
  payer,
  mintRentExempt,
  decimals,
  owner,
  freezeAuthority,
  signers,
) {
  const account = createUninitializedMint(
    instructions,
    payer,
    mintRentExempt,
    signers,
  );

  instructions.push(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      account,
      decimals,
      owner,
      freezeAuthority,
    ),
  );

  return account;
}

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
)

function createAssociatedTokenAccountInstruction(
  instructions,
  associatedTokenAddress,
  payer,
  walletAddress,
  splTokenMintAddress,
) {
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      data: Buffer.from([]),
    }),
  );
}

const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

class Data {
  name;
  symbol;
  uri;
  sellerFeeBasisPoints;
  creators;
  constructor(args) {
    this.name = args.name;
    this.symbol = args.symbol;
    this.uri = args.uri;
    this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
    this.creators = args.creators;
  }
}

class Edition {
  key;
  /// Points at MasterEdition struct
  parent;
  /// Starting at 0 for master record, this is incremented for each edition minted.
  edition;

  constructor(args) {
    this.key = MetadataKey.EditionV1;
    this.parent = args.parent;
    this.edition = args.edition;
  }
}
class Creator {
  address;
  verified;
  share;

  constructor(args) {
    this.address = args.address;
    this.verified = args.verified;
    this.share = args.share;
  }
}


class CreateMasterEditionArgs {
  instruction = 10;
  maxSupply;
  constructor(args) {
    this.maxSupply = args.maxSupply;
  }
}


class MintPrintingTokensArgs {
  instruction = 9;
  supply;

  constructor(args) {
    this.supply = args.supply;
  }
}

async function getEdition(
  tokenMint,
){
  // const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from('metadata'),
        toPublicKey(METADATA_PROGRAM_ID).toBuffer(),
        toPublicKey(tokenMint).toBuffer(),
        Buffer.from('edition'),
      ],
      toPublicKey(METADATA_PROGRAM_ID),
    )
  )[0];
}

class MetadataKey {
  static Uninitialized = 0;
  static MetadataV1 = 4;
  static EditionV1 = 1;
  static MasterEditionV1 = 2;
  static MasterEditionV2 = 6;
  static EditionMarker = 7;
}

class MasterEditionV1 {
  key;
  supply;
  maxSupply;
  /// Can be used to mint tokens that give one-time permission to mint a single limited edition.
  printingMint;
  /// If you don't know how many printing tokens you are going to need, but you do know
  /// you are going to need some amount in the future, you can use a token from this mint.
  /// Coming back to token metadata with one of these tokens allows you to mint (one time)
  /// any number of printing tokens you want. This is used for instance by Auction Manager
  /// with participation NFTs, where we dont know how many people will bid and need participation
  /// printing tokens to redeem, so we give it ONE of these tokens to use after the auction is over,
  /// because when the auction begins we just dont know how many printing tokens we will need,
  /// but at the end we will. At the end it then burns this token with token-metadata to
  /// get the printing tokens it needs to give to bidders. Each bidder then redeems a printing token
  /// to get their limited editions.
  oneTimePrintingAuthorizationMint;

  constructor(args) {
    this.key = MetadataKey.MasterEditionV1;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
    this.printingMint = args.printingMint;
    this.oneTimePrintingAuthorizationMint =
      args.oneTimePrintingAuthorizationMint;
  }
}

class MasterEditionV2 {
  key;
  supply;
  maxSupply;

  constructor(args) {
    this.key = MetadataKey.MasterEditionV2;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
  }
}

class UpdateMetadataArgs {
  instruction = 1;
  data;
  // Not used by this app, just required for instruction
  updateAuthority;
  primarySaleHappened;
  constructor(args) {
    this.data = args.data ? args.data : null;
    this.updateAuthority = args.updateAuthority ? args.updateAuthority : null;
    this.primarySaleHappened = args.primarySaleHappened;
  }
}

class EditionMarker {
  key;
  ledger;

  constructor(args) {
    this.key = MetadataKey.EditionMarker;
    this.ledger = args.ledger;
  }

  editionTaken(edition) {
    const editionOffset = edition % 248;
    const indexOffset = Math.floor(editionOffset / 8);

    if (indexOffset > 30) {
      throw Error('bad index for edition');
    }

    const positionInBitsetFromRight = 7 - (editionOffset % 8);

    const mask = Math.pow(2, positionInBitsetFromRight);

    const appliedMask = this.ledger[indexOffset] & mask;

    return appliedMask != 0;
  }
}

class Metadata {
  key;
  updateAuthority;
  mint;
  data;
  primarySaleHappened;
  isMutable;
  editionNonce;

  // set lazy
  masterEdition;
  edition;

  constructor(args) {
    this.key = MetadataKey.MetadataV1;
    this.updateAuthority = args.updateAuthority;
    this.mint = args.mint;
    this.data = args.data;
    this.primarySaleHappened = args.primarySaleHappened;
    this.isMutable = args.isMutable;
    this.editionNonce = args.editionNonce ?? null;
  }

  async init() {
    //const metadata = toPublicKey(programIds().metadata);
    /*
    This nonce stuff doesnt work - we are doing something wrong here. TODO fix.
    if (this.editionNonce !== null) {
      this.edition = (
        await PublicKey.createProgramAddress(
          [
            Buffer.from(METADATA_PREFIX),
            metadata.toBuffer(),
            toPublicKey(this.mint).toBuffer(),
            new Uint8Array([this.editionNonce || 0]),
          ],
          metadata,
        )
      ).toBase58();
    } else {*/
    this.edition = await getEdition(this.mint);
    //}
    this.masterEdition = this.edition;
  }
}


class CreateMetadataArgs {
  instruction = 0;
  data;
  isMutable;

  constructor(args) {
    this.data = args.data;
    this.isMutable = args.isMutable;
  }
}

const METADATA_SCHEMA = new Map([
  [
    CreateMetadataArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['data', Data],
        ['isMutable', 'u8'], // bool
      ],
    },
  ],
  [
    UpdateMetadataArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['data', { kind: 'option', type: Data }],
        ['updateAuthority', { kind: 'option', type: 'pubkeyAsString' }],
        ['primarySaleHappened', { kind: 'option', type: 'u8' }],
      ],
    },
  ],

  [
    CreateMasterEditionArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['maxSupply', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
  [
    MintPrintingTokensArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['supply', 'u64'],
      ],
    },
  ],
  [
    MasterEditionV1,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['supply', 'u64'],
        ['maxSupply', { kind: 'option', type: 'u64' }],
        ['printingMint', 'pubkeyAsString'],
        ['oneTimePrintingAuthorizationMint', 'pubkeyAsString'],
      ],
    },
  ],
  [
    MasterEditionV2,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['supply', 'u64'],
        ['maxSupply', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
  [
    Edition,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['parent', 'pubkeyAsString'],
        ['edition', 'u64'],
      ],
    },
  ],
  [
    Data,
    {
      kind: 'struct',
      fields: [
        ['name', 'string'],
        ['symbol', 'string'],
        ['uri', 'string'],
        ['sellerFeeBasisPoints', 'u16'],
        ['creators', { kind: 'option', type: [Creator] }],
      ],
    },
  ],
  [
    Creator,
    {
      kind: 'struct',
      fields: [
        ['address', 'pubkeyAsString'],
        ['verified', 'u8'],
        ['share', 'u8'],
      ],
    },
  ],
  [
    Metadata,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['updateAuthority', 'pubkeyAsString'],
        ['mint', 'pubkeyAsString'],
        ['data', Data],
        ['primarySaleHappened', 'u8'], // bool
        ['isMutable', 'u8'], // bool
        ['editionNonce', { kind: 'option', type: 'u8' }],
      ],
    },
  ],
  [
    EditionMarker,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['ledger', [31]],
      ],
    },
  ],
]);

async function awaitTransactionSignatureConfirmation(
  txid,
  timeout,
  connection,
  commitment = 'recent',
  queryStatus = false,
) {
  let done = false;
  let status = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  status = await new Promise(async (resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      console.log('Rejecting for timeout...');
      reject({ timeout: true });
    }, timeout);
    try {
      subId = connection.onSignature(
        txid,
        (result, context) => {
          done = true;
          status = {
            err: result.err,
            slot: context.slot,
            confirmations: 0,
          };
          if (result.err) {
            console.log('Rejected via websocket', result.err);
            reject(status);
          } else {
            console.log('Resolved via websocket', result);
            resolve(status);
          }
        },
        commitment,
      );
    } catch (e) {
      done = true;
      console.error('WS error in setup', txid, e);
    }
    while (!done && queryStatus) {
      // eslint-disable-next-line no-loop-func
      (async () => {
        try {
          const signatureStatuses = await connection.getSignatureStatuses([
            txid,
          ]);
          status = signatureStatuses && signatureStatuses.value[0];
          if (!done) {
            if (!status) {
              console.log('REST null result for', txid, status);
            } else if (status.err) {
              console.log('REST error for', txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              console.log('REST no confirmations for', txid, status);
            } else {
              console.log('REST confirmation for', txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            console.log('REST connection error: txid', txid, e);
          }
        }
      })();
      await sleep(2000);
    }
  });

  //@ts-ignore
  if (connection._signatureSubscriptions[subId])
    connection.removeSignatureListener(subId);
  done = true;
  console.log('Returning status', status);
  return status;
}



const DEFAULT_TIMEOUT = 15000;
const getUnixTs = () => {
  return new Date().getTime() / 1000;
};
function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateTransaction(
  connection,
  transaction,
  commitment,
) {
  // @ts-ignore
  transaction.recentBlockhash = await connection._recentBlockhash(
    // @ts-ignore
    connection._disableBlockhashCaching,
  );

  const signData = transaction.serializeMessage();
  // @ts-ignore
  const wireTransaction = transaction._serialize(signData);
  const encodedTransaction = wireTransaction.toString('base64');
  const config = { encoding: 'base64', commitment };
  const args = [encodedTransaction, config];

  // @ts-ignore
  const res = await connection._rpcRequest('simulateTransaction', args);
  if (res.error) {
    throw new Error('failed to simulate transaction: ' + res.error.message);
  }
  return res.result;
}

async function sendSignedTransaction({
  signedTransaction,
  connection,
  timeout = DEFAULT_TIMEOUT,
}){
  const rawTransaction = signedTransaction.serialize();
  const startTime = getUnixTs();
  let slot = 0;
  const txid = await connection.sendRawTransaction(
    rawTransaction,
    {
      skipPreflight: true,
    },
  );

  console.log('Started awaiting confirmation for', txid);

  let done = false;
  (async () => {
    while (!done && getUnixTs() - startTime < timeout) {
      connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
      });
      await sleep(500);
    }
  })();
  try {
    const confirmation = await awaitTransactionSignatureConfirmation(
      txid,
      timeout,
      connection,
      'recent',
      true,
    );

    if (!confirmation)
      throw new Error('Timed out awaiting confirmation on transaction');

    if (confirmation.err) {
      console.error(confirmation.err);
      throw new Error('Transaction failed: Custom instruction error');
    }

    slot = confirmation?.slot || 0;
  } catch (err) {
    console.error('Timeout Error caught', err);
    if (err.timeout) {
      throw new Error('Timed out awaiting confirmation on transaction');
    }
    let simulateResult = null;
    try {
      simulateResult = (
        await simulateTransaction(connection, signedTransaction, 'single')
      ).value;
    } catch (e) {}
    if (simulateResult && simulateResult.err) {
      if (simulateResult.logs) {
        for (let i = simulateResult.logs.length - 1; i >= 0; --i) {
          const line = simulateResult.logs[i];
          if (line.startsWith('Program log: ')) {
            throw new Error(
              'Transaction failed: ' + line.slice('Program log: '.length),
            );
          }
        }
      }
      throw new Error(JSON.stringify(simulateResult.err));
    }
    // throw new Error('Transaction failed');
  } finally {
    done = true;
  }

  console.log('Latency', txid, getUnixTs() - startTime);
  return { txid, slot };
}


const sendTransactionWithRetry = async (
  connection,
  wallet,
  instructions,
  signers,
  commitment = 'singleGossip',
  includesFeePayer = false,
  block,
  beforeSend,
) => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let transaction = new Transaction();
  instructions.forEach(instruction => transaction.add(instruction));
  transaction.recentBlockhash = (
    block || (await connection.getRecentBlockhash(commitment))
  ).blockhash;

  if (includesFeePayer) {
    transaction.setSigners(...signers.map(s => s.publicKey));
  } else {
    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      ...signers.map(s => s.publicKey),
    );
  }

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  if (!includesFeePayer) {
    transaction = await wallet.signTransaction(transaction);
  }

  if (beforeSend) {
    beforeSend();
  }

  const { txid, slot } = await sendSignedTransaction({
    connection,
    signedTransaction: transaction,
  });

  return { txid, slot };
};


async function createMetadata(
  data,
  updateAuthority,
  mintKey,
  mintAuthorityKey,
  instructions,
  payer,
) {
  const metadataProgramId = METADATA_PROGRAM_ID;

  const metadataAccount = (
    await findProgramAddress(
      [
        Buffer.from('metadata'),
        toPublicKey(metadataProgramId).toBuffer(),
        toPublicKey(mintKey).toBuffer(),
      ],
      toPublicKey(metadataProgramId),
    )
  )[0];
  console.log('Data', data);
  const value = new CreateMetadataArgs({ data, isMutable: true });
  console.log(value);
  const txnData = Buffer.from(serialize(METADATA_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(metadataAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(mintKey),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(mintAuthorityKey),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(updateAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(metadataProgramId),
      data: txnData,
    }),
  );

  return metadataAccount;
}

async function updateMetadata(
  data,
  newUpdateAuthority,
  primarySaleHappened,
  mintKey,
  updateAuthority,
  instructions,
  metadataAccount,
) {
  const metadataProgramId = METADATA_PROGRAM_ID;

  metadataAccount =
    metadataAccount ||
    (
      await findProgramAddress(
        [
          Buffer.from('metadata'),
          toPublicKey(metadataProgramId).toBuffer(),
          toPublicKey(mintKey).toBuffer(),
        ],
        toPublicKey(metadataProgramId),
      )
    )[0];

  const value = new UpdateMetadataArgs({
    data,
    updateAuthority: !newUpdateAuthority ? undefined : newUpdateAuthority,
    primarySaleHappened:
      primarySaleHappened === null || primarySaleHappened === undefined
        ? null
        : primarySaleHappened,
  });
  const txnData = Buffer.from(serialize(METADATA_SCHEMA, value));
  const keys = [
    {
      pubkey: toPublicKey(metadataAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(updateAuthority),
      isSigner: true,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(metadataProgramId),
      data: txnData,
    }),
  );

  return metadataAccount;
}

async function createMasterEdition(
  maxSupply,
  mintKey,
  updateAuthorityKey,
  mintAuthorityKey,
  payer,
  instructions,
) {
  const metadataProgramId = METADATA_PROGRAM_ID;

  const metadataAccount = (
    await findProgramAddress(
      [
        Buffer.from('metdata'),
        toPublicKey(metadataProgramId).toBuffer(),
        toPublicKey(mintKey).toBuffer(),
      ],
      toPublicKey(metadataProgramId),
    )
  )[0];

  const editionAccount = (
    await findProgramAddress(
      [
        Buffer.from('metadata'),
        toPublicKey(metadataProgramId).toBuffer(),
        toPublicKey(mintKey).toBuffer(),
        Buffer.from('edition'),
      ],
      toPublicKey(metadataProgramId),
    )
  )[0];

  const value = new CreateMasterEditionArgs({ maxSupply });
  const data = Buffer.from(serialize(METADATA_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(editionAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(mintKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(updateAuthorityKey),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(mintAuthorityKey),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(metadataAccount),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(metadataProgramId),
      data,
    }),
  );
}


const mintNFT = async (
  connection,
  wallet,
  endpoint,
  files,
  metadata,
  progressCallback, maxSupply,
) => {
  if (!wallet?.publicKey) return;

  const metadataContent = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description,
    seller_fee_basis_points: metadata.sellerFeeBasisPoints,
    image: metadata.image,
    animation_url: metadata.animation_url,
    attributes: metadata.attributes,
    external_url: metadata.external_url,
    properties: {
      ...metadata.properties,
      creators: metadata.creators?.map(creator => {
        return {
          address: creator.address,
          share: creator.share,
        };
      }),
    },
  };

  const realFiles = [
    ...files,
    new File([JSON.stringify(metadataContent)], 'metadata.json'),
  ];

  const { instructions: pushInstructions, signers: pushSigners } =
    await prepPayForFilesTxn(wallet, realFiles, metadata);

  progressCallback(1);


//   // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );
  // const accountRent = await connection.getMinimumBalanceForRentExemption(
  //   AccountLayout.span,
  // );

//   // This owner is a temporary signer and owner of metadata we use to circumvent requesting signing
//   // twice post Arweave. We store in an account (payer) and use it post-Arweave to update MD with new link
//   // then give control back to the user.
//   // const payer = new Account();
  const payerPublicKey = wallet.publicKey.toBase58();
  const instructions = [...pushInstructions];
  const signers = [...pushSigners];

//   // This is only temporarily owned by wallet...transferred to program by createMasterEdition below
  const mintKey = createMint(
    instructions,
    wallet.publicKey,
    mintRent,
    0,
    // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
    toPublicKey(payerPublicKey),
    toPublicKey(payerPublicKey),
    signers,
  ).toBase58();

  const recipientKey = (
    await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        toPublicKey(mintKey).toBuffer(),
      ],
      associatedToken,
    )
  )[0];

  createAssociatedTokenAccountInstruction(
    instructions,
    toPublicKey(recipientKey),
    wallet.publicKey,
    wallet.publicKey,
    toPublicKey(mintKey),
  );

  const metadataAccount = await createMetadata(
    new Data({
      symbol: metadata.symbol,
      name: metadata.name,
      uri: ' '.repeat(64), // size of url for arweave
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      creators: metadata.creators,
    }),
    payerPublicKey,
    mintKey,
    payerPublicKey,
    instructions,
    wallet.publicKey.toBase58(),
  );
  progressCallback(2);

//   // TODO: enable when using payer account to avoid 2nd popup
//   // const block = await connection.getRecentBlockhash('singleGossip');
//   // instructions.push(
//   //   SystemProgram.transfer({
//   //     fromPubkey: wallet.publicKey,
//   //     toPubkey: payerPublicKey,
//   //     lamports: 0.5 * LAMPORTS_PER_SOL // block.feeCalculator.lamportsPerSignature * 3 + mintRent, // TODO
//   //   }),
//   // );

  const { txid } = await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
    'single',
  );
  progressCallback(3);

  try {
    await connection.confirmTransaction(txid, 'max');
    progressCallback(4);
  } catch {
    // ignore
  }

  // Force wait for max confirmations
  // await connection.confirmTransaction(txid, 'max');
  await connection.getParsedConfirmedTransaction(txid, 'confirmed');

  progressCallback(5);

  // this means we're done getting AR txn setup. Ship it off to ARWeave!
  const data = new FormData();
  data.append('transaction', txid);
  data.append('env', endpoint);

  const tags = realFiles.reduce(
    (acc, f) => {
      acc[f.name] = [{ name: 'mint', value: mintKey }];
      return acc;
    },
    {},
  );
  data.append('tags', JSON.stringify(tags));
  realFiles.map(f => data.append('file[]', f));

  // TODO: convert to absolute file name for image

  const result = await uploadToArweave(data);
  progressCallback(6);

  const metadataFile = result.messages?.find(
    m => m.filename === 'manifest.json',
  );
  if (metadataFile?.transactionId && wallet.publicKey) {
    const updateInstructions = [];
    const updateSigners = [];

    // TODO: connect to testnet arweave
    const arweaveLink = `https://arweave.net/${metadataFile.transactionId}`;
    await updateMetadata(
      new Data({
        name: metadata.name,
        symbol: metadata.symbol,
        uri: arweaveLink,
        creators: metadata.creators,
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      }),
      undefined,
      undefined,
      mintKey,
      payerPublicKey,
      updateInstructions,
      metadataAccount,
    );

    updateInstructions.push(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        toPublicKey(mintKey),
        toPublicKey(recipientKey),
        toPublicKey(payerPublicKey),
        [],
        1,
      ),
    );

    progressCallback(7);
    // // In this instruction, mint authority will be removed from the main mint, while
    // // minting authority will be maintained for the Printing mint (which we want.)
    await createMasterEdition(
      maxSupply !== undefined ? new BN(maxSupply) : undefined,
      mintKey,
      payerPublicKey,
      payerPublicKey,
      payerPublicKey,
      updateInstructions,
    );

    // TODO: enable when using payer account to avoid 2nd popup
    /*  if (maxSupply !== undefined)
      updateInstructions.push(
        setAuthority({
          target: authTokenAccount,
          currentAuthority: payerPublicKey,
          newAuthority: wallet.publicKey,
          authorityType: 'AccountOwner',
        }),
      );
*/
    // TODO: enable when using payer account to avoid 2nd popup
    // Note with refactoring this needs to switch to the updateMetadataAccount command
    // await transferUpdateAuthority(
    //   metadataAccount,
    //   payerPublicKey,
    //   wallet.publicKey,
    //   updateInstructions,
    // );

    progressCallback(8);

    const txid = await sendTransactionWithRetry(
      connection,
      wallet,
      updateInstructions,
      updateSigners,
    );

    // notify({
    //   message: 'Art created on Solana',
    //   description: (
    //     <a href={arweaveLink} target="_blank" rel="noopener noreferrer">
    //       Arweave Link
    //     </a>
    //   ),
    //   type: 'success',
    // });
    alert('Success'+arweaveLink);

    // TODO: refund funds

    // send transfer back to user
  }
  // TODO:
  // 1. Jordan: --- upload file and metadata to storage API
  // 2. pay for storage by hashing files and attaching memo for each file

  return { metadataAccount };
};

async function getAssetCostToStore(files) {
  const sizes = files.map(f => f.size);
  const result = await calculate(sizes);

  return LAMPORTS_PER_SOL * result.solana;
}

const prepPayForFilesTxn = async (
  wallet,
  files,
  metadata,
) => {
  
  const memo = new PublicKey(
    'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  );

  const instructions = [];
  const signers = [];

  if (wallet.publicKey){
    let AR_SOL_HOLDER_ID = new PublicKey(
      '6FKvsq4ydWFci6nGq9ckbjYMtnmaqAoatz5c9XWjiDuS',
    );
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: AR_SOL_HOLDER_ID,
        lamports: await getAssetCostToStore(files),
      }),
    );    
  }

  for (let i = 0; i < files.length; i++) {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(await files[i].text());
    const hex = hashSum.digest('hex');
    instructions.push(
      new TransactionInstruction({
        keys: [],
        programId: memo,
        data: Buffer.from(hex),
      }),
    );
  }

  return {
    instructions,
    signers,
  };
};


export default function Main() {
  const [pubKey, setPubkey] = useState('');
  let [wallet, setWallet] = useState({});
  const [nftCreateProgress, setNFTcreateProgress] = useState(0);
  let connection = {
    connection: new Connection(clusterApiUrl('testnet'), 'recent'),
    endpoint: clusterApiUrl('testnet'),
    tokens: new Map(),
  };

  let attributes = {
    name: '',
    symbol: '',
    description: '',
    external_url: '',
    image: '',
    animation_url: undefined,
    attributes: [
      {trait_type: 'color', value: 'red'}
    ],
    seller_fee_basis_points: 0,
    creators: [],
    properties: {
      files: [],
      category: 'image',
    },
  }

  const mintItem = async () => {
    let name = document.getElementById('name-itm').value;
    let symbol = document.getElementById('sym-itm').value;
    let desc = document.getElementById('desc-itm').value;
    let exturl = document.getElementById('ext-url').value;
    let royalty = document.getElementById('royalty-fees').value;
    let img = document.getElementById('itm-img').files[0];

    console.log(name, symbol, desc, exturl, royalty, img);
    console.log(wallet);
    attributes.name = name;
    attributes.symbol = symbol;
    attributes.description = desc;
    attributes.external_url = exturl;
    attributes.image = img;
    attributes.animation_url = '';
    attributes.seller_fee_basis_points = royalty;
    attributes.creators = [
      new Creator(pubKey, 100)
    ];
    attributes.properties = {
        files: [{
          uri: img.name,
          type: img.type
        }],
        category: 'image'
    }
    const metadata = {
      name: attributes.name,
      symbol: attributes.symbol,
      creators: attributes.creators,
      description: attributes.description,
      sellerFeeBasisPoints: attributes.seller_fee_basis_points,
      image: attributes.image,
      animation_url: attributes.animation_url,
      attributes: attributes.attributes,
      external_url: attributes.external_url,
      properties: {
        files: attributes.properties.files,
        category: attributes.properties?.category,
      },
    };
    const _nft = await mintNFT(
      connection.connection,
      wallet,
      'testnet',
      [img],
      metadata,
      setNFTcreateProgress,
      1,
    );
  }

  const connectWallet = async () => {
    console.log("akjdsk");
    if (window.solana){
      const resp = await window.solana.connect();
      console.log(resp);
      console.log(resp.publicKey.toString());
      setWallet({publicKey: resp.publicKey});
      setPubkey(resp.publicKey.toString());
    }
    else{
      alert('User cancelled');
    }
  }

  return (
    <div>
      <button onClick={connectWallet}>Connect to phantom</button>

      <p>address: {wallet.publicKey?.toString()}</p>
      <div>
        <label>Name: </label>
        <input type="text" id='name-itm' />
      </div>
      <div>
        <label>Symbol: </label>
        <input type="text" id="sym-itm" />
      </div>
      <div>
        <label>Description: </label>
        <input type="text" id="desc-itm" />
      </div>
      <div>
        <label>External URL: </label>
        <input type="text" id='ext-url' />
      </div>
      <div>
        <label>Royalty Fees: </label>
        <input type="number" id='royalty-fees' />
      </div>
      <div>
        <label>Image Fees: </label>
        <input type="file" accept="image/*" id='itm-img' />
      </div>
      <div>
        <button onClick={mintItem}>Submit</button>
      </div>
      <h2>Step we're on: {nftCreateProgress}</h2>
    </div>
  );
}

