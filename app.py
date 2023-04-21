from flask import Flask, render_template, request, jsonify
from time import time
import json
import hashlib

app = Flask(__name__)

class MushroomCoin:
    def __init__(self):
        self.blockchain = []
        self.transactions = []
        self.difficulty = 2
        self.miner_reward = 10
        self.block_reward = 1

        self.create_genesis_block()

    def create_genesis_block(self):
        # Create the first block with a random hash
        block = {
            'index': 0,
            'timestamp': time(),
            'transactions': [],
            'nonce': 0,
            'previous_hash': '0' * self.difficulty
        }
        self.blockchain.append(block)

    def add_transaction(self, sender, receiver, amount):
        # Add a new transaction to the list of transactions
        self.transactions.append({
            'sender': sender,
            'receiver': receiver,
            'amount': amount
        })

    def mine_block(self, miner_address):
        # Create a new block and add it to the blockchain
        block = {
            'index': len(self.blockchain),
            'timestamp': time(),
            'transactions': self.transactions,
            'nonce': 0,
            'previous_hash': self.get_latest_block()['hash']
        }
        block['hash'] = self.calculate_hash(block)
        self.blockchain.append(block)

        # Reward the miner
        self.add_transaction('', miner_address, self.miner_reward)

        # Clear the list of transactions
        self.transactions = []

    def get_latest_block(self):
        # Return the latest block in the blockchain
        return self.blockchain[-1]

    def calculate_hash(self, block):
        # Calculate the SHA-256 hash of a block
        block_string = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    def proof_of_work(self, block):
        # Find a nonce that makes the block's hash start with the required number of zeros
        while self.calculate_hash(block)[:self.difficulty] != '0' * self.difficulty:
            block['nonce'] += 1
        return block

    def is_valid_chain(self):
        # Check that the blockchain is valid
        for i in range(1, len(self.blockchain)):
            current_block = self.blockchain[i]
            previous_block = self.blockchain[i - 1]

            # Check that the block's hash is correct
            if current_block['hash'] != self.calculate_hash(current_block):
                return False

            # Check that the block's previous_hash points to the previous block's hash
            if current_block['previous_hash'] != previous_block['hash']:
                return False

        return True
 
coin = MushroomCoin()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/mine', methods=['POST'])
def mine():
    miner_address = request.form.get('miner_address')
    if miner_address:
        coin.mine_block(miner_address)
        response = {
            'message': 'Block mined successfully.',
            'block': coin.get_latest_block()
        }
        return jsonify(response), 200
    else:
        return jsonify({'message': 'Miner address is required.'}), 400

@app.route('/transactions/new', methods=['POST'])
def new_transaction():
    sender = request.form.get('sender')
    receiver = request.form.get('receiver')
    amount = request.form.get('amount')

    if sender and receiver and amount:
        coin.add_transaction(sender, receiver, float(amount))
        response = {'message': 'Transaction added.'}
        return jsonify(response), 201
    else:
        return jsonify({'message': 'Invalid transaction data.'}), 400

@app.route('/chain', methods=['GET'])
def full_chain():
    response = {
        'chain': coin.blockchain,
        'length': len(coin.blockchain)
    }
    return jsonify(response), 200

if __name__ == '__main__':
    app.run(debug=True)
