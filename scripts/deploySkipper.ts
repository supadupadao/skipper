import { toNano } from '@ton/core';
import { Skipper } from '../wrappers/Skipper';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const skipper = provider.open(await Skipper.fromInit());

    await skipper.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(skipper.address);

    // run methods on `skipper`
}
