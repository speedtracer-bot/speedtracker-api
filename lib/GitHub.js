'use strict'

const GitHubApi = require('@octokit/rest')

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
    userAgent: headers['user-agent'],
    request: {
      timeout: 5000,
    },
    Promise: Promise
  })
}

GitHub.prototype.authenticate = function (token) {
  return new GitHubApi({auth: token})
}

module.exports = GitHub

module.exports.GITHUB_CONNECT = GITHUB_CONNECT
