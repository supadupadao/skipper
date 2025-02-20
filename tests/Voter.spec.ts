import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {  toNano } from '@ton/core';
import '@ton/test-utils';
import { EXIT_CODES, OP_CODES } from './constants';
import { Voter } from '../wrappers/Voter';

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

    it('should fail UpdateVoterBalance if voter is not initialized', async () => {
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
            success: false,
            exitCode: EXIT_CODES.NotInitialized,
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
            exitCode: EXIT_CODES.InvalidOwner,
        });
    });
});
