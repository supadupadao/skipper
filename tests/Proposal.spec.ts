import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import '@ton/test-utils';
import { Proposal } from '../wrappers/Proposal';
import { beginCell, toNano } from '@ton/core';
import { Voter } from '../wrappers/Voter';

const LOCK_INTERVAL = 1209600;

describe('Proposal', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let skipper: SandboxContract<TreasuryContract>;
    let voter: SandboxContract<Voter>;
    let proposal: SandboxContract<Proposal>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        skipper = await blockchain.treasury('skipper');

        proposal = blockchain.openContract(await Proposal.fromInit(skipper.address, 1n));
        voter = blockchain.openContract(await Voter.fromInit(skipper.address, proposal.address, deployer.address));
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
                data: {
                    $$type: 'ProposalData',
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
                amount: toNano("100500"),
            }
        );
        expect(successUpdateVotesResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: voter.address,
            success: true,
            op: 0x690302,
        });
        expect(successUpdateVotesResult.transactions).toHaveTransaction({
            from: voter.address,
            to: proposal.address,
            success: true,
            op: 0x690202,
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
                amount: toNano("100500"),
            }
        );
        expect(failedUpdateVotesResult.transactions).toHaveTransaction({
            from: skipper.address,
            to: voter.address,
            success: true,
            op: 0x690302,
        });
        expect(failedUpdateVotesResult.transactions).toHaveTransaction({
            from: voter.address,
            to: proposal.address,
            success: false,
            op: 0x690202,
            exitCode: 6906,
        });
    });
});
