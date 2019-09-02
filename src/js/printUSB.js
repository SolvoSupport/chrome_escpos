function printDataToDevice(data, device, response) {
    // Open a device and print the data to the resulting handle
    if (!device) {
        response({ status: false, error: "No se ha seleccionado ninguna impresora usb." });
        return;
    }
    chrome.usb.openDevice(device, function (handle) {
        printDataToHandle(data, device, handle, response)
    });
}

function printDataToHandle(data, device, handle, response) {
    // Claim interface and print data to it
    if (!handle) {
        response({ status: false, error: "Fallo al reclamar la interfaz del dispositivo." });
        return;
    }
    chrome.usb.claimInterface(handle, 0, function () {
        if (chrome.runtime.lastError) {
            response({ status: false, error: "Fallo al reclamar la interfaz del dispositivo." });
            return;
        }
        printDataToInterface(data, device, handle, response);
    });
}

function printDataToInterface(data, device, handle) {
    if (!handle)
        return;
    // Transfer data to a claimed interface on an open device
    var info = {
        "direction": "out",
        "endpoint": 1,
        "data": data
    };
    chrome.usb.bulkTransfer(handle, info, function (transferResult) {
        if (transferResult.resultCode) {
            response({ status: false, error: "Error en la transferencia" });
            return;
        }
        chrome.usb.releaseInterface(handle, 0, function () {
            if (chrome.runtime.lastError)
                return;
        });
    });
}

//Another way to print
function test_print(data) {
    function callback(handles) {
        if (!handles) {
            //updateStatus("Error handles undefined");
            return;
        };
        handles.forEach(handle => {
            var info = {
                "direction": "out",
                "endpoint": 1,
                "data": data
            };
            chrome.usb.bulkTransfer(handle, info, function (transferResult) {
                $('device').value = JSON.stringify(transferResult);
                if (transferResult.resultCode) {
                    //updateStatus("Error en la transferencia");
                    return;
                }
                chrome.usb.releaseInterface(handle, 0, function () {
                    chrome.usb.closeDevice(handle);
                    if (chrome.runtime.lastError)
                        $('handle').value = JSON.stringify(chrome.runtime.lastError);
                    return;
                });
            });
        });
    }
    chrome.usb.findDevices({ "vendorId": 1046, "productId": 20497 }, callback);
}

function printUSB(dataArray, printer, response) {
    if (!printer) {
        response({ status: false, error: "No se ha seleccionado ninguna impresora usb." });
        return;
    }
    var totalDataSize = dataArray.length;
    var data = new ArrayBuffer(totalDataSize);
    var dataView = new Uint8Array(data, 0, totalDataSize);
    dataView.set(dataArray, 0);
    printDataToDevice(data, printer.device, response);
    //test_print(data);
}

