import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { address, beginCell, toNano } from '@ton/core';
import { Skipper } from '../wrappers/Skipper';
import '@ton/test-utils';
import { JettonMaster } from './JettonMaster';
import { JettonWallet } from './JettonWallet';
import { JettonLock } from '../wrappers/Lock';
import { Proposal } from '../wrappers/Proposal';

describe('Integration tests', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jetton_master: SandboxContract<JettonMaster>;
    let jetton_wallet: SandboxContract<JettonWallet>;
    let skipper: SandboxContract<Skipper>;
    let lock: SandboxContract<JettonLock>;
    let proposal: SandboxContract<Proposal>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        jetton_master = blockchain.openContract(await JettonMaster.fromInit(deployer.address));
        jetton_wallet = blockchain.openContract(await JettonWallet.fromInit(jetton_master.address, deployer.address));
        skipper = blockchain.openContract(await Skipper.fromInit(jetton_master.address));
        lock = blockchain.openContract(await JettonLock.fromInit(deployer.address, jetton_master.address));
        proposal = blockchain.openContract(await Proposal.fromInit(skipper.address, 1n));

        const deployResult = await skipper.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: skipper.address,
            deploy: true,
            success: true,
        });

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

        await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.05')
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("100500"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: beginCell().asSlice(),
                forward_ton_amount: toNano("0.05"),
                response_destination: lock.address,
            }
        );
        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano('100500'));
    });

    it('should create proposal', async () => {
        const createProposalResult = await lock.send(
            deployer.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: 'SendProxyMessage',
                to: skipper.address,
                payload: beginCell()
                    .storeUint(0x690401, 32)
                    .storeAddress(deployer.address)
                    .storeRef(beginCell().endCell())
                    .asCell(),
            }
        );
        expect(createProposalResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: true,
            op: 0x690101,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: lock.address,
            to: skipper.address,
            success: true,
            op: 0x690102,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: proposal.address,
            success: true,
            op: 0x690201,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: proposal.address,
            // to: voter.address,
            success: true,
            op: 0x690301,
        });
    });
});
