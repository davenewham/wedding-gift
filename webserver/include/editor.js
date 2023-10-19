const width = 1200
const height = 825 
let canvas = document.querySelector('#cdraw');
let sketchpad = new Atrament(canvas, {width: width, height: height});

var textUntouched = true;

function switchTab(target) {
    var tabs = document.getElementById("tabs").children;
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle("active", "t"+target == tabs[i].id); 
    }

    var el = document.getElementsByClassName("grouped");
    for (var i = 0; i < el.length; i++) {
        el[i].classList.toggle("hidden", !el[i].classList.contains("g"+target)); 
    }

    var el = document.getElementsByTagName("canvas");
    for (var i = 0; i < el.length; i++) {
        el[i].classList.toggle("disabled", "c"+target != el[i].id); 
    }

    updateAuthor();
    if (!textUntouched)
        updateText();
}

function clearDrawing() {
    sketchpad.clear();
}

function selectPen() {
    sketchpad.mode = "draw";
}

function selectEraser() {
    sketchpad.mode = "erase";
}

function updateAuthor() {
    var ctx = document.getElementById("cstart").getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "30px josefin_sansregular";
    let text = document.getElementById("author").value;
    let size = ctx.measureText(text);
    ctx.fillText(text, 790 - size.width, 470);
}

var updateAuthorTO = false;
function updateAuthorTimeout() {
    if (updateAuthorTO !== false) {
        clearTimeout(updateAuthorTO);
        updateAuthorTO = false;
    }
    updateAuthorTO = setTimeout(updateAuthor, 500);
}

function updateText() {
    var ctx = document.getElementById("ctext").getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let text = document.getElementById("text").value;
    let font = document.getElementById("font").value;
    let lines = text.trim().split('\n');
    let n = lines.length;
    for (var i = 0; i < n; i++)
        lines[i] = lines[i].trim();

    var fontsize = 110;
    var w, h;
    while (fontsize > 30) {
        fontsize -= 10;
        h = fontsize * 1.25;
        w = 0;
        ctx.font = fontsize+"px " + font;
        for (var i = 0; i < n; i++) {
            let size = ctx.measureText(lines[i]);
            if (size.width > w)
                w = size.width;
        }
        if (n*h < 400 && w < 720)
          break;
    }
    if (w > 790 || n*h > 470) {
        document.getElementById("lineerror").style.display = "block";
        document.getElementById("authorerror").style.display = "none";
        document.getElementById("submitblock").style.display = "none";
    } else if (document.getElementById("author").value == "") {
        document.getElementById("lineerror").style.display = "none";
        document.getElementById("authorerror").style.display = "block";
        document.getElementById("submitblock").style.display = "none";
    } else {
        document.getElementById("lineerror").style.display = "none";
        document.getElementById("authorerror").style.display = "none";
        document.getElementById("submitblock").style.display = "block";
    }
    if (fontsize < 50)
        document.getElementById("linewarning").style.display = "block";
    else
        document.getElementById("linewarning").style.display = "none";

    ctx.font = fontsize+"px " + font;
    var y = (480 - n*h) / 2 + h*2/3;
    for (var i = 0; i < n; i++) {
        let size = ctx.measureText(lines[i]);
        ctx.fillText(lines[i], (790 - size.width)/2, y);
        y += h;
    }
    var data = document.getElementById("ctext").getContext('2d').getImageData(0, 0, 800, 480);
    let d = data.data;
    for (var y = 0; y < 480; y++) {
        for (var x = 0; x < 800; x++) {
            let index = 4*(y * 800 + x);
            if (d[index+3] > 127 && (d[index] < 127 && d[index+1] < 127 && d[index+2] < 127)) {
                d[index] = 0;
                d[index+1] = 0;
                d[index+2] = 0;
                d[index+3] = 255;
            } else {
                d[index] = 255;
                d[index+1] = 255;
                d[index+2] = 255;
                d[index+3] = 0;
            }
        }
    }
    document.getElementById("ctext").getContext('2d').putImageData(data, 0, 0);
}

var updateTextTO = false;
function updateTextTimeout() {
    if (updateTextTO !== false) {
        clearTimeout(updateTextTO);
        updateTextTO = false;
    }
    updateTextTO = setTimeout(updateText, 500);
}

function textTouched() {
    if (textUntouched) {
        textUntouched = false;
        document.getElementById("text").value = "";
    }
}

function randomizeSelect(id) {
    var options = document.getElementById(id).children;
    let i = Math.floor(Math.random() * options.length);
    options[i].selected = true;
}

function submit() {
    var d1 = document.getElementById("cstart").getContext('2d').getImageData(0, 0, 800, 480).data;
    var d2 = document.getElementById("ctext").getContext('2d').getImageData(0, 0, 800, 480).data;
    var d3 = document.getElementById("cdraw").getContext('2d').getImageData(0, 0, 800, 480).data;

    var out = [];

    function isBlack(x, y) {
        let index = 4*(y * 800 + x) + 3;
        return d1[index] > 127 || d2[index] > 127 || d3[index] > 127;
    }

    var bi = 0;
    for (var y = 0; y < 480; y++) {
        //Repeated encoding
        var repeated = [];
        var white = true;
        var count = 0;
        for (var x = 0; x < 800; x++) {
            let black = isBlack(x, y);
            if (count == 255) {
                repeated.push(count);
                count = 0;
            }
            if (white && black) {
                white = false;
                repeated.push(count);
                count = 0;
            } else if (!white && !black) {
                white = true;
                repeated.push(count);
                count = 0;
            }
            count++;
        }
        if (count > 0)
            repeated.push(count);

        if (repeated.length > 100) {
            out[bi] = 0;
            bi++;

            //Pixelmap encpding
            for (var x = 0; x < 800; x+=8) {
                var b = 0;
                for (var i = 0; i < 8; i++) {
                    b = b << 1;
                    if (isBlack(x+i, y))
                        b = b | 0x01;
                }
                out[bi] = b;
                bi++;
            }
        } else {
            out[bi] = repeated.length;
            bi++;
            for (var i = 0; i < repeated.length; i++) {
                out[bi] = repeated[i];
                bi++;
            }
        }
    }

    var bytes = new Uint8Array(out);
    console.log(bytes);

    var xhr = new XMLHttpRequest;
    xhr.open("POST", "https://localhost/submit.php", false);
    xhr.onload = function () {
        window.location.replace("https://localhost/success.html");
    };
    xhr.send(bytes);
}

randomizeSelect("font");
switchTab("start");
