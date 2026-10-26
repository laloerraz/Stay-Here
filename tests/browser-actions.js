"use strict";
document.getElementById("script-open").onclick = () => window.open("https://example.com/ad");
document.getElementById("synthetic").onclick = () => document.getElementById("new-link").click();
document.getElementById("fake-click").onclick = () => {
  const link = document.getElementById("new-link");
  // Suppress native default navigation in this test only; it would be handled by
  // the production worker. Verify an untrusted event cannot grant a trusted tab.
  link.addEventListener("click", event => event.preventDefault(), { once: true });
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true }));
};
document.getElementById("meta-refresh").onclick = () => {
  const meta = document.createElement("meta"); meta.httpEquiv = "refresh";
  meta.content = "600; url=https://example.com/unwanted"; document.head.append(meta);
};
function update(key, value) { qa.policy[key] = value; qa.storageListeners.forEach(fn => fn({}, "local")); qa.render(); }
document.getElementById("pause").onclick = () => update("protected", !qa.policy.protected);
document.getElementById("allow").onclick = () => update("allowClickedLinks", !qa.policy.allowClickedLinks);
document.getElementById("strict").onclick = () => update("strictRedirects", !qa.policy.strictRedirects);
document.getElementById("form").addEventListener("submit", event => {
  event.preventDefault(); document.getElementById("form-status").textContent = "Formulario autorizado por la protección";
});
qa.render();
