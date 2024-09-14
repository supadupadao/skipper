import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Treasury } from '../wrappers/Treasury';
import '@ton/test-utils';

describe('Treasury', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let treasury: SandboxContract<Treasury>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        treasury = blockchain.openContract(await Treasury.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await treasury.send(
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
            to: treasury.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and treasury are ready to use
    });
});
