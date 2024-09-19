import "@stdlib/ownable";
import "./messages.tact";
import "./jetton/wallet.tact";
import "./jetton/master.tact";
import "./treasury.tact";

// Lock contract for TON Jetton
@interface("org.supadupadao.jetton.lock")
contract JettonLock with Ownable {
    // Locked balance in jetton coins
    balance: Int as coins = 0;
    // UNIX timestamp until jetton coins will be locked
    lock_timestamp: Int as uint64 = 0;
    // Jetton coins owner address
    owner: Address;
    init(owner: Address){
        self.owner = owner;
    }

    receive(msg: JettonTransferNotification){
        let ctx = context();
        let treasury_init = initOf Treasury();
        let treasury_address = contractAddress(treasury_init);
        let jetton_master_init = initOf JettonMaster(treasury_address);
        let jetton_master_address = contractAddress(jetton_master_init);
        let jetton_wallet_init = initOf JettonWallet(jetton_master_address, msg.sender);
        let jetton_wallet_address = contractAddress(jetton_wallet_init);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, jetton_wallet_address == ctx.sender);
        self.balance += msg.amount;
    }

    receive(msg: RequestNewProposal){
        self.requireOwner();
        let treasury_init = initOf Treasury();
        let treasury_address = contractAddress(treasury_init);
    }

    receive(msg: RequestVoteYes){
        self.requireOwner();
        // TODO
    }

    receive(msg: RequestVoteNo){
        self.requireOwner();
        // TODO
    }
}