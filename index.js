'use strict'

const Analytics = require('./lib/Analytics')
const config = require('./config')
const cors = require('cors')
const crypto = require('crypto')
const Database = require('./lib/Database')
const ErrorHandler = require('./lib/ErrorHandler')
const express = require('express')
const GitHub = require('./lib/GitHub')
const Scheduler = require('./lib/Scheduler')
const SpeedTracker = require('./lib/SpeedTracker')

const WebhookApi = require('@octokit/webhooks')
// const EventHandler = require('@octokit/webhooks/event-handler')
// const EventSource = require('eventsource')


// const eventHandler = new EventHandler({
//   async transform (event) {
//     // optionally transform passed event before handlers are called
//     return event
//   }
// })

// ------------------------------------
// Server
// ------------------------------------

const server = express()

server.use(cors())

// ------------------------------------
// Scheduler
// ------------------------------------

let scheduler

// ------------------------------------
// GitHub
// ------------------------------------

const github = new GitHub()

// console.log(github)
//console.log(github.api.issues)
github.authenticate(config.get('githubToken'))

// ------------------------------------
// DB connection
// ------------------------------------

let db = new Database(connection => {
  console.log('(*) Established database connection')

  server.listen(config.get('port'), () => {
    console.log(`(*) Server listening on port ${config.get('port')}`)
  })

  scheduler = new Scheduler({
    db: connection,
    remote: github
  })
})

// ------------------------------------
// Endpoint: Test
// ------------------------------------

// const SmeeClient = require('smee-client')

// const smee = new SmeeClient({
//   source: 'https://smee.io/EVnL2aQsLdOmYl',
//   target: 'http://localhost:3000/events',
//   logger: console
// })

// const events = smee.start()

// const webhookProxyUrl = 'https://smee.io/EVnL2aQsLdOmYl' // replace with your own Webhook Proxy URL
// const source = new EventSource(webhookProxyUrl)
// source.onmessage = (event) => {
//   const webhookEvent = JSON.parse(event.data)
//   webhooks.verifyAndReceive({
//     id: webhookEvent['x-request-id'],
//     name: webhookEvent['x-github-event'],
//     signature: webhookEvent['x-hub-signature'],
//     payload: webhookEvent.body
//   }).catch(console.error)
// }

const testHandler = (req, res) => {
  // console.log(req)
  const blockList = config.get('blockList').split(',')

  // Abort if user is blocked
  if (blockList.indexOf(req.params.user) !== -1) {
    ErrorHandler.log(`Request blocked for user ${req.params.user}`)

    return res.status(429).send()
  }
  const github = new GitHub(GitHub.GITHUB_CONNECT)

  github.authenticate(config.get('githubToken'))

  const webhooks = new WebhookApi({secret: 'cdfe76a90ece9eb3add341d82ab6479bbf8422b4'})
  console.log(webhooks)
  webhooks.on('*', ({id, name, payload}) => {
    console.log(name, 'event received')
    console.log(payload)
  })

  // const speedtracker = new SpeedTracker({
  //   db,
  //   branch: req.params.branch,
  //   key: req.query.key,
  //   remote: github,
  //   repo: req.params.repo,
  //   scheduler,
  //   user: req.params.user
  // })

  // let profileName = req.params.profile

  // speedtracker.runTest(profileName).then(response => {
  //   res.send(JSON.stringify(response))
  // }).catch(err => {
  //   ErrorHandler.log(err)

  //   res.status(500).send(JSON.stringify(err))
  // })
  // Stop forwarding events
  events.close()
}

server.get('/v1/test/:user/:repo/:branch/:profile', testHandler)
server.post('/v1/test/:user/:repo/:branch/:profile', testHandler)

// ------------------------------------
// Endpoint: Connect
// ------------------------------------

server.get('/v1/connect/:user/:repo', (req, res) => {
  const github = new GitHub(GitHub.GITHUB_CONNECT)

  github.authenticate(config.get('githubToken'))

  github.api.users.getRepoInvites({}).then(response => {
    let invitationId
    let invitation = response.some(invitation => {
      if (invitation.repository.full_name === (req.params.user + '/' + req.params.repo)) {
        invitationId = invitation.id

        return true
      }
    })

    if (invitation) {
      return github.api.users.acceptRepoInvite({
        id: invitationId
      })        
    } else {
      return Promise.reject()
    }
  }).then(response => {
    // Track event
    new Analytics().track(Analytics.Events.CONNECT)

    res.send('OK!')
  }).catch(err => {
    ErrorHandler.log(err)

    res.status(500).send('Invitation not found.')
  })  
})

// ------------------------------------
// Endpoint: Encrypt
// ------------------------------------

server.get('/encrypt/:key/:text?', (req, res) => {
  const key = req.params.key
  const text = req.params.text || req.params.key

  const cipher = crypto.createCipher('aes-256-ctr', key)
  let encrypted = cipher.update(decodeURIComponent(text), 'utf8', 'hex')

  encrypted += cipher.final('hex')

  res.send(encrypted)
})

// ------------------------------------
// Endpoint: Decrypt
// ------------------------------------

server.get('/decrypt/:key/:text?', (req, res) => {
  const decipher = crypto.createDecipher('aes-256-ctr', req.params.key)
  let decrypted = decipher.update(req.params.text, 'hex', 'utf8')

  decrypted += decipher.final('utf8')

  res.send(decrypted)
})

// ------------------------------------
// Endpoint: Catch all
// ------------------------------------

server.all('*', (req, res) => {
  const response = {
    success: false,
    error: 'INVALID_URL_OR_METHOD'
  }

  res.status(404).send(JSON.stringify(response))
})

// ------------------------------------
// Basic error logging
// ------------------------------------

process.on('unhandledRejection', (reason, promise) => {
  if (reason) {
    ErrorHandler.log(reason)  
  }
})
