import { Address, beginCell, toNano } from '@ton/core';
import { Skipper } from '../wrappers/Skipper';
import { NetworkProvider } from '@ton/blueprint';
import { JettonLock } from '../wrappers/Lock';

const JETTON_MASTER_ADDRESS = process.env.JETTON_MASTER_ADDRESS;
const PROPOSAL_RECEIVER_ADDRESS = "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ";

export async function run(provider: NetworkProvider) {
  const skipper = provider.open(await Skipper.fromInit(Address.parse(JETTON_MASTER_ADDRESS!)));
  const lock = provider.open(await JettonLock.fromInit(provider.sender().address!, Address.parse(JETTON_MASTER_ADDRESS!)));

  await lock.send(
    provider.sender(),
    {
      value: toNano('0.1'),
    },
    {
      $$type: 'SendProxyMessage',
      to: skipper.address,
      lock_period: null,
      payload: beginCell()
        .storeUint(0x690401, 32)
        .storeAddress(Address.parse(PROPOSAL_RECEIVER_ADDRESS))
        .storeRef(beginCell().endCell())
        .endCell()
    }
  );

  await provider.waitForDeploy(skipper.address);
}
