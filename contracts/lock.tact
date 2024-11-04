import "@stdlib/ownable";
import "./consts.tact";
import "./errors.tact";
import "./messages.tact";
struct LockData {
    amount: Int;
    unlock_date: Int;
    owner: Address;
}

contract JettonLock with Ownable {
    amount: Int as coins = 0;
    unlock_date: Int as uint64 = 0;
    owner: Address;
    jetton_wallet: Address;
    init(owner: Address, jetton_wallet: Address){
        self.owner = owner;
        self.jetton_wallet = jetton_wallet;
    }

    receive(msg: JettonTransferNotification){
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.jetton_wallet);
        self.amount += msg.amount;
    }

    receive(msg: SendProxyMessage){
        let ctx = context();
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.owner);
        nativeThrowUnless(ERROR_CODE_NEED_FEE, ctx.value >= MIN_LOCK_FEE);
        self.unlock_date = now() + LOCK_INTERVAL;
        send(SendParameters{
                to: msg.to,
                value: 0,
                mode: SendRemainingValue,
                body: ProxyMessage{
                    owner: self.owner,
                    unlock_date: self.unlock_date,
                    amount: self.amount,
                    payload: msg.payload
                }.toCell()
            }
        );
    }

    receive(msg: UnlockJettons){
        let ctx = context();
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.owner);
        nativeThrowUnless(ERROR_CODE_NEED_FEE, ctx.value >= MIN_LOCK_FEE);
        nativeThrowUnless(ERROR_UNLOCK_DATE_NOT_ARRIVED, now() > self.unlock_date);
        send(SendParameters{
                to: self.jetton_wallet,
                value: 0,
                mode: SendRemainingBalance,
                bounce: true,
                body: JettonTransfer{
                    query_id: 0,
                    amount: self.amount,
                    destination: self.owner,
                    response_destination: self.owner,
                    custom_payload: emptyCell(),
                    forward_ton_amount: 1,
                    forward_payload: emptySlice()
                }.toCell()
            }
        );
        self.amount = 0;
    }

    get fun get_lock_data(): LockData {
        return LockData{amount: self.amount, unlock_date: self.unlock_date, owner: self.owner};
    }
}