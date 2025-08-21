#!/usr/bin/env node

const { Blockchain, Transaction } = require('./src/blockchain');
const { Wallet, WalletManager } = require('./src/wallet');
const { Miner, MiningPool } = require('./src/miner');
const { BlockchainExplorer } = require('./src/explorer');
const readline = require('readline');

/**
 * 区块链模拟器主程序
 */
class BlockchainSimulator {
    constructor() {
        this.blockchain = new Blockchain();
        this.walletManager = new WalletManager();
        this.miners = new Map();
        this.miningPool = null;
        this.explorer = null;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        this.setupEventListeners();
        this.initializeDemo();
    }

    setupEventListeners() {
        // 监听区块链事件
        this.blockchain.on('blockMined', (block) => {
            console.log(`\n🎉 新区块已挖出！`);
            console.log(`   高度: ${this.blockchain.chain.length - 1}`);
            console.log(`   哈希: ${block.hash.substring(0, 20)}...`);
            console.log(`   矿工: ${block.miner}`);
            console.log(`   交易数: ${block.transactions.length}`);
        });

        this.blockchain.on('transactionAdded', (transaction) => {
            console.log(`\n📝 新交易已添加: ${transaction.type}`);
            console.log(`   从: ${transaction.from || 'System'}`);
            console.log(`   到: ${transaction.to}`);
            console.log(`   金额: ${transaction.amount}`);
        });
    }

    async initializeDemo() {
        console.log('🚀 初始化区块链模拟器...');

        // 创建演示钱包
        const alice = this.walletManager.createWallet('alice');
        const bob = this.walletManager.createWallet('bob');
        const charlie = this.walletManager.createWallet('charlie');

        // 创建一些代币
        this.blockchain.createToken('DemoToken', 'DEMO', 1000000, alice.address);
        this.blockchain.createToken('TestCoin', 'TEST', 500000, bob.address);

        // 创建矿工
        const miner1 = new Miner(this.blockchain, alice.address, 'Alice Miner');
        const miner2 = new Miner(this.blockchain, bob.address, 'Bob Miner');

        this.miners.set('alice', miner1);
        this.miners.set('bob', miner2);

        // 为所有现有钱包创建矿工
        for (const [name, wallet] of this.walletManager.wallets) {
            if (!this.miners.has(name)) {
                const miner = new Miner(this.blockchain, wallet.address, `${name} Miner`);
                this.miners.set(name, miner);
            }
        }

        // 创建矿池
        this.miningPool = new MiningPool(this.blockchain, 'Demo Mining Pool');
        this.miningPool.addMiner(charlie.address, 'Charlie Pool Miner');

        console.log('✅ 初始化完成！');
        this.showMainMenu();
    }

    showMainMenu() {
        console.log('\n' + '='.repeat(60));
        console.log('🌟 区块链模拟器 - 主菜单');
        console.log('='.repeat(60));
        console.log('1. 💰 钱包管理');
        console.log('2. 💸 发送交易');
        console.log('3. ⛏️  挖矿管理');
        console.log('4. 🪙 代币管理');
        console.log('5. 🔍 区块链浏览器');
        console.log('6. 📊 查看统计');
        console.log('7. 🧪 演示模式');
        console.log('8. ❌ 退出');
        console.log('='.repeat(60));

        this.rl.question('请选择操作 (1-8): ', (choice) => {
            this.handleMainMenuChoice(choice);
        });
    }

    async handleMainMenuChoice(choice) {
        switch (choice) {
            case '1':
                await this.walletMenu();
                break;
            case '2':
                await this.transactionMenu();
                break;
            case '3':
                await this.miningMenu();
                break;
            case '4':
                await this.tokenMenu();
                break;
            case '5':
                await this.explorerMenu();
                break;
            case '6':
                this.showStats();
                break;
            case '7':
                await this.demoMode();
                break;
            case '8':
                this.exit();
                return;
            default:
                console.log('❌ 无效选择，请重试');
                this.showMainMenu();
        }
    }

    async walletMenu() {
        console.log('\n💰 钱包管理');
        console.log('1. 创建钱包');
        console.log('2. 查看钱包列表');
        console.log('3. 查看钱包详情');
        console.log('4. 导入钱包');
        console.log('5. 返回主菜单');

        this.rl.question('请选择操作: ', async (choice) => {
            switch (choice) {
                case '1':
                    this.rl.question('输入钱包名称: ', (name) => {
                        try {
                            const wallet = this.walletManager.createWallet(name);
                            console.log(`✅ 钱包创建成功: ${name}`);
                            console.log(`📍 地址: ${wallet.address}`);
                        } catch (error) {
                            console.log(`❌ 创建失败: ${error.message}`);
                        }
                        this.walletMenu();
                    });
                    break;
                case '2':
                    const wallets = this.walletManager.listWallets();
                    console.log('\n📋 钱包列表:');
                    wallets.forEach((wallet, index) => {
                        const balance = this.blockchain.getBalance(wallet.address);
                        console.log(`${index + 1}. ${wallet.name} (${wallet.address.substring(0, 20)}...) - 余额: ${balance}`);
                    });
                    this.walletMenu();
                    break;
                case '3':
                    this.rl.question('输入钱包名称: ', (name) => {
                        try {
                            const wallet = this.walletManager.wallets.get(name);
                            if (wallet) {
                                const balance = this.blockchain.getBalance(wallet.address);
                                const transactions = this.blockchain.getAddressTransactions(wallet.address);

                                console.log(`\n📊 钱包详情: ${name}`);
                                console.log(`📍 地址: ${wallet.address}`);
                                console.log(`💰 余额: ${balance} coins`);
                                console.log(`📝 交易数: ${transactions.length}`);

                                // 显示代币余额
                                const userTokens = this.blockchain.tokens.get(wallet.address);
                                if (userTokens && userTokens.size > 0) {
                                    console.log(`🪙 代币余额:`);
                                    for (const [tokenName, amount] of userTokens) {
                                        console.log(`   ${tokenName}: ${amount}`);
                                    }
                                }
                            } else {
                                console.log('❌ 钱包不存在');
                            }
                        } catch (error) {
                            console.log(`❌ 查询失败: ${error.message}`);
                        }
                        this.walletMenu();
                    });
                    break;
                case '4':
                    this.walletManager.importWallets();
                    this.walletMenu();
                    break;
                case '5':
                    this.showMainMenu();
                    break;
                default:
                    console.log('❌ 无效选择');
                    this.walletMenu();
            }
        });
    }

    async transactionMenu() {
        console.log('\n💸 发送交易');
        console.log('1. 普通转账');
        console.log('2. 代币转账');
        console.log('3. 铸造代币');
        console.log('4. 查看待处理交易');
        console.log('5. 返回主菜单');

        this.rl.question('请选择操作: ', (choice) => {
            switch (choice) {
                case '1':
                    this.createTransferTransaction();
                    break;
                case '2':
                    this.createTokenTransferTransaction();
                    break;
                case '3':
                    this.createMintTokenTransaction();
                    break;
                case '4':
                    console.log(`\n📋 待处理交易: ${this.blockchain.pendingTransactions.length} 笔`);
                    this.blockchain.pendingTransactions.forEach((tx, index) => {
                        console.log(`${index + 1}. ${tx.type}: ${tx.from || 'System'} -> ${tx.to}, 金额: ${tx.amount}`);
                    });
                    this.transactionMenu();
                    break;
                case '5':
                    this.showMainMenu();
                    break;
                default:
                    console.log('❌ 无效选择');
                    this.transactionMenu();
            }
        });
    }

    createTransferTransaction() {
        this.rl.question('发送方钱包名称: ', (fromName) => {
            this.rl.question('接收方地址: ', (to) => {
                this.rl.question('转账金额: ', (amount) => {
                    // 计算建议手续费
                    const tempTx = new Transaction(null, null, parseFloat(amount));
                    const suggestedFee = tempTx.calculateFee();

                    this.rl.question(`手续费 (建议: ${suggestedFee}, 直接回车使用建议值): `, (feeInput) => {
                        try {
                            const fromWallet = this.walletManager.wallets.get(fromName);
                            if (!fromWallet) {
                                console.log('❌ 发送方钱包不存在');
                                this.transactionMenu();
                                return;
                            }

                            // 使用自定义手续费或建议手续费
                            const customFee = feeInput.trim() ? parseFloat(feeInput) : null;
                            const transaction = new Transaction(fromWallet.address, to, parseFloat(amount), 'transfer', {}, customFee);
                            transaction.sign(fromWallet.privateKey);

                            console.log(`💰 转账金额: ${amount} coins`);
                            console.log(`💳 手续费: ${transaction.fee} coins`);
                            console.log(`💸 总计: ${parseFloat(amount) + transaction.fee} coins`);

                            this.blockchain.addTransaction(transaction);
                            console.log('✅ 交易已添加到待处理队列');
                        } catch (error) {
                            console.log(`❌ 交易创建失败: ${error.message}`);
                        }
                        this.transactionMenu();
                    });
                });
            });
        });
    }

    createTokenTransferTransaction() {
        this.rl.question('代币名称: ', (tokenName) => {
            this.rl.question('发送方钱包名称: ', (fromName) => {
                this.rl.question('接收方地址: ', (to) => {
                    this.rl.question('转账数量: ', (amount) => {
                        try {
                            const fromWallet = this.walletManager.wallets.get(fromName);
                            if (!fromWallet) {
                                console.log('❌ 发送方钱包不存在');
                                this.transactionMenu();
                                return;
                            }

                            const transaction = new Transaction(
                                fromWallet.address,
                                to,
                                parseFloat(amount),
                                'transfer_token',
                                { tokenName }
                            );
                            transaction.sign(fromWallet.privateKey);

                            this.blockchain.addTransaction(transaction);
                            console.log('✅ 代币转账交易已添加');
                        } catch (error) {
                            console.log(`❌ 交易创建失败: ${error.message}`);
                        }
                        this.transactionMenu();
                    });
                });
            });
        });
    }

    createMintTokenTransaction() {
        this.rl.question('代币名称: ', (tokenName) => {
            this.rl.question('接收方地址: ', (to) => {
                this.rl.question('铸造数量: ', (amount) => {
                    try {
                        const transaction = new Transaction(
                            null,
                            to,
                            parseFloat(amount),
                            'mint_token',
                            { tokenName }
                        );

                        this.blockchain.addTransaction(transaction);
                        console.log('✅ 代币铸造交易已添加');
                    } catch (error) {
                        console.log(`❌ 交易创建失败: ${error.message}`);
                    }
                    this.transactionMenu();
                });
            });
        });
    }

    async miningMenu() {
        console.log('\n⛏️  挖矿管理');
        console.log('1. 开始单独挖矿');
        console.log('2. 停止挖矿');
        console.log('3. 查看矿工状态');
        console.log('4. 矿池管理');
        console.log('5. 调整难度');
        console.log('6. 返回主菜单');

        this.rl.question('请选择操作: ', (choice) => {
            switch (choice) {
                case '1':
                    const availableMiners = Array.from(this.miners.keys()).join('/');
                    this.rl.question(`选择矿工 (${availableMiners}): `, (minerName) => {
                        const miner = this.miners.get(minerName);
                        if (miner) {
                            miner.start();
                        } else {
                            console.log('❌ 矿工不存在');
                        }
                        this.miningMenu();
                    });
                    break;
                case '2':
                    this.rl.question('选择矿工 (alice/bob): ', (minerName) => {
                        const miner = this.miners.get(minerName);
                        if (miner) {
                            miner.stop();
                        } else {
                            console.log('❌ 矿工不存在');
                        }
                        this.miningMenu();
                    });
                    break;
                case '3':
                    console.log('\n📊 矿工状态:');
                    for (const [name, miner] of this.miners) {
                        const stats = miner.getStats();
                        console.log(`${name}: ${stats.isRunning ? '🟢 运行中' : '🔴 已停止'} - 已挖 ${stats.blocksMinedTotal} 个区块`);
                    }
                    this.miningMenu();
                    break;
                case '4':
                    this.miningPoolMenu();
                    break;
                case '5':
                    this.rl.question('输入新难度 (1-6): ', (difficulty) => {
                        const diff = parseInt(difficulty);
                        if (diff >= 1 && diff <= 6) {
                            this.blockchain.difficulty = diff;
                            console.log(`✅ 难度已调整为: ${diff}`);
                        } else {
                            console.log('❌ 难度必须在1-6之间');
                        }
                        this.miningMenu();
                    });
                    break;
                case '6':
                    this.showMainMenu();
                    break;
                default:
                    console.log('❌ 无效选择');
                    this.miningMenu();
            }
        });
    }

    miningPoolMenu() {
        console.log('\n🏊 矿池管理');
        console.log('1. 启动矿池');
        console.log('2. 停止矿池');
        console.log('3. 查看矿池状态');
        console.log('4. 返回挖矿菜单');

        this.rl.question('请选择操作: ', (choice) => {
            switch (choice) {
                case '1':
                    this.miningPool.startPool();
                    this.miningPoolMenu();
                    break;
                case '2':
                    this.miningPool.stopPool();
                    this.miningPoolMenu();
                    break;
                case '3':
                    const stats = this.miningPool.getPoolStats();
                    console.log(`\n📊 矿池状态:`);
                    console.log(`   名称: ${stats.poolName}`);
                    console.log(`   状态: ${stats.isRunning ? '🟢 运行中' : '🔴 已停止'}`);
                    console.log(`   矿工数: ${stats.minerCount}`);
                    console.log(`   已挖区块: ${stats.totalBlocksMined}`);
                    console.log(`   总奖励: ${stats.totalReward}`);
                    this.miningPoolMenu();
                    break;
                case '4':
                    this.miningMenu();
                    break;
                default:
                    console.log('❌ 无效选择');
                    this.miningPoolMenu();
            }
        });
    }

    async tokenMenu() {
        console.log('\n🪙 代币管理');
        console.log('1. 创建代币');
        console.log('2. 查看所有代币');
        console.log('3. 查看代币详情');
        console.log('4. 返回主菜单');

        this.rl.question('请选择操作: ', (choice) => {
            switch (choice) {
                case '1':
                    this.rl.question('代币名称: ', (name) => {
                        this.rl.question('代币符号: ', (symbol) => {
                            this.rl.question('总供应量: ', (supply) => {
                                this.rl.question('创建者钱包名称: ', (creatorName) => {
                                    try {
                                        const creator = this.walletManager.wallets.get(creatorName);
                                        if (!creator) {
                                            console.log('❌ 创建者钱包不存在');
                                            this.tokenMenu();
                                            return;
                                        }

                                        this.blockchain.createToken(name, symbol, parseInt(supply), creator.address);
                                        console.log('✅ 代币创建成功');
                                    } catch (error) {
                                        console.log(`❌ 创建失败: ${error.message}`);
                                    }
                                    this.tokenMenu();
                                });
                            });
                        });
                    });
                    break;
                case '2':
                    const tokens = this.blockchain.getAllTokens();
                    console.log('\n📋 代币列表:');
                    tokens.forEach((token, index) => {
                        console.log(`${index + 1}. ${token.name} (${token.symbol}) - 供应量: ${token.totalSupply}`);
                    });
                    this.tokenMenu();
                    break;
                case '3':
                    this.rl.question('代币名称: ', (tokenName) => {
                        const tokenInfo = this.blockchain.tokenInfo.get(tokenName);
                        if (tokenInfo) {
                            console.log(`\n📊 代币详情: ${tokenName}`);
                            console.log(`   符号: ${tokenInfo.symbol}`);
                            console.log(`   总供应量: ${tokenInfo.totalSupply}`);
                            console.log(`   创建者: ${tokenInfo.creator}`);
                            console.log(`   创建时间: ${new Date(tokenInfo.createdAt).toLocaleString()}`);
                        } else {
                            console.log('❌ 代币不存在');
                        }
                        this.tokenMenu();
                    });
                    break;
                case '4':
                    this.showMainMenu();
                    break;
                default:
                    console.log('❌ 无效选择');
                    this.tokenMenu();
            }
        });
    }

    async explorerMenu() {
        console.log('\n🔍 区块链浏览器');
        console.log('1. 启动Web浏览器');
        console.log('2. 停止Web浏览器');
        console.log('3. 返回主菜单');

        this.rl.question('请选择操作: ', (choice) => {
            switch (choice) {
                case '1':
                    if (!this.explorer) {
                        this.explorer = new BlockchainExplorer(this.blockchain, 3000);
                        this.explorer.start();
                        this.explorer.setupWebSocket();
                    } else {
                        console.log('⚠️  浏览器已在运行中');
                    }
                    this.explorerMenu();
                    break;
                case '2':
                    if (this.explorer) {
                        this.explorer.stop();
                        this.explorer = null;
                    } else {
                        console.log('⚠️  浏览器未运行');
                    }
                    this.explorerMenu();
                    break;
                case '3':
                    this.showMainMenu();
                    break;
                default:
                    console.log('❌ 无效选择');
                    this.explorerMenu();
            }
        });
    }

    showStats() {
        const stats = this.blockchain.getStats();
        console.log('\n📊 区块链统计:');
        console.log(`   总区块数: ${stats.totalBlocks}`);
        console.log(`   总交易数: ${stats.totalTransactions}`);
        console.log(`   总地址数: ${stats.totalAddresses}`);
        console.log(`   总代币数: ${stats.totalTokens}`);
        console.log(`   当前难度: ${stats.difficulty}`);
        console.log(`   待处理交易: ${stats.pendingTransactions}`);
        console.log(`   链有效性: ${this.blockchain.isChainValid() ? '✅ 有效' : '❌ 无效'}`);

        this.showMainMenu();
    }

    async demoMode() {
        console.log('\n🧪 演示模式启动...');

        // 启动浏览器
        if (!this.explorer) {
            this.explorer = new BlockchainExplorer(this.blockchain, 3000);
            this.explorer.start();
            this.explorer.setupWebSocket();
        }

        // 启动一个矿工
        const miner = this.miners.get('alice');
        miner.start();

        // 创建一些演示交易
        const alice = this.walletManager.wallets.get('alice');
        const bob = this.walletManager.wallets.get('bob');
        const charlie = this.walletManager.wallets.get('charlie');

        console.log('🎬 开始创建演示交易...');

        // 每5秒创建一笔交易
        const demoInterval = setInterval(() => {
            try {
                // 随机选择交易类型和参与者
                const txTypes = [
                    {
                        from: alice,
                        to: bob.address,
                        amount: Math.random() * 50 + 10,
                        type: 'transfer'
                    },
                    {
                        from: alice,
                        to: charlie.address,
                        amount: Math.random() * 30 + 5,
                        type: 'transfer'
                    },
                    {
                        from: null,
                        to: bob.address,
                        amount: Math.random() * 100 + 50,
                        type: 'mint_token',
                        data: { tokenName: 'DemoToken' }
                    }
                ];

                const randomTxConfig = txTypes[Math.floor(Math.random() * txTypes.length)];

                let transaction;
                if (randomTxConfig.type === 'mint_token') {
                    transaction = new Transaction(
                        null,
                        randomTxConfig.to,
                        randomTxConfig.amount,
                        'mint_token',
                        randomTxConfig.data
                    );
                } else {
                    transaction = new Transaction(
                        randomTxConfig.from.address,
                        randomTxConfig.to,
                        randomTxConfig.amount
                    );
                    // 用正确的私钥签名
                    transaction.sign(randomTxConfig.from.privateKey);
                }

                this.blockchain.addTransaction(transaction);
                console.log(`💸 演示交易: ${randomTxConfig.type} - ${randomTxConfig.amount.toFixed(2)} ${randomTxConfig.data?.tokenName || 'coins'}`);
            } catch (error) {
                console.log(`❌ 演示交易失败: ${error.message}`);
            }
        }, 5000);

        console.log('🎭 演示模式运行中...');
        console.log('🌐 浏览器地址: http://localhost:3000');
        console.log('按任意键停止演示模式');

        this.rl.question('', () => {
            clearInterval(demoInterval);
            miner.stop();
            console.log('🛑 演示模式已停止');
            this.showMainMenu();
        });
    }

    exit() {
        console.log('\n👋 感谢使用区块链模拟器！');

        // 停止所有矿工
        for (const miner of this.miners.values()) {
            if (miner.isRunning) {
                miner.stop();
            }
        }

        // 停止矿池
        if (this.miningPool && this.miningPool.isRunning) {
            this.miningPool.stopPool();
        }

        // 停止浏览器
        if (this.explorer) {
            this.explorer.stop();
        }

        this.rl.close();
        process.exit(0);
    }
}

// 启动模拟器
if (require.main === module) {
    console.log('🌟 欢迎使用 Node.js 区块链模拟器！');
    console.log('🔗 完整功能：创建链、钱包、代币、挖矿、转账、浏览器');
    console.log('');

    new BlockchainSimulator();
}

module.exports = { BlockchainSimulator };
