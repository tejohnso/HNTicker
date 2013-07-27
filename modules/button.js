/*global Components */
"use strict";
var EXPORTED_SYMBOLS = ['loadButton'];

function loadButton(window) {
  var hnTicker = window.hnTicker;
  hnTicker.button = window.document.createElement("toolbarbutton");
  hnTicker.button.setAttribute("id", "HNTicker");
  hnTicker.button.clickListener = function() {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
              .getService(Components.interfaces.nsIWindowMediator)
              .getMostRecentWindow('navigator:browser');
    win.openUILinkIn('https://news.ycombinator.com' + hnTicker.button.loginNeeded, 'tab');
  };
  hnTicker.button.addEventListener("click", hnTicker.button.clickListener, true);

  hnTicker.buttonSibling.parentNode.insertBefore(hnTicker.button, hnTicker.buttonSibling);
  
  hnTicker.canvas = window.document
                    .createElementNS("http://www.w3.org/1999/xhtml", "canvas");
  hnTicker.canvas.setAttribute("id", "HNTicker-canvas");
  hnTicker.ctx = hnTicker.canvas.getContext("2d");
  hnTicker.font = "16px sans-serif";
  hnTicker.img = window.document
                 .createElementNS("http://www.w3.org/1999/xhtml","img");
  hnTicker.img.src = 'data:image/gif;base64,R0lGODlhEgASAKIAAP/jyvihV/aKLfmxc/////9mAAAAAAAAACH5BAAAAAAALAAAAAASABIAAAMpWLrc/jDKOQkRy8pBhuKeRAAKQFBBxwVUYY5twXVxodV3nLd77f9ASQIAOw==';

  hnTicker.drawButton = function(text) {
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
    hnTicker.buttonSibling.parentNode.insertBefore(hnTicker.button
                                                  ,hnTicker.buttonSibling);
    hnTicker.button.setAttribute("image", hnTicker.canvas.toDataURL());
  };

  hnTicker.button.unload = function(window) {
    var hnTicker = window.hnTicker
       ,button = hnTicker.button;

    window.dump('HNTicker:   unloading button\n');
    if (!button) {
      window.dump('HNTicker: no button to unload\n');
      return;
    }

    hnTicker.karmaRequest.abort();
    window.clearInterval(hnTicker.intervalHandle);
    button.removeEventListener("click", hnTicker.button.clickListener, true);
    button.parentNode.removeChild(button);
    window.dump('HNTicker:   button unloaded\n');
  };
}
