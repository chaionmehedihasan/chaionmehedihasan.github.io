function loadList(storageKey, file) {
  var local = [];
  try { local = JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (e) {}
  return fetch(file, { cache: "no-store" })
    .then(function (response) { return response.ok ? response.json() : []; })
    .catch(function () { return []; })
    .then(function (published) {
      var seen = {};
      var all = [];
      (Array.isArray(published) ? published : []).forEach(function (item) {
        if (!item || !item.id || seen[item.id]) return;
        seen[item.id] = true;
        all.push(item);
      });
      (Array.isArray(local) ? local : []).forEach(function (item) {
        if (!item || !item.id || seen[item.id]) return;
        seen[item.id] = true;
        all.unshift(item);
      });
      return all;
    });
}

window.chaionProjects = function () { return loadList("chaion-research", "research.json"); };
window.chaionPrevious = function () { return loadList("chaion-previous", "previous.json"); };

function fillNames(countId, namesId, items, page, singular, plural) {
  var count = document.getElementById(countId);
  var names = document.getElementById(namesId);
  if (!count || !names) return;
  var total = items.length;
  count.textContent = total === 1 ? "1 " + singular : total + " " + plural;
  names.replaceChildren();
  if (!total) {
    var empty = document.createElement("li");
    var link = document.createElement("a");
    link.href = page;
    link.textContent = "All projects";
    empty.appendChild(link);
    names.appendChild(empty);
    return;
  }
  items.forEach(function (item) {
    var row = document.createElement("li");
    var link = document.createElement("a");
    link.href = page + "#" + encodeURIComponent(item.id);
    link.textContent = item.title || "Untitled project";
    row.appendChild(link);
    names.appendChild(row);
  });
}

function slidePrevious(items) {
  var count = document.getElementById("previous-count");
  var title = document.getElementById("previous-title");
  var image = document.getElementById("previous-image");
  if (!count) return;
  var total = items.length;
  count.textContent = total === 1 ? "1 previous project" : total + " previous projects";
  if (!title) return;
  if (!total) {
    title.textContent = "No previous project yet";
    if (image) image.hidden = true;
    return;
  }
  var index = 0;
  function show() {
    var item = items[index % items.length];
    title.textContent = item.title || "Untitled project";
    var photo = (item.images || []).filter(function (src) { return String(src).indexOf("data:image/") === 0; })[0];
    if (image) {
      if (photo) { image.hidden = false; image.src = photo; }
      else image.hidden = true;
    }
    index += 1;
  }
  show();
  if (total > 1 && !window.__previousSlide) {
    window.__previousSlide = setInterval(show, 4000);
  }
}

function bootProjects() {
  window.chaionProjects().then(function (items) {
    fillNames("project-count", "project-names", items, "research.html", "project running", "projects running");
  }).catch(function () {
    var count = document.getElementById("project-count");
    if (count) count.textContent = "0 projects running";
  });
  if (window.chaionPrevious) {
    window.chaionPrevious().then(slidePrevious).catch(function () {
      var count = document.getElementById("previous-count");
      if (count) count.textContent = "0 previous projects";
    });
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootProjects);
else bootProjects();
