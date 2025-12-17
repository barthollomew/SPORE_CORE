import { Injectable } from '@angular/core';
import SHA256 from 'crypto-js/sha256';

export interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  timestamp: number;
  note?: string;
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  nonce: number;
  previousHash: string;
  hash: string;
  miner: string;
  reward: number;
  difficulty: number;
}

@Injectable({
  providedIn: 'root',
})
export class BlockchainService {
  private chain: Block[] = [];
  private pendingTransactions: Transaction[] = [];

  private readonly difficulty = 3;
  private readonly minerReward = 12;

  constructor() {
    this.chain.push(this.createGenesisBlock());
  }

  getDifficulty(): number {
    return this.difficulty;
  }

  getReward(): number {
    return this.minerReward;
  }

  getChain(): Block[] {
    return [...this.chain];
  }

  getPendingTransactions(): Transaction[] {
    return [...this.pendingTransactions];
  }

  queueTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
    const numericAmount = Number(transaction.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error('Amount must be greater than zero.');
    }

    const record: Transaction = {
      ...transaction,
      amount: numericAmount,
      id: this.createId(),
      timestamp: Date.now(),
    };

    this.pendingTransactions = [...this.pendingTransactions, record];
    return record;
  }

  async mineBlock(minerAddress: string): Promise<Block> {
    const trimmedAddress = minerAddress.trim();
    if (!trimmedAddress) {
      throw new Error('Miner address is required.');
    }

    const reward: Transaction = {
      id: this.createId(),
      sender: 'network',
      receiver: trimmedAddress,
      amount: this.minerReward,
      timestamp: Date.now(),
      note: 'Miner reward',
    };

    const transactions = [...this.pendingTransactions, reward];
    const previousHash = this.chain.length
      ? this.chain[this.chain.length - 1].hash
      : '0'.repeat(64);

    const baseBlock: Omit<Block, 'hash' | 'nonce'> = {
      index: this.chain.length,
      timestamp: Date.now(),
      transactions,
      previousHash,
      miner: trimmedAddress,
      reward: this.minerReward,
      difficulty: this.difficulty,
    };

    const { hash, nonce } = await this.findProof(baseBlock);

    const block: Block = {
      ...baseBlock,
      nonce,
      hash,
    };

    this.chain = [...this.chain, block];
    this.pendingTransactions = [];

    return block;
  }

  isValid(): boolean {
    for (let i = 1; i < this.chain.length; i += 1) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.previousHash !== previous.hash) {
        return false;
      }

      if (current.hash !== this.calculateHash({ ...current })) {
        return false;
      }

      if (!current.hash.startsWith('0'.repeat(current.difficulty))) {
        return false;
      }
    }

    return true;
  }

  private createGenesisBlock(): Block {
    const seededTransactions: Transaction[] = [
      {
        id: this.createId(),
        sender: 'network',
        receiver: 'forest-treasury',
        amount: 50,
        timestamp: Date.now(),
        note: 'Genesis infusion',
      },
      {
        id: this.createId(),
        sender: 'forest-treasury',
        receiver: 'mycelium-research-lab',
        amount: 12,
        timestamp: Date.now(),
        note: 'Funding the first study',
      },
    ];

    const base: Omit<Block, 'hash'> = {
      index: 0,
      timestamp: Date.now(),
      transactions: seededTransactions,
      nonce: 0,
      previousHash: '0'.repeat(64),
      miner: 'mycelium-core',
      reward: this.minerReward,
      difficulty: this.difficulty,
    };

    const hash = this.calculateHash({ ...base });

    return { ...base, hash };
  }

  private async findProof(
    baseBlock: Omit<Block, 'hash' | 'nonce'>,
  ): Promise<{ hash: string; nonce: number }> {
    let nonce = 0;
    let hash = '';
    const prefix = '0'.repeat(this.difficulty);

    // Yield occasionally so the UI stays responsive while we hunt for a valid nonce.
    const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve));

    while (true) {
      const candidate = { ...baseBlock, nonce };
      hash = this.calculateHash(candidate);

      if (hash.startsWith(prefix)) {
        break;
      }

      nonce += 1;

      if (nonce % 500 === 0) {
        // eslint-disable-next-line no-await-in-loop
        await yieldToBrowser();
      }
    }

    return { hash, nonce };
  }

  private calculateHash(block: Omit<Block, 'hash'> & { hash?: string }): string {
    const { hash: _ignoredHash, ...cleanBlock } = block;
    return SHA256(JSON.stringify(cleanBlock)).toString();
  }

  private createId(): string {
    return typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2);
  }
}
