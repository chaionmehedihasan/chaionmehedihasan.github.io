(function () {
  var OWNER = "chaionjust@gmail.com";

  function signedIn() {
    try { return sessionStorage.getItem("chaion-owner") === "1"; } catch (e) { return false; }
  }

  function setSignedIn(on) {
    try {
      if (on) sessionStorage.setItem("chaion-owner", "1");
      else sessionStorage.removeItem("chaion-owner");
    } catch (e) {}
  }

  function keyFor(section) {
    return section === "fabrication" ? "chaion-fabrication" : "chaion-log-" + section;
  }

  function read(section) {
    try { return JSON.parse(localStorage.getItem(keyFor(section)) || "[]"); } catch (e) { return []; }
  }

  function write(section, items) {
    localStorage.setItem(keyFor(section), JSON.stringify(items));
  }

  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Could not read that file.")); };
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var scale = Math.min(1, 1400 / Math.max(image.width, image.height));
          var canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          var context = canvas.getContext("2d");
          if (!context) { reject(new Error("Could not prepare the image.")); return; }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.onerror = function () { reject(new Error("That file is not a readable image.")); };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function drawBoard(board) {
    var section = board.getAttribute("data-section");
    var items = read(section);
    board.replaceChildren();
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "note";
      empty.textContent = signedIn() ? "Nothing posted yet." : "Sign in to add a photo. Visitors cannot post.";
      board.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      var card = document.createElement("article");
      card.className = "post";
      if (item.photo && String(item.photo).indexOf("data:image/") === 0) {
        var img = document.createElement("img");
        img.src = item.photo;
        img.alt = "";
        card.appendChild(img);
      }
      if (item.title) {
        var heading = document.createElement("h3");
        heading.textContent = item.title;
        card.appendChild(heading);
      }
      if (item.body) {
        var note = document.createElement("p");
        note.textContent = item.body;
        card.appendChild(note);
      }
      if (signedIn()) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "text-button";
        button.textContent = "Remove";
        button.onclick = function () {
          write(section, read(section).filter(function (row) { return row.id !== item.id; }));
          drawBoard(board);
        };
        card.appendChild(button);
      }
      board.appendChild(card);
    });
  }

  function paint() {
    var on = signedIn();
    var panel = document.getElementById("signin-panel");
    var status = document.getElementById("signin-status");
    if (panel) panel.hidden = on;
    if (status) status.hidden = !on;
    document.querySelectorAll(".composer").forEach(function (form) { form.hidden = !on; });
    document.querySelectorAll(".board").forEach(drawBoard);
  }

  var button = document.getElementById("signin-button");
  if (button) {
    button.onclick = function () {
      var email = document.getElementById("email").value.trim().toLowerCase();
      var error = document.getElementById("signin-error");
      if (email !== OWNER) {
        if (error) error.textContent = "Only chaionjust@gmail.com can sign in.";
        return;
      }
      if (error) error.textContent = "";
      setSignedIn(true);
      paint();
    };
  }

  var signOut = document.getElementById("signout-button");
  if (signOut) {
    signOut.onclick = function () {
      setSignedIn(false);
      paint();
    };
  }

  document.querySelectorAll(".composer").forEach(function (form) {
    form.onsubmit = function (event) {
      event.preventDefault();
      if (!signedIn()) return;
      var section = form.getAttribute("data-section");
      var title = form.querySelector("[name=title]").value.trim();
      var body = form.querySelector("[name=body]").value.trim();
      var file = form.querySelector("[name=photo]").files[0];
      var error = form.querySelector(".error");
      if (error) error.textContent = "";
      var finish = function (photo) {
        if (!title && !body && !photo) {
          if (error) error.textContent = "Add a note or a photo.";
          return;
        }
        var items = read(section);
        items.unshift({ id: String(Date.now()), title: title, body: body, photo: photo || "" });
        write(section, items);
        form.reset();
        paint();
      };
      if (!file) finish("");
      else shrink(file).then(finish).catch(function (reason) { if (error) error.textContent = reason.message; });
    };
  });

  paint();
})();
