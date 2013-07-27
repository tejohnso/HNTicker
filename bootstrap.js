/*global Components, APP_SHUTDOWN
        ,loadButton, loadPrefs, loadHttpRequest */
"use strict";
var Cc = Components.classes
   ,Ci = Components.interfaces
   ,modulePath = 'chrome://hnticker/content/modules/';

function loadIntoWindow (window) {
  var buttonSibling = window.document.getElementById("tabbrowser-tabs");

  if (!buttonSibling) {
    window.dump('HNTicker: window has no tabs\n');
    return;
  }

  window.hnTicker = {};
  window.hnTicker.buttonSibling = buttonSibling;
  window.hnTicker.dataURL = "https://news.ycombinator.com";

  loadHttpRequest(window);
  loadButton(window);
  loadPrefs(window);

  window.hnTicker.intervalHandle = window.setInterval(function() {
    window.hnTicker.loadKarmaAndDraw();
  }, window.hnTicker.intervalSeconds * 1000);  

  window.hnTicker.hnPageListener = function(event) {
    if (/https:\/\/news\.ycombinator\.com\/(news)?/.test(event.
        originalTarget.defaultView.location.href)) {
      window.hnTicker.loadKarmaAndDraw();
    }
  };

  window.gBrowser.addEventListener("load", window.hnTicker.hnPageListener, true);

  window.hnTicker.loadKarmaAndDraw();
}

function unloadFromWindow(window) {
  var hnTicker = window.hnTicker;

  window.gBrowser.removeEventListener("load", window.hnTicker.hnPageListener, true);
  hnTicker.button.unload(window);
  hnTicker.unloadHttp();
  hnTicker.prefObserver.unregister();
  delete window.hnTicker;
  window.dump('HNTicker: unloaded from window\n');
}

/*
 bootstrap.js API
*/

var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    var domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).
                    getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function loadHandler() {
      domWindow.removeEventListener("load", loadHandler, true);
      loadIntoWindow(domWindow);
    }, true);
  },
  onCloseWindow: function(aWindow) { },
  onWindowTitleChange: function(aWindow, aTitle) { }
};

function startup(aData, aReason) {
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator)
     ,enumerator = wm.getEnumerator("navigator:browser")
     ,win;

  Components.utils.import(modulePath + 'prefs.js');
  Components.utils.import(modulePath + 'button.js');
  Components.utils.import(modulePath + 'httpRequest.js');

  while (enumerator.hasMoreElements()) {
    win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow).top;
    loadIntoWindow(win);
  }

  // Load into any new windows
  wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean up any UI changes
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator)
     ,enumerator = wm.getEnumerator("navigator:browser")
     ,win;

  if (aReason === APP_SHUTDOWN) {return;}

  wm.removeListener(windowListener);

  // Unload from any existing windows
  while (enumerator.hasMoreElements()) {
    win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
    win.dump('HNTicker: unloading from window\n');
    unloadFromWindow(win);
  }
  
  try {
    Components.utils.unload(modulePath + 'prefs.js');
    Components.utils.unload(modulePath + 'button.js');
    Components.utils.unload(modulePath + 'httpRequest.js');
  } catch(err) {
    Components.utils.reportError(err);
    return;
  }
}

function install(aData, aReason) { }

function uninstall(aData, aReason) {
  shutdown(aData, aReason);
}
