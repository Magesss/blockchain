const { EventEmitter } = require('events');

/**
 * 挖矿器类
 */
class Miner extends EventEmitter {
    constructor(blockchain, minerAddress, name = 'Miner') {
        super();
        this.blockchain = blockchain;
        this.minerAddress = minerAddress;
        this.name = name;
        this.isRunning = false;
        this.stats = {
            blocksMinedTotal: 0,
            totalReward: 0,
            totalHashrate: 0,
            startTime: null,
            lastBlockTime: null
        };

        // 监听区块链事件
        this.blockchain.on('transactionAdded', () => {
            if (this.isRunning && this.blockchain.pendingTransactions.length > 0) {
                this.emit('newTransactionDetected');
            }
        });
    }

    start() {
        if (this.isRunning) {
            console.log(`⚠️  矿工 ${this.name} 已在运行中`);
            return;
        }

        this.isRunning = true;
        this.stats.startTime = Date.now();

        console.log(`🚀 矿工 ${this.name} 开始挖矿`);
        console.log(`📍 矿工地址: ${this.minerAddress}`);
        console.log(`⚙️  当前难度: ${this.blockchain.difficulty}`);

        this.emit('started');
        this.miningLoop();
    }

    stop() {
        if (!this.isRunning) {
            console.log(`⚠️  矿工 ${this.name} 未在运行`);
            return;
        }

        this.isRunning = false;
        console.log(`⏹️  矿工 ${this.name} 已停止挖矿`);
        this.emit('stopped');
        this.printStats();
    }

    async miningLoop() {
        while (this.isRunning) {
            try {
                // 检查是否有待处理的交易
                if (this.blockchain.pendingTransactions.length === 0) {
                    // 没有交易时等待
                    await this.sleep(1000);
                    continue;
                }

                console.log(`\n⛏️  ${this.name} 开始挖掘新区块...`);
                console.log(`📝 待处理交易数量: ${this.blockchain.pendingTransactions.length}`);

                const startTime = Date.now();

                // 挖矿
                const block = this.blockchain.minePendingTransactions(this.minerAddress);

                const miningTime = Date.now() - startTime;

                // 更新统计信息
                this.updateStats(block, miningTime);

                // 发出事件
                this.emit('blockMined', {
                    block,
                    miner: this.name,
                    miningTime,
                    reward: block.reward
                });

                console.log(`🎉 ${this.name} 成功挖出区块 #${block.transactions[0] ? this.blockchain.chain.length - 1 : 0}`);
                console.log(`💰 获得奖励: ${block.reward} coins`);
                console.log(`⏱️  挖矿用时: ${miningTime}ms`);

                // 短暂休息后继续
                await this.sleep(100);

            } catch (error) {
                console.error(`❌ ${this.name} 挖矿出错:`, error.message);
                await this.sleep(5000); // 出错后等待5秒
            }
        }
    }

    updateStats(block, miningTime) {
        this.stats.blocksMinedTotal++;
        this.stats.totalReward += block.reward;
        this.stats.lastBlockTime = miningTime;

        // 计算平均算力 (哈希/秒)
        const attempts = block.nonce;
        const hashrate = attempts / (miningTime / 1000);
        this.stats.totalHashrate += hashrate;
    }

    getStats() {
        const runningTime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        const avgHashrate = this.stats.blocksMinedTotal > 0
            ? this.stats.totalHashrate / this.stats.blocksMinedTotal
            : 0;

        return {
            name: this.name,
            address: this.minerAddress,
            isRunning: this.isRunning,
            blocksMinedTotal: this.stats.blocksMinedTotal,
            totalReward: this.stats.totalReward,
            avgHashrate: Math.round(avgHashrate),
            runningTime: Math.round(runningTime / 1000), // 秒
            lastBlockTime: this.stats.lastBlockTime
        };
    }

    printStats() {
        const stats = this.getStats();

        console.log(`\n📊 ${this.name} 挖矿统计:`);
        console.log(`   已挖区块: ${stats.blocksMinedTotal}`);
        console.log(`   总奖励: ${stats.totalReward} coins`);
        console.log(`   平均算力: ${stats.avgHashrate} H/s`);
        console.log(`   运行时间: ${stats.runningTime} 秒`);
        if (stats.lastBlockTime) {
            console.log(`   最后区块用时: ${stats.lastBlockTime}ms`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 设置挖矿难度
    setDifficulty(difficulty) {
        console.log(`🔧 ${this.name} 调整难度: ${this.blockchain.difficulty} -> ${difficulty}`);
        this.blockchain.difficulty = difficulty;
    }

    // 获取当前余额
    getBalance() {
        return this.blockchain.getBalance(this.minerAddress);
    }

    // 获取代币余额
    getTokenBalance(tokenName) {
        return this.blockchain.getTokenBalance(this.minerAddress, tokenName);
    }
}

/**
 * 挖矿池类
 */
class MiningPool extends EventEmitter {
    constructor(blockchain, poolName = 'Mining Pool') {
        super();
        this.blockchain = blockchain;
        this.poolName = poolName;
        this.miners = new Map();
        this.isRunning = false;
        this.poolAddress = `pool_${Date.now()}`;
        this.stats = {
            totalBlocksMined: 0,
            totalReward: 0,
            startTime: null
        };
    }

    addMiner(minerAddress, name) {
        if (this.miners.has(minerAddress)) {
            throw new Error(`矿工 ${minerAddress} 已在矿池中`);
        }

        const miner = new Miner(this.blockchain, minerAddress, name);
        this.miners.set(minerAddress, miner);

        // 监听矿工事件
        miner.on('blockMined', (data) => {
            this.handleBlockMined(data);
        });

        console.log(`👥 矿工 ${name} (${minerAddress}) 加入矿池 ${this.poolName}`);
        return miner;
    }

    removeMiner(minerAddress) {
        const miner = this.miners.get(minerAddress);
        if (!miner) {
            throw new Error(`矿工 ${minerAddress} 不在矿池中`);
        }

        miner.stop();
        this.miners.delete(minerAddress);
        console.log(`👋 矿工 ${minerAddress} 离开矿池 ${this.poolName}`);
    }

    startPool() {
        if (this.isRunning) {
            console.log(`⚠️  矿池 ${this.poolName} 已在运行中`);
            return;
        }

        this.isRunning = true;
        this.stats.startTime = Date.now();

        console.log(`🏊 矿池 ${this.poolName} 开始运行`);
        console.log(`👥 矿工数量: ${this.miners.size}`);

        // 启动所有矿工
        for (const miner of this.miners.values()) {
            miner.start();
        }

        this.emit('poolStarted');
    }

    stopPool() {
        if (!this.isRunning) {
            console.log(`⚠️  矿池 ${this.poolName} 未在运行`);
            return;
        }

        this.isRunning = false;

        // 停止所有矿工
        for (const miner of this.miners.values()) {
            miner.stop();
        }

        console.log(`⏹️  矿池 ${this.poolName} 已停止`);
        this.printPoolStats();
        this.emit('poolStopped');
    }

    handleBlockMined(data) {
        this.stats.totalBlocksMined++;
        this.stats.totalReward += data.reward;

        console.log(`🎉 矿池 ${this.poolName} 挖出新区块！`);
        console.log(`   矿工: ${data.miner}`);
        console.log(`   奖励: ${data.reward} coins`);

        // 分配奖励（简化版：平均分配）
        this.distributeReward(data.reward);

        this.emit('poolBlockMined', data);
    }

    distributeReward(totalReward) {
        if (this.miners.size === 0) return;

        const rewardPerMiner = totalReward / this.miners.size;

        console.log(`💰 矿池奖励分配: ${rewardPerMiner} coins/矿工`);

        // 在实际应用中，这里应该根据算力贡献来分配
        for (const [address, miner] of this.miners) {
            // 这里只是记录，实际的余额更新由区块链处理
            console.log(`   ${miner.name}: +${rewardPerMiner} coins`);
        }
    }

    getPoolStats() {
        const runningTime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        const minerStats = Array.from(this.miners.values()).map(miner => miner.getStats());

        return {
            poolName: this.poolName,
            poolAddress: this.poolAddress,
            isRunning: this.isRunning,
            minerCount: this.miners.size,
            totalBlocksMined: this.stats.totalBlocksMined,
            totalReward: this.stats.totalReward,
            runningTime: Math.round(runningTime / 1000),
            miners: minerStats
        };
    }

    printPoolStats() {
        const stats = this.getPoolStats();

        console.log(`\n📊 矿池 ${this.poolName} 统计:`);
        console.log(`   矿工数量: ${stats.minerCount}`);
        console.log(`   已挖区块: ${stats.totalBlocksMined}`);
        console.log(`   总奖励: ${stats.totalReward} coins`);
        console.log(`   运行时间: ${stats.runningTime} 秒`);

        console.log(`\n👥 矿工详情:`);
        stats.miners.forEach(miner => {
            console.log(`   ${miner.name}: ${miner.blocksMinedTotal} 区块, ${miner.totalReward} coins`);
        });
    }

    // 获取矿工列表
    getMiners() {
        return Array.from(this.miners.values()).map(miner => miner.getStats());
    }
}

module.exports = { Miner, MiningPool };
