import React, { useState, useEffect } from 'react';
import { PublicKey, Connection, clusterApiUrl, Keypair, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {Token, TOKEN_PROGRAM_ID, } from '@solana/spl-token';
import axios from 'axios'
import { getParsedNftAccountsByOwner,isValidSolanaAddress, createConnectionConfig,} from "@nfteyez/sol-rayz";



export default function CreateToken(){

  async function mintingProcess(){
    // Connect to cluster
    var connection = new Connection(
      clusterApiUrl("devnet"),
      'confirmed',
    );
  
    // Generate a new wallet keypair and airdrop SOL
    var fromWallet = Keypair.generate();
    console.log(fromWallet);
    var fromAirdropSignature = await connection.requestAirdrop(
      fromWallet.publicKey,
      LAMPORTS_PER_SOL,
    );
    //wait for airdrop confirmation
    await connection.confirmTransaction(fromAirdropSignature);
  
    //create new token mint
    let mint = await Token.createMint(
      connection,
      fromWallet,
      fromWallet.publicKey,
      null,
      9,
      TOKEN_PROGRAM_ID,
    );
  
    //get the token account of the fromWallet Solana address, if it does not exist, create it
    let fromTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      fromWallet.publicKey,
    );
  
    // Generate a new wallet to receive newly minted token
    var toWallet = await window.solana.connect();
    console.log(toWallet);
  
    //get the token account of the toWallet Solana address, if it does not exist, create it
    var toTokenAccount = await mint.getOrCreateAssociatedAccountInfo(
      toWallet.publicKey,
    );
  
    //minting 1 new token to the "fromTokenAccount" account we just returned/created
    await mint.mintTo(
      fromTokenAccount.address, //who it goes to
      fromWallet.publicKey, // minting authority
      [], // multisig
      1000000000, // how many
    );
  
    await mint.setAuthority(
      mint.publicKey,
      null,
      "MintTokens",
      fromWallet.publicKey,
      []
    )
  
    // Add token transfer instructions to transaction
    var transaction = new Transaction().add(
      Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        [],
        1,
      ),
    );
  
    // Sign transaction, broadcast, and confirm
    var signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet],
      {commitment: 'confirmed'},
    );
    console.log('SIGNATURE', signature);
  }

  async function transfer(tokenMintAddress, wallet, to, connection, amount) {
    const mintPublicKey = new PublicKey(tokenMintAddress);    
    const mintToken = new Token(
      connection,
      mintPublicKey,
      TOKEN_PROGRAM_ID,
      wallet.payer // the wallet owner will pay to transfer and to create recipients associated token account if it does not yet exist.
    );
          
    const fromTokenAccount = await mintToken.getOrCreateAssociatedAccountInfo(
      wallet.publicKey
    );
  
    const destPublicKey = new PublicKey(to);
  
    // Get the derived address of the destination wallet which will hold the custom token
    const associatedDestinationTokenAddr = await Token.getAssociatedTokenAddress(
      mintToken.associatedProgramId,
      mintToken.programId,
      mintPublicKey,
      destPublicKey
    );
  
    const receiverAccount = await connection.getAccountInfo(associatedDestinationTokenAddr);
          
    const instructions = [];  
  
    if (receiverAccount === null) {
  
      instructions.push(
        Token.createAssociatedTokenAccountInstruction(
          mintToken.associatedProgramId,
          mintToken.programId,
          mintPublicKey,
          associatedDestinationTokenAddr,
          destPublicKey,
          wallet.publicKey
        )
      )
  
    }
    
    instructions.push(
      Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        fromTokenAccount.address,
        associatedDestinationTokenAddr,
        wallet.publicKey,
        [],
        amount
      )
    );
  
    const transaction = new Transaction().add(...instructions);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    
    const transactionSignature = await connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: true }
    );
  
    await connection.confirmTransaction(transactionSignature);
  }

  const [nftData, setNftData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectedAddr, setAddrs] = useState('');

  //Define createConnection function here
  const createConnection = () => {
    return new Connection(clusterApiUrl("devnet"));
  };

  const connectWallet = async () => {
    let resp = await window.solana.connect();
    setAddrs(resp.publicKey);
  }



  //Define getProvider function here
  const getProvider = () => {
    if ("solana" in window) {
    const provider = window.solana;
    if (provider.isPhantom) {
      return provider;
     }
    }
  };
  
  const getAllNftData = async () => {
    try {
      if (connectedAddr) {
        const connect = createConnectionConfig(clusterApiUrl("devnet"));
        const provider = getProvider();
        let ownerToken = provider.publicKey;
        const result = isValidSolanaAddress('5epMEec3BoNPvrvHB8frEvM75kRzDgmeS8WZrUG6p3Z9');
        console.log("result", result);
        const nfts = await getParsedNftAccountsByOwner({
          publicAddress: '5epMEec3BoNPvrvHB8frEvM75kRzDgmeS8WZrUG6p3Z9',
          connection: connect,
          serialization: true,
        });
        return nfts;
      }
    } catch (error) {
      console.log(error);
    }
  };
  
  //Define getAllNftData function here
  const getNftTokenData = async () => {
    try {
      let nftData = await getAllNftData();
      console.log(nftData)
      var data = Object.keys(nftData).map((key) => nftData[key]);                                                                   
      let arr = [];
      let n = data.length;
      for (let i = 0; i < n; i++) {
        console.log(data[i].data.uri);
        let val = await axios.get(data[i].data.uri);
        arr.push(val);
      }
      return arr;
    } catch (error) {
      console.log(error);
    }
  };
  
  useEffect(() => {
    async function data() {
      let res = await getNftTokenData();
      setNftData(res);
      setLoading(true);
    }
    data();
  }, [connectedAddr]);
  
  

  return(
    <>
      <button onClick={mintingProcess}>Create</button>
      <section className="nft mt-2 my-5">
        <div className="container">
          <div className="row text-center">
            <div className="col-12">
              <h4 className="title">NFT</h4>
            </div>
            <div className="col-12">
              <button onClick={connectWallet}>connect first</button>
            </div>
            
            <div className="col-12">
              <p >Address: {connectedAddr.toString()}</p>
            </div>
          </div>
          <div className="row  d-flex justify-content-center">
            {loading ? (
              <>
                {nftData &&
                  nftData.length > 0 &&
                  nftData.map((val, ind) => {
                    return (
                      <div className="col-4 mt-3" key={ind}>
                        <div className="cart text-center">
                          <div className="img mt-4 pt-3">
                            <img src={val.data.image} alt="loading..." />
                            <p className="mt-1">{val.data.name}</p>
                            <h6 className=" mt-2">
                              {val.data.description}
                            </h6>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>
            ) : (
              <>
                <p className="text-center">loading...</p>
              </>
            )}
          </div>
        </div>
      </section>
    </>

    );
}