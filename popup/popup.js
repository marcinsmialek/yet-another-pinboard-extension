var bookmarkList = document.getElementById("bookmarks");
var offset = 0;
var pins;

document.getElementById("filter").addEventListener("keyup", handleFilterChange);
//document.getElementById("deleteBookmark").addEventListener("click", handleDelete);
document.getElementById("editform").addEventListener("submit", handleSubmit);
document.getElementById("greyout").addEventListener("click", (e) => {
    e.target.classList.toggle("hidden");
    document.getElementById("editwrapper").classList.toggle("hidden");
});

Array.from(document.getElementById("prevnext").children).forEach(element => {
    element.addEventListener("click", handlePrevNextClick);
});

browser.storage.local.get("pins").then((token) => {
    pins = new Map(token.pins);
    displayPins();
});

function preparePrevNext(numberPins) {
    Array.from(document.getElementById("prevnext").children).forEach(element => {
        element.classList.remove("linkdisabled");
        element.classList.remove("currentpage");
    });
    console.log("numberPins", numberPins);
    console.log("currentOffset: ", offset);
    let firstPage = Math.min(Math.max(1, offset / 100 - 1), Math.max(Math.ceil(numberPins / 100) - 4, 1));
    for (let i = 0; i < 5; i++) {
        let curElement = document.getElementById("pageNo" + (i + 1).toString());
        curElement.innerHTML = firstPage + i;
        curElement.dataset.offset = (firstPage + i - 1) * 100;
        if (curElement.dataset.offset == offset) {
            curElement.classList.add("currentpage");
        }
        else if (parseInt(curElement.dataset.offset) > numberPins) {
            curElement.classList.add("linkdisabled");
        }
    }
    document.getElementById("prevPage").dataset.offset = offset - 100;
    document.getElementById("nextPage").dataset.offset = offset + 100;
    document.getElementById("firstPage").dataset.offset = 0;
    document.getElementById("lastPage").dataset.offset = 100 * Math.floor(numberPins / 100);


    switch (offset) {
        case 0:
            document.getElementById("firstPage").classList.add("linkdisabled");
            document.getElementById("prevPage").classList.add("linkdisabled");
            break;
        case 100 * Math.floor(numberPins / 100):
            document.getElementById("nextPage").classList.add("linkdisabled");
            document.getElementById("lastPage").classList.add("linkdisabled");
            break;
    }
}

function handlePrevNextClick(e) {
    console.log("PrevNext", e.target.dataset.offset);
    offset = parseInt(e.target.dataset["offset"]);
    displayPins();
}

function handleDelete(e) {
    console.log("DELETING!!!");
    browser.storage.local.get("apikey").then((token) => {
        let headers = new Headers({ "Accept": "application/json" });
        let apikey = token.apikey;
        let init = { method: 'GET', headers };
        let request = new Request("https://api.pinboard.in/v1/posts/delete/?auth_token=" + apikey +
            "&url=" + encodeURIComponent(document.getElementById("url").value) + "&format=json", init);
        fetch(request).then(function (response) {
            if (response.status == 200 && response.ok) {
                response.json().then(json => {
                    if (json.result_code == "done") {
                        // delete from storage using document.[...].dataset["entryID"].slice(3) for the ID
                        // delete from local list
                    }
                });
            }
        });
    });
}

function handleSubmit(e) {
    e.preventDefault();
    browser.storage.local.get("apikey").then((token) => {
        let headers = new Headers({ "Accept": "application/json" });
        let apikey = token.apikey;
        let init = { method: 'GET', headers };
        let pin = pins.get(document.getElementById("url").dataset.entryId);
        pin.description = document.getElementById("description").value;
        pin.tags = document.getElementById("tags").value;
        pin.toread = (document.getElementById("toread").checked ? "yes" : "no");
        pins.set(pin.href, pin);
        let request = new Request("https://api.pinboard.in/v1/posts/add/?auth_token=" + apikey +
            "&url=" + encodeURIComponent(pin.href) +
            "&description=" + encodeURIComponent(pin.description) +
            "&tags=" + encodeURIComponent(pin.tags) +
            "&toread=" + pin.toread +
            "&format=json", init);
        fetch(request).then( (response) => {
            console.log(response);
            if (response.status == 200 && response.ok) {
                response.json().then(json => {
                    if (json.result_code == "done") {
                        document.getElementById("editwrapper").classList.toggle("hidden");
                        document.getElementById("greyout").classList.toggle("hidden");
                    }
                    else {
                        console.log("Error. Reply was not 'done'");
                    }
                });
            }
            else {
                console.log("Error. Not status code 200 or not response OK");
            }
        });
    });
}

function displayPins() {
    let filter = document.getElementById("filter").value.toLowerCase();
    while (bookmarkList.firstChild) {
        bookmarkList.removeChild(bookmarkList.firstChild);
    }
    let c = 0;
    for (var [key, pin] of pins) {
        if (filter == "" || pinContains(pin, filter)) {
            if (c >= offset && c < offset + 100) {
                addListItem(pin, key);
            }
            c++;
        }
    }
    preparePrevNext(c);
}

function pinContains(pin, searchText) {
    return (contains(pin.description, searchText) || contains(pin.href, searchText) || contains(pin.tags, searchText));
}

function contains(haystack, needle) {
    return haystack.toLowerCase().indexOf(needle.toLowerCase()) > -1;
}

function handleFilterChange(e) {
    offset = 0;
    displayPins();
}

function handleEditBookmark(e) {
    e.preventDefault();
    let pin = pins.get(e.target.dataset.entryId);
    document.getElementById("description").value = pin.description;
    document.getElementById("url").value = pin.href;
    document.getElementById("tags").value = pin.tags;
    document.getElementById("toread").checked = (pin.toread == "yes");
    document.getElementById("editwrapper").classList.toggle("hidden");
    document.getElementById("greyout").classList.toggle("hidden");
    document.getElementById("url").dataset.entryId = e.target.dataset.entryId;
    //document.getElementById("listdiv").style.maxHeight = "360px";
    //document.getElementById("deleteBookmark").dataset["entryId"] = e.target.dataset.entryId;
}

function handleLinkClick(e) {
    e.preventDefault();
    if (e.button == 1 || e.ctrlKey) {
        browser.tabs.create({ url: e.target.href });
    }
    else {
        browser.tabs.update({ url: e.target.href });
    }
    window.close();
}

function addListItem(pin, key) {
    let entry = document.createElement('li');
    let edit = document.createElement("a");
    edit.appendChild(document.createTextNode("\u{270E}"));
    edit.addEventListener("click", handleEditBookmark);
    edit.dataset.entryId = key;
    entry.appendChild(edit);
    let link = document.createElement("a");
    link.href = pin.href;
    link.addEventListener("click", handleLinkClick);
    link.id = key;
    link.appendChild(document.createTextNode(pin.description));
    link.title = pin.tags;
    entry.appendChild(link);
    bookmarkList.appendChild(entry);
}