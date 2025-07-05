import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Minter } from '../build/Skipper/tact_Minter';

export async function run(provider: NetworkProvider) {
    const minter = provider.open(await Minter.fromInit());

    await minter.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(minter.address);
}
