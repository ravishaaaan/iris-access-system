// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IrisAccess {
    
    struct UserProfile {
        string name;
        string email;
        string phone;
        string idNumber;
        string securityQuestion;
        string securityAnswer;
        string[] faceHashes;
        bool isRegistered;
    }

    // Mapping: Code -> Is Valid?
    mapping(string => bool) private validAccessCodes;
    
    mapping(address => UserProfile) private users;

    event UserRegistered(address indexed userWallet, string name);
    event CodeBurned(string code);

    // ORGANIZER ONLY: Add a list of unique codes
    // In production, add 'onlyOwner' modifier here!
    function addAccessCodes(string[] memory _codes) public {
        for (uint i = 0; i < _codes.length; i++) {
            validAccessCodes[_codes[i]] = true;
        }
    }

    // 1. Check if Code is Valid (View only)
    function validateAccessCode(string memory _code) public view returns (bool) {
        return validAccessCodes[_code];
    }

    // 2. Register User (Gasless - admin submits on behalf of user)
    function registerUser(
        address _userWallet,    // <--- USER'S WALLET ADDRESS
        string memory _accessCode,
        string memory _name,
        string memory _email,
        string memory _phone,
        string memory _idNumber,
        string memory _question,
        string memory _answer,
        string[] memory _faceHashes
    ) public {
        // 1. Validate the Code
        require(validAccessCodes[_accessCode], "Invalid or Used Access Code");
        
        // 2. Ensure user isn't already registered
        require(!users[_userWallet].isRegistered, "Wallet already registered");

        // 3. BURN THE CODE (Prevent reuse)
        validAccessCodes[_accessCode] = false;
        emit CodeBurned(_accessCode);

        // 4. Save Profile for the USER'S wallet, not msg.sender
        users[_userWallet] = UserProfile({
            name: _name,
            email: _email,
            phone: _phone,
            idNumber: _idNumber,
            securityQuestion: _question,
            securityAnswer: _answer,
            faceHashes: _faceHashes,
            isRegistered: true
        });

        emit UserRegistered(_userWallet, _name);
    }

    function getUserProfile(address _userAddress) public view returns (UserProfile memory) {
        require(users[_userAddress].isRegistered, "User not found");
        return users[_userAddress];
    }
}