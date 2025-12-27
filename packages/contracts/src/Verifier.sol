// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Verifier {
    // Scalar field size
    uint256 constant r =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax =
        19179532147309318687095848029523529046951874547007354567638094369954845985636;
    uint256 constant alphay =
        17121686636143999602191467741752097449317894129905088117766652260771258878549;
    uint256 constant betax1 =
        10753147059211196330587043746466644872757797836839709751500274398922904484096;
    uint256 constant betax2 =
        1232628488889712716459013846156127850936169377557165606834055176406456524785;
    uint256 constant betay1 =
        11950452125375287822854871869373879475406272744728607304445172998205259183581;
    uint256 constant betay2 =
        1691706436602615528783775089972201815017640867992023437612599704557674763318;
    uint256 constant gammax1 =
        11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 =
        10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 =
        4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 =
        8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 =
        4361613799653268376421784790290285131205842561471858299891635893178441005444;
    uint256 constant deltax2 =
        14861009281580408475921760478077799634926705236572172974758682645568205538327;
    uint256 constant deltay1 =
        19110997997562452308659816516840554976911982772209480231365777275492718790417;
    uint256 constant deltay2 =
        10382593515707419683600671754067325134201794954362813763000309408063574291843;

    uint256 constant IC0x =
        18581719150366147984600738833188378071218786190798704308257475584823362679571;
    uint256 constant IC0y =
        6300399741256689442417612849385157602111260855631421398789940574045592364381;

    uint256 constant IC1x =
        9215056155144938829950679598436701360027000894798024334817611386445056958808;
    uint256 constant IC1y =
        4847000039215302337595319906273589158709648290486927360639394338337618027681;

    uint256 constant IC2x =
        2433092780054105971749927293903965082882206514276860183274503966315720800558;
    uint256 constant IC2y =
        9624756780631665980668799083397099758031285752116547089911334657554629381515;

    uint256 constant IC3x =
        2296404077599769475701805486547716050782932842779471450672997753972668901730;
    uint256 constant IC3y =
        20228094948944291725275130424694430839484099436508012525212902978839619660615;

    uint256 constant IC4x =
        13459840283216475388343643774759223390140643029205654148446361139661594394954;
    uint256 constant IC4y =
        17542804704642386938494028708669794341749841023964003052819701579726076145234;

    uint256 constant IC5x =
        10688200498090702631848652964620359167685196850865139865822273918965524349056;
    uint256 constant IC5y =
        9510804992465226539229281180583682592566768382607015229937572534177342119820;

    uint256 constant IC6x =
        20823560244395247509884446209921794796235383180429748577220020317396115239783;
    uint256 constant IC6y =
        6158949459866218154221821301992075298300189235116180229175870770917381647895;

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[6] memory _pubSignals
    ) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x

                g1_mulAccC(_pVk, IC1x, IC1y, mload(add(pubSignals, 0)))

                g1_mulAccC(_pVk, IC2x, IC2y, mload(add(pubSignals, 32)))

                g1_mulAccC(_pVk, IC3x, IC3y, mload(add(pubSignals, 64)))

                g1_mulAccC(_pVk, IC4x, IC4y, mload(add(pubSignals, 96)))

                g1_mulAccC(_pVk, IC5x, IC5y, mload(add(pubSignals, 128)))

                g1_mulAccC(_pVk, IC6x, IC6y, mload(add(pubSignals, 160)))

                // -A
                mstore(_pPairing, mload(pA))
                mstore(
                    add(_pPairing, 32),
                    mod(sub(q, mload(add(pA, 32))), q)
                )

                // B
                mstore(add(_pPairing, 64), mload(pB))
                mstore(add(_pPairing, 96), mload(add(pB, 32)))
                mstore(add(_pPairing, 128), mload(add(pB, 64)))
                mstore(add(_pPairing, 160), mload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))

                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), mload(pC))
                mstore(add(_pPairing, 608), mload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)

                let success := staticcall(
                    sub(gas(), 2000),
                    8,
                    _pPairing,
                    768,
                    _pPairing,
                    0x20
                )

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F

            checkField(mload(add(_pubSignals, 0)))

            checkField(mload(add(_pubSignals, 32)))

            checkField(mload(add(_pubSignals, 64)))

            checkField(mload(add(_pubSignals, 96)))

            checkField(mload(add(_pubSignals, 128)))

            checkField(mload(add(_pubSignals, 160)))

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}
