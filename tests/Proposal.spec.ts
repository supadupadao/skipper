import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import '@ton/test-utils';
import { Proposal } from '../wrappers/Proposal';
import { beginCell, toNano } from '@ton/core';
import { Voter } from '../wrappers/Voter';
import { EXIT_CODES, LOCK_INTERVAL, OP_CODES } from './constants';

describe('Proposal', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let skipper: SandboxContract<TreasuryContract>;
    let voter: SandboxContract<Voter>;
    let proposal: SandboxContract<Proposal>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        skipper = await blockchain.treasury('skipper');

        proposal = blockchain.openContract(await Proposal.fromInit(skipper.address, 1n));
        voter = blockchain.openContract(await Voter.fromInit(skipper.address, proposal.address, deployer.address));
    });

    it('should not allow to update votes without init', async () => {
        let startTime = Math.floor(Date.now() / 1000);
        blockchain.now = startTime;

        let result = await proposal.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: "UpdateVotes",
                amount: toNano("100500"),
                owner: deployer.address,
                vote: 1n,
                voter_unlock_date: BigInt(startTime + LOCK_INTERVAL),                
            }
        );
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.UpdateVotes,
            exitCode: EXIT_CODES.NotInitialized,
        });      
    });

    it('should not allow to execute proposal without init', async () => {
        let startTime = Math.floor(Date.now() / 1000);
        blockchain.now = startTime;

        let result = await proposal.send(
            deployer.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: "ExecuteProposal"                            
            }
        );
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.ExecuteProposal,
            exitCode: EXIT_CODES.NotInitialized,
        });      
    });

    it('should not double init proposal', async () => {
        let firstInitResult = await proposal.send(
            skipper.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: "InitProposal",
                amount: toNano("100500"),
                initiator: deployer.address,
                lock_period: null,
                payload: {
                    $$type: 'ProposalPayload',
                    body: beginCell().asCell(),
                    receiver: deployer.address,
                }
            }
        );
        expect(firstInitResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.InitProposal,
        });

        let otherInitResult = await proposal.send(
            skipper.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: "InitProposal",
                amount: toNano("100500"),
                initiator: deployer.address,
                lock_period: null,
                payload: {
                    $$type: 'ProposalPayload',
                    body: beginCell().asCell(),
                    receiver: deployer.address,
                }
            }
        );
        expect(otherInitResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.InitProposal,
            exitCode: EXIT_CODES.AlreadyInitialized,
        });
    });

    it('should not allow voting after expired', async () => {
        let startTime = Math.floor(Date.now() / 1000);

        blockchain.now = startTime;

        await proposal.send(
            skipper.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: "InitProposal",
                amount: toNano("100500"),
                initiator: deployer.address,
                lock_period: null,
                payload: {
                    $$type: 'ProposalPayload',
                    body: beginCell().asCell(),
                    receiver: deployer.address,
                }
            }
        );

        let successUpdateVotesResult = await voter.send(
            skipper.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: "UpdateVoterBalance",
                vote: 1n,
                amount: toNano("100600"),
                voter_unlock_date: BigInt(startTime + LOCK_INTERVAL),                
            }
        );
        expect(successUpdateVotesResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: voter.address,
            success: true,
            op: OP_CODES.UpdateVoterBalance,
        });
        expect(successUpdateVotesResult.transactions).toHaveTransaction({
            from: voter.address,
            to: proposal.address,
            success: true,
            op: OP_CODES.UpdateVotes,
        });

        blockchain.now = blockchain.now!! + LOCK_INTERVAL + 1;

        let failedUpdateVotesResult = await voter.send(
            skipper.getSender(),
            {
                value: toNano("0.05"),
            },
            {
                $$type: "UpdateVoterBalance",
                vote: 1n,
                amount: toNano("100700"),
                voter_unlock_date: BigInt(startTime + LOCK_INTERVAL),                
            }
        );
        expect(failedUpdateVotesResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: voter.address,
            success: true,
            op: OP_CODES.UpdateVoterBalance,
        });
        expect(failedUpdateVotesResult.transactions).toHaveTransaction({
            from: voter.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.UpdateVotes,
            exitCode: EXIT_CODES.ProposalExpired,
        });
    });

    it('should fail if balance is not enough storage fees', async () => {
        let startTime = Math.floor(Date.now() / 1000);
        blockchain.now = startTime;
        
        const duration = 3600 * 24 * 365 * 15; // 15 years
        const longUnlockDate = Math.floor(Date.now() / 1000 + duration);   
    
        const result = await proposal.send(
            skipper.getSender(),
            {
                value: toNano("0.03"), 
            },
            {
                $$type: "InitProposal",
                amount: toNano("0.03"),
                initiator: deployer.address,
                lock_period: BigInt(longUnlockDate), 
                payload: {
                    $$type: 'ProposalPayload',
                    body: beginCell().asCell(),
                    receiver: deployer.address,
                }
            }
        );
    
        expect(result.transactions).toHaveTransaction({
            from: skipper.address,
            to: proposal.address,
            success: false,
            op: OP_CODES.InitProposal,
            exitCode: EXIT_CODES.InsufficientStorageFees,
        });
    });
    
});