//TODO: set listener onDeviceConnect

//Global variables and settings
var printers = [];
var connectedSockets = [];
var port = 9999;
var server = new http.Server();
var wsServer = new http.WebSocketServer(server);
var isServer = true;
const PRIVATE_TOKEN = "npfdFMGpysvG7SNEGy60hTAoS0/EhHsIdvc94CQgUnU";

server.listen(port);
/////////////////////////////////////////////////////////////////

//Events
server.addEventListener('request', function (req) {
  var url = req.headers.url;
  if (url == '/')
    url = '/index.html';
  // Serve the pages of this chrome application.
  req.serveUrl(url);
  return true;
});

wsServer.addEventListener('request', function (req) {
  var socket = req.accept();
  connectedSockets.push(socket);
  socket.addEventListener('message', function (e) {
    function response(data) {
      socket.send(JSON.stringify(data));
    }
    var msj = JSON.parse(e.data);
    var token = msj.token;
    if (token == PRIVATE_TOKEN) {
      var func = msj.func;
      var data = msj.data;
      handleError(JSON.stringify(data));
      var funcs = {
        print: handlePrint,
        add: addPrinter,
        remove: removePrinter,
        getDefaultPrinter: getDefaultPrinter,
        setDefaultPrinter: setDefaultPrinter,
        getPrinters: getPrinters,
        scanUSBPrinters: scanUSBPrinters
      };
      if (func in funcs)
        funcs[func](data, response);
      else
        response({ status: false, error: "Function doesn't found. Please check the documentation. Func: " + func });
    } else {
      response({ status: false, error: "Invalid token. Access is not granted." });
    }
  });
  socket.addEventListener('close', function () {
    for (var i = 0; i < connectedSockets.length; i++) {
      if (connectedSockets[i] == socket) {
        connectedSockets.splice(i, 1);
        break;
      }
    }
  });
  return true;
});

chrome.usb.onDeviceAdded.addListener((device) => {
  addPrinterUSB(device, loadPrinters);
});
/////////////////////////////////////////////////////////////////

//Storage 
function addPrinter(data, response) {
  try {
    chrome.storage.local.get(['printers'], function (result) {
      result = result.printers;
      var id;
      if (result)
        id = (result.length !== 0) ? result[result.length - 1].id + 1 : 1;
      else {
        id = 1;
        result = [];
      }
      var obj = { id: id, name: data.name, mode: data.mode, device: data.device };
      if (!isIn(obj, result)) {
        result.push(obj);
        chrome.storage.local.set({ printers: result }, function () {
          printers = result;
          return response ? response({ status: true, printers: printers }) : { status: true, printers: printers, id: id };
        });
      } else {
        return response ? response({ status: false, printers: printers }) : { status: false, printers: printers };
      }
    });
  } catch{
    return response ? response({ status: false }) : { status: false };
  }
}

function updatePrinter(data, response) {
  try {
    chrome.storage.local.get(['printers'], function (result) {
      var list = result.printers;
      var id = Number(data.id);
      for (let i = 0; i < list.length; i++) {
        const element = list[i];
        if (element.id === id) {
          data.id = Number(data.id);
          if (data.mode === "usb") {
            data.device.device = Number(data.device.device);
            data.device.vendorId = Number(data.device.vendorId);
            data.device.productId = Number(data.device.productId);
            data.device.version = Number(data.device.version);
          }
          list[i] = data;
          var pr = list;
          chrome.storage.local.set({ printers: pr }, function () {
            return response({ status: true, printers: pr });
          });
          return;
        }
      }
    });
  } catch{
    return response({ status: false, error: "Error actualizando la impresora." });
  }
}

//printers array of printer
//printer: {id: string, name: string, mode: string@["tcp","usb"], device: device }
function removePrinter(id, response) {
  try {
    chrome.storage.local.get(['printers'], function (result) {
      var list = result.printers;
      var ar = [];
      list.forEach(printer => {
        if (printer.id !== id) {
          ar.push(printer);
        }
      });
      chrome.storage.local.set({ printers: ar }, function () {
        printers = ar;
        return response ? response({ status: true, printers: printers }) : { status: true, printers: printers };
      });
    });
  } catch {
    return response ? response({ status: false }) : { status: false };
  }
}

function removeListPrinter(list, response) {
  var i = 0;
  list = list || [];
  if (list.length === 0)
    return response();
  function f() {
    i += 1;
    if (i >= list.length)
      return response();
    removePrinter(list[i], f);
  }
  removePrinter(list[i], f);
}

function getDefaultPrinter(data, response) {
  try {
    chrome.storage.local.get(['defaultPrinter'], function (result) {
      response({ status: true, id: result.defaultPrinter });
    });
  } catch{
    response({ status: false });
  }
}

function setDefaultPrinter(data, response) {
  try {
    chrome.storage.local.set({ defaultPrinter: data.id }, function () {
      var r = { status: true, id: data.id };
      return response ? response(r) : r;
    });
  } catch{
    return response ? response({ status: false }) : { status: false };
  }
}

function getPrinters(data, response) {
  try {
    chrome.storage.local.get(['printers'], function (result) {
      response({ status: true, printers: result.printers });
    });
  } catch{
    response({ status: false });
  }
}
/////////////////////////////////////////////////////////////////

//AUX Functions
function checkParam(data, keyName, acceptedValues) {
  if (!(keyName in data)) {
    error = "Key missing: '" + keyName + ".";
    return { status: false, error: error };
  }
  if (!acceptedValues) {
    if (data[keyName] === undefined) {
      error = "Key undefined or invalid: '" + keyName + "'. Get: '" + data[keyName] + "'.Check documentation.";
      return { status: false, error: error };
    }
  } else {
    if (data[keyName] === undefined || !(data[keyName] in acceptedValues)) {
      error = "Key undefined or invalid: '" + keyName + "'. Get: '" + data[keyName] + "'. Check documentation.";
      return { status: false, error: error };
    }
  }
  return true;
}

function isIn(obj, list) {
  if (!list || !obj)
    return false;
  for (let i = 0; i < list.length; i++) {
    const element = list[i];
    var v = obj.mode === element.mode;
    if (v) {
      if (obj.mode === "tcp") {
        v = obj.device.ip === element.device.ip && obj.device.port === element.device.port;
      } else {
        var o = obj.device;
        var e = element.device;
        v = o.device === e.device;
        v = v && o.vendorId === e.vendorId;
        v = v && o.productId === e.productId;
        v = v && o.version === e.version;
        v = v && o.productName === e.productName;
        v = v && o.manufacturerName === e.manufacturerName;
        v = v && o.serialNumber === e.serialNumber;
      }
      if (v)
        return true;
    }
  }
  return false;
}

function cleanUSBDuplicates(device, response) {
  var def;
  function f(data) {
    var isDef = false;
    var deleteList = [];
    var list = data.printers;
    if (!list || !device)
      return response(false);
    for (let i = 0; i < list.length; i++) {
      const element = list[i];
      var o = device;
      var e = element.device;
      var v = o.vendorId === e.vendorId;
      v = v && o.productId === e.productId;
      v = v && o.version === e.version;
      v = v && o.productName === e.productName;
      v = v && o.manufacturerName === e.manufacturerName;
      v = v && o.serialNumber === e.serialNumber;
      if (v) {
        deleteList.push(element.id);
        isDef = def === element.id;
      }

    }
    removeListPrinter(deleteList, () => {
      response(isDef);
    });
  }
  getDefaultPrinter(null, (data) => {
    def = data.id;
    getPrinters(null, f);
  })
}

function addPrinterUSB(device, response) {
  function f(isDef) {
    var nm = "usb" + device.device;
    var obj = { name: nm, mode: "usb", device: device };
    addPrinter(obj, (data) => {
      if (isDef) {
        if (data.status)
          return setDefaultPrinter(data.id, response);
      }
      response();
    });
  }
  cleanUSBDuplicates(device, f);
}

function searchById(id, response) {
  chrome.storage.local.get(['printers'], function (result) {
    var list = result.printers;
    id = Number(id);
    for (let i = 0; i < list.length; i++) {
      const element = list[i];
      if (element.id === id)
        return response(element);
    }
    return response({});
  });
}
/////////////////////////////////////////////////////////////////
function selectPrinter(response) {
  filters = chrome.runtime.getManifest().permissions[2].usbDevices;
  chrome.usb.getUserSelectedDevices({ 'multiple': true, 'filters': filters }, function (devices) {
    if (devices.length == 0) {
      response();
      return;
    }
    devices.forEach(element => {
      addPrinterUSB(element, response);
    });
  });
}

function scanUSBPrinters(data, response) {
  function getDeviceList(devices) {
    var i = 0;
    devices.forEach((e) => {
      addPrinterUSB(e, () => {
        i++;
        if (devices.length === i) {
          return response ? response(devices) : devices;
        }
      });
    });
  }
  filters = chrome.runtime.getManifest().permissions[2].usbDevices;
  chrome.usb.getDevices({ filters: filters }, getDeviceList);
}
/////////////////////////////////////////////////////////////////

//Methods
//parameter: data
//{id: string, message: string, raw: Boolean}
function handlePrint(data, response) {
  check = checkParam(data, "id");
  if (check !== true) return response(check);
  var id = data.id;
  check = checkParam(data, "message");
  if (check !== true) return response(check);
  check = checkParam(data, "messageType");
  if (check !== true) return response(check);
  var messageType = data.messageType;
  var message = data.message;
  searchById(Number(id), function (printer) {
    if (!printer.mode) {
      getDefaultPrinter(null, function (data) {
        searchById(Number(data.id), function (printer) {
          print(message, messageType, printer, response);
        });
      });
    } else {
      print(message, messageType, printer, response);
    }
  });
}
/////////////////////////////////////////////////////////////////


scanUSBPrinters(null, (element) => {
  loadPrinters();
});
