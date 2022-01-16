import React from "react";
import { getPhantomWallet } from "@solana/wallet-adapter-wallets";
import { Connection, actions } from '@metaplex/js';
import { clusterApiUrl, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import crypto from 'crypto';
import BN from 'bn.js';


let txstore = '3TFubDQM7HUpnF9RBiAQNCJ3Lc1uZQrCiHhgyULQuWeV9CZzBnssDJQfsCT17zx2u8VpszK1VpxofycmfveBmZak';
let storeid = '2538011ca4efefb98cefcae700cc4c3c3e35296d4511f2cf754162ebf808d914';

let extpriceaccount = '7Rc2kh9iRc29UUVYGtVyCeGTBxu2YbonH7QRScK5zXNH';
let pricemint = 'So11111111111111111111111111111111111111112';
let tx = "5jUQRqUZD3G1TkJ2YbUy1Y4d2gZt9tTYcNX7bF2Tv3d4Nb6KYKKhZn8mVQAMeFfV8vBXpXJZYrY9GMxnWpwfFJzq";

let fractionMint = 'APMzfsVEfFwkCJkDk7EEUnMXWHAgueBbrDJBmotA4tQP';
let fractionTreasury = 'rDnVs2SECENHBuChv98bKv2AeQmzCPJxXp6MfgY1RDv';
let redeemTreasury = 'FKqfgZPjAwnVB4pnsNvFvvKHPzuZSDHhxQYyXziDiHBe';
let vault = 'EV2bzBQwHHwn3Fqc3VBXEvFBGrM8RWFJrtgpyPySmJBS';

let tokenAddress_edition = '41HT2FWnAVzYmdc2htGhmFXwd2fc5tFPF1EEK4xP2MFv';
let metadata_metadata = 'FtivWBvuSYSAQLQ3A9VjQqJaHLu8nNcMPQE1vhm3FdY9';
let tokenMint_mint = 'E9R53q7kjsZ18zLBX8xkLTZPBweZm9waLTSSVeqKy9NF';


const addObjectToIPFS = (obj) => {
  var myHeaders = new Headers();
  const code = crypto.randomBytes(4).toString('hex')
  var formdata = new FormData();
  const str = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(str);
  const blob = new Blob([bytes], {
      type: "application/json;charset=utf-8"
  });
  formdata.append("", blob, `metadata_${code}.json`);

  var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: formdata,
      redirect: 'follow',
  };

  return fetch("https://ipfs.infura.io:5001/api/v0/add", requestOptions)
  .then(response => response.text())
  .then(result => {console.log(result); return result})
  .catch(error => {console.log('error', error); return error});
}



export default function MetaplexTest(){


  const createStore = async () => {
    let connection = new Connection(clusterApiUrl("devnet"));
    const wallet = getPhantomWallet();
    console.log(wallet);
    await wallet.adapter.connect();
    // await adapter.connect();
    console.log(wallet.adapter._publicKey);
    let w = wallet.adapter._wallet.publicKey.toString();
    let signT = wallet.adapter._wallet.signTransaction;
    let signAllT = wallet.adapter._wallet.signAllTransactions;
    let wlt = {
      publicKey: new PublicKey(w),
      signTransaction: signT,
      signAllTransactions: signAllT
    };
    console.log(wlt);
    console.log(wlt.publicKey);
    const s = await actions.initStore({
      connection,
      wallet: wlt,
    });
    console.log(s);
  }

  const mintNftt = async () => {
    let arv = "https://ipfs.io/ipfs/QmYYKmR8KXpPuaYbiSfAGqbYYA7PnDHhqXZ8RfgngrV4os";
    let connection = new Connection(clusterApiUrl("devnet"));
    const wallet = getPhantomWallet();
    console.log(wallet);
    await wallet.adapter.connect();
    // await adapter.connect();
    console.log(wallet.adapter._publicKey);
    let w = wallet.adapter._wallet.publicKey.toString();
    let signT = wallet.adapter._wallet.signTransaction;
    let signAllT = wallet.adapter._wallet.signAllTransactions;
    let wlt = {
      publicKey: new PublicKey(w),
      signTransaction: signT,
      signAllTransactions: signAllT
    };
    console.log(wlt);
    console.log(wlt.publicKey);
    let s = await actions.mintNFT({
      connection,
      wallet: wlt,
      uri: arv,
      maxSupply: 1
    });
    console.log(s);
    console.log(s.edition.toBase58());
    console.log(s.metadata.toBase58());
    console.log(s.mint.toBase58());

  }
  
  const addIpfs = async () => {
    let res = await addObjectToIPFS({
      "name": "1",
      "symbol": "",
      "image": "https://www.arweave.net/JPU6SII4ydeunkDdR0E55zpqBgD2xkI7DnX2Z1WhuJc?ext=png",
      "properties": {
      "files": [
      {
      "uri": "https://www.arweave.net/JPU6SII4ydeunkDdR0E55zpqBgD2xkI7DnX2Z1WhuJc?ext=png",
      "type": "image/png"
      }
      ],
      "category": "image",
      "creators": [
      {
      "share": 100,
      "address": "rHETQthTcwEVwHCxj3YDGQcJCyFxCAn5QQmbgnMjYzq"
      }
      ]
      },
      "description": "",
      "seller_fee_basis_points": 500,
      "attributes": [
      {
      "trait_type": "background",
      "value": "blue"
      },
      {
      "trait_type": "eyes",
      "value": "star-eyes"
      },
      {
      "trait_type": "mouth",
      "value": "triangle-mouth"
      },
      {
      "trait_type": "face",
      "value": "teal-face"
      }
      ],
      "collection": {}
    });
    console.log(res);
  }

  const createPA = async () => {
    let connection = new Connection(clusterApiUrl("devnet"));
    const wallet = getPhantomWallet();
    console.log(wallet);
    await wallet.adapter.connect();
    // await adapter.connect();
    console.log(wallet.adapter._publicKey);
    let w = wallet.adapter._wallet.publicKey.toString();
    let signT = wallet.adapter._wallet.signTransaction;
    let signAllT = wallet.adapter._wallet.signAllTransactions;
    let wlt = {
      publicKey: new PublicKey(w),
      signTransaction: signT,
      signAllTransactions: signAllT
    };
    console.log(wlt);
    let a = await actions.createExternalPriceAccount({
      connection,
      wallet: wlt
    });
    console.log(a);
    console.log(a.externalPriceAccount.toBase58(), a.priceMint.toBase58());
  }

  const createVault = async () => {
    let connection = new Connection(clusterApiUrl("devnet"));
    const wallet = getPhantomWallet();
    console.log(wallet);
    await wallet.adapter.connect();
    // await adapter.connect();
    console.log(wallet.adapter._publicKey);
    let w = wallet.adapter._wallet.publicKey.toString();
    let signT = wallet.adapter._wallet.signTransaction;
    let signAllT = wallet.adapter._wallet.signAllTransactions;
    let wlt = {
      publicKey: new PublicKey(w),
      signTransaction: signT,
      signAllTransactions: signAllT
    };
    console.log(wlt);
    let a = await actions.createVault({
      connection,
      wallet: wlt,
      priceMint: new PublicKey(pricemint),
      externalPriceAccount: new PublicKey(extpriceaccount)
    });
    console.log(a);
    console.log(a.fractionMint.toBase58());
    console.log(a.fractionTreasury.toBase58());
    console.log(a.redeemTreasury.toBase58());
    console.log(a.vault.toBase58());
  }

  const addToVault = async () => {
    let connection = new Connection(clusterApiUrl("devnet"));
    const wallet = getPhantomWallet();
    console.log(wallet);
    await wallet.adapter.connect();
    // await adapter.connect();
    console.log(wallet.adapter._publicKey);
    let w = wallet.adapter._wallet.publicKey.toString();
    let signT = wallet.adapter._wallet.signTransaction;
    let signAllT = wallet.adapter._wallet.signAllTransactions;
    let wlt = {
      publicKey: new PublicKey(w),
      signTransaction: signT,
      signAllTransactions: signAllT
    };
    console.log(new BN(1000, 10));
    let ppp = new BN(1000, 10);
    console.log(ppp.toNumber())
    console.log(wlt, );
    let a = await actions.addTokensToVault({
      connection,
      wallet: wlt,
      vault: new PublicKey(vault),
      nfts: [{
        tokenAccount: new PublicKey('4ky2NDiJXncQ78doTbfQnSoW85Ec1S7jp7fUih6cGoS2'),
        tokenMint: new PublicKey('E9R53q7kjsZ18zLBX8xkLTZPBweZm9waLTSSVeqKy9NF'),
        amount: new BN(1.1, 10)
      }]
    });
    console.log(a);
  } 

  return(
    <button onClick={addToVault}>
      Create Store
    </button>
    
  );
}
