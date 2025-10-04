export const LPLockerABI = [
  {
    type: 'function',
    name: 'lockLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_lpToken', type: 'address' },
      { name: '_amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'triggerWithdrawal',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_lockId', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'cancelWithdrawalTrigger',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_lockId', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'withdrawLP',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_lockId', type: 'uint256' },
      { name: '_amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'claimLPFees',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_lockId', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'topUpLock',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_lockId', type: 'uint256' },
      { name: '_amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'getLockInfo',
    stateMutability: 'view',
    inputs: [{ name: '_lockId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'lpToken', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'lockedAt', type: 'uint256' },
          { name: 'withdrawalTriggeredAt', type: 'uint256' },
          { name: 'isWithdrawn', type: 'bool' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'getAllLockIds',
    stateMutability: 'view',
    inputs: [{ name: '_owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }]
  },
  {
    type: 'event',
    name: 'LiquidityLocked',
    inputs: [
      { name: 'lockId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'lpToken', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'WithdrawalTriggered',
    inputs: [
      { name: 'lockId', type: 'uint256', indexed: true },
      { name: 'triggeredAt', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'LiquidityWithdrawn',
    inputs: [
      { name: 'lockId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  }
] as const;
