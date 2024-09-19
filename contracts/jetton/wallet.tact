import "../teps/tep74.tact";

@interface("org.ton.jetton.wallet")
contract JettonWallet with TEP74JettonWallet {
    master: Address;
    owner: Address;
    code: Cell;
    balance: Int = 0;
    init(master: Address, owner: Address){
        self.master = master;
        self.owner = owner;
        self.code = initOf JettonWallet(master, owner).code;
    }
}