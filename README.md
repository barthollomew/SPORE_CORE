# Mushroom Coin

Mushroom Coin is a decentralised cryptocurrency implementation built for educational purposes. It runs entirely in the browser and demonstrates mining, transactions, and block validation with a simple proof of work chain. It is not intended for production use or real funds.

## Features
- Proof of work mining with miner rewards
- Pending transaction queue and block creation
- Block explorer view of hashes, nonces, and transactions
- Ionic UI built on Angular standalone components

## Tech stack
- Angular
- Ionic
- TypeScript
- crypto-js for hashing

## Project structure
- src/app/core: singleton services and application wide logic
- src/app/features: route level pages and feature areas
- src/app/theme: Ionic theme variables
- src/assets: static assets
- public: static assets copied at build time

## Run locally
- npm install
- npm start
- open http://localhost:4200

## Build
- npm run build

## Notes
- Chain data lives in memory and resets on refresh.
- There is no real network, wallet, or persistent storage.
