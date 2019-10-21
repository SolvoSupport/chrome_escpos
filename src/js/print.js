var cutLine = String.fromCharCode(0x0a) + String.fromCharCode(0x1d) + String.fromCharCode(0x56) + String.fromCharCode(0x41) + String.fromCharCode(0x03);
var setEncoding = String.fromCharCode(0x1b) + String.fromCharCode(0x28) + String.fromCharCode(0x74) + String.fromCharCode(0x03) + String.fromCharCode(0x00) + String.fromCharCode(0x00) + String.fromCharCode(0x7f) + String.fromCharCode(0x01);

function encodeText(str, callback) {
    var bb = new Blob([str]);
    var f = new FileReader();
    f.onload = function (e) {
        callback(e.target.result);
    };
    f.readAsArrayBuffer(bb);
}

function encodeUSBText(s, callback) {
    var dataArray = s.split('');
    dataArray = dataArray.map(function (s) { return s.charCodeAt(0) });
    //dataArray.push(0x0a); dataArray.push(0x1d); dataArray.push(0x56); dataArray.push(0x41); dataArray.push(0x03);
    callback(dataArray);
}

function encodeQr(data, callback) {
    var qrdata = data || "Undefined QR";
    var len = qrdata.length + 3;
    var size = 6; // De 1 a 8
    size = ((size % 8) + 8) % 8;
    var pl = Number(len % 256);
    var ph = Number(len / 256);
    var s = "";
    var qrBegin = [
        0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00, //SELECT MODEL 2 (0x31 MODEL 1)
        0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size, //SIZE
        0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31,
        0x1d, 0x28, 0x6b, pl, ph, 0x31, 0x50, 0x30];
    var qrEnd = [0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30];
    qrBegin.forEach(element => {
        s += String.fromCharCode(element);
    });
    s += qrdata;
    qrEnd.forEach(element => {
        s += String.fromCharCode(element);
    });
    callback(s);
}

function printTicketUsb(data, callback) {
    encodeQr(data.qr, function (qr) {
        var ticket = setEncoding + data.text + qr + cutLine;
        encodeUSBText(ticket, function (output) {
            callback(output);
        });
    });
}

function printTicket(data, callback) {
    encodeQr(data.qr, function (qr) {
        var ticket = setEncoding + data.text + qr + cutLine;
        encodeText(ticket, function (output) {
            callback(output);
        });
    });
}

function print(message, messageType, printer, callback) {
    var mode = printer.mode;
    if (!printer || !mode) {
        return callback({ status: false, error: "Printer ID invalid and unable to find default Printer." });
    }
    function sendToPrint(data) {
        if (mode === "usb")
            printUSB(data, printer, callback);
        if (mode === "tcp")
            printTCP(data, printer.device.ip, printer.device.port, callback);
    }
    if (messageType === "raw") {
        sendToPrint(message);
    } else if (messageType === "text") {
        if (mode === "usb")
            encodeUSBText(setEncoding + message, sendToPrint);
        if (mode === "tcp")
            encodeText(setEncoding + message, sendToPrint);
    } else if (messageType === "qr") {
        if (mode === "usb") {
            encodeQr(message, function (s) {
                encodeUSBText(s, sendToPrint);
            });
        }
        if (mode === "tcp") {
            encodeQr(message, function (s) {
                encodeText(s, sendToPrint);
            });
        }

    } else if (messageType === "ticket") {
        if (mode === "usb")
            printTicketUsb(message, sendToPrint);
        if (mode === "tcp")
            printTicket(message, sendToPrint);
    }
}