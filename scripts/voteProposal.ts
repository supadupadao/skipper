import { Address, beginCell, toNano } from '@ton/core';
import { Skipper } from '../wrappers/Skipper';
import { NetworkProvider } from '@ton/blueprint';
import { JettonLock } from '../wrappers/Lock';
import { Proposal } from '../wrappers/Proposal';

const JETTON_MASTER_ADDRESS = process.env.JETTON_MASTER_ADDRESS;
const PROPOSAL_ID = 0;

export async function run(provider: NetworkProvider) {
  const skipper = provider.open(await Skipper.fromInit(Address.parse(JETTON_MASTER_ADDRESS!)));
  const lock = provider.open(await JettonLock.fromInit(provider.sender().address!, Address.parse(JETTON_MASTER_ADDRESS!)));

  await lock.send(
    provider.sender(),
    {
      value: toNano('0.05'),
    },
    {
      $$type: 'SendProxyMessage',
      to: skipper.address,
      lock_period: null,
      payload: beginCell()
        .storeUint(0x690402, 32)
        .storeUint(PROPOSAL_ID, 64)
        .storeBit(true)
        .endCell()
    }
  );

  await provider.waitForDeploy(skipper.address);
}
