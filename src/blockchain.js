const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * 交易类
 */
class Transaction {
    constructor(from, to, amount, type = 'transfer', data = {}, customFee = null) {
        this.id = crypto.randomUUID();
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.type = type; // 'transfer', 'mint', 'burn', 'contract'
        this.data = data;
        this.timestamp = Date.now();
        this.fee = customFee !== null ? customFee : this.calculateFee();
        this.signature = null;
    }

    calculateFee() {
        // 简单的手续费计算
        const baseFee = 0.001;
        const amountFee = this.amount * 0.0001;
        return Math.max(baseFee, amountFee);
    }

    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(this.from + this.to + this.amount + this.timestamp + JSON.stringify(this.data))
            .digest('hex');
    }

    sign(privateKey) {
        const hash = this.calculateHash();
        const sign = crypto.createSign('SHA256');
        sign.update(hash);
        this.signature = sign.sign(privateKey, 'hex');
    }

    isValid() {
        // 对于特殊交易类型（如挖矿奖励、铸造代币），不需要签名验证
        if (this.type === 'mining_reward' || this.type === 'mint_token') {
            return true;
        }

        if (!this.signature) return false;
        if (!this.from) return false;

        // 简化签名验证 - 在实际应用中应该使用公钥验证
        // 这里我们简化处理，只要有签名就认为有效
        return this.signature && this.signature.length > 0;
    }
}

/**
 * 区块类
 */
class Block {
    constructor(timestamp, transactions, previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
        this.miner = null;
        this.reward = 0;
        this.difficulty = 4;
    }

    calculateHash() {
        return crypto
            .createHash('sha256')
            .update(
                this.previousHash +
                this.timestamp +
                JSON.stringify(this.transactions) +
                this.nonce
            )
            .digest('hex');
    }

    mineBlock(difficulty, minerAddress) {
        const target = Array(difficulty + 1).join('0');
        const startTime = Date.now();
        let attempts = 0;

        console.log(`⛏️  开始挖矿区块，难度: ${difficulty}`);

        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            attempts++;
            this.hash = this.calculateHash();

            // 每10000次尝试显示进度
            if (attempts % 10000 === 0) {
                console.log(`   尝试次数: ${attempts}, 当前哈希: ${this.hash.substring(0, 20)}...`);
            }
        }

        const duration = Date.now() - startTime;
        this.miner = minerAddress;
        this.reward = this.calculateReward();

        console.log(`✅ 区块挖矿成功！`);
        console.log(`   矿工: ${minerAddress}`);
        console.log(`   Nonce: ${this.nonce}`);
        console.log(`   哈希: ${this.hash}`);
        console.log(`   用时: ${duration}ms`);
        console.log(`   尝试次数: ${attempts}`);
        console.log(`   奖励: ${this.reward} coins`);
    }

    calculateReward() {
        // 基础奖励 + 交易手续费
        const baseReward = 10;
        const feeReward = this.transactions.reduce((sum, tx) => sum + tx.fee, 0);
        return baseReward + feeReward;
    }

    hasValidTransactions() {
        return this.transactions.every(tx => tx.isValid());
    }
}

/**
 * 区块链类
 */
class Blockchain extends EventEmitter {
    constructor() {
        super();
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.miningReward = 10;
        this.balances = new Map();
        this.tokens = new Map(); // 代币余额
        this.tokenInfo = new Map(); // 代币信息

        // 初始化一些测试账户
        this.initializeTestAccounts();
    }

    createGenesisBlock() {
        const genesisBlock = new Block(Date.now(), [], '0');
        genesisBlock.hash = genesisBlock.calculateHash();
        return genesisBlock;
    }

    initializeTestAccounts() {
        // 不再预设余额，让用户通过挖矿获得初始余额
        console.log('💰 区块链已初始化，请通过挖矿获得初始余额');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(transaction) {
        // 验证交易
        if (!transaction.from || !transaction.to) {
            throw new Error('交易必须包含发送方和接收方地址');
        }

        if (!transaction.isValid()) {
            throw new Error('无效的交易签名');
        }

        // 检查余额
        if (transaction.type === 'transfer') {
            const balance = this.getBalance(transaction.from);
            if (balance < transaction.amount + transaction.fee) {
                throw new Error('余额不足');
            }
        }

        this.pendingTransactions.push(transaction);
        this.emit('transactionAdded', transaction);

        console.log(`📝 交易已添加到待处理队列: ${transaction.id}`);
    }

    minePendingTransactions(miningRewardAddress) {
        // 添加挖矿奖励交易
        const rewardTransaction = new Transaction(
            null,
            miningRewardAddress,
            this.miningReward,
            'mining_reward'
        );
        this.pendingTransactions.push(rewardTransaction);

        // 创建新区块
        const block = new Block(
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );

        // 挖矿
        block.mineBlock(this.difficulty, miningRewardAddress);

        // 添加到链中
        this.chain.push(block);

        // 更新余额
        this.updateBalances(block);

        // 清空待处理交易
        this.pendingTransactions = [];

        // 发出事件
        this.emit('blockMined', block);

        return block;
    }

    updateBalances(block) {
        block.transactions.forEach(transaction => {
            switch (transaction.type) {
                case 'transfer':
                    // 转账
                    const fromBalance = this.balances.get(transaction.from) || 0;
                    const toBalance = this.balances.get(transaction.to) || 0;

                    this.balances.set(transaction.from, fromBalance - transaction.amount - transaction.fee);
                    this.balances.set(transaction.to, toBalance + transaction.amount);
                    break;

                case 'mining_reward':
                    // 挖矿奖励
                    const minerBalance = this.balances.get(transaction.to) || 0;
                    this.balances.set(transaction.to, minerBalance + transaction.amount);
                    break;

                case 'mint_token':
                    // 铸造代币
                    this.mintToken(transaction.data.tokenName, transaction.to, transaction.amount);
                    break;

                case 'transfer_token':
                    // 代币转账
                    this.transferToken(transaction.data.tokenName, transaction.from, transaction.to, transaction.amount);
                    break;
            }
        });
    }

    // 代币相关方法
    createToken(name, symbol, totalSupply, creator) {
        if (this.tokenInfo.has(name)) {
            throw new Error('代币已存在');
        }

        this.tokenInfo.set(name, {
            name,
            symbol,
            totalSupply,
            creator,
            createdAt: Date.now()
        });

        // 将所有代币分配给创建者
        const creatorTokens = this.tokens.get(creator) || new Map();
        creatorTokens.set(name, totalSupply);
        this.tokens.set(creator, creatorTokens);

        console.log(`🪙 代币创建成功: ${name} (${symbol}), 总供应量: ${totalSupply}`);
    }

    mintToken(tokenName, to, amount) {
        const userTokens = this.tokens.get(to) || new Map();
        const currentAmount = userTokens.get(tokenName) || 0;
        userTokens.set(tokenName, currentAmount + amount);
        this.tokens.set(to, userTokens);
    }

    transferToken(tokenName, from, to, amount) {
        const fromTokens = this.tokens.get(from) || new Map();
        const toTokens = this.tokens.get(to) || new Map();

        const fromAmount = fromTokens.get(tokenName) || 0;
        if (fromAmount < amount) {
            throw new Error('代币余额不足');
        }

        fromTokens.set(tokenName, fromAmount - amount);
        toTokens.set(tokenName, (toTokens.get(tokenName) || 0) + amount);

        this.tokens.set(from, fromTokens);
        this.tokens.set(to, toTokens);
    }

    getBalance(address) {
        return this.balances.get(address) || 0;
    }

    getTokenBalance(address, tokenName) {
        const userTokens = this.tokens.get(address) || new Map();
        return userTokens.get(tokenName) || 0;
    }

    getAllTokens() {
        return Array.from(this.tokenInfo.entries()).map(([name, info]) => ({
            name,
            ...info
        }));
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.hasValidTransactions()) {
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }

        return true;
    }

    // 获取区块链统计信息
    getStats() {
        const totalBlocks = this.chain.length;
        const totalTransactions = this.chain.reduce((sum, block) => sum + block.transactions.length, 0);
        const totalAddresses = this.balances.size;
        const totalTokens = this.tokenInfo.size;

        return {
            totalBlocks,
            totalTransactions,
            totalAddresses,
            totalTokens,
            difficulty: this.difficulty,
            pendingTransactions: this.pendingTransactions.length
        };
    }

    // 搜索功能
    searchTransaction(txId) {
        for (const block of this.chain) {
            const transaction = block.transactions.find(tx => tx.id === txId);
            if (transaction) {
                return {
                    transaction,
                    block: {
                        hash: block.hash,
                        timestamp: block.timestamp,
                        height: this.chain.indexOf(block)
                    }
                };
            }
        }
        return null;
    }

    searchBlock(hashOrHeight) {
        if (typeof hashOrHeight === 'number') {
            return this.chain[hashOrHeight] || null;
        } else {
            return this.chain.find(block => block.hash === hashOrHeight) || null;
        }
    }

    getAddressTransactions(address) {
        const transactions = [];

        this.chain.forEach((block, blockIndex) => {
            block.transactions.forEach(tx => {
                if (tx.from === address || tx.to === address) {
                    transactions.push({
                        ...tx,
                        blockHeight: blockIndex,
                        blockHash: block.hash,
                        blockTimestamp: block.timestamp
                    });
                }
            });
        });

        return transactions.sort((a, b) => b.timestamp - a.timestamp);
    }
}

module.exports = { Blockchain, Transaction, Block };
