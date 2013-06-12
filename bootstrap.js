/*global Components, APP_SHUTDOWN */
"use strict";
var Cc = Components.classes;
var Ci = Components.interfaces;

var loadIntoWindow = function(window) {
  var anchor = window.document.getElementById("tabbrowser-tabs");
  if (!anchor) {
    window.dump('HNTicker: window ' + window.id +
                ' ' + window.title + ' has no browser tabs to anchor to' + '\n');
    return;
  }
  var button = window.document.createElement("toolbarbutton");
  button.setAttribute("id", "HNTicker");
  button.setAttribute("class", "button-control");
  button.style.marginRight='0.5em';
  button.style.userFocus='normal';
  button.addEventListener("click", function() {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
              .getService(Components.interfaces.nsIWindowMediator)
              .getMostRecentWindow('navigator:browser');
    win.openUILinkIn('https://news.ycombinator.com' + button.loginNeeded, 'tab');
  }, true);
  anchor.parentNode.insertBefore(button, anchor);
  
  var canvas = window.document.createElementNS("http://www.w3.org/1999/xhtml",
                                                 "canvas");
  canvas.setAttribute("id", "HNTicker-canvas");
  var fontString = "16px sans-serif";
  var ctx = canvas.getContext("2d");
  var img = window.document.createElementNS("http://www.w3.org/1999/xhtml","img");
  img.src = 'data:image/gif;base64,R0lGODlhEgASAKIAAP/jyvihV/aKLfmxc/////9mAAAAAAAAACH5BAAAAAAALAAAAAASABIAAAMpWLrc/jDKOQkRy8pBhuKeRAAKQFBBxwVUYY5twXVxodV3nLd77f9ASQIAOw==';

  var drawButton = function(karmaVal) {
    window.dump('HNTicker: redrawing' + '\n');
    ctx.font = fontString;
    var textLeftPad = 1;
    var fontHalfHeight = ctx.font.substr(0,ctx.font.indexOf('px'))/2;
    canvas.width = (img.width + ctx.measureText(karmaVal).width) + textLeftPad;
    canvas.height = img.height;
    ctx.font = fontString;
    ctx.textBaseline = 'top';
    ctx.drawImage(img,0,0);
    ctx.fillStyle = "#012";
    ctx.fillText(karmaVal, img.width + textLeftPad, img.height/2 + 1 - fontHalfHeight);
    anchor.parentNode.insertBefore(button, anchor);
    button.setAttribute("image", canvas.toDataURL());
  };

  button.karmaRequest = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                        .createInstance(Components.interfaces.nsIXMLHttpRequest);
  button.karmaRequest.onprogress = function(aEvent) {
    if (aEvent.target.loaded > 1500) {
       button.karmaRequest.abort();
    }
  };
  button.karmaRequest.addEventListener("loadend", function(e) {
    var karmaRegExp = new RegExp(userID + '</a>&nbsp;\\(' + '(\\d+)' + '\\)');
    var karmaMatch = e.target.responseText.match(karmaRegExp);
    if (karmaMatch) {
       drawButton(karmaMatch[1]);
       button.loginNeeded = '';
    } else {
       button.loginNeeded = '/newslogin';
       drawButton('login');
    }
  });
  button.karmaRequest.onerror = function(aEvent) {
    window.dump("HNTicker: ajax error: " + aEvent.target.status + '\n');
  };

  var loadKarmaAndDraw = function() {
     //drawing and loading should be split.  if we are coming
     //from the hn page we can get the karma from the loaded page
     //and redraw - without reloading the page internally
    button.karmaRequest.open("GET", dataURL, true);
    button.karmaRequest.send(null);
  };

  var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefService)
                   .getBranch("extensions.HNTicker.");
  var defBranch = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefService)
                   .getDefaultBranch("extensions.HNTicker.");
  defBranch.setIntPref('interval', 180);
  defBranch.setCharPref('username', '-');
  var prefObserver = {
     observe: function(aSubject, aTopic, aData) {
        switch (aData) {
           case "username":
              userID = prefBranch.getCharPref('username');
              window.dump('HNTicker: username ' + userID + '\n');
             break;
           case "interval":
              intervalSeconds = prefBranch.getIntPref('interval');
              if (intervalSeconds < 180) {
                 intervalSeconds = 180;
                 prefBranch.setIntPref('interval', 180);
              }
              window.clearInterval(button.intervalHandle);
              button.intervalHandle = window.setInterval(function() {
                 loadKarmaAndDraw();
              }, intervalSeconds * 1000);
             window.dump('HNTicker: reloading every ' + intervalSeconds + ' seconds' + '\n');
             break;
        }
     },
     unregister: function() {
        prefBranch.removeObserver("", prefObserver);
     }
  };
  var intervalSeconds = prefBranch.getIntPref('interval');
  var userID = prefBranch.getCharPref('username');
  if (userID === '-') {
     userID = {"value": "-"};
     Cc["@mozilla.org/embedcomp/prompt-service;1"]
     .getService(Components.interfaces.nsIPromptService)
     .prompt(null, "username", "HNTicker: What is your username?", userID, null, {});
     userID = userID.value;
     prefBranch.setCharPref('username', userID);
  }
  window.dump('HNTicker: username ' + userID + '\n');
  prefBranch.addObserver("", prefObserver, false);
  var dataURL = "https://news.ycombinator.com";
  if (typeof intervalSeconds !== 'number' || intervalSeconds < 180) {
     intervalSeconds = 180;
     prefBranch.setIntPref('interval', 180);
  }
  window.dump('HNTicker: reloading every ' + intervalSeconds + ' seconds' + '\n');

  loadKarmaAndDraw();

  window.gBrowser.addEventListener("load", function(event) {
     //window.dump(event.originalTarget.defaultView.location.href + '\n');
     if (/https:\/\/news\.ycombinator\.com\/(news)?/.test(event.
     originalTarget.defaultView.location.href)) {
       loadKarmaAndDraw();
     }
  }, true);
  button.intervalHandle = window.setInterval(function() {
    loadKarmaAndDraw();
  }, intervalSeconds * 1000);  
};

function unloadFromWindow(window) {
  if (!window) {
    window.dump('no window?!' + '\n');
    return;
  }

  prefObserver.unregister();
  var button = window.document.getElementById("HNTicker");
  if (button) {
    button.karmaRequest.abort();
    window.clearInterval(button.intervalHandle);
    button.parentNode.removeChild(button);
    window.dump('button unloaded' + '\n');
  } else {
    window.dump('no button to unload' + '\n');
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
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Load into any existing windows
  var enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    var win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow).top;
    loadIntoWindow(win);
  }

  // Load into any new windows
  wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean up any UI changes
  if (aReason === APP_SHUTDOWN) {return;}

  var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

  // Stop watching for new windows
  wm.removeListener(windowListener);

  // Unload from any existing windows
  var enumerator = wm.getEnumerator("navigator:browser");
  while (enumerator.hasMoreElements()) {
    var win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
    win.dump('unloading from window' + '\n');
    unloadFromWindow(win);
  }
}

function install(aData, aReason) { }

function uninstall(aData, aReason) {
  shutdown(aData, aReason);
}
