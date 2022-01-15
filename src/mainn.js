import React, { useState, useEffect } from 'react';
import axios from 'axios'
import { Connection, clusterApiUrl, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getParsedNftAccountsByOwner,isValidSolanaAddress, createConnectionConfig,} from "@nfteyez/sol-rayz";


export default function Mainn(){
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

  async function transferSOL() {
    // Detecing and storing the phantom wallet of the user (creator in this case)
    var provider = await getProvider();
    console.log("Public key of the emitter: ",provider.publicKey.toString());

    // Establishing connection
    var connection = new Connection(
      clusterApiUrl('devnet'),
    );

    // I have hardcoded my secondary wallet address here. You can take this address either from user input or your DB or wherever
    var recieverWallet = new PublicKey("rHETQthTcwEVwHCxj3YDGQcJCyFxCAn5QQmbgnMjYzq");

    // Airdrop some SOL to the sender's wallet, so that it can handle the txn fee
    // var airdropSignature = await connection.requestAirdrop(
    //   provider.publicKey,
    //   web3.LAMPORTS_PER_SOL,
    // );

    // // Confirming that the airdrop went through
    // await connection.confirmTransaction(airdropSignature);
    // console.log("Airdropped");

    var transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: recieverWallet,
        lamports: LAMPORTS_PER_SOL/(1000) //Investing 1 SOL. Remember 1 Lamport = 10^-9 SOL.
      }),
    );

    // Setting the variables for the transaction
    transaction.feePayer = await provider.publicKey;
    let blockhashObj = await connection.getRecentBlockhash();
    transaction.recentBlockhash = await blockhashObj.blockhash;

    // Transaction constructor initialized successfully
    if(transaction) {
      console.log("Txn created successfully");
    }
    
    // Request creator to sign the transaction (allow the transaction)
    let signed = await provider.signTransaction(transaction);
    // The signature is generated
    let signature = await connection.sendRawTransaction(signed.serialize());
    // Confirm whether the transaction went through or not
    await connection.confirmTransaction(signature);

    //Signature chhap diya idhar
    console.log("Signature: ", signature);
  }
  
  const getAllNftData = async () => {
    try {
      if (connectedAddr) {
        const connect = createConnectionConfig(clusterApiUrl("devnet"));
        const provider = getProvider();
        let ownerToken = provider.publicKey;
        const result = isValidSolanaAddress(ownerToken);
        console.log("result", result);
        const nfts = await getParsedNftAccountsByOwner({
          publicAddress: ownerToken,
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
  
  return (
    <>
      <section className="nft mt-2 my-5">
        <div className="container">
          <div className="row text-center">
            <div className="col-12">
              <h4 className="title">NFT</h4>
            </div>
            <div className="col-12">
              <button onClick={connectWallet}>connectttt first</button>
            </div>
            
            <div className="col-12">
              <p >Address: {connectedAddr.toString()}</p>
              <button onClick={transferSOL}>Transfer</button>
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