const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const { weightRepo } = require('./models/Weights')
const { logWeightByAuthId } = require('./models/Weights')
const { Footer } = require('@chatium/json')
const { ListItem } = require('@chatium/json')
const { getBMIColor } = require('./utils/BMI')
const { getBMIDescription } = require('./utils/BMI')
const { profileRepo } = require('./models/Profile')
const { calcBMI } = require('./utils/BMI')
const { refresh } = require('@chatium/json')
const { updateProfileField } = require('./models/Profile')
const { showTextDialog } = require('@chatium/json')
const { getProfileByAuthId } = require('./models/Profile')

require('dotenv').config()

const {
  screenResponse, apiCallResponse,
  navigate,
  Screen, Text, Button,
} = require('@chatium/json')

const { getChatiumContext, triggerHotReload } = require('@chatium/sdk')

const centerFlexTextProps = { containerStyle: { default: false, flexDirection: 'column', alignItems: 'center' } }

const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(morgan('combined'))

app.get('/', async (req, res) => {
  const ctx = getContext(req)

  const profiles = (await profileRepo.findAll(ctx)).filter(p => p.weight > 0 && p.name)
  if (profiles.length === 0) {
    return res.json(
      screenResponse({
        data: await Screen({ title: 'Мониторинг веса' }, [
          Text({ text: 'Еще нет ни одного пользователя заполнившего свой профиль.' }),
          Footer({}, [
            Button({ title: 'Участвовать', onClick: navigate(`/dashboard/${ctx.auth.id}`) }),
          ]),
        ])
      })
    )
  }

  return res.json(
    screenResponse({
      data: await Screen({ title: 'Мониторинг веса' }, [
        profiles.length > 0 && Text({ text: 'Участники', styles: ['bold'], containerStyle: { marginBottom: 0 } }),
        ...profiles.map(p => ListItem({
          title: p.name,
          description: p.height === 0
            ? 'Не указан рост'
            : getBMIDescription(calcBMI(p.height, p.weight)),
          logo: {
            text: p.weight,
            bgColor: '#e0e0e0',
          },
          onClick: navigate(`/dashboard/${p.authId}`)
        })),
        Footer({}, [
          Button({
            title: 'Укажите текущий вес',
            onClick: showTextDialog({
              title: 'Укажите текущий вес в килограммах',
              submitUrl: '/profile/weight'
            })
          }),
        ])
      ])
    })
  )
})

app.get('/dashboard/:authId', async (req, res) => {
  const ctx = getContext(req)
  const authId = parseInt(req.params.authId)

  const dateTo = new Date()
  const dates = Array
    .from(Array(7).keys())
    .reverse()
    .map(delta => {
      const date = new Date(dateTo)
      date.setDate(dateTo.getDate() - delta)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    })

  const weights = (await weightRepo.findAll(ctx))
    .filter(weight => weight.authId === authId)
    .filter(weight => dates.includes(weight.date))
    .sort((a, b) => a.date - b.date)

  const startWeight = weights.length > 0 ? weights[0].weight : 0
  const minWeight = weights.reduce((result, item) => Math.min(result, item.weight), startWeight)
  const maxWeight = weights.reduce((result, item) => Math.max(result, item.weight), startWeight)
  const delta = maxWeight - minWeight

  const chartHeight = 100

  const profile = await getProfileByAuthId(ctx, authId)
  const hasHeight = profile && profile.height > 0
  const hasWeight = profile && profile.weight > 0
  const hasTargetWeight = profile && profile.targetWeight > 0

  const hasBMI = hasHeight && hasWeight
  const BMI = hasBMI ? calcBMI(profile.height, profile.weight) : 0
  const BMIDescription = hasBMI ? getBMIDescription(BMI) : ''
  const BMIColor = hasBMI ? getBMIColor(BMI) : ''

  let prevWeight = startWeight
  const bars = dates.map(date => {
    const model = weights.find(weight => weight.date === date)
    const weight = model ? model.weight : prevWeight
    prevWeight = weight

    return {
      weight,
      height: delta === 0 ? 250 : ((weight - minWeight) / delta * chartHeight) + 50,
      hasData: !!model
    }
  })

  return res.json(
    screenResponse({
      data: await Screen({ title: profile ? profile.name : 'Текущее состояние' }, [
        weights.length > 0 && Text({ containerStyle: { flexDirection: 'row', alignItems: 'flex-end' } }, [
          bars.map(bar => Text({
            containerStyle: {
              default: false,
              bgColor: bar.hasData ? '#00dcff' : '#e7eaea',
              height: bar.height,
              width: `${100 / dates.length}%`,
              borderTopColor: bar.hasData ? '#206693' : '#9f9f9f',
              borderTopWidth: 4,
              borderRightWidth: 'hairline',
              borderRightColor: '#3f97b0',
            }
          }, [Text({ text: bar.weight, styles: [{ fontSize: '12px' }] })]))
        ]),

        hasBMI && Text({ text: 'Индекс массы тела:', containerStyle: { marginBottom: 10 } }),
        hasBMI && Text(centerFlexTextProps, [
          Text({ text: `${BMI} кг/м²`, styles: ['xxxlarge', 'bold', { fontSize: '52px' }], containerStyle: { default: false } }),
          Text({ text: 'По рекомендациям ВОЗ', containerStyle: { default: false } }),
          Text({ text: 'это трактуется как:', containerStyle: { default: false } }),
          Text({ text: BMIDescription, color: BMIColor }),
        ]),

        hasWeight && Text({ text: 'Текущий вес:', containerStyle: { marginBottom: 0 } }),
        hasWeight && Text(centerFlexTextProps, [
          Text({ text: `${profile.weight} кг`, styles: ['xxlarge', 'bold'] })
        ]),

        Button({
          title: 'Изменить текущий вес',
          onClick: showTextDialog({
            title: 'Укажите текущий вес в килограммах',
            submitUrl: '/profile/weight'
          })
        }),

        hasTargetWeight && Text({ text: 'Желаемый вес:', containerStyle: { marginBottom: 0 } }),
        hasTargetWeight && Text(centerFlexTextProps, [
          Text({ text: `${profile.targetWeight} кг`, styles: ['xxlarge', 'bold'] })
        ]),

        (!hasTargetWeight || ctx.auth.id === authId) && Button({
          title: hasTargetWeight
            ? 'Изменить желаемый вес'
            : 'Указать желаемый вес',
          onClick: showTextDialog({
            title: hasTargetWeight
              ? 'Изменить желаемый вес в килограммах'
              : 'Указать желаемый вес в килограммах',
            submitUrl: '/profile/targetWeight'
          })
        }),

        Text({ text: 'Для расчета индекса массы тела необходимо указать рост и вес.' }),

        (!hasHeight || ctx.auth.id === authId) && Button({
          title: hasHeight
            ? `Изменить рост (${profile.height} см)`
            : 'Указать мой рост',
          onClick: showTextDialog({
            title: 'Указать рост в сантиметрах',
            submitUrl: '/profile/height'
          })
        }),
      ])
    })
  )
})

app.post('/profile/:field', async (req, res) => {
  const ctx = getContext(req)

  const field = req.params.field
  const value = req.body.value

  await updateProfileField(ctx, ctx.auth.id, field, value)

  if (field === 'weight') {
    await logWeightByAuthId(ctx, ctx.auth.id, value)
  }

  res.json(
    apiCallResponse({ appAction: refresh() })
  )
})

console.log(``)
console.log(`Application started:`)

const port = process.env.PORT || 5050
app.listen(port, '0.0.0.0', () => {
  console.log(`Listening at port :${port}`)
  if (process.env.API_KEY && process.env.API_SECRET) {
    triggerHotReload(appCtx).catch(err => console.log('triggerHotReload error:', err))
  }
})

console.log(``)
console.log(`   APP_ENDPOINT = ${process.env.APP_ENDPOINT ? process.env.APP_ENDPOINT : 'undefined (setup .env file)'}`)
console.log(`        API_KEY = ${process.env.API_KEY ? process.env.API_KEY : 'undefined (setup .env file)'}`)
console.log(`     API_SECRET = ${process.env.API_SECRET ? process.env.API_SECRET.slice(0, 10) + 'xXxXxXxXxXxXxXxXxXxXxX' : 'undefined (setup .env file)'}`)
console.log(``)

const appCtx = {
  app: {
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
  }
}

function getContext(req) {
  return getChatiumContext(appCtx, req.headers)
}
