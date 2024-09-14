import { toNano } from '@ton/core';
import { Treasury } from '../wrappers/Treasury';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const treasury = provider.open(await Treasury.fromInit());

    await treasury.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(treasury.address);

    // run methods on `treasury`
}
