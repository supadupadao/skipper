import "./wallet.tact";
import "../teps/tep74.tact";

@interface("org.ton.jetton.master")
contract JettonMaster with TEP74JettonMaster {
    // Maximum tokens can be minted
    max_supply: Int = ton("21000000");
    // Current tokens minted
    current_supply: Int = 0;
    // Administrator of token. Who can mint new tokens
    owner: Address;
    // Initial code of jetton wallet
    jetton_wallet_code: Cell;
    init(owner: Address){
        self.owner = owner;
        self.jetton_wallet_code = initOf JettonWallet(myAddress(), myAddress()).code;
    }
}