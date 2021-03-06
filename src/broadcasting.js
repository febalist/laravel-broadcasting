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

      window.Pusher = window.Pusher || require('pusher-js')
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

      window.io = window.io || require('socket.io-client')
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

  disconnect () {
    if (this.echo) {
      this.echo.disconnect()
      this.status = null
      delete this.echo
    }
  }

  channel (channel) {
    this._init()

    this._log(`channel ${channel}`)

    return this.echo.channel(channel)
  }

  private (channel) {
    this._init()

    this._log(`private ${channel}`)

    return this.echo.private(channel)
  }

  join (channel) {
    this._init()

    this._log(`join ${channel}`)

    return this.echo.join(channel)
  }

  leave (channel) {
    if (this.echo) {
      this.echo.leave(channel)
    }
  }
}

window.broadcasting = new Broadcasting()
