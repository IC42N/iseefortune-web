# ISeeFortune - Epoch-Based Prediction Game on Solana

ISeeFortune is a epoch-based prediction game built on Solana.

Players place predictions on numbers within tiered games and compete for
pooled rewards. Outcomes are derived deterministically from finalized
Solana data ensuring transparency and verifiability without relying
on off-chain randomness.

This project combines on-chain logic, serverless infrastructure, and
real-time UI into a fast, transparent, and provably fair experience.

------------------------------------------------------------------------

## How It Works

-   The game runs in epochs.
-   Players:
    -   Place a prediction on a number
    -   Stake SOL within tier limits
    -   Adjust stake or change numbers before cutoff

When an epoch ends:
- A winning number is deterministically derived from
finalized Solana data. 
- Rewards are distributed on-chain.

All core game logic is enforced on Solana.

------------------------------------------------------------------------

## Core Concepts

### Epochs

An epoch defines: 
- A valid betting window 
- A cutoff boundary 
- A deterministic resolution event

### Tiers

Each tier operates independently with: 
- Separate stake limits 
- Separate reward pools 
- Separate activity streams

### Predictions

Players may: 
- Place a new prediction 
- Increase stake 
- Change their selected number (before cutoff)

All actions are recorded on-chain.

------------------------------------------------------------------------

## Tier-Based Live Interaction

Chat and activity feeds are gated by on-chain participation.
Only verified players who have placed a prediction in a tier can
participate in its live chat.

Access is granted only after on-chain transaction verification.
No client-side trust assumptions are used.

------------------------------------------------------------------------

## Architecture Overview

### On-Chain

-   Anchor program
-   Deterministic epoch resolution
-   Transparent, verifiable state

### Backend

-   Serverless transaction verification
-   Auth token issuance
-   Tier participation validation

### Frontend

-   Next.js (App Router)
-   Solana Wallet Adapter
-   Real-time UI updates
-   Smooth, non-blocking interaction

------------------------------------------------------------------------

## Security Principles

-   Zero trust game results
-   All game logic enforced on-chain
-   Minimal public identity exposure

------------------------------------------------------------------------

## Tech Stack

-   Solana / Anchor
-   AWS Serverless Game Engine (Rust microservices)
-   Next.js
-   Firebase Firestore (Activity Feed)


------------------------------------------------------------------------

## Running Locally

``` bash
cp .env.example .env.local
npm install
npm run dev
```

## Creator

Built by Leo\
Focused on fairness, transparency, and deterministic on-chain systems.
