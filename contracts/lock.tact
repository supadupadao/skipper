import "@stdlib/deploy";
import "./consts.tact";
import "./errors.tact";
import "./messages.tact";


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

    owner_jetton_wallet: Address? = null;
    unverified_data: map<Address, Int> = emptyMap();
    init(owner: Address, jetton_master: Address){
        self.owner = owner;
        self.jetton_master = jetton_master;
    }

    receive(msg: JettonTransferNotification){
        if self.owner_jetton_wallet == null {
            let cached = self.unverified_data.get(sender());
            if (cached != null) {
                self.unverified_data.set(sender(), msg.amount + cached!!);
            } else {
                self.unverified_data.set(sender(), msg.amount);
            }

            send(SendParameters {
                to: self.jetton_master,
                value: 0,
                mode: SendRemainingValue,
                body: ProvideWalletAddress {
                    query_id: msg.query_id,
                    owner_address: myAddress(),
                    include_address: true
                }.toCell()
            });
        } else {
            nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.owner_jetton_wallet);
            self.amount += msg.amount;
        }
    }

    receive(msg: TakeWalletAddress){
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.jetton_master);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, myAddress() == msg.owner_address);
        self.owner_jetton_wallet = msg.wallet_address;

        let cached = self.unverified_data.get(msg.wallet_address);
        if (cached != null) {
            self.amount += cached!!;
        }

        self.unverified_data = emptyMap();
    }

    receive(msg: LockJettons) {
        nativeThrowUnless(ERROR_INVALID_LOCK_PERIOD, msg.lock_period > 0);
        // Ensure the new lock period actually extends the lock date
        let calculatedUnlockDate: Int = now() + msg.lock_period;        
        nativeThrowUnless(ERROR_LOCK_PERIOD_TOO_SHORT, calculatedUnlockDate > self.unlock_date);
        self.unlock_date = calculatedUnlockDate;
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
        }else if (op == 0x690402){     
            if(msg.lock_period != null && msg.lock_period!! > 0){ 
                let calculatedUnlockDate: Int = now() + msg.lock_period!!;
                if (calculatedUnlockDate > self.unlock_date) {
                    self.unlock_date = calculatedUnlockDate;
                }
            }            
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

        send(SendParameters{
                to: self.owner_jetton_wallet!!,
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