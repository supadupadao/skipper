import "@stdlib/deploy";
import "./consts.tact";
import "./errors.tact";
import "./messages.tact";
import "./proposal.tact";

fun computeJettonWalletStateInit(master: Address, owner: Address): StateInit {
    let data = beginCell().storeRef(JETTON_SYSTEM_CELL).storeUint(0, 1).storeAddress(master).storeAddress(owner
    ).endCell();
    return StateInit{code: JETTON_WALLET_CODE, data: data};
}

struct LockData {
    amount: Int as coins;
    unlock_date: Int as uint64;
    owner: Address;
}

contract JettonLock with Deployable {
    amount: Int as coins = 0;
    unlock_date: Int as uint64 = 0;
    owner: Address;
    jetton_master: Address;
    init(owner: Address, jetton_master: Address){
        self.owner = owner;
        self.jetton_master = jetton_master;
    }

    receive(msg: JettonTransferNotification){
        let jetton_wallet_init = computeJettonWalletStateInit(self.jetton_master, myAddress());
        let jetton_wallet_address = contractAddress(jetton_wallet_init);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == jetton_wallet_address);
        self.amount += msg.amount;
        self.unlock_date = now() + LOCK_INTERVAL;
    }

    receive(msg: SendProxyMessage){
        let ctx = context();
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.owner);
        nativeThrowUnless(ERROR_CODE_NEED_FEE, ctx.value >= MIN_LOCK_FEE);

        let op = msg.payload.asSlice().loadUint(32);
        if (op == 0x690401){
            // Calculate the new unlock_date based on lock_period or defaults
            let calculatedUnlockDate: Int = now() + (
                msg.lock_period != null && msg.lock_period!! > 0
                    ? (msg.lock_period!! >= LOCK_MIN_INTERVAL ? msg.lock_period!! : LOCK_MIN_INTERVAL) 
                    : LOCK_INTERVAL // Default lock interval
            );

            // Update unlock_date only if the calculated value is higher
            if (calculatedUnlockDate > self.unlock_date) {
                self.unlock_date = calculatedUnlockDate;
            }
        }else if (
            op == 0x690402 && 
            msg.lock_period != null && msg.lock_period!! > 0){ 
            self.unlock_date = now() + msg.lock_period!!;
        }else{
            self.unlock_date = now() + LOCK_INTERVAL;
        }

        

        send(SendParameters{
                to: msg.to,
                value: 0,
                mode: SendRemainingValue,
                body: ProxyMessage{
                    owner: self.owner,
                    lock_period: msg.lock_period,           // optional period to lock the contract (for init only)
                    voter_unlock_date: self.unlock_date,    // unlock date of the voters tokens
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
        let jetton_wallet_init = computeJettonWalletStateInit(self.jetton_master, myAddress());
        send(SendParameters{
                to: contractAddress(jetton_wallet_init),
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