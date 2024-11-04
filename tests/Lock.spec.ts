import '@ton/test-utils';
import { address, beginCell, toNano } from '@ton/core';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { JettonLock } from '../wrappers/Lock';

const LOCK_INTERVAL = 1209600;
const ZERO_ADDRESS = address("0:0000000000000000000000000000000000000000000000000000000000000000");

describe('Success lock behavior', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lock: SandboxContract<JettonLock>;
    let jetton_wallet: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        jetton_wallet = await blockchain.treasury('jetton_wallet');
        lock = blockchain.openContract(await JettonLock.fromInit(deployer.address, jetton_wallet.address));

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
    });

    it('should handle transfer notification', async () => {
        let startTime = Math.floor(Date.now() / 1000);

        blockchain.now = startTime;
        const transferNotification = await lock.send(
            jetton_wallet.getSender(),
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
        expect(transferNotification.transactions).toHaveTransaction({
            from: jetton_wallet.address,
            to: lock.address,
            success: true,
            deploy: false,
            op: 0x7362d09c,
        });

        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano("100500"));
        expect(lockData.owner.toString()).toEqual(deployer.address.toString());
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
            }
        );
        expect(proxyResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            op: 0x690101,
            success: true,
        });
        expect(proxyResult.transactions).toHaveTransaction({
            from: lock.address,
            to: ZERO_ADDRESS,
            op: 0x690102,
            body: beginCell()
                .storeUint(0x690102, 32)
                .storeAddress(deployer.address)
                .storeUint(blockchain.now!! + LOCK_INTERVAL, 64)
                .storeCoins(toNano('100500'))
                .storeRef(messagePayload)
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
            op: 0x690103,
        });
        expect(unlockResult.transactions).toHaveTransaction({
            from: lock.address,
            to: jetton_wallet.address,
            success: true,
            op: 0x0f8a7ea5,
        });
    });
});

describe('Error handling for lock', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lock: SandboxContract<JettonLock>;
    let jetton_wallet: SandboxContract<TreasuryContract>;
    let other_contract: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        jetton_wallet = await blockchain.treasury('jetton_wallet');
        other_contract = await blockchain.treasury('other_contract');
        lock = blockchain.openContract(await JettonLock.fromInit(deployer.address, jetton_wallet.address));

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
    });

    it('should validate jetton wallet address', async () => {
        const transferNotification = await lock.send(
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
        expect(transferNotification.transactions).toHaveTransaction({
            from: other_contract.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: 0x7362d09c,
            exitCode: 132,
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
            }
        );
        expect(proxyResult.transactions).toHaveTransaction({
            from: other_contract.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: 0x690101,
            exitCode: 132,
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
            }
        );
        expect(proxyResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: false,
            deploy: false,
            op: 0x690101,
            exitCode: 6901,
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
            op: 0x690103,
            exitCode: 132,
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
            op: 0x690103,
            exitCode: 6901,
        });
    });

    it('should not unlock until unlock date', async () => {
        let startTime = Math.floor(Date.now() / 1000);

        blockchain.now = startTime;
        const transferNotification = await lock.send(
            jetton_wallet.getSender(),
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
        expect(transferNotification.transactions).toHaveTransaction({
            from: jetton_wallet.address,
            to: lock.address,
            success: true,
            deploy: false,
            op: 0x7362d09c,
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
            op: 0x690103,
            exitCode: 6902,
        });
    });
});
