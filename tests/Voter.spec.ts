import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import '@ton/test-utils';

describe('Voter', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
    });

    it('should init voter', async () => {
        expect(2 + 2).toEqual(5);
    });

    it('should count new locked value', async () => {
        expect(2 + 2).toEqual(5);
    });
});
