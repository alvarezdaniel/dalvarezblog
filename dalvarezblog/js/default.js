// For an introduction to the Grid template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=232446
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {

            document.getElementById("markItem").onclick = markItem;
            document.getElementById("refresh").onclick = refreshContent;
            document.getElementById("pinGroup").onclick = pinGroupClicked;

            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.

            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            if (app.sessionState.history) {
                nav.history = app.sessionState.history;
            }
            args.setPromise(WinJS.UI.processAll().then(function () {
                if (nav.location) {
                    nav.history.current.initialPlaceholder = true;
                    return nav.navigate(nav.location, nav.state);
                } else {
                    return nav.navigate(Application.navigator.home);
                }
            }));
        }
    });

    app.onsettings = function (e) {
        e.detail.applicationcommands = { "about": { title: "Acerca de...", href: "/pages//about.html" } };
        WinJS.UI.SettingsFlyout.populateSettings(e);
    };


    function refreshContent() {
        Data.refresh();
        appbar.winControl.hide();
    };

    function setPinButton(groupKey) {

        var appbarTileId = groupKey;
        var pinGroup = document.getElementById("pinGroup").winControl;

        if (Windows.UI.StartScreen.SecondaryTile.exists(appbarTileId)) {
            pinGroup.label = "Desanclar";
            pinGroup.icon = WinJS.UI.AppBarIcon.unpin;
            pinGroup.tooltip = "Desanclar";
        } else {
            pinGroup.label = "Anclar";
            pinGroup.icon = WinJS.UI.AppBarIcon.pin;
            pinGroup.tooltip = "Anclar";
        }

    };

    WinJS.Namespace.define("MyAppBar", {
        setPinButton: setPinButton,
    });

    function pinGroupClicked() {

        var pinGroupElement = document.getElementById("pinGroup");
        var group = Data.groups.getItemFromKey(WinJS.Navigation.state.groupKey);

        if (WinJS.UI.AppBarIcon.unpin === pinGroupElement.winControl.icon) {
            unpinGroup(pinGroupElement, group).done(function (isDeleted) {
                setPinButton(group.data.key);
            });
        } else {
            pinGroup(pinGroupElement, group).done(function (isCreated) {
                setPinButton(group.data.key);
            });
        }
    };

    function pinGroup(element, group) {
        var uriLogo = new Windows.Foundation.Uri("ms-appx:///images/logo.png");
        var newTileOptions = Windows.UI.StartScreen.TileOptions.showNameOnLogo;
        var tileId = group.data.key;
        var shortName = group.data.title;

        var tile = new Windows.UI.StartScreen.SecondaryTile(tileId, shortName, shortName, group.data.key, newTileOptions, uriLogo); // add correct logo
        tile.foregroundText = Windows.UI.StartScreen.ForegroundText.dark;

        var selectionRect = element.getBoundingClientRect();

        var buttonCoordinates = { x: selectionRect.left, y: selectionRect.top, width: selectionRect.width, height: selectionRect.height };
        var placement = Windows.UI.Popups.Placement.above;

        return new WinJS.Promise(function (complete, error, progress) {
            tile.requestCreateForSelectionAsync(buttonCoordinates, placement).done(function (isCreated) {
                if (isCreated) {
                    complete(true);
                } else {
                    complete(false);
                }
            });
        });

    };

    function unpinGroup(element, group) {
        var selectionRect = element.getBoundingClientRect();
        var buttonCoordinates = { x: selectionRect.left, y: selectionRect.top, width: selectionRect.width, height: selectionRect.height };
        var placement = Windows.UI.Popups.Placement.above;

        var tileToDelete = new Windows.UI.StartScreen.SecondaryTile(group.data.key);

        return new WinJS.Promise(function (complete, error, progress) {
            tileToDelete.requestDeleteForSelectionAsync(buttonCoordinates, placement).done(function (isDeleted) {
                if (isDeleted) {
                    complete(true);
                } else {
                    complete(false);
                }
            });
        });
    };

    function markItem() {
        var titles = document.getElementsByClassName("item-title");
        var subtitles = document.getElementsByClassName("item-subtitle");
        var listView = document.querySelector(".groupeditemslist").winControl;
        var items = listView.selection.getItems();
        var i;
        for (i = 0; i < items._value.length; i++) {
            var key = parseFloat(items._value[i].key);
            if (titles[0].innerHTML != "") { // Check for 0 based index vector
                if (key == 0) continue;
                key--;
            }
            var prevTitleAttributes = titles[key].getAttribute("style"); // We hold previous styles for modification
            var prevSubtitleAttributes = subtitles[key].getAttribute("style");
            if (prevTitleAttributes != null)
                titles[key].setAttribute("style", prevTitleAttributes + "color:gray");
            else
                titles[key].setAttribute("style", "color:gray");

            if (prevSubtitleAttributes != null)
                subtitles[key].setAttribute("style", prevSubtitleAttributes + "color:gray");
            else
                subtitles[key].setAttribute("style", "color:gray");
        }
        listView.selection.clear();
    }

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. If you need to 
        // complete an asynchronous operation before your application is 
        // suspended, call args.setPromise().
        app.sessionState.history = nav.history;
        args.setPromise();
    };

    app.start();
})();
