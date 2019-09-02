chrome.app.runtime.onLaunched.addListener(function (data) {
  // Open main window
  chrome.app.window.create('../views/home.html',
    {
      id: 'main',
      innerBounds: { width: 1200, height: 700 }
    });
});
