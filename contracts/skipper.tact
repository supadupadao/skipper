import "@stdlib/deploy";
import "./consts.tact";
import "./lock.tact";
import "./proposal.tact";
struct SkipperData {
    last_proposal_id: Int as uint64;
}

contract Skipper with Deployable {
    jetton_master: Address;
    last_proposal_id: Int as uint64 = 0;
    init(jetton_master: Address){
        self.jetton_master = jetton_master;
    }

    receive(msg: ProxyMessage){
        let jetton_lock_init = initOf JettonLock(msg.owner, self.jetton_master);
        let jetton_lock_address = contractAddress(jetton_lock_init);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == jetton_lock_address);
        let op = msg.payload.asSlice().loadUint(32);
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
            return;
        }
        if (op == 0x690402) {
            let payload = VoteForProposal.fromCell(msg.payload);
            let proposal_init = initOf Proposal(myAddress(), payload.proposal_id);
            let voter_init = initOf Voter(myAddress(), contractAddress(proposal_init), msg.owner);
            send(SendParameters{
                    to: contractAddress(voter_init),
                    value: 0,
                    mode: SendRemainingValue,
                    code: voter_init.code,
                    data: voter_init.data,
                    bounce: false,
                    body: UpdateVoterBalance{amount: msg.amount, vote: payload.vote}.toCell()
                }
            );
            return;
        }
        nativeThrow(ERROR_PROXY_OPCODE_NOT_FOUND);
    }

    get fun get_skipper_data(): SkipperData {
        return SkipperData{last_proposal_id: self.last_proposal_id};
    }

    get fun get_proposal_address(proposal_id: Int): Address {
        let init = initOf Proposal(myAddress(), proposal_id);
        return contractAddress(init);
    }

    get fun get_lock_address(owner: Address): Address {
        let init = initOf JettonLock(owner, self.jetton_master);
        return contractAddress(init);
    }
}