import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonToast,
} from '@ionic/angular/standalone';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Block, BlockchainService, Transaction } from '../../core/services/blockchain.service';

type MiningChallenge = {
  question: string;
  answer: number;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonModal,
    IonSpinner,
    IonTitle,
    IonToolbar,
    IonToast,
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly blockchain = inject(BlockchainService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly mineForm = this.fb.group({
    miner: ['0xforager', [Validators.required, Validators.minLength(4)]],
    solution: ['', [Validators.required]],
  });

  readonly transactionForm = this.fb.group({
    sender: ['forest-treasury', [Validators.required, Validators.minLength(3)]],
    receiver: ['grove-reserve', [Validators.required, Validators.minLength(3)]],
    amount: [5, [Validators.required, Validators.min(0.01)]],
    note: [''],
  });

  readonly chain = signal<Block[]>([]);
  readonly pending = signal<Transaction[]>([]);
  readonly mining = signal(false);
  readonly toastMessage = signal<string | null>(null);
  readonly guideOpen = signal(false);
  readonly difficulty = this.blockchain.getDifficulty();
  readonly minerReward = this.blockchain.getReward();
  readonly challenge = signal<MiningChallenge>(this.createChallenge());

  readonly stats = computed(() => {
    const chain = this.chain();
    const pending = this.pending();

    const minted = chain.reduce((sum, block) => {
      const blockMint = block.transactions
        .filter((tx) => tx.sender === 'network')
        .reduce((innerSum, tx) => innerSum + tx.amount, 0);
      return sum + blockMint;
    }, 0);

    const txCount = chain.reduce((sum, block) => sum + block.transactions.length, 0);

    return {
      height: chain.length,
      minted,
      txCount,
      pending: pending.length,
    };
  });

  readonly displayChain = computed(() =>
    [...this.chain()].sort((a, b) => b.index - a.index),
  );

  constructor() {
    this.refresh();
  }

  async onMineBlock(): Promise<void> {
    if (this.mining()) {
      return;
    }

    if (this.mineForm.controls.miner.invalid) {
      this.mineForm.controls.miner.markAsTouched();
      return;
    }

    if (!this.isChallengeSolved()) {
      this.mineForm.controls.solution.markAsTouched();
      this.showToast('Incorrect solution. New challenge issued.');
      this.resetChallenge();
      return;
    }

    const miner = this.mineForm.controls.miner.value.trim();
    this.mining.set(true);

    try {
      const block = await this.blockchain.mineBlock(miner);
      this.showToast(`Block #${block.index} mined for ${block.miner}`);
    } catch (error) {
      const message = (error as Error).message ?? 'Unable to mine block right now.';
      this.showToast(message);
    } finally {
      this.mining.set(false);
      this.resetChallenge();
      this.refresh();
    }
  }

  onCreateTransaction(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    const { sender, receiver, amount, note } = this.transactionForm.getRawValue();
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
      this.showToast('Enter a valid numeric amount.');
      return;
    }

    try {
      this.blockchain.queueTransaction({
        sender: sender.trim(),
        receiver: receiver.trim(),
        amount: numericAmount,
        note: note?.trim() ? note.trim() : undefined,
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Could not queue transaction.';
      this.showToast(message);
      return;
    }

    this.transactionForm.patchValue({ amount: 1, note: '' });
    this.showToast('Transaction queued for the next block.');
    this.refresh();
  }

  trackBlock(_: number, block: Block): string {
    return block.hash;
  }

  trackTransaction(_: number, tx: Transaction): string {
    return tx.id;
  }

  chainIsHealthy(): boolean {
    return this.blockchain.isValid();
  }

  isChallengeSolved(): boolean {
    const rawValue = this.mineForm.controls.solution.value;
    const trimmed = String(rawValue ?? '').trim();

    if (!trimmed) {
      return false;
    }

    const numericValue = Number(trimmed);
    return Number.isFinite(numericValue) && numericValue === this.challenge().answer;
  }

  challengeStatusMessage(): string {
    const rawValue = this.mineForm.controls.solution.value;
    const trimmed = String(rawValue ?? '').trim();

    if (!trimmed) {
      return '';
    }

    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue)) {
      return 'incorrect';
    }

    return numericValue === this.challenge().answer ? 'correct' : 'incorrect';
  }

  openGuide(): void {
    this.guideOpen.set(true);
  }

  closeGuide(): void {
    this.guideOpen.set(false);
  }

  refreshChallenge(): void {
    this.resetChallenge();
  }

  private refresh(): void {
    this.chain.set(this.blockchain.getChain());
    this.pending.set(this.blockchain.getPendingTransactions());
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
  }

  private resetChallenge(): void {
    this.challenge.set(this.createChallenge());
    this.mineForm.controls.solution.setValue('');
    this.mineForm.controls.solution.markAsPristine();
  }

  private createChallenge(): MiningChallenge {
    const left = this.randomInt(1, 9);
    const right = this.randomInt(1, 9);

    return {
      question: `${left} + ${right}`,
      answer: left + right,
    };
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
