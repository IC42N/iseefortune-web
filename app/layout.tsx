import type { Metadata } from "next";
import { ReactNode } from "react";
import { Saira, Orbitron } from 'next/font/google';
import Providers from "@/components/Providers/Providers";

// Order matters here.
import "@solana/wallet-adapter-react-ui/styles.css";
import "../styles/global.scss";

export const metadata: Metadata = {
  title: "I See Fortune",
  description: "Epoch Game of the future",
};

// Site Logo
const title = Orbitron({
  weight: '800',
  variable: '--font-title'
});

// Main site font
const primary = Saira({
  weight: '400',
  variable: '--font-primary'
});


// const mono = JetBrains_Mono({
//   subsets: ["latin"],
//   variable: "--font-mono",
//   display: "swap",
// });

// const secondary = Lexend_Deca({
//   weight: ['400'],
//   variable: "--font-primary",
// });


export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${title.variable}  ${primary.variable} `}>
    <body className="root">
    <Providers>{children}</Providers>
    </body>
    </html>
  );
}