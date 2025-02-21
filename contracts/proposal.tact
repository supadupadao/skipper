import "./consts.tact";
import "./errors.tact";
import "./messages.tact";
const PROPOSAL_ACCEPT_THRESHOLD: Int = ton("300000");
const PROPOSAL_VOTES_GAP: Int = ton("10000");

contract Proposal {
    master: Address;
    proposal_id: Int as uint64;
    is_initialized: Bool = false;
    is_executed: Bool = false;
    votes_yes: Int as coins = 0;
    votes_no: Int as coins = 0;
    expires_at: Int as uint64;
    data: ProposalData? = null;
    
    init(master: Address, proposal_id: Int) {
        self.master = master;
        self.proposal_id = proposal_id;
        self.expires_at = now() + LOCK_INTERVAL;
    }

    receive(msg: InitProposal){
        // TODO check fees
        nativeThrowIf(ERROR_ALREADY_INITIALIZED, self.is_initialized);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.master);
        self.data = msg.data;
        self.votes_yes = msg.amount;
        let voter_init: StateInit = initOf Voter(self.master, myAddress(), msg.initiator);
        self.is_initialized = true;

        // Calculate the expiration time
        if (msg.lock_period != null && msg.lock_period!! > 0) {
            let proposedExpiration = now() + msg.lock_period!!;
            self.expires_at = max(proposedExpiration, now() + LOCK_MIN_INTERVAL);
        } else {
            self.expires_at = now() + LOCK_INTERVAL;
        }

        
        send(SendParameters{ // TODO update value
                to: contractAddress(voter_init),
                value: 0,
                mode: SendRemainingValue,
                bounce: true,
                code: voter_init.code,
                data: voter_init.data,
                body: InitVoter{amount: msg.amount}.toCell()
            }
        );
    }

    receive(msg: UpdateVotes){
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.is_initialized);
        nativeThrowIf(ERROR_ALREADY_EXECUTED, self.is_executed);
        nativeThrowUnless(ERROR_PROPOSAL_EXPIRED, now() < self.expires_at);

         // Check if unlock_date covers the proposal's expires_at
        nativeThrowUnless(ERROR_UNLOCK_DATE_INSUFFICIENT, msg.voter_unlock_date >= self.expires_at);
        let voter_init = initOf Voter(self.master, myAddress(), msg.owner);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == contractAddress(voter_init));

        if (msg.vote == 1) {
            self.votes_yes += msg.amount;
        }
        if (msg.vote == 0) {
            self.votes_no += msg.amount;
        }
    }

    receive(msg: ExecuteProposal){
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.is_initialized);
        nativeThrowIf(ERROR_ALREADY_EXECUTED, self.is_executed);
        nativeThrowUnless(ERROR_NO_ENOGH_VOTES, self.votes_yes > PROPOSAL_ACCEPT_THRESHOLD);
        nativeThrowUnless(ERROR_TOO_MANY_NO_VOTES, self.votes_yes > (self.votes_no + PROPOSAL_VOTES_GAP));
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.data != null);
        self.is_executed = true;
        send(SendParameters{
                to: self.data!!.receiver,
                value: 0,
                bounce: false,
                mode: SendRemainingBalance,
                body: self.data!!.body,
            }
        );
    }

    get fun get_proposal_data(): ProposalData? {
        return self.data;
    }
    
    get fun expires_at(): Int {
        return self.expires_at;
    }
}

contract Voter {
    master: Address;
    proposal: Address;
    owner: Address;
    is_initialized: Bool = false;
    amount: Int = 0;

    init(master: Address, proposal: Address, owner: Address){
        self.master = master;
        self.proposal = proposal;
        self.owner = owner;
    }

    fun initialize(amount: Int) {
        self.is_initialized = true;
        self.amount = amount;
    }

    receive(msg: InitVoter){
        nativeThrowIf(ERROR_ALREADY_INITIALIZED, self.is_initialized);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.proposal);
        self.initialize(msg.amount);
    }

    receive(msg: UpdateVoterBalance){   
        nativeThrowIf(ERROR_ALREADY_INITIALIZED, self.is_initialized);             
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.master);    
        self.initialize(msg.amount);        

        send(SendParameters{
                to: self.proposal,
                value: 0,
                mode: SendRemainingValue,
                body: UpdateVotes{
                    owner: self.owner, 
                    amount: msg.amount - self.amount,
                    vote: msg.vote,
                    voter_unlock_date: msg.voter_unlock_date
                }.toCell()
            }
        );
    }

    get fun get_voter_amount(): Int {
        return self.amount;
    }
}