import EventEmitter from 'wolfy87-eventemitter'
import Echo from 'laravel-echo'

export default class Broadcasting extends EventEmitter {
  constructor (config) {
    super()

    this.config = config
    this.connected = null
  }

  start () {
    if (this.config.driver == 'pusher') {

      this.pusher = require('pusher-js')
      this.echo = new Echo({
        broadcaster: 'pusher',
        key: this.config.key,
        cluster: this.config.cluster,
        encrypted: true,
      })

      this.echo.connector.pusher.connection.bind('state_change', states => {
        const connected = states.current == 'connected'
        if (this.connected !== connected) {
          this.connected = connected
          this.emit(connected ? 'connected' : 'disconnect')
        }
      })

    } else if (this.config.driver == 'redis') {

      this.io = require('socket.io-client')
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
        this.emit('disconnect')
      })

    }
  }

  channel (name) {
    if (!this.echo) {
      this.start()
    }

    return this.echo.channel(name)
  }
}
