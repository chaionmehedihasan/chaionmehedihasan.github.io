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
      empty.textContent = "Nothing posted yet.";
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

  function savedPositions() {
    try { return JSON.parse(localStorage.getItem("chaion-positions") || "[]"); } catch (e) { return []; }
  }

  function hiddenFixed() {
    try { return JSON.parse(localStorage.getItem("chaion-hidden-positions") || "[]"); } catch (e) { return []; }
  }

  function removeButton(onClick) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "text-button remove-entry";
    button.textContent = "Remove";
    button.onclick = onClick;
    return button;
  }

  function drawPositions() {
    var list = document.getElementById("timeline");
    if (!list) return;
    list.querySelectorAll("[data-added]").forEach(function (node) { node.remove(); });
    list.querySelectorAll("[data-fixed]").forEach(function (row) {
      row.hidden = false;
      var old = row.querySelector(".remove-entry");
      if (old) old.remove();
    });
      list.querySelectorAll(".more-toggle").forEach(function (more) {
        var detail = more.nextElementSibling;
        more.onclick = function () {
          if (!detail) return;
          detail.hidden = !detail.hidden;
          more.textContent = detail.hidden ? "More" : "Less";
        };
      });
      savedPositions().slice().reverse().forEach(function (item) {
      var row = document.createElement("li");
      row.setAttribute("data-added", item.id);
      var when = document.createElement("div");
      when.className = "role-when";
      var start = item.start || "";
      var end = item.end || "";
      when.textContent = item.when || [start, end].filter(Boolean).join(" — ");
      var body = document.createElement("div");
      body.className = "role-body";
      var title = document.createElement("strong");
      title.textContent = item.title || "";
      body.appendChild(title);
      if (item.location) {
        var place = document.createElement("p");
        place.className = "role-place";
        place.textContent = item.location;
        body.appendChild(place);
      }
      var duties = item.duties || item.body || "";
      if (duties) {
        var more = document.createElement("button");
        more.type = "button";
        more.className = "more-toggle text-button";
        more.textContent = "More";
        var detail = document.createElement("p");
        detail.className = "role-duty";
        detail.hidden = true;
        detail.textContent = duties;
        more.onclick = function () {
          detail.hidden = !detail.hidden;
          more.textContent = detail.hidden ? "More" : "Less";
        };
        body.appendChild(more);
        body.appendChild(detail);
      }
      if (signedIn()) {
        body.appendChild(removeButton(function () {
          var next = savedPositions().filter(function (saved) { return saved.id !== item.id; });
          localStorage.setItem("chaion-positions", JSON.stringify(next));
          drawPositions();
        }));
      }
      row.appendChild(when);
      row.appendChild(body);
      list.insertBefore(row, list.firstChild);
    });
  }

  function paint() {
    var on = signedIn();
    var panel = document.getElementById("signin-panel");
    var status = document.getElementById("signin-status");
    if (panel) panel.hidden = on;
    if (status) status.hidden = !on;
    document.querySelectorAll(".composer").forEach(function (form) { form.hidden = !on; });
    var lock = document.getElementById("position-lock");
    var positionSign = document.getElementById("position-signin");
    if (lock) lock.hidden = on;
    if (positionSign) positionSign.hidden = on;
    document.querySelectorAll(".board").forEach(drawBoard);
    drawPositions();
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
    if (form.id === "position-form") return;
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

  var positionSign = document.getElementById("position-signin");
  if (positionSign) {
    positionSign.onclick = function () {
      setSignedIn(true);
      paint();
    };
  }

  var moreFields = document.getElementById("more-fields");
  if (moreFields) {
    moreFields.onclick = function () {
      var extra = document.getElementById("duty-fields");
      if (!extra) return;
      extra.hidden = !extra.hidden;
      moreFields.textContent = extra.hidden ? "More" : "Less";
    };
  }

  var positionForm = document.getElementById("position-form");
  if (positionForm) {
    positionForm.onsubmit = function (event) {
      event.preventDefault();
      if (!signedIn()) return;
      var start = positionForm.querySelector("[name=start]").value.trim();
      var end = positionForm.querySelector("[name=end]").value.trim();
      var location = positionForm.querySelector("[name=location]").value.trim();
      var title = positionForm.querySelector("[name=title]").value.trim();
      var duties = positionForm.querySelector("[name=duties]").value.trim();
      var error = positionForm.querySelector(".error");
      if (!start || !title) {
        if (error) error.textContent = "Add the start date and the position.";
        return;
      }
      if (error) error.textContent = "";
      var items = savedPositions();
      items.unshift({ id: String(Date.now()), start: start, end: end, location: location, title: title, duties: duties });
      localStorage.setItem("chaion-positions", JSON.stringify(items));
      positionForm.reset();
      var extra = document.getElementById("duty-fields");
      var moreFieldsButton = document.getElementById("more-fields");
      if (extra) extra.hidden = true;
      if (moreFieldsButton) moreFieldsButton.textContent = "More";
      drawPositions();
    };
  }

  paint();
})();
