// This file implements the JettonLock contract for Skipper DAO.
// JettonLock is responsible for securely locking jettons for a user, tracking lock periods,
// and acting as a proxy for proposal participation and voting. It ensures tokens are locked for the required period,
// manages wallet address verification, and handles unlocking and forwarding of tokens after the lock expires.

import "@stdlib/deploy";
import "./consts.tact";
import "./errors.tact";
import "./messages.tact";


// Structure for returning lock state data
struct LockData {
    amount: Int as coins;
    unlock_date: Int as uint64;
    owner: Address;
}

// JettonLock contract
// This contract locks jettons for a specific user, manages lock/unlock logic, and proxies voting actions to the DAO.
// It verifies the user's jetton wallet, accumulates tokens, and ensures correct lock periods for governance participation.
contract JettonLock with Deployable {
    amount: Int as coins = 0;
    unlock_date: Int as uint64 = 0;
    owner: Address;
    jetton_master: Address;

    owner_jetton_wallet: Address? = null;
    unverified_data: map<Address, Int> = emptyMap();

    // Initializes the JettonLock contract with the owner's address and the jetton master address.
    init(owner: Address, jetton_master: Address){
        self.owner = owner;
        self.jetton_master = jetton_master;
    }

    // Handles incoming JettonTransferNotification messages.
    // If the owner's jetton wallet is not yet verified, accumulates tokens in a temporary map and requests wallet address from the master.
    // Once verified, adds tokens directly to the locked amount.
    receive(msg: JettonTransferNotification){
        if self.owner_jetton_wallet == null {
            let cached = self.unverified_data.get(sender());
            if (cached != null) {
                self.unverified_data.set(sender(), msg.amount + cached!!);
            } else {
                self.unverified_data.set(sender(), msg.amount);
            }

            message(MessageParameters {
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

    // Handles the response from the jetton master with the owner's wallet address.
    // Verifies and sets the wallet, adds any cached tokens, and clears the temporary map.
    receive(msg: TakeWalletAddress){
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.jetton_master);
        // nativeThrowUnless(ERROR_CODE_INVALID_OWNER, myAddress() == msg.owner_address);
        self.owner_jetton_wallet = msg.wallet_address;

        let cached = self.unverified_data.get(msg.wallet_address);
        if (cached != null) {
            self.amount += cached!!;
        }

        foreach (key, _ in self.unverified_data) {
            self.unverified_data.del(key);
        }
    }

    // Locks jettons for a specified period.
    // Ensures the new lock period extends the current unlock date.
    receive(msg: LockJettons) {
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.owner);
        nativeThrowUnless(ERROR_INVALID_LOCK_PERIOD, msg.lock_period > 0);
        // Ensure the new lock period actually extends the lock date
        let calculatedUnlockDate: Int = now() + msg.lock_period;        
        nativeThrowUnless(ERROR_LOCK_PERIOD_TOO_SHORT, calculatedUnlockDate > self.unlock_date);
        self.unlock_date = calculatedUnlockDate;
    }


    // Handles proxy messages for proposal participation and voting.
    // Updates unlock date if needed and forwards the proxy message to the target contract.
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

        message(MessageParameters{
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

    // Unlocks jettons after the lock period has expired.
    // Transfers all locked tokens back to the owner's wallet.
    receive(msg: UnlockJettons){
        let ctx = context();
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.owner);
        nativeThrowUnless(ERROR_CODE_NEED_FEE, ctx.value >= MIN_LOCK_FEE);
        nativeThrowUnless(ERROR_UNLOCK_DATE_NOT_ARRIVED, now() > self.unlock_date);

        message(MessageParameters{
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

    // Returns the current lock state as a LockData struct.
    get fun get_lock_data(): LockData {
        return LockData{amount: self.amount, unlock_date: self.unlock_date, owner: self.owner};
    }
}