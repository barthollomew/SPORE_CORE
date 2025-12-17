import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRow,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonToast,
} from '@ionic/angular/standalone';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Block, BlockchainService, Transaction } from '../../services/blockchain.service';
import { addIcons } from 'ionicons';
import { flash, planet, pulse, shieldCheckmark, sparkles } from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    IonAccordion,
    IonAccordionGroup,
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonRow,
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
  readonly difficulty = this.blockchain.getDifficulty();
  readonly minerReward = this.blockchain.getReward();

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

  readonly latestBlock = computed(() => {
    const chain = this.chain();
    return chain.length ? chain[chain.length - 1] : null;
  });

  readonly displayChain = computed(() =>
    [...this.chain()].sort((a, b) => b.index - a.index),
  );

  constructor() {
    addIcons({ sparkles, shieldCheckmark, flash, planet, pulse });
    this.refresh();
  }

  async onMineBlock(): Promise<void> {
    if (this.mineForm.invalid) {
      this.mineForm.markAllAsTouched();
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

  formatHash(hash: string): string {
    if (!hash) {
      return '';
    }
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  }

  chainIsHealthy(): boolean {
    return this.blockchain.isValid();
  }

  private refresh(): void {
    this.chain.set(this.blockchain.getChain());
    this.pending.set(this.blockchain.getPendingTransactions());
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
  }
}
