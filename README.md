# 区块链模拟器 (Blockchain Simulator)

一个功能完整的区块链模拟器，使用 Node.js 构建，包含挖矿、钱包管理、代币系统、交易处理和区块链浏览器等核心功能。

## ✨ 主要特性

### 🔗 核心区块链功能
- **完整的区块链实现** - 包含区块、交易、哈希验证等核心机制
- **工作量证明 (PoW)** - 可调节难度的挖矿算法
- **交易验证** - 数字签名验证和余额检查
- **分叉处理** - 自动选择最长链

### 💰 钱包系统
- **钱包创建和管理** - 生成公私钥对和地址
- **数字签名** - 使用椭圆曲线加密算法
- **余额查询** - 实时查看账户余额
- **交易历史** - 完整的交易记录

### ⛏️ 挖矿功能
- **单独挖矿** - 独立矿工挖矿
- **矿池挖矿** - 多矿工协作挖矿
- **挖矿奖励** - 自动分配区块奖励
- **难度调整** - 动态调整挖矿难度

### 🪙 代币系统
- **代币创建** - 创建自定义代币
- **代币转账** - 支持代币之间的转账
- **代币余额** - 查看各种代币余额
- **代币管理** - 完整的代币生命周期管理

### 🌐 Web 界面
- **区块链浏览器** - 查看区块和交易详情
- **交易可视化** - 实时交易流程展示
- **转账界面** - 用户友好的转账操作
- **代币管理界面** - 代币创建和管理

## 🚀 快速开始

### 环境要求
- Node.js 14.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd blockchain-simulator
```

2. **安装依赖**
```bash
npm install
```

3. **启动模拟器**
```bash
npm start
```

## 📖 使用指南

### 命令行界面

启动主程序后，您将看到交互式菜单：

```
🌟 区块链模拟器 - 主菜单
1. 💰 钱包管理
2. 💸 发送交易
3. ⛏️ 挖矿管理
4. 🪙 代币管理
5. 🔍 区块链浏览器
6. 📊 查看统计
7. 🧪 演示模式
8. ❌ 退出
```

### 可用脚本

```bash
# 启动主程序
npm start

# 启动单独的矿工
npm run miner

# 启动钱包管理
npm run wallet

# 启动区块链浏览器
npm run explorer

# 开发模式（自动重启）
npm run dev

# 测试可视化工具
npm run test-visualizer
```

### Web 界面

启动程序后，可以通过浏览器访问以下页面：

- **主页**: `http://localhost:3000` - 区块链概览
- **区块浏览器**: `http://localhost:3000/blocks.html` - 查看所有区块
- **交易记录**: `http://localhost:3000/transactions.html` - 查看交易历史
- **转账页面**: `http://localhost:3000/transfer.html` - 发送交易
- **代币管理**: `http://localhost:3000/tokens.html` - 管理代币
- **交易可视化**: `http://localhost:3000/transaction-visualizer.html` - 实时交易展示

## 🏗️ 项目结构

```
blockchain-simulator/
├── src/                          # 核心源代码
│   ├── blockchain.js            # 区块链核心逻辑
│   ├── wallet.js                # 钱包管理
│   ├── miner.js                 # 挖矿功能
│   └── explorer.js              # 区块链浏览器
├── public/                       # Web 界面文件
│   ├── index.html               # 主页
│   ├── blocks.html              # 区块浏览器
│   ├── transactions.html        # 交易记录
│   ├── transfer.html            # 转账页面
│   ├── tokens.html              # 代币管理
│   └── transaction-visualizer.html # 交易可视化
├── wallets/                      # 钱包数据存储
├── index.js                      # 主入口文件
├── test-visualizer.js           # 测试工具
├── tree.js                      # 项目结构展示
└── package.json                 # 项目配置
```

## 🔧 核心组件

### Blockchain 类
- 管理区块链状态
- 处理交易验证
- 实现工作量证明
- 管理代币系统

### Wallet 类
- 生成密钥对
- 创建数字签名
- 管理地址

### Miner 类
- 执行挖矿算法
- 创建新区块
- 获取挖矿奖励

### Explorer 类
- 提供 Web API
- 展示区块链数据
- 处理用户交互

## 🎯 功能演示

### 创建钱包
```javascript
const wallet = walletManager.createWallet('alice');
console.log(`地址: ${wallet.address}`);
```

### 发送交易
```javascript
const transaction = new Transaction(
    fromAddress,
    toAddress,
    amount,
    'transfer'
);
transaction.signTransaction(wallet.keyPair);
blockchain.addTransaction(transaction);
```

### 挖矿
```javascript
const miner = new Miner(blockchain, minerAddress, 'Miner Name');
miner.startMining();
```

### 创建代币
```javascript
blockchain.createToken('MyToken', 'MTK', 1000000, ownerAddress);
```

## 🛠️ 技术栈

- **Node.js** - 运行时环境
- **Express.js** - Web 服务器
- **WebSocket** - 实时通信
- **Crypto** - 加密算法
- **UUID** - 唯一标识符生成
- **Chalk** - 终端颜色输出
- **Inquirer** - 交互式命令行
- **QRCode** - 二维码生成

## 📊 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Interface │    │  Command Line   │    │   API Server    │
│                 │    │   Interface     │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │    Blockchain Core        │
                    │  ┌─────────────────────┐  │
                    │  │     Blockchain      │  │
                    │  │     Transaction     │  │
                    │  │       Block         │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
    ┌─────┴─────┐           ┌─────┴─────┐           ┌─────┴─────┐
    │  Wallet   │           │   Miner   │           │  Explorer │
    │  Manager  │           │   Pool    │           │  Service  │
    └───────────┘           └───────────┘           └───────────┘
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔮 未来计划

- [ ] 实现智能合约功能
- [ ] 添加更多共识算法（PoS, DPoS）
- [ ] 网络节点通信
- [ ] 移动端应用
- [ ] 性能优化和扩展性改进
- [ ] 更多代币标准支持

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 Issue
- 发送 Pull Request
- 邮件联系项目维护者

---

⭐ 如果这个项目对您有帮助，请给它一个星标！
