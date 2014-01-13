var _bTestResults = {};

function postResults () {
    var val;
    if (window.console) { console.log(_bTestResults); }
    for (var key in _bTestResults) {
        val = _bTestResults[key];
        if (typeof val == 'boolean') {
            _bTestResults[key] = (val ? 1 : 0);
        }
    }
    // Beacon the results to Browserscope.
    var testKey = 'agt1YS1wcm9maWxlcnIRCxIEVGVzdBiAgICEm_S4CQw';
    var script = document.createElement('script');
    script.src = 'http://www.browserscope.org/user/beacon/' + testKey;
    script.src += '?sandboxid=73fd99689bbaf82';
    document.body.appendChild(script);
}

window.onerror = function (message, url, line) {
    _bTestResults.error = ['ERROR ', 'line:', line, ' ', message].join('');
    postResults();
};

var runTests = (function (win, doc) {
    var testQueue, currentTest;
    var testCallback;
    var iframeWin;
    var lastAddedListener;
    var supportsPostMessage = 'postMessage' in window;
    win.setIframeWin = function (win) {
        iframeWin = win;
        runTests();
    };

    var allTests = {
        'only_strings': function (done) {
            var onlyStrings = false;
            setCallback(null);
            try {
                send({
                    toString: function () {
                        onlyStrings = true;
                    }
                });
            } catch (e) {}
            // some older webkit browsers send the object with toString as null
            // avoid this message being received by the next test
            setTimeout(function () {
                done(onlyStrings);
            }, 500);
        },

        'send_object': function (done) {
            setCallback(function (message) {
                done(typeof message == 'object');
            });
            send({foo: 'bar'});
        },

        'send_number': function (done) {
            setCallback(function (message) {
                done(message === 5);
            });
            send(5);
        },

        'send_date': function (done) {
            var date = new Date();
            setCallback(function (message) {
                done(message instanceof Date && 
                    date.getTime() == message.getTime());
            });
            send(date);
        },

        'send_array': function (done) {
            setCallback(function (message) {
                done(message.length === 3 && message[2] === 3);
            });
            send([1, 2, 3]);
        },

        'send_regexp': function (done) {
            setCallback(function (message) {
                done(Object.prototype.toString.call(message) === '[object RegExp]' &&
                    message.test('test') === true);
            });
            send(/test/);
        },

        'send_deep_object': function (done) {
            var bar = {'a': 'b'};
            setCallback(function (message) {
                done(typeof message == 'object' &&
                    typeof message.foo == 'object' && message.foo.a === 'b');
            });
            send({foo: bar});
        },

        'send_nested_array': function (done) {
            var arr = [1, 2, 3];
            setCallback(function (message) {
                done(message.length === 1 && message[0].length === 3 &&
                    message[0][2] === 3);
            });
            send([arr]);
        },

        'send_blob': function (done) {
            var supportsBlob = false, blob;
            try {
              supportsBlob = !!new Blob();
            } catch (e) {}

            _bTestResults.supports_blob = supportsBlob;
            if (supportsBlob) {
                blob = new Blob(['blob test'], {type : 'text/plain'});
                setCallback(function (message) {
                    done(message instanceof Blob &&
                        message.type == 'text/plain' && message.size == blob.size);
                });
                send(blob);
            } else {
                done(false);
            }
        },

        'send_arraybuffer': function (done) {
            var supportsArrayBuffer = true;
            var buf;
            try {
                buf = new ArrayBuffer(16);
            } catch (e) {
                supportsArrayBuffer = false;
            }
            _bTestResults.supports_arraybuffer = supportsArrayBuffer;
            if (supportsArrayBuffer) {
                setCallback(function (message) {
                    done(message && message.byteLength === 16);
                });
                send(buf);
            } else {
                done(false);
            }
        },

        'send_pixel_data': function (done) {
            var canvas = doc.createElement('canvas');
            var supportsCanvas = !!(canvas.getContext && canvas.getContext('2d'));
            _bTestResults.supports_canvas = supportsCanvas;
            if (supportsCanvas) {
                canvas.style.width = canvas.style.height = '10px';
                var ctx = canvas.getContext('2d');
                var imageData = ctx.getImageData(0, 0, 10, 10);
                if (imageData) {
                    setCallback(function (message) {
                        done(message && message.length > 0 && typeof message != 'string');
                    });
                    send(imageData.data);
                } else {
                    _bTestResults.no_canvas_pixel_data = true;
                }
            } else {
                done(false);
            }
        },

        'send_filelist': function (done) {
            var supportsFileList = !!(win.FileList);
            var f, files;
            _bTestResults.supports_filelist = supportsFileList;
            if (supportsFileList) {
                f = document.createElement('input');
                f.type = 'file';
                f.multiple = true;
                setCallback(function (message) {
                    done(message instanceof FileList && message.length === 0);
                });
                send(f.files);
            } else {
                done(false);
            }

        },
        
        'DATA_CLONE_ERR_defined': function (done) {
            done(win.DOMException && DOMException.DATA_CLONE_ERR === 25);
        },
    };

    function createIframe () {
        var iframeContent = '<!DOCTYPE html><scr'+'ipt>parent.setIframeWin(this);</scr'+'ipt>';
        var iframe = doc.createElement('iframe');
        iframe.style.border = iframe.style.width = iframe.style.height = 0;
        doc.body.appendChild(iframe);
        var iDoc = iframe.contentWindow.document;
        iDoc.open('text/html', 'replace');
        iDoc.write(iframeContent);
        iDoc.close();
    }

    function onMessage (evt) {
        //console.log(currentTest, typeof evt.data, evt.data);
        if (typeof testCallback == 'function') {
            testCallback(evt.data);
        }
    }

    function addListener () {
        if (win.addEventListener) {
            addEventListener('message', onMessage, false);
        } else if (win.attachEvent) {
            attachEvent('onmessage', onMessage);
        }
    }

    function setCallback (fn) {
        testCallback = fn;
    }

    function send (msg) {
        iframeWin.top.postMessage(msg, '*');
    }

    function runTests () {
        testQueue = [];
        for (var key in allTests) {
            testQueue.push(key);
        }
        addListener();
        runNext();
    }

    function runNext () {
        setCallback(undefined);

        if (testQueue.length > 0) {
            currentTest = testQueue.shift();
            var test = allTests[currentTest];
            lastAddedListener = null;
            var onComplete = function (result) {
                _bTestResults[currentTest] = result;
                runNext();
            };
            try {
                test(onComplete);
            } catch (e) {
                _bTestResults[currentTest + '_threw_error'] = 1;
                onComplete(false);
            }
        } else {
            postResults();
        }

    }

    _bTestResults.supports_postmessage = supportsPostMessage;
    
    return function () {
        if (supportsPostMessage) {
            createIframe();
        } else {
            for (var key in allTests) {
                _bTestResults[key] = false;
            }
        }
    };

})(window, document);

(function (location) {
    if (location.search.indexOf('autorun=1') !== -1) {
        runTests();
    }
})(window.location || document.location);