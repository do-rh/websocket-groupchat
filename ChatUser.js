"use strict";

/** Functionality related to chatting. */

// Room is an abstraction of a chat channel
const Room = require("./Room");

/** ChatUser is a individual connection from client -> server to chat. */

class ChatUser {
  /** Make chat user: store connection-device, room.
   *
   * @param send {function} callback to send message to this user
   * @param room {Room} room user will be in
   * */

  constructor(send, roomName) {
    this._send = send; // "send" function for this user
    this.room = Room.get(roomName); // room user will be in
    this.name = null; // becomes the username of the visitor

    console.log(`created chat in ${this.room.name}`);
  }

  /** Send msgs to this client using underlying connection-send-function.
   *
   * @param data {string} message to send
   * */

  send(data) {
    try {
      this._send(data);
    } catch {
      // If trying to send to a user fails, ignore it
    }
  }

  /** Handle joining: add to room members, announce join.
   *
   * @param name {string} name to use in room
   * */

  handleJoin(name) {
    this.name = name;
    this.room.join(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} joined "${this.room.name}".`,
    });
  }

  /** Handle a chat: broadcast to room.
   *
   * @param text {string} message to send
   * */

  handleChat(text) {
    this.room.broadcast({
      name: this.name,
      type: "chat",
      text: text,
    });
  }

  /** Handle a joke: send to user.
   *
   * @param text {string} message to send
   * */

  handleJoke() {
    const joke = 'bad joke';
    const data = {
      name: "JokeBot",
      type: "joke",
      text: joke,
    };
    // console.log('data is: ', data, 'this.name is: ', this.name);
    this.room.privateMsg(data, this)
  }

  /** Handle members req: send all members list to user.
 *
 * @param text {string} message to send
 * */

  handleMembers() {
    const members = this.room.members;
    // console.log(this.room.members, "this.room.members");
    const membersInfo = [];
    for (let member of members) {
      membersInfo.push(member.name);
    }
    const membersRes = membersInfo.join(", ");
    const data = {
      name: "Members list",
      type: "members",
      text: membersRes,
    };
    // console.log('data is: ', data, 'this.name is: ', this.name);
    this.room.privateMsg(data, this);
  }

  /** Handle private messages: send a direct private message to another user.
*
* @param text {string} message to send
* */

  handlePriv(text) {
    const content = text.split(" ").filter(el => el)

    const toMember = content[1];
    const message = content.slice(2).join(" ");
    for (let member of this.room.members) {
      if (member.name === toMember) {
        const data = {
          name: `private message from ${this.name}`,
          type: "priv",
          text: message,
        };
        // console.log('data is: ', data, 'this.name is: ', this.name);
        this.room.privateMsg(data, member);
      }
    }
  }

  /** Handle name change: change a user's name and broadcast to group.
  *
  * @param text {string} message to send
  * */

  handleNameChange(text) {
    const content = text.split(" ").filter(el => el)
    const newName = content[1];

    const data = {
      name: "announcement",
      type: "chat",
      text: `${this.name} has decided to change their name to ${newName}`,
    }
    // console.log('data is: ', data, 'this.name is: ', this.name);
    this.room.broadcast(data);
    this.name = newName;
  }

  /** Handle messages from client:
   *
   * @param jsonData {string} raw message data
   *
   * @example<code>
   * - {type: "join", name: username} : join
   * - {type: "chat", text: msg }     : chat
   * </code>
   */

  handleMessage(jsonData) {
    let msg = JSON.parse(jsonData);

    if (msg.type === 'joke') this.handleJoke();
    else if (msg.type === "join") this.handleJoin(msg.name);
    else if (msg.type === "chat") this.handleChat(msg.text);
    else if (msg.type === "members") this.handleMembers();
    else if (msg.type === "priv") this.handlePriv(msg.text);
    else if (msg.type === "name") this.handleNameChange(msg.text);
    else throw new Error(`bad message: ${msg.type}`);
  }

  /** Connection was closed: leave room, announce exit to others. */

  handleClose() {
    this.room.leave(this);
    this.room.broadcast({
      type: "note",
      text: `${this.name} left ${this.room.name}.`,
    });
  }
}

module.exports = ChatUser;
