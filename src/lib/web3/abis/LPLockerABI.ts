export const LPLockerABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'tokenContract_', type: 'address' },
      { name: 'owner_', type: 'address' },
      { name: 'feeReceiver_', type: 'address' }
    ]
  },
  {
    type: 'function',
    name: 'lockLiquidity',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: 'lockId', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'triggerWithdrawal',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'cancelWithdrawalTrigger',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'withdrawLP',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'lockId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'claimLPFees',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'topUpLock',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'lockId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'changeFeeReceiver',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newFeeReceiver', type: 'address' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'updateClaimableFees',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'recoverToken',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'getLockInfo',
    stateMutability: 'view',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: [
      { name: 'owner_', type: 'address' },
      { name: 'feeReceiver_', type: 'address' },
      { name: 'tokenContract_', type: 'address' },
      { name: 'amount_', type: 'uint256' },
      { name: 'lockUpEndTime_', type: 'uint256' },
      { name: 'isLiquidityLocked_', type: 'bool' },
      { name: 'isWithdrawalTriggered_', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'getUnlockTime',
    stateMutability: 'view',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: [{ name: 'lockUpEndTime_', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'getClaimableFees',
    stateMutability: 'view',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: [
      { name: 'token0', type: 'address' },
      { name: 'amount0', type: 'uint256' },
      { name: 'token1', type: 'address' },
      { name: 'amount1', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'getTotalAccumulatedFees',
    stateMutability: 'view',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: [
      { name: 'token0', type: 'address' },
      { name: 'totalAmount0', type: 'uint256' },
      { name: 'token1', type: 'address' },
      { name: 'totalAmount1', type: 'uint256' }
    ]
  },
  {
    type: 'function',
    name: 'getAllLockIds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32[]' }]
  },
  {
    type: 'function',
    name: 'lockExists',
    stateMutability: 'view',
    inputs: [{ name: 'lockId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'getLPBalance',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'lpBalance', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'pendingOwner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'acceptOwnership',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'transferOwnership',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newOwner', type: 'address' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'feeReceiver',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'tokenContract',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'event',
    name: 'LiquidityLocked',
    inputs: [
      { name: 'lockId', type: 'bytes32', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'WithdrawalTriggered',
    inputs: [
      { name: 'lockId', type: 'bytes32', indexed: false },
      { name: 'unlockTime', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'WithdrawalCancelled',
    inputs: [{ name: 'lockId', type: 'bytes32', indexed: false }]
  },
  {
    type: 'event',
    name: 'LPWithdrawn',
    inputs: [
      { name: 'lockId', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'FeesClaimed',
    inputs: [
      { name: 'lockId', type: 'bytes32', indexed: true },
      { name: 'token0', type: 'address', indexed: false },
      { name: 'amount0', type: 'uint256', indexed: false },
      { name: 'token1', type: 'address', indexed: false },
      { name: 'amount1', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'FeeReceiverChanged',
    inputs: [{ name: 'newFeeReceiver', type: 'address', indexed: true }]
  },
  {
    type: 'event',
    name: 'LockFullyWithdrawn',
    inputs: [{ name: 'lockId', type: 'bytes32', indexed: true }]
  },
  {
    type: 'event',
    name: 'ClaimableFeesUpdated',
    inputs: [{ name: 'lockId', type: 'bytes32', indexed: true }]
  }
] as const;
