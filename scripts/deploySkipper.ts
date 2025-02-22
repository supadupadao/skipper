import { Address, toNano } from '@ton/core';
import { Skipper } from '../wrappers/Skipper';
import { NetworkProvider } from '@ton/blueprint';

const JETTON_MASTER_ADDRESS = process.env.JETTON_MASTER_ADDRESS;

export async function run(provider: NetworkProvider) {
    const skipper = provider.open(await Skipper.fromInit(Address.parse(JETTON_MASTER_ADDRESS!!)));

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
}
