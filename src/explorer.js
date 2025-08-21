const express = require('express');
const path = require('path');
const cors = require('cors');

/**
 * 区块链浏览器类
 */
class BlockchainExplorer {
    constructor(blockchain, port = 3000) {
        this.blockchain = blockchain;
        this.port = port;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    setupRoutes() {
        // 首页 - 区块链概览
        this.app.get('/api/overview', (req, res) => {
            const stats = this.blockchain.getStats();
            const latestBlocks = this.blockchain.chain.slice(-5).reverse();

            res.json({
                stats,
                latestBlocks: latestBlocks.map(block => ({
                    height: this.blockchain.chain.indexOf(block),
                    hash: block.hash,
                    timestamp: block.timestamp,
                    transactionCount: block.transactions.length,
                    miner: block.miner,
                    reward: block.reward
                }))
            });
        });

        // 获取所有区块
        this.app.get('/api/blocks', (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;

            const blocks = this.blockchain.chain
                .slice()
                .reverse()
                .slice(startIndex, endIndex)
                .map((block, index) => ({
                    height: this.blockchain.chain.length - 1 - startIndex - index,
                    hash: block.hash,
                    previousHash: block.previousHash,
                    timestamp: block.timestamp,
                    transactionCount: block.transactions.length,
                    miner: block.miner,
                    reward: block.reward,
                    nonce: block.nonce,
                    difficulty: block.difficulty || this.blockchain.difficulty
                }));

            res.json({
                blocks,
                totalBlocks: this.blockchain.chain.length,
                currentPage: page,
                totalPages: Math.ceil(this.blockchain.chain.length / limit)
            });
        });

        // 获取特定区块详情
        this.app.get('/api/block/:hashOrHeight', (req, res) => {
            const { hashOrHeight } = req.params;
            let block;
            let height;

            if (isNaN(hashOrHeight)) {
                // 按哈希搜索
                block = this.blockchain.searchBlock(hashOrHeight);
                height = block ? this.blockchain.chain.indexOf(block) : -1;
            } else {
                // 按高度搜索
                height = parseInt(hashOrHeight);
                block = this.blockchain.searchBlock(height);
            }

            if (!block) {
                return res.status(404).json({ error: '区块未找到' });
            }

            res.json({
                height,
                hash: block.hash,
                previousHash: block.previousHash,
                timestamp: block.timestamp,
                miner: block.miner,
                reward: block.reward,
                nonce: block.nonce,
                difficulty: block.difficulty || this.blockchain.difficulty,
                transactions: block.transactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    from: tx.from,
                    to: tx.to,
                    amount: tx.amount,
                    fee: tx.fee,
                    timestamp: tx.timestamp,
                    data: tx.data
                }))
            });
        });

        // 获取所有交易
        this.app.get('/api/transactions', (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const startIndex = (page - 1) * limit;

            const allTransactions = [];
            this.blockchain.chain.forEach((block, blockIndex) => {
                block.transactions.forEach(tx => {
                    allTransactions.push({
                        ...tx,
                        blockHeight: blockIndex,
                        blockHash: block.hash,
                        blockTimestamp: block.timestamp
                    });
                });
            });

            const sortedTransactions = allTransactions
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(startIndex, startIndex + limit);

            res.json({
                transactions: sortedTransactions,
                totalTransactions: allTransactions.length,
                currentPage: page,
                totalPages: Math.ceil(allTransactions.length / limit)
            });
        });

        // 获取特定交易详情
        this.app.get('/api/transaction/:txId', (req, res) => {
            const { txId } = req.params;
            const result = this.blockchain.searchTransaction(txId);

            if (!result) {
                return res.status(404).json({ error: '交易未找到' });
            }

            res.json({
                transaction: result.transaction,
                block: result.block
            });
        });

        // 获取地址信息
        this.app.get('/api/address/:address', (req, res) => {
            const { address } = req.params;
            const balance = this.blockchain.getBalance(address);
            const transactions = this.blockchain.getAddressTransactions(address);

            // 获取代币余额
            const tokenBalances = [];
            const userTokens = this.blockchain.tokens.get(address);
            if (userTokens) {
                for (const [tokenName, amount] of userTokens) {
                    const tokenInfo = this.blockchain.tokenInfo.get(tokenName);
                    tokenBalances.push({
                        name: tokenName,
                        symbol: tokenInfo?.symbol || tokenName,
                        balance: amount
                    });
                }
            }

            res.json({
                address,
                balance,
                tokenBalances,
                transactionCount: transactions.length,
                transactions: transactions.slice(0, 20) // 最近20笔交易
            });
        });

        // 获取所有代币
        this.app.get('/api/tokens', (req, res) => {
            const tokens = this.blockchain.getAllTokens();
            res.json({ tokens });
        });

        // 获取钱包列表
        this.app.get('/api/wallets', (req, res) => {
            // 这里需要从钱包管理器获取钱包列表
            // 由于我们没有直接访问钱包管理器，我们返回默认钱包
            const wallets = [
                { name: 'alice', address: this.getWalletAddress('alice') },
                { name: 'bob', address: this.getWalletAddress('bob') },
                { name: 'charlie', address: this.getWalletAddress('charlie') }
            ];
            res.json({ wallets });
        });

        // 转账API
        this.app.post('/api/transfer', (req, res) => {
            try {
                const { from, to, amount, customFee } = req.body;

                if (!from || !to || !amount) {
                    return res.status(400).json({ error: '缺少必要参数' });
                }

                if (amount <= 0) {
                    return res.status(400).json({ error: '转账金额必须大于0' });
                }

                // 获取发送方钱包地址
                const fromAddress = this.getWalletAddress(from);
                if (!fromAddress) {
                    return res.status(400).json({ error: '发送方钱包不存在' });
                }

                // 检查余额
                const balance = this.blockchain.getBalance(fromAddress);
                const fee = Math.max(0.001, amount * 0.0001);

                if (balance < amount + fee) {
                    return res.status(400).json({ error: `余额不足，需要 ${amount + fee} coins，当前余额 ${balance} coins` });
                }

                // 创建交易
                const { Transaction } = require('./blockchain');
                const transaction = new Transaction(fromAddress, to, amount, 'transfer', {}, customFee);


                              // 获取发送方钱包的私钥并签名
                const fs = require('fs');
                const path = require('path');
                try {
                    const walletPath = path.join(__dirname, `../wallets/${from}.json`);
                    if (fs.existsSync(walletPath)) {
                        const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
                        transaction.sign(walletData.privateKey);
                    } else {
                        return res.status(400).json({ error: '无法找到发送方钱包私钥' });
                    }
                } catch (error) {
                    return res.status(500).json({ error: '签名失败: ' + error.message });
                }

                // 添加到区块链
                this.blockchain.addTransaction(transaction);

                res.json({
                    success: true,
                    transactionId: transaction.id,
                    fee: transaction.fee,
                    message: '转账成功，等待矿工确认'
                });

            } catch (error) {
                console.error('转账失败:', error);
                res.status(500).json({ error: '转账失败: ' + error.message });
            }
        });

        // 代币转账API
        this.app.post('/api/transfer-token', (req, res) => {
            try {
                const { from, to, amount, tokenName, customFee } = req.body;

                if (!from || !to || !amount || !tokenName) {
                    return res.status(400).json({ error: '缺少必要参数' });
                }

                if (amount <= 0) {
                    return res.status(400).json({ error: '转账金额必须大于0' });
                }

                // 获取发送方钱包地址
                const fromAddress = this.getWalletAddress(from);
                if (!fromAddress) {
                    return res.status(400).json({ error: '发送方钱包不存在' });
                }

                // 检查代币余额
                const tokenBalance = this.blockchain.getTokenBalance(fromAddress, tokenName);
                if (tokenBalance < amount) {
                    return res.status(400).json({ error: `代币余额不足，需要 ${amount} ${tokenName}，当前余额 ${tokenBalance} ${tokenName}` });
                }

                // 检查主币余额（用于支付手续费）
                const coinBalance = this.blockchain.getBalance(fromAddress);
                const fee = customFee || Math.max(0.001, amount * 0.0001);

                if (coinBalance < fee) {
                    return res.status(400).json({ error: `主币余额不足支付手续费，需要 ${fee} coins，当前余额 ${coinBalance} coins` });
                }

                // 创建代币转账交易
                const { Transaction } = require('./blockchain');
                const transaction = new Transaction(fromAddress, to, amount, 'transfer_token', { tokenName }, customFee);

                // 获取发送方钱包的私钥并签名
                const fs = require('fs');
                const path = require('path');
                try {
                    const walletPath = path.join(__dirname, `../wallets/${from}.json`);
                    if (fs.existsSync(walletPath)) {
                        const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
                        transaction.sign(walletData.privateKey);
                    } else {
                        return res.status(400).json({ error: '无法找到发送方钱包私钥' });
                    }
                } catch (error) {
                    return res.status(500).json({ error: '签名失败: ' + error.message });
                }

                // 添加到区块链
                this.blockchain.addTransaction(transaction);

                res.json({
                    success: true,
                    transactionId: transaction.id,
                    fee: transaction.fee,
                    message: '代币转账成功，等待矿工确认'
                });

            } catch (error) {
                console.error('代币转账失败:', error);
                res.status(500).json({ error: '代币转账失败: ' + error.message });
            }
        });

        // 获取地址的代币余额
        this.app.get('/api/address/:address/tokens/:tokenName', (req, res) => {
            try {
                const { address, tokenName } = req.params;
                const balance = this.blockchain.getTokenBalance(address, tokenName);

                res.json({
                    address,
                    tokenName,
                    balance
                });
            } catch (error) {
                console.error('获取代币余额失败:', error);
                res.status(500).json({ error: '获取代币余额失败: ' + error.message });
            }
        });

        // 获取特定代币信息
        this.app.get('/api/token/:tokenName', (req, res) => {
            const { tokenName } = req.params;
            const tokenInfo = this.blockchain.tokenInfo.get(tokenName);

            if (!tokenInfo) {
                return res.status(404).json({ error: '代币未找到' });
            }

            // 计算持有者信息
            const holders = [];
            for (const [address, userTokens] of this.blockchain.tokens) {
                const balance = userTokens.get(tokenName);
                if (balance && balance > 0) {
                    holders.push({ address, balance });
                }
            }

            holders.sort((a, b) => b.balance - a.balance);

            res.json({
                ...tokenInfo,
                holders: holders.slice(0, 100), // 前100名持有者
                holderCount: holders.length
            });
        });

        // 搜索功能
        this.app.get('/api/search/:query', (req, res) => {
            const { query } = req.params;
            const results = [];

            // 搜索区块（按哈希或高度）
            if (!isNaN(query)) {
                const block = this.blockchain.searchBlock(parseInt(query));
                if (block) {
                    results.push({
                        type: 'block',
                        data: {
                            height: parseInt(query),
                            hash: block.hash,
                            timestamp: block.timestamp
                        }
                    });
                }
            } else if (query.length === 64) {
                // 可能是区块哈希
                const block = this.blockchain.searchBlock(query);
                if (block) {
                    results.push({
                        type: 'block',
                        data: {
                            height: this.blockchain.chain.indexOf(block),
                            hash: block.hash,
                            timestamp: block.timestamp
                        }
                    });
                }

                // 可能是交易ID
                const txResult = this.blockchain.searchTransaction(query);
                if (txResult) {
                    results.push({
                        type: 'transaction',
                        data: txResult.transaction
                    });
                }
            }

            // 搜索地址
            if (this.blockchain.balances.has(query)) {
                results.push({
                    type: 'address',
                    data: {
                        address: query,
                        balance: this.blockchain.getBalance(query)
                    }
                });
            }

            res.json({ results });
        });

        // 获取待处理交易
        this.app.get('/api/pending-transactions', (req, res) => {
            res.json({
                transactions: this.blockchain.pendingTransactions,
                count: this.blockchain.pendingTransactions.length
            });
        });

        // 网络统计
        this.app.get('/api/network-stats', (req, res) => {
            const stats = this.blockchain.getStats();
            const latestBlock = this.blockchain.getLatestBlock();

            // 计算平均区块时间
            let avgBlockTime = 0;
            if (this.blockchain.chain.length > 1) {
                const recentBlocks = this.blockchain.chain.slice(-10);
                let totalTime = 0;
                for (let i = 1; i < recentBlocks.length; i++) {
                    totalTime += recentBlocks[i].timestamp - recentBlocks[i-1].timestamp;
                }
                avgBlockTime = totalTime / (recentBlocks.length - 1);
            }

            res.json({
                ...stats,
                latestBlockHash: latestBlock.hash,
                latestBlockTime: latestBlock.timestamp,
                avgBlockTime: Math.round(avgBlockTime / 1000), // 转换为秒
                chainValid: this.blockchain.isChainValid()
            });
        });

        // 提供静态HTML页面
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        this.app.get('/blocks', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/blocks.html'));
        });

        this.app.get('/transactions', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/transactions.html'));
        });

        this.app.get('/tokens', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/tokens.html'));
        });

        this.app.get('/transaction-visualizer', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/transaction-visualizer.html'));
        });

        this.app.get('/transfer', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/transfer.html'));
        });
    }

    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`🌐 区块链浏览器启动成功！`);
            console.log(`📱 访问地址: http://localhost:${this.port}`);
            console.log(`🔍 API 文档: http://localhost:${this.port}/api/overview`);
        });

        this.server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`❌ 端口 ${this.port} 已被占用，尝试使用端口 ${this.port + 1}`);
                this.port = this.port + 1;
                setTimeout(() => this.start(), 1000);
            } else {
                console.error('服务器启动失败:', err);
            }
        });

        return this.server;
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log(`⏹️  区块链浏览器已停止`);
        }
    }

    // 实时更新功能（WebSocket）
    setupWebSocket() {
        const WebSocket = require('ws');
        const wss = new WebSocket.Server({ port: this.port + 1 });

        console.log(`🔌 WebSocket 服务启动: ws://localhost:${this.port + 1}`);

        // 监听区块链事件
        this.blockchain.on('blockMined', (block) => {
            this.broadcast(wss, {
                type: 'newBlock',
                data: {
                    height: this.blockchain.chain.length - 1,
                    hash: block.hash,
                    timestamp: block.timestamp,
                    transactionCount: block.transactions.length,
                    miner: block.miner
                }
            });
        });

        this.blockchain.on('transactionAdded', (transaction) => {
            this.broadcast(wss, {
                type: 'newTransaction',
                data: transaction
            });
        });

        wss.on('connection', (ws) => {
            console.log('🔗 新的WebSocket连接');

            ws.on('close', () => {
                console.log('❌ WebSocket连接断开');
            });
        });
    }

    broadcast(wss, message) {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    // 辅助方法：获取钱包地址
    getWalletAddress(walletName) {
        // 这里需要从文件系统读取钱包地址
        // 简化处理：从区块链中查找已知地址
        const fs = require('fs');
        const path = require('path');

        try {
            const walletPath = path.join(__dirname, `../wallets/${walletName}.json`);
            if (fs.existsSync(walletPath)) {
                const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
                return walletData.address;
            }
        } catch (error) {
            console.error(`读取钱包${walletName}失败:`, error);
        }

        return null;
    }
}

module.exports = { BlockchainExplorer };
