from flask import Flask, render_template, request, jsonify
from time import time
import json
import hashlib

app = Flask(__name__)

# Define a class to represent the MushroomCoin blockchain
class MushroomCoin:
    def __init__(self):
        # Initialize the blockchain, transactions list, and set mining difficulty and rewards
        self.blockchain = []
        self.transactions = []
        self.difficulty = 2
        self.miner_reward = 10
        self.block_reward = 1

        # Create the genesis block
        self.create_genesis_block()

    def create_genesis_block(self):
        # Create and append the genesis block to the blockchain
        block = {
            'index': 0,
            'timestamp': time(),
            'transactions': [],
            'nonce': 0,
            'previous_hash': '0' * self.difficulty
        }
        self.blockchain.append(block)

    def add_transaction(self, sender, receiver, amount):
        # Add a new transaction to the transactions list
        self.transactions.append({
            'sender': sender,
            'receiver': receiver,
            'amount': amount
        })

    def mine_block(self, miner_address):
        # Mine a new block and add it to the blockchain
        block = {
            'index': len(self.blockchain),
            'timestamp': time(),
            'transactions': self.transactions,
            'nonce': 0,
            'previous_hash': self.get_latest_block()['hash']
        }
        block['hash'] = self.calculate_hash(block)
        self.blockchain.append(block)

        # Reward the miner and reset the transactions list
        self.add_transaction('', miner_address, self.miner_reward)
        self.transactions = []

    def get_latest_block(self):
        # Return the most recently added block in the blockchain
        return self.blockchain[-1]

    def calculate_hash(self, block):
        # Compute and return the SHA-256 hash of a block
        block_string = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    def proof_of_work(self, block):
        # Find a valid nonce such that the hash of the block satisfies the difficulty requirement
        while self.calculate_hash(block)[:self.difficulty] != '0' * self.difficulty:
            block['nonce'] += 1
        return block

    def is_valid_chain(self):
        # Validate the blockchain: Ensure each block's hash and previous_hash are correct
        for i in range(1, len(self.blockchain)):
            current_block = self.blockchain[i]
            previous_block = self.blockchain[i - 1]

            if current_block['hash'] != self.calculate_hash(current_block):
                return False
            if current_block['previous_hash'] != previous_block['hash']:
                return False

        return True

coin = MushroomCoin()

@app.route('/')
def index():
    return render_template('index.html')

# Define route to mine a new block
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

# Define route to create a new transaction
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
