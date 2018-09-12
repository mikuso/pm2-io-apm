import Debug from 'debug'
import * as stringify from 'json-stringify-safe'

const debug = Debug('axm:transportService')

class TransportConfig {
  publicKey: string
  secretKey: string
  appName: string
}

class Actions {
  action_name: string // tslint:disable-line
  action_type: string // tslint:disable-line
  opts?: Object
}

class Process {
  axm_actions: Actions[] // tslint:disable-line
  axm_monitor: Object // tslint:disable-line
  axm_options: Object // tslint:disable-line
  axm_dynamic?: Object // tslint:disable-line
  interpreter?: string
  versionning?: Object
}

class Transport {
  send: Function
  disconnect: Function
  on: Function
}

class Agent {
  transport: Transport
  send: Function
}

export default class TransportService {

  private config: TransportConfig
  private agent: Agent
  private transport: Transport
  private process: Process
  private isStandalone: Boolean

  init () {
    this.isStandalone = false
  }

  initStandalone (config: TransportConfig, cb: Function) {
    this.isStandalone = true
    const Agent = require('/Users/valentin/Work/Keymetrics/pm2-io-agent-node')
    debug('Init new transport service')
    this.config = config
    this.process = {
      axm_actions: [],
      axm_options: {},
      axm_monitor: {}
    }
    this.agent = new Agent({
      publicKey: this.config.publicKey,
      secretKey: this.config.secretKey,
      appName: this.config.appName
    }, this.process, (err) => {
      if (err) {
        console.error(err)
        process.exit(1)
      }
      this.transport = this.agent.transport
      debug('Agent launched')
      return cb()
    })
  }

  setMetrics (metrics) {
    if (this.isStandalone) return this.process.axm_monitor = metrics
    this.send('axm:monitor', metrics)
  }

  addAction (action) {
    debug(`Add action: ${action.action_name}:${action.action_type}`)
    if (this.isStandalone) return this.process.axm_actions.push(action)
    return this.send('axm:action', action)
  }

  setOptions (options) {
    debug(`Set options: [${Object.keys(options).join(',')}]`)
    if (this.isStandalone) return this.process.axm_options = Object.assign(this.process.axm_options, options)
    return this.send('axm:option:configuration', options)
  }

  send (channel, payload) {
    if (this.isStandalone) return this.agent.send(channel, payload) ? 0 : -1
    if (!process.send) return -1
    try {
      process.send(JSON.parse(stringify({
        type: channel,
        data: payload
      })))
    } catch (e) {
      debug('Process disconnected from parent !')
      debug(e.stack || e)
      process.exit(1)
    }
    return 0
  }

  destroy () {
    if (this.isStandalone) return
    this.transport.disconnect()
  }
}