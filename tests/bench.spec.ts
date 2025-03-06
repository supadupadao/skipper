import '@ton/test-utils';
import { beginCell, comment, toNano } from '@ton/core';
import { Blockchain, BlockchainTransaction, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { JettonLock } from '../wrappers/Lock';
import { JettonMaster } from './JettonMaster';
import { JettonWallet } from './JettonWallet';
import { Skipper } from '../wrappers/Skipper';
import { LOCK_INTERVAL, OP_CODES } from './constants';
import { Proposal } from '../wrappers/Proposal';

const ROUND_COINS = 1000000n;

function roundCoins(coins: bigint): bigint {
    return coins / ROUND_COINS * ROUND_COINS;
}

function measureGas(transactions: BlockchainTransaction[]): bigint {
    const consumption = transactions.reduce((prev, curr) => {
        prev += curr.totalFees.coins;
        return prev;
    }, 0n);

    return roundCoins(consumption);
}

const GAS_CONSUMPTION_VALUES = {
    DEPLOY_SKIPPER: toNano('0.039'),
    DEPLOY_LOCK: toNano('0.022'),
    MINT_JETTON: toNano('0.044'),
    TRANSFER_JETTON: toNano('0.028'),
    UNLOCK_JETTON: toNano('0.028'),
    NEW_PROPOSAL: toNano('0.034'),
    VOTE_PROPOSAL: toNano('0.031'),
    EXECUTE_PROPOSAL: toNano('0.005'),
}

describe('Gas consumption benchmark', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lock: SandboxContract<JettonLock>;
    let skipper: SandboxContract<Skipper>;
    let proposal: SandboxContract<Proposal>;
    let jetton_master: SandboxContract<JettonMaster>;
    let jetton_wallet: SandboxContract<JettonWallet>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        jetton_master = blockchain.openContract(await JettonMaster.fromInit(deployer.address));
        jetton_wallet = blockchain.openContract(await JettonWallet.fromInit(jetton_master.address, deployer.address));
        lock = blockchain.openContract(await JettonLock.fromInit(deployer.address, jetton_master.address));
        skipper = blockchain.openContract(await Skipper.fromInit(jetton_master.address));
        proposal = blockchain.openContract(await Proposal.fromInit(skipper.address, 1n));
    });

    it('measure deploy', async () => {
        const deploySkipper = await skipper.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deploySkipper.transactions).not.toHaveTransaction({ success: false });
        expect(measureGas(deploySkipper.transactions)).toEqual(GAS_CONSUMPTION_VALUES.DEPLOY_SKIPPER)

        const deployLock = await lock.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployLock.transactions).not.toHaveTransaction({ success: false });
        expect(measureGas(deployLock.transactions)).toEqual(GAS_CONSUMPTION_VALUES.DEPLOY_LOCK)
    });

    it('measure locking tokens', async () => {
        let startTime = Math.floor(Date.now() / 1000);
        blockchain.now = startTime;

        const mintTokens = await jetton_master.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'JettonMint',
                query_id: 0n,
                amount: toNano('1337500'),
                destination: deployer.address,
            }
        );
        expect(mintTokens.transactions).not.toHaveTransaction({ success: false });
        expect(measureGas(mintTokens.transactions)).toEqual(GAS_CONSUMPTION_VALUES.MINT_JETTON);
        const jettonWalletData = await jetton_wallet.getGetWalletData();
        expect(jettonWalletData.balance).toEqual(toNano('1337500'));

        await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("1337500"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: comment("Lock").asSlice(),
                forward_ton_amount: toNano('0.05'),
                response_destination: lock.address,
            }
        );
        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano('1337500'));
    });

    it('measure unlocking tokens', async () => {
        blockchain.now = blockchain.now!! + LOCK_INTERVAL + 1;

        const unlockJettons = await lock.send(
            deployer.getSender(),
            {
                value: toNano("0.05")
            },
            {
                $$type: 'UnlockJettons',
            }
        );
        const jettonWalletData = await jetton_wallet.getGetWalletData();
        expect(jettonWalletData.balance).toEqual(toNano('1337500'));
    });

    it('measure new proposal', async () => {
        await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("1337000"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: comment("Lock").asSlice(),
                forward_ton_amount: toNano('0.05'),
                response_destination: lock.address,
            }
        );
        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano('1337000'));

        const newProposal = await lock.send(
            deployer.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: 'SendProxyMessage',
                to: skipper.address,
                lock_period: null,
                payload: beginCell()
                    .storeUint(OP_CODES.RequestNewProposal, 32)
                    .storeAddress(deployer.address)
                    .storeRef(beginCell().endCell())
                    .asCell(),
            }
        );
        expect(newProposal.transactions).not.toHaveTransaction({ success: false })
        expect(measureGas(newProposal.transactions)).toEqual(GAS_CONSUMPTION_VALUES.NEW_PROPOSAL);
    });

    it('measure vote proposal', async () => {
        await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("500"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: comment("Lock").asSlice(),
                forward_ton_amount: toNano('0.05'),
                response_destination: lock.address,
            }
        );
        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano('1337500'));

        const voteProposal = await lock.send(
            deployer.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: 'SendProxyMessage',
                to: skipper.address,
                lock_period: BigInt(LOCK_INTERVAL),
                payload: beginCell()
                    .storeUint(OP_CODES.VoteForProposal, 32)
                    .storeUint(1, 64)
                    .storeUint(1, 1)
                    .asCell(),
            }
        );
        expect(voteProposal.transactions).not.toHaveTransaction({ success: false });
        expect(measureGas(voteProposal.transactions)).toEqual(GAS_CONSUMPTION_VALUES.VOTE_PROPOSAL);
    });

    it('measure execute proposal', async () => {
        const executeProposal = await proposal.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'ExecuteProposal',
            }
        );
        expect(executeProposal.transactions).not.toHaveTransaction({ success: false });
        expect(measureGas(executeProposal.transactions)).toEqual(GAS_CONSUMPTION_VALUES.EXECUTE_PROPOSAL);
    });
});
