var ws;

$(document).ready(function () {
    if ("WebSocket" in window) {
        debug("WebSocket supported", 'success');
        connect("ws://127.0.0.1:21187/fps");
        $('#console_send').removeAttr('disabled');
    } else {
        debug("WebSocket not supported", 'error');
    }

    function ws_send(str) {
        try {
            ws.send(str);
        } catch (err) {
            debug(err, 'error');
        }
    }

    function connect(host) {
        debug("Connecting to " + host + "...");
        try {
            ws = new WebSocket(host);
        } catch (err) {
            debug(err, 'error');
        }
        
        $('#host_connect').attr('disabled', true);
        $('#host_close').attr('disabled', false);

        ws.onopen = function () {
            debug("Connected successfully", 'success');
            $('#statusDot').addClass('connected');
            $('#connectionText').text('Connected');
        };

        ws.onmessage = function (evt) {
            debug("Received: " + evt.data, 'response');
            var obj = eval("(" + evt.data + ")");
            var status = document.getElementById("es");
            
            switch (obj.workmsg) {
                case 1:
                    status.textContent = "Please open device";
                    break;
                case 2:
                    status.textContent = "Place finger on scanner";
                    break;
                case 3:
                    status.textContent = "Lift finger";
                    break;
                case 4:
                    break;
                case 5:
                    // GET TEMPLATE (Capture) - uses data2
                    if (obj.retmsg == 1) {
                        status.textContent = "Template captured successfully";
                        // Capture uses data2, not data1
                        var templateData = obj.data2 || obj.data1;
                        debug("Capture successful - checking data2: " + (obj.data2 ? "received" : "null"), 'success');
                        if (templateData && templateData != "null" && templateData != "") {
                            document.getElementById("e2").value = templateData;
                            debug("Template stored in e2 (length: " + templateData.length + ")", 'success');
                        } else {
                            debug("Warning: No template data received", 'error');
                        }
                    } else {
                        status.textContent = "Failed to capture template";
                        debug("Capture failed - retmsg: " + obj.retmsg, 'error');
                    }
                    break;
                case 6:
                    // ENROLL TEMPLATE
                    if (obj.retmsg == 1) {
                        status.textContent = "Enrollment successful";
                        debug("Enrollment successful - data1: " + (obj.data1 ? "received" : "null"), 'success');
                        if (obj.data1 && obj.data1 != "null" && obj.data1 != "") {
                            document.getElementById("e1").value = obj.data1;
                            
                            // Get the registered name and display it
                            var registeredName = document.getElementById("userName").value.trim();
                            if (registeredName) {
                                document.getElementById("displayName").textContent = registeredName;
                                document.getElementById("currentUser").style.display = "block";
                                document.getElementById("registrationForm").style.display = "none";
                                debug("✓ " + registeredName + " enrolled successfully", 'success');
                            }
                            
                            debug("Template stored in e1", 'success');
                        } else {
                            debug("Warning: No template data received", 'error');
                        }
                    } else {
                        status.textContent = "Enrollment failed";
                        debug("Enrollment failed - retmsg: " + obj.retmsg, 'error');
                    }
                    break;
                case 7:
                    // FINGERPRINT IMAGE
                    if (obj.image && obj.image != "null" && obj.image != "") {
                        var img = document.getElementById("imgDiv");
                        img.src = "data:image/png;base64," + obj.image;
                        debug("Fingerprint image updated", 'success');
                    }
                    break;
                case 8:
                    status.textContent = "Operation timed out";
                    debug("Timeout occurred", 'error');
                    break;
                case 9:
                    var matchScore = parseInt(obj.retmsg);
                    var enrolledName = document.getElementById("displayName").textContent;
                    
                    if (matchScore >= 40 && matchScore <= 100) {
                        status.textContent = "Match successful! This user is \"" + enrolledName + "\"";
                        debug("✓ Authentication successful - Match score: " + matchScore + " - User: " + enrolledName, 'success');
                    } else {
                        status.textContent = "This user is not \"" + enrolledName + "\"";
                        debug("✗ Authentication failed - Match score: " + matchScore + " (below threshold)", 'error');
                    }
                    break;
                default:
                    debug("Unknown message type: " + obj.workmsg, 'error');
            }
        };

        ws.onclose = function () {
            debug("Connection closed", 'error');
            $('#host_connect').attr('disabled', false);
            $('#host_close').attr('disabled', true);
            $('#statusDot').removeClass('connected');
            $('#connectionText').text('Disconnected');
        };
    }

    function debug(msg, type) {
        $("#console").append('<p class="' + (type || '') + '">' + msg + '</p>');
        $('.console-wrapper').scrollTop($('.console-wrapper')[0].scrollHeight);
    }

    $('#host_connect').click(function () {
        connect("ws://127.0.0.1:21187/fps");
    });

    $('#host_close').click(function () {
        ws.close();
    });
});

function EnrollTemplate() {
    var name = document.getElementById("userName").value.trim();
    
    if (!name) {
        document.getElementById("es").textContent = "Please enter a name first";
        return;
    }
    
    try {
        var cmd = "{\"cmd\":\"enrol\",\"data1\":\"\",\"data2\":\"\"}";
        ws.send(cmd);
        document.getElementById("es").textContent = "Place finger on scanner";
        
        // Log the registration attempt
        debug("Enrolling user: " + name, 'success');
    } catch (err) {
        console.error(err);
    }
}

function GetTemplate() {
    try {
        var cmd = "{\"cmd\":\"capture\",\"data1\":\"\",\"data2\":\"\"}";
        ws.send(cmd);
        document.getElementById("es").textContent = "Place finger on scanner";
    } catch (err) {
        console.error(err);
    }
}

function MatchTemplate() {
    var v1 = document.getElementById("e1").value;
    var v2 = document.getElementById("e2").value;
    
    if (!v1 || !v2) {
        document.getElementById("es").textContent = "Please enroll and capture templates first";
        return;
    }
    
    try {
        var cmd1 = "{\"cmd\":\"setdata\",\"data1\":\"" + v1 + "\",\"data2\":\"\"}";
        ws.send(cmd1);
        
        var cmd2 = "{\"cmd\":\"setdata\",\"data1\":\"\",\"data2\":\"" + v2 + "\"}";
        ws.send(cmd2);
        
        var cmd3 = "{\"cmd\":\"match\",\"data1\":\"\",\"data2\":\"\"}";
        ws.send(cmd3);
        
        document.getElementById("es").textContent = "Verifying...";
    } catch (err) {
        console.error(err);
    }
}