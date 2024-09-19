@name(store_dict)
extends native storeDict(self: Builder, c: Cell): Builder;

// Structure for onchain metadata building
struct OnchainMetadata {
    inner: map<Int as uint256, Cell> = emptyMap();
}

// Create new metadata data structure
fun newMetadata(): OnchainMetadata {
    return OnchainMetadata{inner: emptyMap()};
}

// Add new key/value pair to metadata

extends fun set(self: OnchainMetadata, key: String, value: Slice) {
    self.inner.set(sha256(key), beginCell().storeUint(0, 8).storeSlice(value).endCell());
}

// Build `Cell` from metadata that corresponds with standard

extends fun toCell(self: OnchainMetadata): Cell {
    return beginCell().storeUint(0, 8).storeDict(self.inner.asCell()!!).endCell();
}

// Trait for creating onchain metadata
// https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md

trait TEP64Metadata {
    // Create jetton master onchain metadata
    fun jetton_master_metadata(): Cell {
        let metadata = newMetadata();
        metadata.set("name", "CREW".asSlice());
        metadata.set("description", "Governance token for SupaDupaDAO".asSlice());
        metadata.set("symbol", "CREW".asSlice());
        return metadata.toCell();
    }
}