const { HeapRepo } = require('@chatium/sdk')

const profileRepo = new HeapRepo('Profile', {
  authId: { type: 'int' },
  userId: { type: 'string' },
  name: { type: 'string' },
  height: { type: 'int' },
  weight: { type: 'int' },
  targetWeight: { type: 'int' },
})

async function getProfileByAuthId(ctx, authId) {
  const profiles = await profileRepo.findAll(ctx)
  return profiles.find(p => p.authId === authId)
}

async function updateProfileField(ctx, authId, field, value) {
  if (['height', 'weight', 'targetWeight'].includes(field)) {
    const profile = await getProfileByAuthId(ctx, authId)

    return profile
      ? await profileRepo.update(ctx, {
        id: profile.id,
        userId: ctx.userId,
        name: [ctx.user.firstName, ctx.user.lastName].join(' '),
          ...{ [field]: value }
        })
      : await profileRepo.create(ctx, {
          authId,
          userId: ctx.userId,
          name: [ctx.user.firstName, ctx.user.lastName].join(' '),
          height: 0,
          weight: 0,
          targetWeight: 0,
          ...{ [field]: value }
        })
  }

  return null
}

module.exports = {
  profileRepo,
  getProfileByAuthId,
  updateProfileField,
}
