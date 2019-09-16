var selected;
var selectedPre;
var printersView;
var defPrinter;

function handleError(s, dir) {
  if (s)
    $(dir).removeAttr('hidden');
  else
    $(dir).attr('hidden', true);
  $(dir).text(s);
}

function loadPrinters() {
  chrome.storage.local.get(['printers'], function (result) {
    printersView = result.printers;
    var table = "";
    if (!printersView) {
      handleInfo(false);
      return;
    }
    printersView.forEach(element => {
      var isDef = defPrinter == element.id;
      var def = isDef ? " class=\"table-success\"" : "";
      table += "<tr" + def + "><th scope=\"row\">" + element.id + "</th>";
      table += "<td>" + element.name + "</td>";
      table += "<td>" + element.mode + "</td>"
      if (element.mode === "tcp")
        table += "<td>" + element.device.ip + " : " + element.device.port + "</td></tr>";
      else
        table += "<td>" + element.device.vendorId + " x " + element.device.productId + "</td></tr>";
    });
    $('#printersBodyTable').html(table);
    $("#printersBodyTable tr").click(handleClickTable);
    selected = selected || (printersView.length - 1);
    handleInfo(printersView.length, printersView[printersView.length - 1]);
  });
}

function handleClickTable() {
  $('.selected').removeClass('selected');
  $(this).addClass("selected");
  selectedPre = selected;
  selected = $(this).find('th:first').html();
  if (!printersView) {
    handleInfo(true, null, "No se encontro ninguna impresora.");
    return;
  }
  var attr = $('#infoPrintDiv').attr('hidden');
  if (typeof attr !== typeof undefined && attr !== false) {
    searchById(selected, function (printer) {
      if (!printer) {
        handleInfo(true, null, "Impresora no encontrada!");
        return;
      }
      handleInfo(true, printer);
    });
  }
  else {
    if (selected === selectedPre)
      handleInfo(false);
    else {
      searchById(selected, function (printer) {
        if (!printer) {
          handleInfo(true, null, "Impresora no encontrada!");
          return;
        }
        handleInfo(true, printer);
      });
    }
  }
}

function handleAdd(show, data, error) {
  show = show || false;
  data = data || { name: $('#namePrinter').val(), ip: $('#ipPrinter').val(), port: $('#portPrinter').val() };
  error = error || "";
  $('#namePrinter').val(show ? data.name : "");
  $('#ipPrinter').val(show ? data.ip : "");
  $('#portPrinter').val(show ? data.port : "");
  handleError(error, '#alert-add');
  $('#addPrinterDiv').attr('hidden', !show);
  var attr = $('#infoPrintDiv').attr('hidden');
  if (!(typeof attr !== typeof undefined && attr !== false) && show)
    handleInfo(!show);
}

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function loadInfo(s, pre, data) {
  $('#' + pre + capitalize(s)).val(data[s]);
}

function savePrinter(e) {
  e.preventDefault();
  function callback(printer) {
    var name = $('#namePrinterInfo').val();
    var device;
    if (printer.mode === "tcp") {
      var ip = $('#tcpIp').val();
      var port = $('#tcpPort').val();
      device = { ip: ip, port: port };
    } else if (printer.mode === "usb") {
      device = {
        vendorId: $('#usbVendorId').val(),
        productId: $('#usbProductId').val(),
        serialNumber: $('#usbSerialNumber').val(),
        productName: $('#usbProductName').val(),
        manufacturerName: $('#usbManufacturerName').val(),
        version: $('#usbVersion').val(),
        device: $('#usbDevice').val()
      }
    }
    var obj = { id: printer.id, name: name, mode: printer.mode, device: device };
    updatePrinter(obj, function () {
      enableParam(false, printer.mode);
      loadPrinters();
    });
  }
  searchById(Number(selected), callback);
}

function enableParam(enable, type) {
  enable = !enable;
  $('#namePrinterInfo').attr('readonly', enable);
  if (type === "tcp") {
    $('#tcpIp').attr('readonly', enable);
    $('#tcpPort').attr('readonly', enable);
  } else if (type === "usb") {
    $('#usbVendorId').attr('readonly', enable);
    $('#usbProductId').attr('readonly', enable);
    $('#usbSerialNumber').attr('readonly', enable);
    $('#usbProductName').attr('readonly', enable);
    $('#usbManufacturerName').attr('readonly', enable);
    $('#usbVersion').attr('readonly', enable);
    $('#usbDevice').attr('readonly', enable);
  }
}

function editPrinter() {
  function callback(data) {
    var attr = $('#namePrinterInfo').attr('readonly');
    var isReadOnly = typeof attr !== typeof undefined && attr !== false
    enableParam(isReadOnly, data.mode);
  }
  searchById(Number(selected), callback);
}

function handleInfo(show, data, error) {
  show = show || false;
  data = data || { name: $('#namePrinterInfo').val(), ip: $('#ipPrinterInfo').val(), port: $('#portPrinterInfo').val() };
  error = error || "";
  enableParam(false, "tcp");
  enableParam(false, "usb");
  $('#idPrinterInfo').val(show ? data.id : "");
  $('#namePrinterInfo').val(show ? data.name : "");
  $('#modePrinterInfo').val(show ? data.mode : "");
  handleError(error, '#alert-info');
  if (data.mode === "tcp") {
    var l = ['ip', 'port'];
    $('#usbInfo').attr('hidden', true);
    l.forEach(element => {
      loadInfo(element, "tcp", data.device);
    });
    $('#tcpInfo').attr('hidden', false);
  } else if (data.mode === "usb") {
    var l = ['device', 'vendorId', 'productId', 'version', 'productName', 'manufacturerName', 'serialNumber']
    $('#tcpInfo').attr('hidden', true);
    l.forEach(element => {
      loadInfo(element, "usb", data.device);
    })
    $('#usbInfo').attr('hidden', false);
  } else {
    $('#usbInfo').attr('hidden', true);

    $('#tcpInfo').attr('hidden', true);
  }
  $('#infoPrintDiv').attr('hidden', !show);
  var attr = $('#addPrinterDiv').attr('hidden');
  if (!(typeof attr !== typeof undefined && attr !== false) && show)
    handleAdd(!show);
}

window.addEventListener('DOMContentLoaded', function () {
  getDefaultPrinter(null, function (resp) {
    if (resp.status)
      defPrinter = resp.id;
    loadPrinters();
  });
  $('#tableAdd').click(function (e) {
    e.preventDefault();
    var attr = $('#addPrinterDiv').attr('hidden');
    var isHidden = typeof attr !== typeof undefined && attr !== false;
    handleAdd(isHidden, { name: "", port: "", ip: "" });
  });
  $('#hideAdd').click(function () { handleAdd(false) });
  $('#hideInfo').click(function () { handleInfo(false) });
  $('#addPrinter').click(function (e) {
    handleAdd(true);
    function response(resp) {
      if (!resp.status && resp.printers)
        handleAdd(true, null, "Esta impresora ya existe!");
      else
        handleAdd(true, null, "Error al añadir impresora!");
      loadPrinters();
      if (resp.status) {
        handleInfo(true, resp.printers[resp.printers.length - 1]);
      }
    }
    e.preventDefault();
    var name = $('#namePrinter').val();
    var ip = $('#ipPrinter').val();
    var port = $('#portPrinter').val();
    addPrinter({ name: name, mode: "tcp", device: { ip: ip, port: port } }, response);
  });
  $('#tableDelete').click(function () {
    function response(response) {
      loadPrinters();
    }
    removePrinter(Number(selected), (response));
  })
  $('#tableSearch').click(function () {
    selectPrinter(loadPrinters);
  })
  $('#testPrint').click(function (e) {
    function response(resp) {
      if (!resp.status) {
        if (resp.error)
          handleInfo(true, null, resp.error);
        else
          handleInfo(true, null, "Error al imprimir!");
      }
    }
    e.preventDefault();
    handlePrint({ id: Number(selected), message: {text:"Ticket de prueba\n\nTOTAL:\t\t\t\t$1000\n\n", qr:"ticket-de-prueba"}, messageType: "ticket" }, response);
  })
  $('#editPrinter').click(editPrinter);
  $('#savePrint').click(savePrinter);
  $('#defaultPrinter').click(function (e) {
    e.preventDefault();
    defPrinter = selected;
    setDefaultPrinter({ id: selected }, loadPrinters)
  });
});