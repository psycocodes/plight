// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Verifier.sol";

contract PlightVerifier is Groth16Verifier {
    function verifyProof(
        bytes calldata proof,
        uint256[] calldata publicSignals
    ) external view returns (bool) {
        require(proof.length == 256, "Invalid proof length");
        require(publicSignals.length == 6, "Invalid public signals length");

        uint256[2] memory a;
        uint256[2][2] memory b;
        uint256[2] memory c;
        uint256[6] memory input;

        (
            uint256 p0,
            uint256 p1,
            uint256 p2,
            uint256 p3,
            uint256 p4,
            uint256 p5,
            uint256 p6,
            uint256 p7
        ) = abi.decode(
                proof,
                (
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256
                )
            );

        a[0] = p0;
        a[1] = p1;
        b[0][0] = p2;
        b[0][1] = p3;
        b[1][0] = p4;
        b[1][1] = p5;
        c[0] = p6;
        c[1] = p7;

        for (uint i = 0; i < 6; i++) {
            input[i] = publicSignals[i];
        }

        return verifyProof(a, b, c, input);
    }
}
