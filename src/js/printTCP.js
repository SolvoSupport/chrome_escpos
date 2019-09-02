function printTCP(s, ip, port, response) {
    try {
        chrome.sockets.tcp.create({}, function (createInfo) {
            var socketId = createInfo.socketId;
            if (!socketId) {
                response({ status: false, error: "Error al comunicarse con: " + ip + " : " + port });
                return;
            }
            function onConnectedCallback() {
                function sendTCP(arrayBuffer) {
                    chrome.sockets.tcp.send(socketId, arrayBuffer,
                        function () {
                            chrome.sockets.tcp.close(socketId);
                            response({ status: true });
                        });
                };
                sendTCP(s);
            }
            try {
                chrome.sockets.tcp.connect(Number(socketId), ip, Number(port), onConnectedCallback);
            } catch{
                response({ status: false, error: "Error al comunicarse con: " + ip + " : " + port });
            }
        });
    } catch{
        response({ status: false, error: "Error al comunicarse con: " + ip + " : " + port });
    }
}