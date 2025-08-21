const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 钱包类
 */
class Wallet {
    constructor(name = null) {
        this.name = name || `wallet_${Date.now()}`;
        this.generateKeyPair();
        this.transactions = [];
    }

    generateKeyPair() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.address = this.generateAddress();
    }

    generateAddress() {
        // 从公钥生成地址
        const hash = crypto.createHash('sha256').update(this.publicKey).digest('hex');
        return hash.substring(0, 40); // 取前40位作为地址
    }

    sign(data) {
        const sign = crypto.createSign('SHA256');
        sign.update(data);
        return sign.sign(this.privateKey, 'hex');
    }

    verify(data, signature) {
        const verify = crypto.createVerify('SHA256');
        verify.update(data);
        return verify.verify(this.publicKey, signature, 'hex');
    }

    // 保存钱包到文件
    save(directory = './wallets') {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        const walletData = {
            name: this.name,
            address: this.address,
            publicKey: this.publicKey,
            privateKey: this.privateKey,
            createdAt: Date.now()
        };

        const filename = path.join(directory, `${this.name}.json`);
        fs.writeFileSync(filename, JSON.stringify(walletData, null, 2));

        console.log(`💾 钱包已保存: ${filename}`);
        return filename;
    }

    // 从文件加载钱包
    static load(filename) {
        if (!fs.existsSync(filename)) {
            throw new Error(`钱包文件不存在: ${filename}`);
        }

        const walletData = JSON.parse(fs.readFileSync(filename, 'utf8'));
        const wallet = new Wallet();

        wallet.name = walletData.name;
        wallet.address = walletData.address;
        wallet.publicKey = walletData.publicKey;
        wallet.privateKey = walletData.privateKey;

        return wallet;
    }

    // 列出所有钱包
    static listWallets(directory = './wallets') {
        if (!fs.existsSync(directory)) {
            return [];
        }

        const files = fs.readdirSync(directory);
        return files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filepath = path.join(directory, file);
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                return {
                    name: data.name,
                    address: data.address,
                    filename: file,
                    createdAt: data.createdAt
                };
            });
    }

    // 生成二维码（地址）
    generateQRCode() {
        // 这里可以集成 qrcode 库
        return `QR Code for address: ${this.address}`;
    }

    // 获取钱包信息
    getInfo() {
        return {
            name: this.name,
            address: this.address,
            publicKey: this.publicKey.substring(0, 100) + '...',
            createdAt: this.createdAt || Date.now()
        };
    }

    // 导出私钥（危险操作）
    exportPrivateKey(password) {
        // 在实际应用中，应该用密码加密私钥
        if (!password) {
            throw new Error('导出私钥需要密码');
        }

        // 简单的加密（实际应用中应该使用更安全的方法）
        const cipher = crypto.createCipher('aes192', password);
        let encrypted = cipher.update(this.privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return encrypted;
    }

    // 导入私钥
    static importPrivateKey(encryptedPrivateKey, password) {
        const decipher = crypto.createDecipher('aes192', password);
        let decrypted = decipher.update(encryptedPrivateKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        const wallet = new Wallet();
        wallet.privateKey = decrypted;

        // 从私钥重新生成公钥和地址
        // 注意：这是简化版本，实际应用中需要更复杂的处理
        wallet.address = wallet.generateAddress();

        return wallet;
    }
}

/**
 * 钱包管理器
 */
class WalletManager {
    constructor() {
        this.wallets = new Map();
        this.currentWallet = null;
    }

    createWallet(name) {
        if (this.wallets.has(name)) {
            throw new Error(`钱包 ${name} 已存在`);
        }

        const wallet = new Wallet(name);
        this.wallets.set(name, wallet);

        // 保存到文件
        wallet.save();

        console.log(`✅ 钱包创建成功: ${name}`);
        console.log(`📍 地址: ${wallet.address}`);

        return wallet;
    }

    loadWallet(filename) {
        const wallet = Wallet.load(filename);
        this.wallets.set(wallet.name, wallet);
        return wallet;
    }

    selectWallet(name) {
        const wallet = this.wallets.get(name);
        if (!wallet) {
            throw new Error(`钱包 ${name} 不存在`);
        }

        this.currentWallet = wallet;
        console.log(`🔄 已切换到钱包: ${name} (${wallet.address})`);
        return wallet;
    }

    getCurrentWallet() {
        if (!this.currentWallet) {
            throw new Error('没有选择钱包');
        }
        return this.currentWallet;
    }

    listWallets() {
        return Array.from(this.wallets.values()).map(wallet => wallet.getInfo());
    }

    // 批量导入钱包
    importWallets(directory = './wallets') {
        const walletFiles = Wallet.listWallets(directory);

        walletFiles.forEach(walletInfo => {
            try {
                const wallet = this.loadWallet(path.join(directory, walletInfo.filename));
                console.log(`📥 导入钱包: ${wallet.name} (${wallet.address})`);
            } catch (error) {
                console.error(`❌ 导入钱包失败: ${walletInfo.filename}`, error.message);
            }
        });

        console.log(`📦 共导入 ${this.wallets.size} 个钱包`);
    }

    // 备份所有钱包
    backupWallets(backupPath = './backup') {
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }

        const backup = {
            timestamp: Date.now(),
            wallets: Array.from(this.wallets.values()).map(wallet => ({
                name: wallet.name,
                address: wallet.address,
                publicKey: wallet.publicKey,
                // 注意：实际应用中不应该明文备份私钥
                privateKey: wallet.privateKey
            }))
        };

        const backupFile = path.join(backupPath, `wallets_backup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));

        console.log(`💾 钱包备份完成: ${backupFile}`);
        return backupFile;
    }
}

module.exports = { Wallet, WalletManager };
