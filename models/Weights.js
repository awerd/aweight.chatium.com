const { HeapRepo } = require('@chatium/sdk')

const weightRepo = new HeapRepo('Weight', {
  authId: {
    type: 'int',
  },
  date: {
    type: 'int',
  },
  weight: {
    type: 'int',
  },
})

async function logWeightByAuthId(ctx, authId, weight) {
  const date = (new Date()).setHours(0, 0, 0, 0)
  const existsWeight = (await weightRepo.findAll(ctx)).find(p => p.authId === authId && p.date === date)

  if (!existsWeight) {
    return await weightRepo.create(ctx, {
      authId,
      date,
      weight,
    })
  }

  return await weightRepo.update(ctx, {
    id: existsWeight.id,
    weight,
  })
}

module.exports = {
  weightRepo,
  logWeightByAuthId,
}
