// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateVerification {
    address public owner;
    mapping(string => bool) private certificateHashes;
    
    event CertificateAdded(string hash, address issuer);
    
    constructor() {
        owner = msg.sender;
    }
    
    function storeHash(string memory hash) public {
        require(!certificateHashes[hash], "Certificate hash already exists");
        certificateHashes[hash] = true;
        emit CertificateAdded(hash, msg.sender);
    }
    
    function verifyHash(string memory hash) public view returns (bool) {
        return certificateHashes[hash];
    }
}