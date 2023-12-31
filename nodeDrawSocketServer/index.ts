const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)

import { Server } from 'socket.io'
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})
const emailToSocketIdMap = new Map();
type Point = { x: number; y: number }

type DrawLine = {
  prevPoint: Point | null
  currentPoint: Point
  color: string
}

io.on('connection', (socket) => {
  console.log("connect-draw")
  socket.on('client-ready', () => {
    socket.broadcast.emit('get-canvas-state')
  })

  socket.on('canvas-state', (state) => {
    console.log('received canvas state')
    socket.broadcast.emit('canvas-state-from-server', state)
    console.log(state)
  })

  socket.on('draw-line', ({ prevPoint, currentPoint, color }: DrawLine) => {
    socket.broadcast.emit('draw-line', { prevPoint, currentPoint, color })
    console.log(prevPoint, currentPoint, color)
  })

  socket.on('clear', () => io.emit('clear'))
})


io.on('connection', (socket) => {
  console.log("connect-room")

  socket.on('room:join', () => {
    socket.broadcast.emit('get-video-state')
  })


    socket.on('join-room', (roomName,done)=>{
      console.log(roomName)
      socket.join(roomName)
      done()
    })
  

})
server.listen(3001, () => {
  console.log('✔️ Server listening on port 3001')
})
