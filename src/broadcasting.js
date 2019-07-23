import EventEmitter from 'wolfy87-eventemitter'
import Echo from 'laravel-echo'

class Broadcasting extends EventEmitter {
  constructor () {
    super()

    this.config = app.broadcasting
    this.connected = null

    for (let event of ['connected', 'disconnected']) {
      this.defineEvent(event)
      this.on(event, () => {
        this._log(event)
      })
    }
  }

  _log (message) {
    if (window.console && console.log) {
      console.log(`broadcasting: ${message}`)
    }
  }

  _init () {
    if (this.echo) {
      return
    }

    this._log(`connecting ${this.config.driver}...`)

    if (this.config.driver == 'pusher') {

      window.Pusher = require('pusher-js')
      this.echo = new Echo({
        broadcaster: 'pusher',
        key: this.config.key,
        cluster: this.config.cluster,
        encrypted: this.config.encrypted,
      })

      this.echo.connector.pusher.connection.bind('state_change', states => {
        const connected = states.current == 'connected'
        if (this.connected !== connected) {
          this.connected = connected
          this.emit(connected ? 'connected' : 'disconnected')
        }
      })

    } else if (this.config.driver == 'redis') {

      window.io = require('socket.io-client')
      this.echo = new Echo({
        broadcaster: 'socket.io',
        host: location.host,
      })

      this.echo.connector.socket.on('connect', () => {
        this.connected = true
        this.emit('connected')
      })
      this.echo.connector.socket.on('disconnect', () => {
        this.connected = false
        this.emit('disconnected')
      })

    } else {
      throw new Error(`Unsupported broadcasting driver "${this.config.driver}"`)
    }

  }

  connect (timeout) {
    this._init()

    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve()
      } else if (timeout) {
        const id = setTimeout(reject, timeout)
        this.once('connected', () => {
          clearTimeout(id)
          resolve()
        })
      } else {
        this.once('connected', resolve)
      }
    })
  }

  channel (name) {
    this._init()

    this._log(`channel ${name}`)

    return this.echo.channel(name)
  }
}

window.broadcasting = new Broadcasting()
