import "./errors.tact";
import "./messages.tact";

contract Proposal {
    master: Address;
    proposal_id: Int as uint64;
    votes_yes: Int as coins = 0;
    votes_no: Int as coins = 0;
    data: ProposalData? = null;
    init(master: Address, proposal_id: Int){
        self.master = master;
        self.proposal_id = proposal_id;
    }

    receive(msg: InitProposal){
        // TODO check fees
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.master);
        self.data = msg.data;
        self.votes_yes = msg.amount;
        let voter_init: StateInit = initOf Voter(self.master, myAddress(), msg.initiator);
        send(SendParameters{ // TODO update value
                to: contractAddress(voter_init),
                value: 0,
                bounce: true,
                code: voter_init.code,
                data: voter_init.data,
                body: InitVoter{amount: msg.amount}.toCell()
            }
        );
    }
}

contract Voter {
    master: Address;
    proposal: Address;
    owner: Address;
    amount: Int = 0;
    init(master: Address, proposal: Address, owner: Address){
        self.master = master;
        self.proposal = proposal;
        self.owner = owner;
    }

    receive(msg: InitVoter){
        // TODO check already initialized
        // TODO sender is DAO?
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.proposal);
        self.amount = msg.amount;
    }

    receive(msg: UpdateVoterBalance){
        // TODO
        // check sender is DAO
        // send diff to proposal
    }
}