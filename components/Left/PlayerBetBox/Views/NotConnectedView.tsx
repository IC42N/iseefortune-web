"use client";

import styles from "../PlayerBetBox.module.scss";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function NotConnectedView() {
  return (
    <div className={styles.disconnected}>
      <div className={styles.msgTitle}>Connect your wallet to play</div>
      <div className={styles.msgSub}>Prediction must be placed before the cutoff</div>
      <div className={styles.connectWalletBox}><WalletMultiButton className="wallet-button" /></div>
    </div>
  );
}