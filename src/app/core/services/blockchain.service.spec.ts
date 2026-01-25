import { BlockchainService } from './blockchain.service';

describe('BlockchainService', () => {
  let service: BlockchainService;

  beforeEach(() => {
    service = new BlockchainService();
  });

  it('queues a trimmed transaction', () => {
    const queued = service.queueTransaction({
      sender: '  forest-treasury  ',
      receiver: '  grove-reserve ',
      amount: 12.5,
      note: '  for spores  ',
    });

    expect(queued.sender).toBe('forest-treasury');
    expect(queued.receiver).toBe('grove-reserve');
    expect(queued.amount).toBe(12.5);
    expect(queued.note).toBe('for spores');
    expect(service.getPendingTransactions()).toEqual([queued]);
  });

  it('rejects blank senders or receivers', () => {
    expect(() =>
      service.queueTransaction({
        sender: '   ',
        receiver: 'grove-reserve',
        amount: 5,
      }),
    ).toThrowError('Sender is required.');

    expect(() =>
      service.queueTransaction({
        sender: 'forest-treasury',
        receiver: '   ',
        amount: 5,
      }),
    ).toThrowError('Receiver is required.');
  });
});
