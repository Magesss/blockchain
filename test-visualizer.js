#!/usr/bin/env node

const { BlockchainSimulator } = require('./index');
const { Transaction } = require('./src/blockchain');

/**
 * 交易可视化测试脚本
 */
class VisualizerTest {
    constructor() {
        this.simulator = new BlockchainSimulator();
        this.isRunning = false;
    }

    async start() {
        console.log('🎬 启动交易可视化测试...');

        // 等待初始化完成
        await this.waitForInitialization();

        // 启动浏览器
        await this.startExplorer();

        // 启动矿工
        this.startMiners();

        // 开始创建测试交易
        this.startTransactionSimulation();

        console.log('🌐 浏览器地址: http://localhost:3000');
        console.log('📊 交易可视化: http://localhost:3000/transaction-visualizer');
        console.log('🎭 测试运行中... 按 Ctrl+C 停止');
    }

    async waitForInitialization() {
        return new Promise(resolve => {
            // 等待2秒确保初始化完成
            setTimeout(resolve, 2000);
        });
    }

    async startExplorer() {
        if (!this.simulator.explorer) {
            const { BlockchainExplorer } = require('./src/explorer');
            this.simulator.explorer = new BlockchainExplorer(this.simulator.blockchain, 3000);
            this.simulator.explorer.start();
            this.simulator.explorer.setupWebSocket();
        }
    }

    startMiners() {
        // 启动Alice矿工
        const aliceMiner = this.simulator.miners.get('alice');
        if (aliceMiner) {
            aliceMiner.start();
            console.log('⛏️  Alice矿工已启动');
        }

        // 启动矿池
        if (this.simulator.miningPool) {
            this.simulator.miningPool.startPool();
            console.log('🏊 矿池已启动');
        }
    }

    startTransactionSimulation() {
        this.isRunning = true;

        const alice = this.simulator.walletManager.wallets.get('alice');
        const bob = this.simulator.walletManager.wallets.get('bob');
        const charlie = this.simulator.walletManager.wallets.get('charlie');

        const wallets = [alice, bob, charlie];

        // 每3秒创建一笔随机交易
        const createTransaction = () => {
            if (!this.isRunning) return;

            try {
                const fromWallet = wallets[Math.floor(Math.random() * wallets.length)];
                const toWallet = wallets[Math.floor(Math.random() * wallets.length)];

                if (fromWallet === toWallet) {
                    setTimeout(createTransaction, 1000);
                    return;
                }

                const transactionTypes = [
                    { type: 'transfer', weight: 60 },
                    { type: 'transfer_token', weight: 30 },
                    { type: 'mint_token', weight: 10 }
                ];

                // 随机选择交易类型
                const rand = Math.random() * 100;
                let cumulative = 0;
                let selectedType = 'transfer';

                for (const txType of transactionTypes) {
                    cumulative += txType.weight;
                    if (rand <= cumulative) {
                        selectedType = txType.type;
                        break;
                    }
                }

                let transaction;
                const amount = Math.random() * 100 + 10; // 10-110

                switch (selectedType) {
                    case 'transfer':
                        transaction = new Transaction(
                            fromWallet.address,
                            toWallet.address,
                            amount
                        );
                        break;

                    case 'transfer_token':
                        const tokens = ['DemoToken', 'TestCoin'];
                        const tokenName = tokens[Math.floor(Math.random() * tokens.length)];
                        transaction = new Transaction(
                            fromWallet.address,
                            toWallet.address,
                            amount,
                            'transfer_token',
                            { tokenName }
                        );
                        break;

                    case 'mint_token':
                        const mintTokens = ['DemoToken', 'TestCoin'];
                        const mintTokenName = mintTokens[Math.floor(Math.random() * mintTokens.length)];
                        transaction = new Transaction(
                            null,
                            toWallet.address,
                            amount,
                            'mint_token',
                            { tokenName: mintTokenName }
                        );
                        break;
                }

                if (transaction && transaction.from) {
                    transaction.sign(fromWallet.privateKey);
                }

                this.simulator.blockchain.addTransaction(transaction);

                const typeText = this.getTransactionTypeText(selectedType);
                console.log(`💸 创建${typeText}: ${amount.toFixed(2)} ${transaction.data?.tokenName || 'coins'}`);

            } catch (error) {
                console.log(`❌ 交易创建失败: ${error.message}`);
            }

            // 随机间隔 2-5 秒
            const nextInterval = Math.random() * 3000 + 2000;
            setTimeout(createTransaction, nextInterval);
        };

        // 开始创建交易
        setTimeout(createTransaction, 3000);
    }

    getTransactionTypeText(type) {
        switch(type) {
            case 'transfer': return '普通转账';
            case 'transfer_token': return '代币转账';
            case 'mint_token': return '代币铸造';
            default: return type;
        }
    }

    stop() {
        this.isRunning = false;
        console.log('\n🛑 测试已停止');

        // 停止所有矿工
        for (const miner of this.simulator.miners.values()) {
            if (miner.isRunning) {
                miner.stop();
            }
        }

        // 停止矿池
        if (this.simulator.miningPool && this.simulator.miningPool.isRunning) {
            this.simulator.miningPool.stopPool();
        }

        // 停止浏览器
        if (this.simulator.explorer) {
            this.simulator.explorer.stop();
        }

        process.exit(0);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const test = new VisualizerTest();

    // 处理退出信号
    process.on('SIGINT', () => {
        test.stop();
    });

    process.on('SIGTERM', () => {
        test.stop();
    });

    test.start().catch(console.error);
}

module.exports = { VisualizerTest };
