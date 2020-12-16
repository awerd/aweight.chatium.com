const { HeapRepo } = require('@chatium/sdk')

const profileRepo = new HeapRepo('Profile', {
  authId: {
    type: 'int',
  },
  userId: {
    type: 'string',
  },
  name: {
    type: 'string',
  },
  gender: {
    type: 'string',
  },
  height: {
    type: 'int',
  },
  weight: {
    type: 'int',
  },
  targetWeight: {
    type: 'int',
  },
})

const GENDER_MALE = 'male'
const GENDER_FEMALE = 'female'
const GENDER_UNKNOWN = 'unknown'

const profileGenders = {
  GENDER_MALE,
  GENDER_FEMALE,
}

async function getProfileByAuthId(ctx, authId) {
  const profiles = await profileRepo.findAll(ctx)
  return profiles.find(p => p.authId === authId)
}

async function getOrCreateProfileByAuthId(ctx, authId) {
  const profile = await getProfileByAuthId(ctx, authId)

  if (!profile) {
    return await profileRepo.create(ctx, {
      authId,
      userId: ctx.userId,
      name: [ctx.user.firstName, ctx.user.lastName].join(' '),
      gender: GENDER_UNKNOWN,
      height: 0,
      weight: 0,
      targetWeight: 0,
    })
  }
  return profile
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
          gender: GENDER_UNKNOWN,
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
  profileGenders,
  getProfileByAuthId,
  getOrCreateProfileByAuthId,
  updateProfileField,
}
