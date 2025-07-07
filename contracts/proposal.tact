// This file contains the core logic for proposals and voting in the Skipper DAO system.
// The Proposal contract manages the lifecycle of a DAO proposal: initialization, voting, and execution.
// The Voter contract tracks the state of an individual voter's participation in a proposal and relays votes to the Proposal contract.

import "./consts.tact";
import "./errors.tact";
import "./messages.tact";
import "./utils/storage.tact";


// Minimum number of YES votes required for a proposal to be accepted
const PROPOSAL_ACCEPT_THRESHOLD: Int = ton("300000");
// Minimum difference between YES and NO votes for proposal acceptance
const PROPOSAL_VOTES_GAP: Int = ton("10000");
// Storage cost estimation: number of bits required for Proposal contract
const PROPOSAL_BITS: Int = 29429;
// Storage cost estimation: number of cells required for Proposal contract
const PROPOSAL_CELLS: Int = 73;

// Proposal contract
// This contract represents a single proposal in the DAO. It stores proposal state, handles initialization,
// receives and counts votes, and executes the proposal if voting conditions are met.
contract Proposal {
    master: Address;
    proposal_id: Int as uint64;
    is_initialized: Bool = false;
    is_executed: Bool = false;
    votes_yes: Int as coins = 0;
    votes_no: Int as coins = 0;
    expires_at: Int as uint64;
    payload: ProposalPayload? = null;
    
    // Initializes the proposal contract with the master address and proposal id.
    // Sets the default expiration time for voting.
    init(master: Address, proposal_id: Int) {
        self.master = master;
        self.proposal_id = proposal_id;
        self.expires_at = now() + LOCK_INTERVAL;
    }

    // Handles the first initialization of the proposal.
    // Sets the proposal payload, records the initial YES votes, deploys the first Voter contract for the initiator,
    // and calculates the expiration time for voting based on the lock period.
    receive(msg: InitProposal){
        nativeThrowIf(ERROR_ALREADY_INITIALIZED, self.is_initialized);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.master);

        self.payload = msg.payload;
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

        nativeThrowUnless(
            ERROR_INSUFFICIENT_STORAGE_FEE,
            checkEnoughStorageFunds(
                PROPOSAL_BITS,
                PROPOSAL_CELLS,
                self.expires_at - now())
        );
        
        deploy(DeployParameters{ // TODO update value
                value: 0,
                mode: SendRemainingValue,
                bounce: true,
                init: voter_init,
                body: InitVoter{
                    amount: msg.amount,
                    expires_at: self.expires_at
                    }.toCell()
            }
        );
    }

    // Handles incoming votes from Voter contracts.
    // Updates YES/NO vote counts and ensures all voting and timing conditions are met.
    receive(msg: UpdateVotes){
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.is_initialized);
        nativeThrowIf(ERROR_ALREADY_EXECUTED, self.is_executed);
        nativeThrowUnless(ERROR_PROPOSAL_EXPIRED, now() < self.expires_at);
        nativeThrowIf(ERROR_CODE_INVALID_AMOUNT, msg.amount <= 0);             

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

    // Executes the proposal if all voting conditions are satisfied.
    // Sends the proposal payload to the target contract and marks the proposal as executed.
    receive(msg: ExecuteProposal){
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.is_initialized);
        nativeThrowIf(ERROR_ALREADY_EXECUTED, self.is_executed);
        nativeThrowUnless(ERROR_NOT_ENOUGH_VOTES, self.votes_yes > PROPOSAL_ACCEPT_THRESHOLD);
        nativeThrowUnless(ERROR_TOO_MANY_NO_VOTES, self.votes_yes > (self.votes_no + PROPOSAL_VOTES_GAP));
        nativeThrowUnless(ERROR_NOT_INITIALIZED, self.payload != null);

        self.is_executed = true;
        message(MessageParameters {
                to: self.payload!!.receiver,
                value: 0,
                bounce: false,
                mode: SendRemainingBalance,
                body: self.payload!!.body,
            }
        );
    }

    // Returns the current state of the proposal as a ProposalData struct.
    get fun get_proposal_data(): ProposalData {
        return ProposalData{
            proposal_id: self.proposal_id,
            is_initialized: self.is_initialized,
            is_executed: self.is_executed,
            votes_yes: self.votes_yes,
            votes_no: self.votes_no,
            expires_at: self.expires_at,
            payload: self.payload
        };
    }
}

const VOTER_BITS: Int = 16032;
const VOTER_CELLS: Int = 22;

// Voter contract
// This contract represents a single voter's participation in a proposal.
// It stores the voter's locked amount, expiration, and relays voting actions to the Proposal contract.
contract Voter {
    master: Address;
    proposal: Address;
    owner: Address;
    is_initialized: Bool = false;
    amount: Int = 0;
    expires_at: Int as uint64;

    // Initializes the voter contract with the master, proposal, and owner addresses.
    // Sets the default expiration time for the lock.
    init(master: Address, proposal: Address, owner: Address){
        self.master = master;
        self.proposal = proposal;
        self.owner = owner;
        self.expires_at = now() + LOCK_INTERVAL;
    }

    // Handles the initialization of the voter contract.
    // Sets the locked amount and expiration, and checks storage requirements.
    receive(msg: InitVoter){
        nativeThrowIf(ERROR_ALREADY_INITIALIZED, self.is_initialized);
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.proposal);
        nativeThrowIf(ERROR_CODE_INVALID_AMOUNT, msg.amount <= 0);             

        self.is_initialized = true;
        self.amount = msg.amount;
        self.expires_at = msg.expires_at;

        nativeThrowUnless(
            ERROR_INSUFFICIENT_STORAGE_FEE,
            checkEnoughStorageFunds(
                VOTER_BITS,
                VOTER_CELLS,
                self.expires_at - now())
        );
    }

    // Handles updates to the voter's balance and vote from the Skipper contract.
    // Updates the locked amount, expiration, and relays the vote to the Proposal contract.
    receive(msg: UpdateVoterBalance){   
        nativeThrowIf(ERROR_CODE_INVALID_AMOUNT, msg.amount <= 0);             
        nativeThrowUnless(ERROR_CODE_INVALID_OWNER, sender() == self.master);  
        nativeThrowUnless(ERROR_INVALID_EXPIRATION_TIME, msg.voter_unlock_date > 0);

        if(!self.is_initialized){
            self.expires_at = msg.voter_unlock_date;
            nativeThrowUnless(
                ERROR_INSUFFICIENT_STORAGE_FEE,
                checkEnoughStorageFunds(
                    VOTER_BITS,
                    VOTER_CELLS,
                    self.expires_at - now())
            );
        }

        let newAmount = !self.is_initialized ? msg.amount : msg.amount - self.amount;

        nativeThrowIf(ERROR_CODE_INVALID_AMOUNT, newAmount <= 0);
        self.is_initialized = true;
        self.amount = msg.amount;
        

        message(MessageParameters{
            to: self.proposal,
            value: 0,
            mode: SendRemainingValue,
            body: UpdateVotes{
                owner: self.owner, 
                amount: newAmount, // Send only the difference
                vote: msg.vote,
                voter_unlock_date: msg.voter_unlock_date
            }.toCell()
        });
    }

    // Returns the current state of the voter as a VoterData struct.
    get fun get_voter_data(): VoterData {
        return VoterData{
            proposal: self.proposal,
            owner: self.owner,
            is_initialized: self.is_initialized,
            amount: self.amount,
            expires_at: self.expires_at
        };
    }
}