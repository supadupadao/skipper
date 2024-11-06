import "@stdlib/deploy";
import "./consts.tact";
import "./lock.tact";
import "./proposal.tact";

fun computeJettonWalletStateInit(master: Address, owner: Address): StateInit {
    let data = beginCell().storeRef(JETTON_SYSTEM_CELL).storeUint(0, 1).storeAddress(master).storeAddress(owner
    ).endCell();
    return StateInit{code: JETTON_WALLET_CODE, data: data};
}

contract Skipper with Deployable {
    jetton_master: Address;
    last_proposal_id: Int as uint64 = 0;
    init(jetton_master: Address){
        self.jetton_master = jetton_master;
    }

    receive(msg: ProxyMessage){
        let jetton_wallet_init = computeJettonWalletStateInit(self.jetton_master, msg.owner);
        let jetton_wallet_address = contractAddress(jetton_wallet_init);
        let jetton_lock_init = initOf JettonLock(msg.owner, jetton_wallet_address);
        let jetton_lock_address = contractAddress(jetton_lock_init);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == jetton_lock_address);
        let op = msg.payload.asSlice().loadUint(64);
        if (op == 0x690401) {
            let payload = RequestNewProposal.fromCell(msg.payload);
            self.last_proposal_id += 1;
            let new_proposal_init = initOf Proposal(myAddress(), self.last_proposal_id);
            send(SendParameters{
                    to: contractAddress(new_proposal_init),
                    value: 0,
                    mode: SendRemainingValue,
                    bounce: false,
                    code: new_proposal_init.code,
                    data: new_proposal_init.data,
                    body: InitProposal{initiator: msg.owner, amount: msg.amount, data: payload.data}.toCell()
                }
            );
        }
        if (op == 0x690402) {
            let payload = VoteForProposal.fromCell(msg.payload);
            let proposal_init = initOf Proposal(myAddress(), payload.proposal_id);
            let voter_init = initOf Voter(myAddress(), contractAddress(proposal_init), msg.owner);
            send(SendParameters{
                    to: contractAddress(voter_init),
                    value: 0,
                    mode: SendRemainingValue,
                    bounce: false,
                    body: UpdateVoterBalance{amount: msg.amount, vote: payload.vote}.toCell()
                }
            );
        }
    }
}