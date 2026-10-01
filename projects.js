window.chaionProjects = function () {
  var local = [];
  try { local = JSON.parse(localStorage.getItem("chaion-research") || "[]"); } catch (e) {}
  return fetch("research.json", { cache: "no-store" })
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
};
