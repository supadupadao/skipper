import '@ton/test-utils';
import { beginCell, comment, toNano } from '@ton/core';
import { Blockchain, SandboxContract, TreasuryContract  } from '@ton/sandbox';
import { JettonLock } from '../wrappers/Lock';
import { JettonMaster } from './JettonMaster';
import { JettonWallet } from './JettonWallet';
import { EXIT_CODES, LOCK_INTERVAL, OP_CODES, ZERO_ADDRESS } from './constants';

describe('Success lock behavior', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lock: SandboxContract<JettonLock>;
    let jetton_master: SandboxContract<JettonMaster>;
    let jetton_wallet: SandboxContract<JettonWallet>;
    let lock_jetton_wallet: SandboxContract<JettonWallet>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
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
