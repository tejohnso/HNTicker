/*global Components, APP_SHUTDOWN */
"use strict";
var Cc = Components.classes;
var Ci = Components.interfaces;

function loadIntoWindow (window) {
  var hnTicker = {}
     ,anchor = window.document.getElementById("tabbrowser-tabs");
  if (!anchor) {
    window.dump('HNTicker: window has no tabs\n');
    return;
  }
  hnTicker.button = window.document.createElement("toolbarbutton");
  hnTicker.button.setAttribute("id", "HNTicker");
  hnTicker.button.setAttribute("class", "hnTicker.button.control");
  hnTicker.button.style.marginRight='0.5em';
  hnTicker.button.style.userFocus='normal';
  hnTicker.button.addEventListener("click", function() {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
              .getService(Components.interfaces.nsIWindowMediator)
              .getMostRecentWindow('navigator:browser');
    win.openUILinkIn('https://news.ycombinator.com' + hnTicker.button.loginNeeded,
     'tab');
  }, true);
  anchor.parentNode.insertBefore(hnTicker.button, anchor);
  
  hnTicker.canvas = window.document
                    .createElementNS("http://www.w3.org/1999/xhtml", "canvas");
  hnTicker.canvas.setAttribute("id", "HNTicker-canvas");
  hnTicker.ctx = hnTicker.canvas.getContext("2d");
  hnTicker.font = "16px sans-serif";
  hnTicker.img = window.document
                 .createElementNS("http://www.w3.org/1999/xhtml","img");
  hnTicker.img.src = 'data:image/gif;base64,R0lGODlhEgASAKIAAP/jyvihV/aKLfmxc/////9mAAAAAAAAACH5BAAAAAAALAAAAAASABIAAAMpWLrc/jDKOQkRy8pBhuKeRAAKQFBBxwVUYY5twXVxodV3nLd77f9ASQIAOw==';

  function drawButton(text) {
    var textLeftPad = 1
       ,fontHalfHeight = hnTicker.font.substr(0,
                         hnTicker.font.indexOf('px'))/2
       ,xPos = hnTicker.img.width + textLeftPad
       ,yPos = hnTicker.img.height/2 - fontHalfHeight;
    window.dump('HNTicker: redrawing - text is ' + text + '\n');
    hnTicker.ctx.font = hnTicker.font;
    hnTicker.canvas.width = hnTicker.img.width +
                            hnTicker.ctx.measureText(text).width +
                            textLeftPad;
    hnTicker.canvas.height = hnTicker.img.height;
    hnTicker.ctx.textBaseline = 'top';
    hnTicker.ctx.drawImage(hnTicker.img,0,0);
    hnTicker.ctx.font = hnTicker.font;
    hnTicker.ctx.fillStyle = "#012";
    hnTicker.ctx.fillText(text, xPos, yPos);
    anchor.parentNode.insertBefore(hnTicker.button, anchor);
    hnTicker.button.setAttribute("image", hnTicker.canvas.toDataURL());
  }

  hnTicker.karmaRequest = Components
                          .classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                          .createInstance(Components
                          .interfaces.nsIXMLHttpRequest);
  hnTicker.karmaRequest.onprogress = function(aEvent) {
    if (aEvent.target.loaded > 1500) {
       hnTicker.karmaRequest.abort();
    }
  };
  hnTicker.karmaRequest.addEventListener("loadend", function(e) {
    var karmaRegExp = new RegExp(hnTicker.userID + 
                                '</a>&nbsp;\\(' + '(\\d+)' + '\\)')
       ,karmaMatch = e.target.responseText.match(karmaRegExp);
    if (karmaMatch) {
       drawButton(karmaMatch[1]);
       hnTicker.button.loginNeeded = '';
    } else {
       hnTicker.button.loginNeeded = '/newslogin';
       drawButton('login');
    }
  });

  hnTicker.karmaRequest.onerror = function(aEvent) {
    window.dump("HNTicker: ajax error: " + aEvent.target.status + '\n');
    drawButton('error');
  };

  function loadKarmaAndDraw() {
    hnTicker.karmaRequest.open("GET", hnTicker.dataURL, true);
    hnTicker.karmaRequest.send(null);
  }

  hnTicker.prefBranch = Components
                        .classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService)
                        .getBranch("extensions.HNTicker.");
  hnTicker.defBranch = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService)
                        .getDefaultBranch("extensions.HNTicker.");
  hnTicker.defBranch.setIntPref('interval', 180);
  hnTicker.defBranch.setCharPref('username', '-');
  hnTicker.prefObserver = {
     observe: function(aSubject, aTopic, aData) {
        switch (aData) {
        case "username":
          hnTicker.userID = hnTicker.prefBranch.getCharPref('username');
          window.dump('HNTicker: username ' + hnTicker.userID + '\n');
          break;
        case "interval":
          hnTicker.intervalSeconds = hnTicker
                                    .prefBranch.getIntPref('interval');
          if (hnTicker.intervalSeconds < 180) {
            hnTicker.intervalSeconds = 180;
            hnTicker.prefBranch.setIntPref('interval', 180);
          }
          window.clearInterval(hnTicker.button.intervalHandle);
          hnTicker.button.intervalHandle = window.setInterval(function() {
            loadKarmaAndDraw();
          }, hnTicker.intervalSeconds * 1000);
          window.dump('HNTicker: reloading every ' + 
                      hnTicker.intervalSeconds + ' seconds' + '\n');
          break;
        }
     },
     unregister: function() {
        hnTicker.prefBranch.removeObserver("", hnTicker.prefObserver);
     }
  };
  hnTicker.intervalSeconds = hnTicker.prefBranch.getIntPref('interval');
  hnTicker.userID = hnTicker.prefBranch.getCharPref('username');
  if (hnTicker.userID === '-') {
     hnTicker.userID = {"value": "-"};
     Cc["@mozilla.org/embedcomp/prompt-service;1"]
     .getService(Components.interfaces.nsIPromptService)
     .prompt(null, "username", "HNTicker: What is your username?", 
             hnTicker.userID, null, {});
     hnTicker.userID = hnTicker.userID.value;
     hnTicker.prefBranch.setCharPref('username', hnTicker.userID);
  }
  window.dump('HNTicker: username ' + hnTicker.userID + '\n');
  hnTicker.prefBranch.addObserver("", hnTicker.prefObserver, false);
  hnTicker.dataURL = "https://news.ycombinator.com";
  if (typeof hnTicker.intervalSeconds !== 'number' || 
      hnTicker.intervalSeconds < 180) {
    hnTicker.intervalSeconds = 180;
    hnTicker.prefBranch.setIntPref('interval', 180);
  }
  window.dump('HNTicker: reloading every ' + 
              hnTicker.intervalSeconds + ' seconds' + '\n');

  loadKarmaAndDraw();

  window.gBrowser.addEventListener("load", function(event) {
     if (/https:\/\/news\.ycombinator\.com\/(news)?/.test(event.
         originalTarget.defaultView.location.href)) {
       loadKarmaAndDraw();
     }
  }, true);
  hnTicker.button.intervalHandle = window.setInterval(function() {
    loadKarmaAndDraw();
  }, hnTicker.intervalSeconds * 1000);  
  window.hnTicker = hnTicker;
}

function unloadFromWindow(window) {
  var button = window.document.getElementById("HNTicker")
     ,hnTicker = window.hnTicker;
  if (!window) {
    window.dump('no window?!' + '\n');
    return;
  }
  hnTicker.prefObserver.unregister();
  if (button) {
    hnTicker.karmaRequest.abort();
    window.clearInterval(hnTicker.button.intervalHandle);
    hnTicker.button.parentNode.removeChild(hnTicker.button);
    delete window.hnTicker;
    window.dump('hnTicker button unloaded' + '\n');
  } else {
    window.dump('no hnTicker button to unload' + '\n');
  }
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
    win.dump('unloading from window' + '\n');
    unloadFromWindow(win);
  }
}

function install(aData, aReason) { }

function uninstall(aData, aReason) {
  shutdown(aData, aReason);
}
