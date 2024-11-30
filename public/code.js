(function() {

  const app = document.querySelector(".app");
  const socket = io();
  let uname;

  // Event listener for joining the chat
  app.querySelector(".join-screen #join-user").addEventListener("click", function () {
      let username = app.querySelector(".join-screen #username").value;
      if (username.length == 0) {
          return;
      }
      socket.emit("newuser", username);
      uname = username;

      app.querySelector(".join-screen").classList.remove("active");
      app.querySelector(".chat-screen").classList.add("active");
  });

  // Event listener for sending messages
  app.querySelector(".chat-screen #send-message").addEventListener("click", function () {
      let message = app.querySelector(".chat-screen #message-input").value;
      if (message.length == 0) {
          return;
      }
      let timestamp = new Date().toLocaleTimeString();

      renderMessage("my", { username: uname, text: message, time: timestamp });

      socket.emit("chat", { username: uname, text: message, time: timestamp });

      app.querySelector(".chat-screen #message-input").value = "";
  });

  // Event listener for exiting the chat
   app.querySelector(".chat-screen #exit-chat").addEventListener("click", function () {
      socket.emit("exituser", uname);
      window.location.href=window.location.href;
  });

//   // Listen for incoming messages from other users
  socket.on("update", function(update){ renderMessage("update", update);
  });
  socket.on("chat", function(message){ renderMessage("other", message);
  });
  

  // Render a message to the chat screen
  function renderMessage(type, message) {
      let messageContainer = app.querySelector(".chat-screen .messages");
      // let el = document.createElement("div");

      if (type === "my") {
          let el = document.createElement("div");
          el.setAttribute("class", "message my-message");
          // el.className = "message my-message";
          el.innerHTML = `
              <div>
                  <div class="name">YOU</div>
                  <div class="text">${message.text}</div>
                  <div class="time" style="text-align: right; font-size: 0.8em; color: gray; margin-top: 4px;">
                      ${message.time}
                  </div>
              </div>
          `;
          messageContainer.appendChild(el);
      } else if (type === "other") {
          let el = document.createElement("div");
          el.setAttribute("class","message other-message");
          el.innerHTML = `
              <div>
                  <div class="name">${message.username}</div>
                  <div class="text">${message.text}</div>
                  <div class="time" style="text-align: left; font-size: 0.8em; color: gray; margin-top: 4px;">
                      ${message.time}
                  </div>
              </div>
          `;
          messageContainer.appendChild(el);
      } else if (type === "update") {
          let el = document.createElement("div");
          el.setAttribute("class", "update")
          // el.className = "update";
          el.innerText = message;
          messageContainer.appendChild(el);
      }

      //scroll chat to end
      messageContainer.scrollTop = messageContainer.scrollHeight - messageContainer.clientHeight;
  }

  // // Handle disconnection
  // socket.on("disconnect", () => {
  //     renderMessage("update", { text: "You have been disconnected" });
  // });
})();

