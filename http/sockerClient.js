/*
 * @copyright
 * Copyright (c) 2019 OVTeam
 *
 * All Rights Reserved
 *
 * Licensed under the MIT License;
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://choosealicense.com/licenses/mit/
 *
 */

const io = require('socket.io-client');
const Redis = require("./../lib/redis");
const SOCKET_SHARRED_TOKEN = "OV_SOCKET_SHARRED_TOKEN";

class SocketClient {
  constructor(nsp = "") {
    this.connected = false;
    this.sharedToken = null;
    this.OVClient = null;
    if (nsp) {
      this.nsp = nsp;
    } else {
      this.nsp = process.env.APP_NAME ? process.env.APP_NAME.toLowerCase() : "";
    }
    this.rooms = [];
  }
  async buildTransportOption() {
    this.sharedToken = await Redis.getItem(SOCKET_SHARRED_TOKEN);
    return {
      polling: {
        extraHeaders: {
          'token': this.sharedToken,
          'app': process.env.APP_NAME || "unknow"
        }
      }
    }
  }
  send(data) {
    if (this.OVClient) {
      this.OVClient.emit("event_broadcast", data);
    }
  }
  join(_room, force = false) {
    if (this.OVClient) {
      if (!force && this.rooms.indexOf(_room) == -1) {
        this.rooms.push(_room);
        this.OVClient.emit("join_room", { room: _room });
      }
      if (force == true) {
        for (let i in this.rooms) {
          this.OVClient.emit("join_room", { room: this.rooms[i] });
        }
      }
    }
  }
  async connect() {
    if (this.OVClient) {
      this.OVClient.close();
      this.OVClient = null;
    }
    this.OVClient = io(`${process.env.OVGATEWAY_URI}/${this.nsp}`, {
      transportOptions: await this.buildTransportOption()
    });
    this.OVClient.on('connect_error', function (err) {
      this.connected = false;
      console.log(`Error [${new Date().toISOString()}]: ${err.message}`);
    })
    this.OVClient.on('reconnect', (err) => {
      console.log(`Reconnect: ${new Date().toISOString()}`);
      this.register();
    })
    this.OVClient.on("disconnect", (err) => {
      this.connected = false;
    })
    this.OVClient.on("connect", () => {
      this.connected = true;
      console.log(`[/${this.nsp}] ${new Date().toISOString()}: Connect to OVGateway successful`);
      this.join(null, true);
    })
  }
  async register() {

    let options = await this.buildTransportOption();
    let result = false;
    if (process.env.OVGATEWAY_URI && this.nsp) {
      let socket = io(process.env.OVGATEWAY_URI + '/register', {
        transportOptions: options
      });

      socket.on('connect_error', function (err) { })

      socket.on("on_register", function (rs) {
        result = rs;
        this.close();
      });
      socket.on('reconnect', (err) => { })
      socket.on("disconnect", () => {
        if (result) {
          this.connect();
        } else {
          Redis.getItem(SOCKET_SHARRED_TOKEN)
            .then(_sharedToken => {
              if (_sharedToken != this.sharedToken) {
                this.register();
              }
            })
        }
      });

      socket.on('connect', () => {
        socket.emit("register", { nsp: this.nsp })
      });
    }
  }
}

module.exports = SocketClient;
