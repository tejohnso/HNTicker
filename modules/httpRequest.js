/*global Components */
"use strict";
var EXPORTED_SYMBOLS = ['loadHttpRequest'];

function loadHttpRequest(window) {
  var hnTicker = window.hnTicker;

  hnTicker.karmaRequest = Components
                          .classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                          .createInstance(Components
                          .interfaces.nsIXMLHttpRequest);
  hnTicker.karmaRequest.onprogress = function(aEvent) {
    if (aEvent.target.loaded > 1500) {
       hnTicker.karmaRequest.abort();
    }
  };

  hnTicker.loadendListener = function(e) {
    var karmaRegExp = new RegExp(hnTicker.userID + 
                                '</a>&nbsp;\\(' + '(\\d+)' + '\\)')
       ,karmaMatch = e.target.responseText.match(karmaRegExp);
    if (karmaMatch) {
       hnTicker.drawButton(karmaMatch[1]);
       hnTicker.button.loginNeeded = '';
    } else {
       hnTicker.button.loginNeeded = '/newslogin';
       hnTicker.drawButton('login');
    }
  };

  hnTicker.karmaRequest.addEventListener("loadend", hnTicker.loadendListener);

  hnTicker.karmaRequest.onerror = function(aEvent) {
    window.dump("HNTicker: ajax error: " + aEvent.target.status + '\n');
    hnTicker.drawButton('error');
  };

  hnTicker.loadKarmaAndDraw = function() {
    hnTicker.karmaRequest.open("GET", window.hnTicker.dataURL, true);
    hnTicker.karmaRequest.send(null);
  };

  hnTicker.unloadHttp = function() {
    window.dump('a\n');
    try{
    hnTicker.karmaRequest.removeEventListener("loadend", hnTicker.loadendListener);
    }catch(e){window.dump(e + '\n');}
    window.dump('a\n');
  };
}
