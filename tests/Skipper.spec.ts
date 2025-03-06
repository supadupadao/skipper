import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { address, beginCell, toNano } from '@ton/core';
import { Skipper } from '../wrappers/Skipper';
import '@ton/test-utils';
import { JettonMaster } from './JettonMaster';
import { JettonWallet } from './JettonWallet';
import { JettonLock } from '../wrappers/Lock';
import { Proposal } from '../wrappers/Proposal';
import { EXIT_CODES, LOCK_INTERVAL, OP_CODES } from './constants';

describe('Integration tests', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jetton_master: SandboxContract<JettonMaster>;
    let jetton_wallet: SandboxContract<JettonWallet>;
    let skipper: SandboxContract<Skipper>;
    let lock: SandboxContract<JettonLock>;
    let proposal: SandboxContract<Proposal>;

    beforeAll(async () => {
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
                amount: toNano('1337000'),
                destination: deployer.address,
            }
        );
        const jettonWalletData = await jetton_wallet.getGetWalletData();
        expect(jettonWalletData.balance).toEqual(toNano('1337000'));

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
                amount: toNano("1337000"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: beginCell().asSlice(),
                forward_ton_amount: toNano("0.05"),
                response_destination: lock.address,
            }
        );
        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano('1337000'));
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
                lock_period: null,
                payload: beginCell()
                    .storeUint(OP_CODES.RequestNewProposal, 32)
                    .storeAddress(deployer.address)
                    .storeRef(beginCell().endCell())
                    .asCell(),
            }
        );
        expect(createProposalResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: true,
            op: OP_CODES.SendProxyMessage,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: lock.address,
            to: skipper.address,
            success: true,
            op: OP_CODES.ProxyMessage,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.InitProposal,
        });
        expect(createProposalResult.transactions).toHaveTransaction({
            from: proposal.address,
            // to: voter.address,
            success: true,
            op: OP_CODES.InitVoter,
        });

        const proposalData = await proposal.getGetProposalData();
        expect(proposalData?.receiver.toString()).toEqual(deployer.address.toString());
        // TODO validate proposal data payload
    });

    it('should increase vote for proposal', async () => {

        //Mint some jettons
        await jetton_master.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'JettonMint',
                query_id: 0n,
                amount: toNano('500'),
                destination: deployer.address,
            }
        );
        const jettonWalletData = await jetton_wallet.getGetWalletData();
        expect(jettonWalletData.balance).toEqual(toNano('500'));   
        
        //lock them
        await jetton_wallet.send(
            deployer.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'JettonTransfer',
                query_id: 0n,
                amount: toNano("500"),
                destination: lock.address,
                custom_payload: null,
                forward_payload: beginCell().asSlice(),
                forward_ton_amount: toNano("0.05"),
                response_destination: lock.address,
            }
        );

        const lockData = await lock.getGetLockData();
        expect(lockData.amount).toEqual(toNano('1337500'));

        //Increase vote
        const voteProposalResult = await lock.send(
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
        expect(voteProposalResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lock.address,
            success: true,
            op: OP_CODES.SendProxyMessage,
        });
        expect(voteProposalResult.transactions).toHaveTransaction({
            from: lock.address,
            to: skipper.address,
            success: true,
            op: OP_CODES.ProxyMessage,
        });
        expect(voteProposalResult.transactions).toHaveTransaction({
            from: skipper.address,
            // to: voter.address,
            success: true,
            op: OP_CODES.UpdateVoterBalance,
        });
        expect(voteProposalResult.transactions).toHaveTransaction({
            // from: voter.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.UpdateVotes,
        });
    });

    it('should execute proposal', async () => {
        const executeResult = await proposal.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'ExecuteProposal',
            }
        );
        expect(executeResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.ExecuteProposal,
        });
        expect(executeResult.transactions).toHaveTransaction({
            from: proposal.address,
            to: deployer.address,
            success: true,
        });
    });

    it('should not double execute proposal', async () => {
        const executeResult = await proposal.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: 'ExecuteProposal',
            }
        );
        expect(executeResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.ExecuteProposal,
            exitCode: EXIT_CODES.AlreadyExecuted,
        });
    });

    it('should compute proposal address', async () => {
        let proposal_address = await skipper.getGetProposalAddress(1n);
        expect(proposal_address).toEqualAddress(proposal.address);
    });

    it('should compute lock address', async () => {
        let lock_address = await skipper.getGetLockAddress(deployer.address);
        expect(lock_address).toEqualAddress(lock.address);
    });
});