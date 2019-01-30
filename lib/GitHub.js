'use strict'

const GitHubApi = require('github')
const util = require('util')

const GITHUB_CONNECT = 1



const GitHub = function (type) {
  let headers = {
    'user-agent': 'SpeedTracker agent'
  }

  switch (type) {
    case GITHUB_CONNECT:
      headers['Accept'] = 'application/vnd.github.swamp-thing-preview+json'
      break
    default:
      headers['Accept'] = 'application/x-www-form-encoded'
      break
  }

  this.api = new GitHubApi({
    debug: (process.env.NODE_ENV !== 'production'),
    debug: false,
    protocol: 'https',
    host: 'api.github.com',
    pathPrefix: '',
    headers,
    timeout: 5000,
    Promise: Promise
  })
}

GitHub.prototype.authenticate = function (token) {
  this.api.authenticate({
    type: 'oauth',
    token: token
  })

  // console.log(util.inspect(this.api.repos.getPayload('08f9b800-24b3-11e9-91ec-f2af313a77a2')))
  return this
}

module.exports = GitHub

module.exports.GITHUB_CONNECT = GITHUB_CONNECT
