import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonLock } from '../wrappers/Lock';
import { JettonMaster, JettonWallet } from '@ton/ton';

const JETTON_MASTER_ADDRESS = process.env.JETTON_MASTER_ADDRESS;
const LOCK_JETTONS_VALUE = 10;

export async function run(provider: NetworkProvider) {
  const lock = provider.open(await JettonLock.fromInit(provider.sender().address!, Address.parse(JETTON_MASTER_ADDRESS!)));
  const jettonMaster = provider.open(await JettonMaster.create(Address.parse(JETTON_MASTER_ADDRESS!)));
  const jettonWalletAddress = await jettonMaster.getWalletAddress(provider.sender().address!);

  await provider.sender().send({
    to: jettonWalletAddress,
    value: toNano('0.05'),
    body: beginCell()
      .storeUint(0x0f8a7ea5, 32)
      // query_id: Int as uint64;
      .storeUint(0, 64)
      // amount: Int as coins;
      .storeCoins(LOCK_JETTONS_VALUE)
      // destination: Address;
      .storeAddress(lock.address)
      // response_destination: Address;
      .storeAddress(lock.address)
      // custom_payload: Cell?;
      .storeMaybeRef(null)
      // forward_ton_amount: Int as coins;
      .storeCoins(1)
      // forward_payload: Slice as remaining;
      // null
      .endCell()
  });
}
