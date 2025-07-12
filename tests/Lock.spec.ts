import '@ton/test-utils';
import { Address, beginCell, Cell, comment, toNano } from '@ton/core';
import { Blockchain, SandboxContract, TreasuryContract  } from '@ton/sandbox';
import { JettonLock, loadProvideWalletAddress, loadTakeWalletAddress } from '../wrappers/Lock';
import { JettonMaster } from './JettonMaster';
import { JettonWallet } from './JettonWallet';
import { EXIT_CODES, LOCK_INTERVAL, OP_CODES, ZERO_ADDRESS } from './constants';

function validateJettonDiscovery(
    provideJettonWalletCell: Cell,
    takeJettonWalletCell: Cell,
    wallet_address: string,
    owner_address: string
) {
    const parsedProvideJettonWallet = loadProvideWalletAddress(provideJettonWalletCell.asSlice());
    expect(parsedProvideJettonWallet.$$type).toEqual('ProvideWalletAddress');
    expect(parsedProvideJettonWallet.query_id).toEqual(0n);
    expect(parsedProvideJettonWallet.owner_address).toEqualAddress(Address.parse(owner_address));
    expect(parsedProvideJettonWallet.include_address).toEqual(true);

    const parsedTakeJettonWallet = loadTakeWalletAddress(takeJettonWalletCell.asSlice());
    expect(parsedTakeJettonWallet.$$type).toEqual("TakeWalletAddress");
    expect(parsedTakeJettonWallet.query_id).toEqual(0n);
    expect(parsedTakeJettonWallet.wallet_address).toEqualAddress(Address.parse(wallet_address));
    expect(parsedTakeJettonWallet.owner_address).toEqualSlice(
        beginCell().storeMaybeRef(
            beginCell().storeAddress(Address.parse(owner_address))
        ).asSlice()
    );
}

describe('Success lock behavior', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let nonDeployer: SandboxContract<TreasuryContract>;
    let lock: SandboxContract<JettonLock>;
    let jetton_master: SandboxContract<JettonMaster>;
    let jetton_wallet: SandboxContract<JettonWallet>;
    let lock_jetton_wallet: SandboxContract<JettonWallet>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        nonDeployer = await blockchain.treasury('nonDeployer');
        jetton_master = blockchain.openContract(await JettonMaster.fromInit(deployer.address, 0n));
        jetton_wallet = blockchain.openContract(await JettonWallet.fromInit(jetton_master.address, deployer.address));
        lock = blockchain.openContract(await JettonLock.fromInit(deployer.address, jetton_master.address));
        lock_jetton_wallet = blockchain.openContract(await JettonWallet.fromInit(jetton_master.address, lock.address));

        await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        await jetton_master.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'JettonMint',
                query_id: 0n,
                amount: toNano('100500'),
                destination: deployer.address,
            }
        );
        const jettonWalletData = await jetton_wallet.getGetWalletData();
        expect(jettonWalletData.balance).toEqual(toNano('100500'));
    });

    it('should handle transfer notification', async () => {
        // User
        // -> User jetton wallet (transfer)
        // -> Lock jetton wallet (transfer internal)
        // -> Lock (transfer notification)
        // -> JettonMaster (provide address)
        // -> Lock (take address)

        let startTime = Math.floor(Date.now() / 1000);

        blockchain.now = startTime;
        const transferNotification = await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("100500"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: comment("Lock").asSlice(),
                forward_ton_amount: toNano('0.05'),
                response_destination: lock.address,
            }
        );

        expect(transferNotification.transactions).toHaveTransaction({
            from: deployer.address,
            to: jetton_wallet.address,
            success: true,
            op: OP_CODES.JettonTransfer,
        });
        expect(transferNotification.transactions).toHaveTransaction({
            from: jetton_wallet.address,
            to: lock_jetton_wallet.address,
            success: true,
            op: OP_CODES.JettonTransferInternal,
        });
        expect(transferNotification.transactions).toHaveTransaction({
            from: lock_jetton_wallet.address,
            to: lock.address,
            success: true,
            op: OP_CODES.JettonTransferNotification,
        });
        expect(transferNotification.transactions).toHaveTransaction({
            from: lock.address,
            to: jetton_master.address,
            success: true,
            op: OP_CODES.ProvideWalletAddress,
            body: beginCell()
                .storeUint(OP_CODES.ProvideWalletAddress, 32)
                .storeUint(0n, 64) // query_id
                .storeAddress(lock.address)
                .storeBit(true)
                .endCell()
        });
        expect(transferNotification.transactions).toHaveTransaction({
            from: jetton_master.address,
            to: lock.address,
            success: true,
            op: OP_CODES.TakeWalletAddress,
            body: beginCell()
                .storeUint(OP_CODES.TakeWalletAddress, 32)
                .storeUint(0n, 64) // query_id
                .storeAddress(lock_jetton_wallet.address)
                .storeAddress(lock.address)
                .endCell()
        });

        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano("100500"));
        expect(lockData.owner.toString()).toEqual(deployer.address.toString());
        //expect(lockData.unlock_date).toEqual(BigInt(blockchain.now + LOCK_INTERVAL));
    });

    it('should lock the jettons', async () => {
        let startTime = Math.floor(Date.now() / 1000);

        blockchain.now = startTime;
        const lockResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'LockJettons',
                lock_period: BigInt(LOCK_INTERVAL)
            }
        );

        expect(lockResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: true,
            op: OP_CODES.LockJettons,
        });

        const lockData = await lock.getGetLockData();
        expect(lockData.unlock_date).toEqual(BigInt(blockchain.now + LOCK_INTERVAL));
    });

    it('should not allow non-owner to lock jettons', async () => {
        // Attempt to lock jettons from a non-owner account
        const lockResult = await lock.send(
            nonDeployer.getSender(), // Not the deployer/owner
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'LockJettons',
                lock_period: BigInt(LOCK_INTERVAL)
            }
        );

        expect(lockResult.transactions).toHaveTransaction({
            from: nonDeployer.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: OP_CODES.LockJettons,
            exitCode: EXIT_CODES.InvalidOwner,
        });
    });

    it('should proxy message', async () => {
        const messagePayload = beginCell().storeUint(1337, 256).asCell();

        const proxyResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("0.05")
            },
            {
                $$type: 'SendProxyMessage',
                to: ZERO_ADDRESS,
                payload: messagePayload,
                lock_period: BigInt(LOCK_INTERVAL)
            }
        );
        expect(proxyResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            op: OP_CODES.SendProxyMessage,
            success: true,
        });        
        
        expect(proxyResult.transactions).toHaveTransaction({
            from: lock.address,
            to: ZERO_ADDRESS,
            op: OP_CODES.ProxyMessage,
            body: beginCell()
                .storeUint(OP_CODES.ProxyMessage, 32)               //Message code
                .storeAddress(deployer.address)                     //Owner
                .storeMaybeUint(LOCK_INTERVAL,64)                   //lock_period , optional used for creating a new proposal
                .storeUint(blockchain.now!! + LOCK_INTERVAL, 64)    //voter_unlock_date , used to check before voting
                .storeCoins(toNano('100500'))                       //amount
                .storeRef(messagePayload)                           //payload
                .endCell()
        });
    });

    it('should unlock jettons', async () => {
        blockchain.now = blockchain.now!! + LOCK_INTERVAL + 1;
        const unlockResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("0.05")
            },
            {
                $$type: 'UnlockJettons',
            }
        );
        expect(unlockResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: true,
            op: OP_CODES.UnlockJettons,
        });
        expect(unlockResult.transactions).toHaveTransaction({
            from: lock.address,
            success: true,
            op: OP_CODES.JettonTransfer,
        });
    });

    it('validate minter.ton.org jetton discovery 1', async () => {
        // TX https://testnet.tonviewer.com/transaction/e80142e8e3215775636e8c748e5ee486f68690fd9e2737b48ee5341d92900ccc
        validateJettonDiscovery(
            Cell.fromHex("b5ee9c7201010101003000005b2c76b973000000000000000080121b65243c0750380e7c2dd2cb85cd0d4e22bd80ca662b46528b5f177371f3c978"),
            Cell.fromHex("b5ee9c7201010201005500015bd1735400000000000000000080185c00699fb594fd4f969e4bcf464866d2620c1b9f4830ad24a1fc7072a733067801004380121b65243c0750380e7c2dd2cb85cd0d4e22bd80ca662b46528b5f177371f3c970"),
            "kQDC4ANM_ayn6ny08l56MkM2kxBg3PpBhWklD-ODlTmYM0wm",
            "kQCQ2ykh4DqBwHPhbpZcLmhqcRXsBlMxWjKUWvi7m4-eS2ZU"
        );
    });

    it('validate minter.ton.org jetton discovery 2', async () => {
        // TX https://testnet.tonviewer.com/transaction/e597041abf9f766bfadbbec9a8b64e8b2975c418e2caa7f4a9aa78448ba1ed6d
        validateJettonDiscovery(
            Cell.fromHex("b5ee9c7201010101003000005b2c76b9730000000000000000800a00719576e4e04ed8f23109a9b4934f412ac824499d4a68155545c52b829baef8"),
            Cell.fromHex("b5ee9c7201010201005500015bd17354000000000000000000801186322fb8fbb745ba91becc67e7f69831988f98a58f7c3755e4230714c011ebf8010043800a00719576e4e04ed8f23109a9b4934f412ac824499d4a68155545c52b829baef0"),
            "kQCMMZF9x926LdSN9mM_P7TBjMR8xSx74bqvIRg4pgCPX2gy",
            "kQBQA4yrtycCdseRiE1NpJp6CVZBIkzqU0Cqqi4pXBTdd56N"
        );
    });

    it('validate random jetton discovery', async () => {
        // TX https://testnet.tonviewer.com/transaction/07f2eb791c1c393d374dd817ea091e503cc764514e357d923884b32786a4f3fa
        validateJettonDiscovery(
            Cell.fromHex("b5ee9c7201010101003000005b2c76b9730000000000000000801cefb507b28f2b9a56974c3c476b608d5f6f2dae14958c625c4bcd7bc0f701aa78"),
            Cell.fromHex("b5ee9c7201010201005500015bd17354000000000000000000800a6b85bdc324aa200130107757710c7e867ac57419075aa8d6ab857dad5f35f9d8010043801cefb507b28f2b9a56974c3c476b608d5f6f2dae14958c625c4bcd7bc0f701aa70"),
            "EQBTXC3uGSVRAAmAg7q7iGP0M9YroMg61Ua1XCvtavmvzniK",
            "EQDnfag9lHlc0rS6YeI7WwRq-3ltcKSsYxLiXmveB7gNUzNO",
        );
    });

    // // Seems like Ston.fi Test jetton is broken, so we skip this test for now
    // it('validate Ston.fi Test RED jetton discovery', async () => {
    //     // TX https://testnet.tonviewer.com/transaction/cfe69a34c1da4995c41a4906fbc33a3e8ffd02e0b733743500e16da47cf8fcff
    //     validateJettonDiscovery(
    //         Cell.fromHex("b5ee9c7201010101003000005b2c76b9730000000000000000801ac51523aa9f8e8c0e5e19e6325dd3fbcf1b1c79e722aaf6e9290e0576d00e58d8"),
    //         Cell.fromHex("b5ee9c72010102010034000119d17354000000000000000000c0010043801ac51523aa9f8e8c0e5e19e6325dd3fbcf1b1c79e722aaf6e9290e0576d00e58d0"),
    //         "kQClCMHCtiz1ejxrhiTIus4xYuNgiOPJ23E3KBY2xxyCBz76",
    //         "kQDWKKkdVPx0YHLwzzGS7p_eeNjjzzkVV7dJSHArtoByxhQh"
    //     );
    // });
});


describe('Error handling for lock', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lock: SandboxContract<JettonLock>;
    let jetton_master: SandboxContract<JettonMaster>;
    let jetton_wallet: SandboxContract<JettonWallet>;
    let other_contract: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        jetton_master = blockchain.openContract(await JettonMaster.fromInit(deployer.address, 0n));
        jetton_wallet = blockchain.openContract(await JettonWallet.fromInit(jetton_master.address, deployer.address));
        other_contract = await blockchain.treasury('other_contract');
        lock = blockchain.openContract(await JettonLock.fromInit(deployer.address, jetton_master.address));

        await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        await jetton_master.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'JettonMint',
                query_id: 0n,
                amount: toNano('100500'),
                destination: deployer.address,
            }
        );
        const jettonWalletData = await jetton_wallet.getGetWalletData();
        expect(jettonWalletData.balance).toEqual(toNano('100500'));
    });

    it('should validate jetton wallet address', async () => {        
        const transferNotification1 = await lock.send(
            other_contract.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'JettonTransferNotification',
                query_id: 0n,
                amount: toNano('100500'),
                sender: deployer.address,
                forward_payload: beginCell().asSlice(),
            }
        );

        const transferNotification2 = await lock.send(
            other_contract.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'JettonTransferNotification',
                query_id: 0n,
                amount: toNano('100500'),
                sender: deployer.address,
                forward_payload: beginCell().asSlice(),
            }
        );
        expect(transferNotification2.transactions).toHaveTransaction({
            from: other_contract.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: OP_CODES.JettonTransferNotification,
            exitCode: EXIT_CODES.InvalidOwner,
        });
    });

    it('should validate owner address in send proxy', async () => {
        const proxyResult = await lock.send(
            other_contract.getSender(),
            {
                value: toNano("0.05")
            },
            {
                $$type: 'SendProxyMessage',
                to: ZERO_ADDRESS,
                payload: beginCell().endCell(),
                lock_period: null
            }
        );
        expect(proxyResult.transactions).toHaveTransaction({
            from: other_contract.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: OP_CODES.SendProxyMessage,
            exitCode: EXIT_CODES.InvalidOwner,
        });
    });

    it('should validate message balance in send proxy', async () => {
        const proxyResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("0.01")
            },
            {
                $$type: 'SendProxyMessage',
                to: ZERO_ADDRESS,
                payload: beginCell().endCell(),
                lock_period: null
            }
        );
        expect(proxyResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: OP_CODES.SendProxyMessage,
            exitCode: EXIT_CODES.NeedFee,
        });
    });

    it('should validate owner address in unlock', async () => {
        const unlockResult = await lock.send(
            other_contract.getSender(),
            {
                value: toNano("0.05")
            },
            {
                $$type: 'UnlockJettons',
            }
        );
        expect(unlockResult.transactions).toHaveTransaction({
            from: other_contract.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: OP_CODES.UnlockJettons,
            exitCode: EXIT_CODES.InvalidOwner,
        });
    });

    it('should validate message balance in send proxy', async () => {
        const unlockResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("0.01")
            },
            {
                $$type: 'UnlockJettons',
            }
        );
        expect(unlockResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: OP_CODES.UnlockJettons,
            exitCode: EXIT_CODES.NeedFee,
        });
    });

    it('should not unlock until unlock date', async () => {
        let startTime = Math.floor(Date.now() / 1000);

        blockchain.now = startTime;
        const transferNotification = await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("100500"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: comment("Lock").asSlice(),
                forward_ton_amount: toNano('0.05'),
                response_destination: lock.address,
            }
        );
        expect(transferNotification.transactions).toHaveTransaction({
            to: lock.address,
            success: true,
            op: OP_CODES.JettonTransferNotification,
        });

      
       

        const lockResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'LockJettons',
                lock_period: BigInt(LOCK_INTERVAL)
            }
        );

        expect(lockResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: true,
            op: OP_CODES.LockJettons,
        });

        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano("100500"));
        expect(lockData.owner.toString()).toEqual(deployer.address.toString());
        expect(lockData.unlock_date).toEqual(BigInt(blockchain.now + LOCK_INTERVAL));

        const unlockResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("0.05")
            },
            {
                $$type: 'UnlockJettons',
            }
        );
        expect(unlockResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: OP_CODES.UnlockJettons,
            exitCode: EXIT_CODES.UnlockDateNotArrived,
        });
    });
});
