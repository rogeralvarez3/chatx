const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const db = require("./db");
const fetch = require("node-fetch");
const fileUpload = require("express-fileupload");
const authServer = "https://coopefacsa.coop:3099";

const app = express();
app.use("/fileUploads", express.static(path.resolve(__dirname, "fileUploads")));
app.use(express.static(path.resolve(__dirname, "dist")));
app.use(fileUpload({ tempFileDir: "/temp", useTempFiles: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.send(`<h1>SERVIDOR SEGURO FUNCIONANDO</h1>`);
});

let onlineUsers = [];

app.post("/uploadFile", (req, res) => {
  verificarToken(req.body.token, result => {
    if (result.id) {
      if (req.files) {
        let file = req.files.myFile;
        let newName =
          new Date().toLocaleString().replace(/[:/\- ]/g, "") +
          "___" +
          file.name;
        console.log(newName);
        let mypath = path.resolve(__dirname, "fileUploads", newName);
        fs.writeFileSync(mypath, file.data);
        delete file.data;
        file.link = `/fileUploads/${newName}`;
        res.send(file);
      }
    } else {
      res.send(result);
    }
  });
});
app.post("/deleteFile", (req, res) => {
  let data = req.body;
  let host = __dirname;
  let mypath = path.join(host, data.link);
  verificarToken(data.token, result => {
    if (result.id) {
      fs.unlinkSync(mypath);
      res.send({ deleted: true, link: data.link });
    } else {
      res.send(result);
    }
  });
});
app.post("/getData", (req, res) => {
  let data = req.body;
  let options = {
    method: "post",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: data.token
    })
  };
  //console.log(data)
  fetch(`${authServer}/verify`, options)
    .then(res => {
      return res.json();
    })
    .then(json => {
      if (json.id) {
        if (data.tabla == "salas") {
          data.condición = `find_in_set('${json.id}',integrantes)>0 or integrantes='*'`;
        }
        db.list(data, result => {
          res.send(result);
        });
      }
    });
});
app.post("/getMessages", (req, res) => {
  let data = req.body;

  let options = {
    method: "post",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: data.token
    })
  };

  fetch(`${authServer}/verify`, options)
    .then(res => {
      return res.json();
    })
    .then(json => {
      if (json.id) {
        data.tabla = "mensajes";
        data.condición = `((\`from\`=${json.id} or \`to\`=${json.id}) and userType=0) or (find_in_set(\`to\`,'${data.salas}')>0 && userType=1)`;
        db.list(data, result => {
          res.send(result);
        });
      }
    });
});
app.post("/mensaje", (req, res) => {
  let data = req.body;
  console.log(data);
  data.tabla = "mensajes";
  let now = new Date().toLocaleString();
  now =
    now
      .split(/ /)[0]
      .split(/\//)
      .reverse()
      .join("-") +
    " " +
    now.split(/ /)[1];
  data.data.fecha = now;
  db.save(data, result => {
    if (!result.errno) {
      if (data.data.userType == 0) {
        let userFilter = onlineUsers.filter(u => {
          return u.userId == data.data.to || u.userId == data.data.from;
        });
        userFilter.forEach(user => {
          let msg = data.data;
          let userName = user.userName;
          socketServer.to(user.socketId).emit("mensaje", msg);

          console.log({ userName, msg });
        });
      } else {
        //console.log("es una sala")
        let params = { tabla: "salas", condición: `id=${data.data.to}` };
        db.list(params, result => {
          if (result.errno) {
            console.log(result);
            return;
          }
          if (result.length == 0) {
            return;
          }
          let usersInRoom = result[0].integrantes;
          if (usersInRoom == "*") {
            socketServer.emit("mensaje", data.data);
          } else {
            onlineUsers.forEach(user => {
              if (usersInRoom.split(",").includes(user.userId.toString())) {
                socketServer.to(user.socketId).emit("mensaje", data.data);
                console.log("enviando mensaje a " + user.userName);
              }
            });
          }
        });
      }
    } else {
      console.log(result);
    }
    res.send(result);
  });
});
app.post("/addRoom", (req, res) => {
  let data = req.body;
  data.id = 0;
  data = { data: data, tabla: "salas" };
  db.save(data, result => {
    res.send(result);
  });
});
let httpServer = app.listen("3001", () => {
  console.log("servidor corriendo en el puerto 3001");
});

const socketServer = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});
socketServer.on("connection", client => {
  client.on("disconnect", () => {
    //console.log("se desconectó " + client.id);

    onlineUsers = onlineUsers.filter(u => {
      return u.socketId != client.id;
    });
    let usrs = onlineUsers.map(u => {
      return u.userId;
    });
    socketServer.emit("onlineUsers", usrs);
  });
  client.on("updateUserData", data => {
    //console.log("se ha conectado ", data);
    let idx = onlineUsers.findIndex(usr => {
      return usr.userId == data.userId && usr.browserId == data.browserId;
    });
    if (idx >= 0) {
      onlineUsers[idx].socketId = client.id;
    } else {
      data.socketId = client.id;
      onlineUsers.push(data);
    }
    let usrs = onlineUsers.map(u => {
      return u.userId;
    });
    socketServer.emit("onlineUsers", usrs);
  });
  client.on("mensajesLeidos", data => {
    let params = {
      tabla: "mensajes",
      condición: `\`from\`=${data.from} and \`to\`=${data.to}`,
      data: { estado: 1 }
    };
    //console.log(params)
    db.save(params, result => {
      if (!result.errno) {
        onlineUsers.forEach(u => {
          //console.log({data,u})
          if (data.from == u.userId) {
            if (socketServer.to(u.socketId)) {
              //console.log(`al cliente ${u.userName} se le avisó que se leyeron sus mensajes`)
              socketServer.to(u.socketId).emit("mensajesLeidos", {
                from: data.from,
                to: data.to,
                userType: data.userType
              });
            }
          }
        });
      } else {
        client.emit("error", {
          title: "error al actualizar estado de mensajes",
          data: result
        });
      }
    });
  });
});

function verificarToken(token, handler) {
  let options = {
    method: "post",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: token
    })
  };
  fetch(`${authServer}/verify`, options)
    .then(res => {
      return res.json();
    })
    .then(json => {
      handler(json);
    });
}
