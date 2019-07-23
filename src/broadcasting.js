import EventEmitter from 'wolfy87-eventemitter'
import Echo from 'laravel-echo'

class Broadcasting extends EventEmitter {
  constructor () {
    super()

    this.config = app.broadcasting
    this.status = null

    this.defineEvents(['online', 'offline', 'status'])
  }

  _log (message) {
    if (window.console) {
      console.log(`broadcasting: ${message}`)
    }
  }

  _status (status) {
    if (this.status !== status) {
      this.status = status
      const event = status ? 'online' : 'offline'
      this._log(event)
      this.emit(event, status)
      this.emit('status', status)
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
        this._status(states.current == 'connected')
      })

    } else if (this.config.driver == 'redis') {

      window.io = require('socket.io-client')
      this.echo = new Echo({
        broadcaster: 'socket.io',
        host: location.host,
      })

      this.echo.connector.socket.on('connect', () => {
        this._status(true)
      })
      this.echo.connector.socket.on('disconnect', () => {
        this._status(false)
      })

    } else {
      throw new Error(`Unsupported broadcasting driver "${this.config.driver}"`)
    }

  }

  connect (timeout) {
    this._init()

    return new Promise((resolve, reject) => {
      if (this.status) {
        resolve()
      } else if (timeout) {
        const id = setTimeout(reject, timeout)
        this.once('online', () => {
          clearTimeout(id)
          resolve()
        })
      } else {
        this.once('online', resolve)
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
