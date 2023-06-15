const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

// cors 설정을 하지 않으면 오류가 생기게 됩니다. 설정해 줍니다.
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 8080;

// 어떤 방에 어떤 유저가 들어있는지
let Student = {};
// socket.id기준으로 어떤 방에 들어있는지
let classRoom = {};

// 방의 최대 인원수
const MAXIMUM = 100;

io.on("connection", (socket) => {
  console.log(socket.id, "connection");
  socket.on("join_room", (data) => {
    // 방이 기존에 생성되어 있다면
    if (Student[data.room]) {
      // 현재 입장하려는 방에 있는 인원수
      const currentRoomLength = Student[data.room].length;
      if (currentRoomLength === MAXIMUM) {
        // 인원수가 꽉 찼다면 돌아갑니다.
        socket.to(socket.id).emit("room_full");
        return;
      }

      // 여분의 자리가 있다면 해당 방 배열에 추가해줍니다.
      Student[data.room] = [...Student[data.room], { id: socket.id }];
    } else {
      // 방이 존재하지 않다면 값을 생성하고 추가해줍시다.
      Student[data.room] = [{ id: socket.id }];
    }
    classRoom[socket.id] = data.room;

    // 입장
    socket.join(data.room);

    // 입장하기 전 해당 방의 다른 유저들이 있는지 확인하고
    // 다른 유저가 있었다면 offer-answer을 위해 알려줍니다.
    const others = Student[data.room].filter((user) => user.id !== socket.id);
    if (others.length) {
      io.sockets.to(socket.id).emit("all_Student", others);
    }
  });

  socket.on("offer", (sdp, roomName) => {
    // offer를 전달받고 다른 유저들에게 전달해 줍니다.
    socket.to(roomName).emit("getOffer", sdp);
  });

  socket.on("answer", (sdp, roomName) => {
    // answer를 전달받고 방의 다른 유저들에게 전달해 줍니다.
    socket.to(roomName).emit("getAnswer", sdp);
  });

  socket.on("candidate", (candidate, roomName) => {
    // candidate를 전달받고 방의 다른 유저들에게 전달해 줍니다.
    socket.to(roomName).emit("getCandidate", candidate);
  });

  socket.on("disconnect", () => {
    // 방을 나가게 된다면 classRoom과 Student의 정보에서 해당 유저를 지워줍니다.
    const roomID = classRoom[socket.id];

    if (Student[roomID]) {
      Student[roomID] = Student[roomID].filter((user) => user.id !== socket.id);
      if (Student[roomID].length === 0) {
        delete Student[roomID];
        return;
      }
    }
    delete classRoom[socket.id];
    socket.broadcast.to(Student[roomID]).emit("user_exit", { id: socket.id });
  });
});

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});