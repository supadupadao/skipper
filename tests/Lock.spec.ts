import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { JettonLock } from '../wrappers/Lock';
import '@ton/test-utils';
import { address, beginCell, toNano } from '@ton/core';

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
            }, {
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
        });
    });

    it('should unlock jettons', async () => {
        blockchain.now = blockchain.now!! + LOCK_INTERVAL + 1;
        const unlockResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("0.05")
            }, {
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
