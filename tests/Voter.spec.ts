import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {  toNano } from '@ton/core';
import '@ton/test-utils';
import { EXIT_CODES, OP_CODES } from './constants';
import { Voter } from '../wrappers/Voter';
import { exitCode } from 'process';

describe('Voter', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let skipper: SandboxContract<TreasuryContract>;
    let proposal: SandboxContract<TreasuryContract>;
    let voter: SandboxContract<Voter>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        skipper = await blockchain.treasury('skipper');
        proposal = await blockchain.treasury('proposal');

        voter = blockchain.openContract(await Voter.fromInit(skipper.address, proposal.address, deployer.address));
    });
    
    it('should not double init voter', async () => {
        let firstInitResult = await voter.send(
            proposal.getSender(),
            {
                value: toNano("1"),
            },
            {
                $$type: 'InitVoter',
                amount: toNano("100"),
            }
        );
        expect(firstInitResult.transactions).toHaveTransaction({
            from: proposal.address,
            to: voter.address,
            success: true,
            op: OP_CODES.InitVoter,
        });

        const secondInitResult = await voter.send(
            proposal.getSender(),
            {
                value: toNano("1"),
            },
            {
                $$type: 'InitVoter',
                amount: toNano("200"),
            }
        );
    
        expect(secondInitResult.transactions).toHaveTransaction({
            from: proposal.address,
            to: voter.address,
            success: false, 
            exitCode: EXIT_CODES.AlreadyInitialized, 
        });
    });

    it('should initialize voter on first UpdateVoterBalance call', async () => {
        const updateBalanceResult = await voter.send(
            skipper.getSender(),
            {
                value: toNano("1"),
            },
            {
                $$type: 'UpdateVoterBalance',
                amount: toNano("100"),
                vote: BigInt(1),
                voter_unlock_date: BigInt(Math.floor(Date.now() / 1000 + 3600)) 
            }
        );
    
        expect(updateBalanceResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: voter.address,
            success: true,
            op: OP_CODES.UpdateVoterBalance,
        });
    });
    
    
    it('should fail initialization from unauthorized sender', async () => {
        const result = await voter.send(
            deployer.getSender(),
            { value: toNano("1") },
            { $$type: 'InitVoter', amount: toNano("100") }
        );

        expect(result.transactions).toHaveTransaction({
            success: false,
            exitCode: EXIT_CODES.InvalidOwner,
        });
    });    

    it('should fail UpdateVoterBalance from unauthorized sender', async () => {
        // Unauthorized sender
        const result = await voter.send(
            proposal.getSender(),
            { value: toNano("1") },
            {
                $$type: 'UpdateVoterBalance',
                amount: toNano("100"),
                vote: BigInt(1),
                voter_unlock_date: BigInt(Math.floor(Date.now() / 1000 + 3600)),
            }
        );
    
        expect(result.transactions).toHaveTransaction({
            success: false,
            exitCode: EXIT_CODES.InvalidOwner, // Unauthorized sender should fail
        });
    });

    it('should allow increasing vote', async () => {
        // First vote
        const firstVoteResult = await voter.send(
            skipper.getSender(),
            {
                value: toNano("1"),
            },
            {
                $$type: 'UpdateVoterBalance',
                amount: toNano("100"),
                vote: BigInt(1),
                voter_unlock_date: BigInt(Math.floor(Date.now() / 1000 + 3600))
            }
        );
    
        expect(firstVoteResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: voter.address,
            success: true,
            op: OP_CODES.UpdateVoterBalance,
        });
    
        // Second vote (should fail)
        const secondVoteResult = await voter.send(
            skipper.getSender(),
            {
                value: toNano("1"),
            },
            {
                $$type: 'UpdateVoterBalance',
                amount: toNano("150"),  // Different amount to ensure it's not the same input
                vote: BigInt(0),        // Opposite vote
                voter_unlock_date: BigInt(Math.floor(Date.now() / 1000 + 3600))
            }
        );
    
        expect(secondVoteResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: voter.address,
            success: true,
            op: OP_CODES.UpdateVoterBalance, // Expect vote already cast error
        });
    });    

    it('should not allow vote with incorect amount', async () => {
        // First vote
        const voteResult = await voter.send(
            skipper.getSender(),
            {
                value: toNano("1"),
            },
            {
                $$type: 'UpdateVoterBalance',
                amount: toNano("0"),
                vote: BigInt(1),
                voter_unlock_date: BigInt(Math.floor(Date.now() / 1000 + 3600))
            }
        );
    
        expect(voteResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: voter.address,
            success: false,
            exitCode: EXIT_CODES.InvalidAmount
        });
    });    
    
});
