import "./messages.tact";

contract Proposal {
    owner: Address;
    proposal_id: Int as uint64;
    transaction: Cell?;
    init(owner: Address, proposal_id: Int){
        self.owner = owner;
        self.proposal_id = proposal_id;
    }

    receive(msg: InitProposal){
        // TODO
    }
}