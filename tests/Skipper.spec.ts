import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Skipper } from '../wrappers/Skipper';
import '@ton/test-utils';

describe('Skipper', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let skipper: SandboxContract<Skipper>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        skipper = blockchain.openContract(await Skipper.fromInit());

        deployer = await blockchain.treasury('deployer');

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
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and skipper are ready to use
    });
});
