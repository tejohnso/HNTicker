/*global Components */
"use strict";
var EXPORTED_SYMBOLS = ['loadPrefs'];

function loadPrefs(window) {
  var hnTicker = window.hnTicker;

  hnTicker.prefBranch = Components
                        .classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService)
                        .getBranch("extensions.HNTicker.");
  hnTicker.defBranch = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService)
                        .getDefaultBranch("extensions.HNTicker.");
  hnTicker.defBranch.setIntPref('interval', 180);

  hnTicker.prefObserver = {
     observe: function(aSubject, aTopic, aData) {
        switch (aData) {
        case "interval":
          hnTicker.intervalSeconds = hnTicker
                                    .prefBranch.getIntPref('interval');
          if (hnTicker.intervalSeconds < 180) {
            hnTicker.intervalSeconds = 180;
            hnTicker.prefBranch.setIntPref('interval', 180);
          }
          window.clearInterval(hnTicker.button.intervalHandle);
          hnTicker.button.intervalHandle = window.setInterval(function() {
            hnTicker.loadKarmaAndDraw();
          }, hnTicker.intervalSeconds * 1000);
          window.dump('HNTicker: reloading every ' + 
                      hnTicker.intervalSeconds + ' seconds' + '\n');
          break;
        }
     },
     unregister: function() {
       window.dump('HNTicker:   unregistering pref observer\n');
       hnTicker.prefBranch.removeObserver("", hnTicker.prefObserver);
       window.dump('HNTicker:   unregistered pref observer\n');
     }
  };

  hnTicker.intervalSeconds = hnTicker.prefBranch.getIntPref('interval');
  if (typeof hnTicker.intervalSeconds !== 'number' || 
      hnTicker.intervalSeconds < 180) {
    hnTicker.intervalSeconds = 180;
    hnTicker.prefBranch.setIntPref('interval', 180);
  }

  hnTicker.prefBranch.addObserver("", hnTicker.prefObserver, false);
  window.dump('HNTicker: reloading every ' + 
              hnTicker.intervalSeconds + ' seconds' + '\n');
}
