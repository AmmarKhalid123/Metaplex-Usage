import React, { FC, useMemo } from 'react';
// import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
// import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
// import {
//     getLedgerWallet,
//     getPhantomWallet,
//     getSlopeWallet,
//     getSolflareWallet,
//     getSolletExtensionWallet,
//     getSolletWallet,
//     getTorusWallet,
// } from '@solana/wallet-adapter-wallets';
// import {
//     WalletModalProvider,
//     WalletDisconnectButton,
//     WalletMultiButton
// } from '@solana/wallet-adapter-react-ui';
// import { clusterApiUrl } from '@solana/web3.js';
// import { HashRouter, Route, Routes } from 'react-router-dom';
import Mainn from './mainn';
import CreateToken from './createtoken';
import MetaplexTest from './metaplextest';
// Default styles that can be overridden by your app
// require('@solana/wallet-adapter-react-ui/styles.css');

// function AppLayout(props){
//     return(
//         <div id='applayout'>
//             {props.children}
//         </div>
//     );
// }


// function WalletMain ({children}) {
//     // // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
//     const network = WalletAdapterNetwork.Testnet;

//     // // You can also provide a custom RPC endpoint
//     const endpoint = useMemo(() => clusterApiUrl(network), [network]);

//     // // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
//     // // Only the wallets you configure here will be compiled into your application, and only the dependencies
//     // // of wallets that your users connect to will be loaded
//     const wallets = useMemo(
//         () => [
//             getPhantomWallet(),
//             // getSlopeWallet(),
//             // getSolflareWallet(),
//             // getTorusWallet(),
//             // getLedgerWallet(),
//             // getSolletWallet({ network }),
//             // getSolletExtensionWallet({ network }),
//         ],
//         [network]
//     );

//     return (
//         <ConnectionProvider endpoint={endpoint}>
//             <WalletProvider wallets={wallets} autoConnect>
//                 <WalletModalProvider>
//                     <AppLayout>{children}</AppLayout>
//                 </WalletModalProvider>
//             </WalletProvider>
//         </ConnectionProvider>
//     );
// };

// function MainCopy(){
//     return(
//         <div>
//         <WalletMultiButton />
//         <WalletDisconnectButton />
//         </div>

//     );
// }


export default function App(){
    
    return(
        <MetaplexTest/>
        // <WalletMain basename={'/'}>
        //     <HashRouter>
        //         <Routes>
        //         <Route exact
        //         path="/"
        //         component={() => <div>aa</div>  } />
        //         </Routes>
        //     </HashRouter>
        // </WalletMain>
    );
}