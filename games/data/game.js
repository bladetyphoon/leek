var Module;

if (typeof Module === "undefined")
    Module = {};

if (!Module.expectedDataFileDownloads) {
    Module.expectedDataFileDownloads = 0;
    Module.finishedDataFileDownloads = 0;
}

Module.expectedDataFileDownloads++;

const CDN_BASE =
    "https://cdn.jsdelivr.net/gh/bladetyphoon/leek@main/games/data/";

Module.locateFile = function (path) {
    return CDN_BASE + path;
};

(function () {
    var loadPackage = function (metadata) {

        var PACKAGE_PATH;

        if (typeof window === "object") {
            PACKAGE_PATH =
                encodeURIComponent(
                    window.location.pathname
                        .toString()
                        .substring(
                            0,
                            window.location.pathname
                                .toString()
                                .lastIndexOf("/")
                        ) + "/"
                );
        } else if (typeof location !== "undefined") {
            PACKAGE_PATH =
                encodeURIComponent(
                    location.pathname
                        .toString()
                        .substring(
                            0,
                            location.pathname
                                .toString()
                                .lastIndexOf("/")
                        ) + "/"
                );
        } else {
            throw "must run in browser";
        }

        /* KEEP THIS RELATIVE — DO NOT TURN INTO A URL */
        var PACKAGE_NAME = "game.data";

        var REMOTE_PACKAGE_BASE = PACKAGE_NAME;

        var REMOTE_PACKAGE_NAME =
            typeof Module["locateFile"] === "function"
                ? Module["locateFile"](REMOTE_PACKAGE_BASE)
                : CDN_BASE + REMOTE_PACKAGE_BASE;

        var REMOTE_PACKAGE_SIZE = metadata.remote_package_size;
        var PACKAGE_UUID = metadata.package_uuid;

        function fetchRemotePackage(packageName, packageSize, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", packageName, true);
            xhr.responseType = "arraybuffer";

            xhr.onload = function () {
                if (
                    xhr.status === 200 ||
                    xhr.status === 304 ||
                    xhr.status === 0
                ) {
                    callback(xhr.response);
                } else {
                    throw new Error("Failed to load: " + packageName);
                }
            };

            xhr.onerror = function () {
                throw new Error("Network error: " + packageName);
            };

            xhr.send(null);
        }

        function runWithFS() {
            function assert(x, msg) {
                if (!x) throw msg;
            }

            function DataRequest(start, end) {
                this.start = start;
                this.end = end;
            }

            DataRequest.prototype = {
                requests: {},

                open: function (mode, name) {
                    this.name = name;
                    this.requests[name] = this;
                    Module.addRunDependency("fp " + name);
                },

                onload: function () {
                    var byteArray = this.byteArray.subarray(
                        this.start,
                        this.end
                    );
                    this.finish(byteArray);
                },

                finish: function (byteArray) {
                    Module.FS_createDataFile(
                        this.name,
                        null,
                        byteArray,
                        true,
                        true,
                        true
                    );

                    Module.removeRunDependency(
                        "fp " + this.name
                    );
                }
            };

            var files = metadata.files;

            for (var i = 0; i < files.length; i++) {
                new DataRequest(
                    files[i].start,
                    files[i].end
                ).open("GET", files[i].filename);
            }

            function processPackageData(arrayBuffer) {
                Module.finishedDataFileDownloads++;

                var byteArray = new Uint8Array(arrayBuffer);

                var ptr = Module.getMemory(byteArray.length);
                Module.HEAPU8.set(byteArray, ptr);

                DataRequest.prototype.byteArray =
                    Module.HEAPU8.subarray(
                        ptr,
                        ptr + byteArray.length
                    );

                for (var i = 0; i < files.length; i++) {
                    DataRequest.prototype.requests[
                        files[i].filename
                    ].onload();
                }

                Module.removeRunDependency(
                    "datafile_game.data"
                );
            }

            Module.addRunDependency("datafile_game.data");

            fetchRemotePackage(
                REMOTE_PACKAGE_NAME,
                REMOTE_PACKAGE_SIZE,
                processPackageData
            );
        }

        if (Module.calledRun) {
            runWithFS();
        } else {
            if (!Module.preRun) Module.preRun = [];
            Module.preRun.push(runWithFS);
        }
    };

    loadPackage({
        package_uuid: "d7e34743-2fea-4de6-8a0e-1103b5fcf07f",
        remote_package_size: 10642513,
        files: [
            {
                filename: "/game.love",
                start: 0,
                end: 10642513
            }
        ]
    });
})();