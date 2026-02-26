/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ic42n.json`.
 */
export type Ic42n = {
  "address": "ic429goRDdS7BXEDYr2nZeAYMxtT6FL3AsB3sneaSu7",
  "metadata": {
    "name": "ic42n",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Epoch-based Solana game",
    "repository": "https://github.com/ic42n"
  },
  "instructions": [
    {
      "name": "awardTicketAuto",
      "discriminator": [
        13,
        26,
        21,
        55,
        195,
        237,
        149,
        113
      ],
      "accounts": [
        {
          "name": "player"
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "profile",
          "docs": [
            "PlayerProfile PDA - must belong to `player`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "The program admin (must match `config.authority`)"
          ],
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    },
    {
      "name": "awardTicketManual",
      "discriminator": [
        102,
        89,
        52,
        68,
        176,
        31,
        100,
        61
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "profile",
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Authority must match `config.authority`"
          ],
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "tickets",
          "type": "u32"
        }
      ]
    },
    {
      "name": "beginResolveGame",
      "discriminator": [
        218,
        212,
        229,
        180,
        46,
        132,
        47,
        234
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Global config (authority, tiers, fee_bps, etc.)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "liveFeed",
          "docs": [
            "Live feed for this tier (must match epoch & tier)"
          ],
          "writable": true
        },
        {
          "name": "resolvedGame",
          "docs": [
            "ResolvedGame PDA for this epoch & tier – must already exist"
          ],
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Authority allowed to kick off resolution for this program"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    },
    {
      "name": "changePredictionNumber",
      "discriminator": [
        159,
        37,
        73,
        45,
        238,
        180,
        225,
        32
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true,
          "relations": [
            "prediction",
            "profile"
          ]
        },
        {
          "name": "liveFeed",
          "writable": true
        },
        {
          "name": "prediction",
          "writable": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "newPredictionType",
          "type": "u8"
        },
        {
          "name": "newChoice",
          "type": "u32"
        }
      ]
    },
    {
      "name": "claimPrediction",
      "discriminator": [
        142,
        100,
        159,
        123,
        31,
        183,
        0,
        113
      ],
      "accounts": [
        {
          "name": "game",
          "docs": [
            "Resolved game account containing Merkle root and claim tracking."
          ],
          "writable": true
        },
        {
          "name": "prediction",
          "docs": [
            "Prediction associated with the claiming wallet for this game chain."
          ],
          "writable": true
        },
        {
          "name": "treasury",
          "docs": [
            "Treasury holding lamports for all payouts."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "claimer",
          "docs": [
            "Wallet receiving the payout."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "index",
          "type": "u32"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      "name": "closeProfile",
      "discriminator": [
        167,
        36,
        181,
        8,
        136,
        158,
        46,
        207
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "closeResolvedGame",
      "discriminator": [
        41,
        26,
        224,
        251,
        3,
        49,
        38,
        114
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "resolvedGame",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    },
    {
      "name": "closeTierLiveFeed",
      "discriminator": [
        81,
        210,
        233,
        61,
        44,
        2,
        210,
        241
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "liveFeed",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    },
    {
      "name": "completeResolveGame",
      "discriminator": [
        189,
        230,
        231,
        80,
        93,
        166,
        153,
        155
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Global config (for authority + fee_bps etc.)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "liveFeed",
          "docs": [
            "Live feed for this tier (must match epoch & tier)"
          ],
          "writable": true
        },
        {
          "name": "resolvedGame",
          "docs": [
            "ResolvedGame PDA for this epoch & tier – MUST already exist"
          ],
          "writable": true
        },
        {
          "name": "treasury",
          "docs": [
            "Treasury holding the SOL for all games"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "feeVault",
          "docs": [
            "Fee vault where protocol fees are accumulated"
          ],
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Authority account that is allowed to resolve games"
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "protocolFeeLamports",
          "type": "u64"
        },
        {
          "name": "netPrizePool",
          "type": "u64"
        },
        {
          "name": "totalWinners",
          "type": "u32"
        },
        {
          "name": "merkleRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "resultsUri",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        }
      ]
    },
    {
      "name": "completeRolloverGame",
      "discriminator": [
        22,
        67,
        151,
        232,
        8,
        52,
        52,
        35
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "liveFeed",
          "writable": true
        },
        {
          "name": "resolvedGame",
          "writable": true
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "winningNumber",
          "type": "u8"
        },
        {
          "name": "rngEpochSlotUsed",
          "type": "u64"
        },
        {
          "name": "rngBlockhashUsed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "emergencyPauseAll",
      "discriminator": [
        96,
        81,
        255,
        34,
        122,
        30,
        88,
        137
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Global Config PDA.",
            "Only the `authority` stored in Config is allowed to update it."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current program authority.",
            "",
            "Must match `config.authority` due to the `has_one` constraint above."
          ],
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "increasePrediction",
      "discriminator": [
        75,
        159,
        70,
        116,
        152,
        118,
        2,
        101
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true,
          "relations": [
            "prediction"
          ]
        },
        {
          "name": "liveFeed",
          "writable": true
        },
        {
          "name": "prediction",
          "writable": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "additionalLamports",
          "type": "u64"
        },
        {
          "name": "choice",
          "type": "u32"
        }
      ]
    },
    {
      "name": "initResolvedGame",
      "discriminator": [
        3,
        11,
        225,
        82,
        84,
        207,
        173,
        159
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "liveFeed",
          "writable": true
        },
        {
          "name": "resolvedGame",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "winningNumber",
          "type": "u8"
        },
        {
          "name": "rngEpochSlotUsed",
          "type": "u64"
        },
        {
          "name": "rngBlockhashUsed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initTierLiveFeed",
      "discriminator": [
        31,
        226,
        36,
        21,
        235,
        180,
        177,
        63
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true
        },
        {
          "name": "treasury",
          "docs": [
            "Pass treasury for the live feed."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "liveFeed",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Global config PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "liveFeed",
          "docs": [
            "Live feed PDA for the provided tier."
          ],
          "writable": true
        },
        {
          "name": "treasury",
          "docs": [
            "Treasury PDA holding protocol lamports."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "feeVault"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    },
    {
      "name": "placePrediction",
      "discriminator": [
        79,
        46,
        195,
        197,
        50,
        91,
        88,
        229
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "liveFeed",
          "writable": true
        },
        {
          "name": "prediction",
          "writable": true
        },
        {
          "name": "profile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "predictionType",
          "type": "u8"
        },
        {
          "name": "choice",
          "type": "u32"
        },
        {
          "name": "lamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "resetLiveFeed",
      "discriminator": [
        108,
        217,
        10,
        61,
        112,
        251,
        137,
        78
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "liveFeed",
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Only admin program authority that is allowed to reset tiers."
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        },
        {
          "name": "rollover",
          "type": "u8"
        }
      ]
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Global Config PDA.",
            "Only the `authority` stored in Config is allowed to update it."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "docs": [
            "Current program authority.",
            "",
            "Must match `config.authority` due to the `has_one` constraint above."
          ],
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "pauseBet",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "pauseWithdraw",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "newAuthority",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newFeeVault",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newFeeBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newMinFeeBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newRolloverFeeStepBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newCutoffSlots",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newRollOverNumber",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "tierUpdates",
          "type": {
            "vec": {
              "defined": {
                "name": "tierUpdateArgs"
              }
            }
          }
        }
      ]
    },
    {
      "name": "updateTierActive",
      "discriminator": [
        27,
        138,
        59,
        2,
        111,
        210,
        16,
        91
      ],
      "accounts": [
        {
          "name": "config",
          "docs": [
            "Global config (stores tiers, authority, etc.)"
          ],
          "writable": true
        },
        {
          "name": "authority",
          "docs": [
            "Program authority (admin / DAO / multisig)"
          ],
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "tierId",
          "type": "u8"
        },
        {
          "name": "active",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "liveFeed",
      "discriminator": [
        188,
        3,
        96,
        15,
        250,
        6,
        139,
        132
      ]
    },
    {
      "name": "playerProfile",
      "discriminator": [
        82,
        226,
        99,
        87,
        164,
        130,
        181,
        80
      ]
    },
    {
      "name": "prediction",
      "discriminator": [
        98,
        127,
        141,
        187,
        218,
        33,
        8,
        14
      ]
    },
    {
      "name": "resolvedGame",
      "discriminator": [
        169,
        201,
        220,
        86,
        101,
        0,
        53,
        209
      ]
    },
    {
      "name": "treasury",
      "discriminator": [
        238,
        239,
        123,
        238,
        89,
        1,
        168,
        253
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "epochMismatch"
    },
    {
      "code": 6001,
      "name": "tierMismatch"
    },
    {
      "code": 6002,
      "name": "invalidTierBounds"
    },
    {
      "code": 6003,
      "name": "invalidAuthorityTarget"
    },
    {
      "code": 6004,
      "name": "invalidTierFlag"
    },
    {
      "code": 6005,
      "name": "invalidRollOverNumber"
    },
    {
      "code": 6006,
      "name": "invalidCutOffNumber"
    },
    {
      "code": 6007,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6008,
      "name": "authorityCannotEqualFeeVault"
    },
    {
      "code": 6009,
      "name": "invalidFeeConfig"
    },
    {
      "code": 6010,
      "name": "invalidLiveFeedState"
    },
    {
      "code": 6011,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6012,
      "name": "invalidInput",
      "msg": "Invalid input"
    },
    {
      "code": 6013,
      "name": "invalidFee"
    },
    {
      "code": 6014,
      "name": "invalidMinimumFee"
    },
    {
      "code": 6015,
      "name": "invalidFeeStep"
    },
    {
      "code": 6016,
      "name": "invalidCurveValue"
    },
    {
      "code": 6017,
      "name": "gameNotFound"
    },
    {
      "code": 6018,
      "name": "unknownTier"
    },
    {
      "code": 6019,
      "name": "invalidTicketBps",
      "msg": "Invalid percentage"
    },
    {
      "code": 6020,
      "name": "invalidTicketMax"
    },
    {
      "code": 6021,
      "name": "inactiveTier",
      "msg": "Inactive tier"
    },
    {
      "code": 6022,
      "name": "invalidTier",
      "msg": "Invalid tier"
    },
    {
      "code": 6023,
      "name": "epochNotAdvanced"
    },
    {
      "code": 6024,
      "name": "liveFeedNotEmpty"
    },
    {
      "code": 6025,
      "name": "gameAlreadyResolved"
    },
    {
      "code": 6026,
      "name": "gameNotResolved"
    },
    {
      "code": 6027,
      "name": "epochPotNotInitialized"
    },
    {
      "code": 6028,
      "name": "alreadyBetThisGame",
      "msg": "Already bet"
    },
    {
      "code": 6029,
      "name": "bettingClosed",
      "msg": "Betting closed"
    },
    {
      "code": 6030,
      "name": "bettingPaused",
      "msg": "Betting paused"
    },
    {
      "code": 6031,
      "name": "noOpChange"
    },
    {
      "code": 6032,
      "name": "treasuryMismatch"
    },
    {
      "code": 6033,
      "name": "betOutOfTierRange"
    },
    {
      "code": 6034,
      "name": "invalidChoiceCount"
    },
    {
      "code": 6035,
      "name": "assertInvariantFailed"
    },
    {
      "code": 6036,
      "name": "invalidBetNumber",
      "msg": "Invalid number selection"
    },
    {
      "code": 6037,
      "name": "invalidBetAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6038,
      "name": "noChangeTickets",
      "msg": "No change tickets"
    },
    {
      "code": 6039,
      "name": "invalidTicketAmount"
    },
    {
      "code": 6040,
      "name": "carryNotAllowed"
    },
    {
      "code": 6041,
      "name": "gameAlreadyResolvingOrResolved"
    },
    {
      "code": 6042,
      "name": "gameNotInResolvingState"
    },
    {
      "code": 6043,
      "name": "noBetsToResolve"
    },
    {
      "code": 6044,
      "name": "emptyResultsUri",
      "msg": "Invalid URI"
    },
    {
      "code": 6045,
      "name": "invalidFeeVault"
    },
    {
      "code": 6046,
      "name": "epochNotComplete"
    },
    {
      "code": 6047,
      "name": "invalidWinningNumber"
    },
    {
      "code": 6048,
      "name": "tooManyWinners"
    },
    {
      "code": 6049,
      "name": "invalidNetPoolPlusNet"
    },
    {
      "code": 6050,
      "name": "invalidPotBreakdown"
    },
    {
      "code": 6051,
      "name": "invalidCarryOver"
    },
    {
      "code": 6052,
      "name": "insufficientTreasuryBalance"
    },
    {
      "code": 6053,
      "name": "bitmapTooLarge"
    },
    {
      "code": 6054,
      "name": "invalidBitmapLen"
    },
    {
      "code": 6055,
      "name": "insufficientPrizePool"
    },
    {
      "code": 6056,
      "name": "proofTooLong"
    },
    {
      "code": 6057,
      "name": "invalidClaimAmount",
      "msg": "Invalid claim amount"
    },
    {
      "code": 6058,
      "name": "emptyMerkleRoot"
    },
    {
      "code": 6059,
      "name": "invalidProof",
      "msg": "Invalid Merkle proof"
    },
    {
      "code": 6060,
      "name": "alreadyClaimed",
      "msg": "Already claimed"
    },
    {
      "code": 6061,
      "name": "invalidIndex"
    },
    {
      "code": 6062,
      "name": "claimNotAllowed",
      "msg": "Claim not allowed"
    },
    {
      "code": 6063,
      "name": "bitmapOutOfBounds"
    },
    {
      "code": 6064,
      "name": "invalidClaimIndex"
    },
    {
      "code": 6065,
      "name": "tooManyClaims"
    },
    {
      "code": 6066,
      "name": "profileLockedActiveGame"
    }
  ],
  "types": [
    {
      "name": "config",
      "docs": [
        "Global configuration PDA.",
        "",
        "Stores protocol-wide controls (authority, fee routing, pause flags),",
        "fee parameters, and tier settings. This account holds no lamports."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pauseBet",
            "docs": [
              "1 = betting paused, 0 = enabled."
            ],
            "type": "u8"
          },
          {
            "name": "pauseWithdraw",
            "docs": [
              "1 = withdrawals/claims paused, 0 = enabled."
            ],
            "type": "u8"
          },
          {
            "name": "authority",
            "docs": [
              "Program admin authority."
            ],
            "type": "pubkey"
          },
          {
            "name": "feeVault",
            "docs": [
              "Destination for collected protocol fees."
            ],
            "type": "pubkey"
          },
          {
            "name": "baseFeeBps",
            "docs": [
              "Base protocol fee in basis points (1 bps = 0.01%)."
            ],
            "type": "u16"
          },
          {
            "name": "betCutoffSlots",
            "docs": [
              "Minimum slots remaining in the epoch required to allow betting."
            ],
            "type": "u64"
          },
          {
            "name": "startedAt",
            "docs": [
              "Unix timestamp when protocol was initialized."
            ],
            "type": "i64"
          },
          {
            "name": "startedEpoch",
            "docs": [
              "Solana epoch when protocol was initialized."
            ],
            "type": "u64"
          },
          {
            "name": "primaryRollOverNumber",
            "docs": [
              "Primary number that triggers rollover behavior."
            ],
            "type": "u8"
          },
          {
            "name": "tiers",
            "docs": [
              "Tier configurations (fixed-size array)."
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "tierSettings"
                  }
                },
                5
              ]
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump for Config."
            ],
            "type": "u8"
          },
          {
            "name": "minFeeBps",
            "docs": [
              "Minimum allowed fee in basis points."
            ],
            "type": "u16"
          },
          {
            "name": "rolloverFeeStepBps",
            "docs": [
              "Fee step applied to rollover scenarios (basis points)."
            ],
            "type": "u16"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future upgrades."
            ],
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "liveFeed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "docs": [
              "The current Solana epoch being tracked for this tier."
            ],
            "type": "u64"
          },
          {
            "name": "firstEpochInChain",
            "docs": [
              "First epoch included in the current epoch-chain for this tier."
            ],
            "type": "u64"
          },
          {
            "name": "totalLamports",
            "docs": [
              "Total lamports wagered across the current epoch-chain."
            ],
            "type": "u64"
          },
          {
            "name": "carriedOverLamports",
            "docs": [
              "Lamports carried into the current epoch (accounting only)."
            ],
            "type": "u64"
          },
          {
            "name": "totalBets",
            "docs": [
              "Total bet count across the current epoch-chain."
            ],
            "type": "u32"
          },
          {
            "name": "carriedOverBets",
            "docs": [
              "Bet count carried into the current epoch (accounting only)."
            ],
            "type": "u32"
          },
          {
            "name": "betCutoffSlots",
            "docs": [
              "Slots-before-epoch-end cutoff enforced for betting."
            ],
            "type": "u64"
          },
          {
            "name": "tier",
            "docs": [
              "Tier ID for this feed (1..=5)."
            ],
            "type": "u8"
          },
          {
            "name": "treasury",
            "docs": [
              "Treasury PDA holding lamports for payouts/fees."
            ],
            "type": "pubkey"
          },
          {
            "name": "epochsCarriedOver",
            "docs": [
              "Number of times this game carried forward due to rollover."
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump."
            ],
            "type": "u8"
          },
          {
            "name": "lamportsPerNumber",
            "docs": [
              "Lamports wagered per number index (0..=9)."
            ],
            "type": {
              "array": [
                "u64",
                10
              ]
            }
          },
          {
            "name": "betsPerNumber",
            "docs": [
              "Bet count per number index (0..=9)."
            ],
            "type": {
              "array": [
                "u32",
                10
              ]
            }
          },
          {
            "name": "secondaryRolloverNumber",
            "docs": [
              "Secondary rollover number for this tier’s current game (0 disables)."
            ],
            "type": "u8"
          },
          {
            "name": "currentFeeBps",
            "docs": [
              "Current fee rate for this tier’s current game."
            ],
            "type": "u16"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved for future fields."
            ],
            "type": {
              "array": [
                "u8",
                61
              ]
            }
          }
        ]
      }
    },
    {
      "name": "playerProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "docs": [
              "The owner/player wallet"
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump"
            ],
            "type": "u8"
          },
          {
            "name": "ticketsAvailable",
            "docs": [
              "Number of available re-roll tickets"
            ],
            "type": "u32"
          },
          {
            "name": "totalBets",
            "type": "u64"
          },
          {
            "name": "totalLamportsWagered",
            "type": "u64"
          },
          {
            "name": "lastPlayedEpoch",
            "type": "u64"
          },
          {
            "name": "lastPlayedTier",
            "type": "u8"
          },
          {
            "name": "lastPlayedTimestamp",
            "type": "i64"
          },
          {
            "name": "xpPoints",
            "type": "u32"
          },
          {
            "name": "recentBets",
            "docs": [
              "Circular buffer of the last N bet pubkeys"
            ],
            "type": {
              "array": [
                "pubkey",
                40
              ]
            }
          },
          {
            "name": "recentBetsLen",
            "docs": [
              "Number of valid entries currently stored (0~RECENT_BETS_CAP)"
            ],
            "type": "u16"
          },
          {
            "name": "recentBetsHead",
            "docs": [
              "Next index to write (wraps around 0..RECENT_BETS_CAP-1)"
            ],
            "type": "u16"
          },
          {
            "name": "lockedUntilEpoch",
            "docs": [
              "Prevent closer if player is in game."
            ],
            "type": "u64"
          },
          {
            "name": "firstPlayedEpoch",
            "docs": [
              "first game played"
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "prediction",
      "docs": [
        "---------------------------------------------------------------------------",
        "prediction",
        "---------------------------------------------------------------------------",
        "Represents a user's prediction for a specific Solana epoch.",
        "Supports multiple \"selection styles\" while keeping the account fixed-size."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameEpoch",
            "docs": [
              "First epoch in the chain for this game (stable game ID)."
            ],
            "type": "u64"
          },
          {
            "name": "epoch",
            "docs": [
              "Epoch in which this prediction was placed (maybe > game_epoch for rollovers)."
            ],
            "type": "u64"
          },
          {
            "name": "player",
            "docs": [
              "Player wallet."
            ],
            "type": "pubkey"
          },
          {
            "name": "tier",
            "docs": [
              "Tier this prediction is for."
            ],
            "type": "u8"
          },
          {
            "name": "predictionType",
            "docs": [
              "Prediction type (UI/analytics hint; the selection set is the source of truth).",
              "0 = single_number",
              "1 = split (any number of numbers)",
              "2 = high_low",
              "3 = even_odd"
            ],
            "type": "u8"
          },
          {
            "name": "selectionCount",
            "docs": [
              "How many entries in `selections` are active (1..=8).",
              "- single_number: 1",
              "- two_numbers: 2",
              "- high_low: typically 4 (exact set stored)",
              "- even_odd: typically 3..=5 depending on blocked rollover numbers",
              "- future \"cover\" styles: up to 8"
            ],
            "type": "u8"
          },
          {
            "name": "selectionsMask",
            "docs": [
              "Bitmask of selected numbers (bit n => number n is selected).",
              "Example: selecting {1,4,7} => (1<<1)|(1<<4)|(1<<7) = 146."
            ],
            "type": "u16"
          },
          {
            "name": "selections",
            "docs": [
              "Selections used by the prediction (exact covered numbers).",
              "",
              "The active set is `selections[0..selection_count]`.",
              "Each entry must be in 1..=9 and must not include blocked rollover numbers",
              "(e.g., 0 and last winning number).",
              "",
              "Examples:",
              "- single_number: [7, 0, 0, 0, 0, 0, 0, 0] (selection_count=1)",
              "- two_numbers:   [2, 7, 0, 0, 0, 0, 0, 0] (selection_count=2)",
              "- high_low:      [1, 2, 3, 4, 0, 0, 0, 0] (selection_count=4)",
              "- even_odd:      [1, 3, 5, 7, 9, 0, 0, 0] (selection_count=5)"
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          },
          {
            "name": "lamports",
            "docs": [
              "Total lamports wagered for this prediction.",
              "Invariant: lamports == lamports_per_number * selection_count"
            ],
            "type": "u64"
          },
          {
            "name": "changedCount",
            "docs": [
              "The number of times this prediction has been changed."
            ],
            "type": "u8"
          },
          {
            "name": "placedSlot",
            "docs": [
              "Slot at which the prediction was first placed."
            ],
            "type": "u64"
          },
          {
            "name": "placedAtTs",
            "docs": [
              "Timestamp when the prediction was first placed."
            ],
            "type": "i64"
          },
          {
            "name": "lastUpdatedAtTs",
            "docs": [
              "Timestamp when the prediction was last updated."
            ],
            "type": "i64"
          },
          {
            "name": "hasClaimed",
            "docs": [
              "Whether the prediction has been claimed."
            ],
            "type": "u8"
          },
          {
            "name": "claimedAtTs",
            "docs": [
              "Timestamp when the prediction was claimed (0 if unclaimed, or leave as-is)."
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump."
            ],
            "type": "u8"
          },
          {
            "name": "version",
            "docs": [
              "Version marker for decoding & future migrations."
            ],
            "type": "u8"
          },
          {
            "name": "lamportsPerNumber",
            "docs": [
              "Lamports wagered per selected number."
            ],
            "type": "u64"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved for future use."
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "resolvedGame",
      "docs": [
        "---------------------------------------------------------------------------",
        "resolvedGame",
        "---------------------------------------------------------------------------",
        "",
        "Finalized record of a single IC42N game, created after a Solana epoch ends.",
        "Stores immutable results, Merkle root, winners, and carry-over data.",
        "",
        "This account is created **after an epoch ends**, once results are known",
        "and the Merkle tree of winners has been computed.",
        "",
        "This struct acts as the **ledger entry** for that epoch and tier:",
        "- records total bets and pot size",
        "- tracks carry-over amounts",
        "- stores the Merkle root for claim verification",
        "- exposes an immutable URI with full result data",
        "",
        "⚠️ Lamports themselves are **never held here** — they remain in the",
        "central Treasury PDA. This account is purely an accounting and claims record."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "tier",
            "type": "u8"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "winningNumber",
            "type": "u8"
          },
          {
            "name": "rngEpochSlotUsed",
            "type": "u64"
          },
          {
            "name": "rngBlockhashUsed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "attemptCount",
            "type": "u8"
          },
          {
            "name": "lastUpdatedSlot",
            "type": "u64"
          },
          {
            "name": "lastUpdatedTs",
            "type": "i64"
          },
          {
            "name": "carryOverBets",
            "type": "u32"
          },
          {
            "name": "totalBets",
            "type": "u32"
          },
          {
            "name": "carryInLamports",
            "type": "u64"
          },
          {
            "name": "carryOutLamports",
            "type": "u64"
          },
          {
            "name": "protocolFeeLamports",
            "type": "u64"
          },
          {
            "name": "netPrizePool",
            "type": "u64"
          },
          {
            "name": "totalWinners",
            "type": "u32"
          },
          {
            "name": "claimedWinners",
            "type": "u32"
          },
          {
            "name": "resolvedAt",
            "type": "i64"
          },
          {
            "name": "merkleRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "resultsUri",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "claimedBitmap",
            "type": "bytes"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "claimedLamports",
            "type": "u64"
          },
          {
            "name": "firstEpochInChain",
            "type": "u64"
          },
          {
            "name": "rolloverReason",
            "type": "u8"
          },
          {
            "name": "secondaryRolloverNumber",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                14
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tierSettings",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tierId",
            "type": "u8"
          },
          {
            "name": "active",
            "type": "u8"
          },
          {
            "name": "minBetLamports",
            "type": "u64"
          },
          {
            "name": "maxBetLamports",
            "type": "u64"
          },
          {
            "name": "curveFactor",
            "docs": [
              "Optional shaping factor used by your payout/odds math."
            ],
            "type": "f32"
          },
          {
            "name": "ticketRewardBps",
            "docs": [
              "Ticket distribution rate in basis points of losers (0 disables)."
            ],
            "type": "u16"
          },
          {
            "name": "ticketRewardMax",
            "docs": [
              "Max number of recipients eligible for tickets per resolved game."
            ],
            "type": "u16"
          },
          {
            "name": "ticketsPerRecipient",
            "docs": [
              "Number of tickets to award per selected recipient."
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                10
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tierUpdateArgs",
      "docs": [
        "Arguments for updating one or more fields of a given tier.",
        "",
        "All fields are optional:",
        "- If a field is `None`, the existing value is left unchanged.",
        "- `tier_id` is used to locate the tier inside `Config.tiers`."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tierId",
            "docs": [
              "Numeric ID of the tier to update (must match an existing TierSettings.tier_id)."
            ],
            "type": "u8"
          },
          {
            "name": "active",
            "docs": [
              "If provided, sets the active flag (0 or 1)."
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "minBetLamports",
            "docs": [
              "New minimum bet in lamports (optional)."
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maxBetLamports",
            "docs": [
              "New maximum bet in lamports (optional)."
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "curveFactor",
            "docs": [
              "New curve multiplier for this tier (optional)."
            ],
            "type": {
              "option": "f32"
            }
          },
          {
            "name": "ticketRewardBps",
            "docs": [
              "Ticket reward % (in basis points) for this tier (optional).",
              "1000 = 10% of losers. 0 disables ticket awards."
            ],
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "ticketRewardMax",
            "docs": [
              "Hard cap on ticket recipients for this tier (optional)."
            ],
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "ticketsRewarded",
            "docs": [
              "Ticket reward count for this tier (optional)."
            ],
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "treasury",
      "docs": [
        "---------------------------------------------------------------------------",
        "treasury",
        "---------------------------------------------------------------------------",
        "",
        "Program-owned PDA that holds SOL for the IC42N game.",
        "If you use a single global treasury, `tier` is fixed to 0."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Who controls configuration / fee withdrawals."
            ],
            "type": "pubkey"
          },
          {
            "name": "tier",
            "docs": [
              "Tier this treasury is associated with:",
              "0 = Global (all tiers)",
              "1 = Low, 2 = Mid, 3 = High (if you ever decide to split)."
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump for deterministic re-derivation."
            ],
            "type": "u8"
          },
          {
            "name": "totalInLamports",
            "docs": [
              "Total lamports ever received as bets into this treasury",
              "(monotonic counter, for analytics / audit)."
            ],
            "type": "u64"
          },
          {
            "name": "totalOutLamports",
            "docs": [
              "Total lamports ever paid out to winners from this treasury."
            ],
            "type": "u64"
          },
          {
            "name": "totalFeesWithdrawn",
            "docs": [
              "Total lamports withdrawn as protocol fees (house edge)."
            ],
            "type": "u64"
          },
          {
            "name": "version",
            "docs": [
              "Versioning for future migrations."
            ],
            "type": "u8"
          },
          {
            "name": "reserved",
            "docs": [
              "Padding / reserved bytes for future use (config, extra flags)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ]
};
