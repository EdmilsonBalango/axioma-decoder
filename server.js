const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors')

const hostname = '127.0.0.1';
const port = process.env.PORT || 3001;
const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

function Decode(fPort, bytes, variables) {

    // Convert Base64 string to a byte array
    function decodeTimestamp(startIndex) {
        const unixTime = (bytes[startIndex] | (bytes[startIndex + 1] << 8) | (bytes[startIndex + 2] << 16) | (bytes[startIndex + 3] << 24)) >>> 0;
        return new Date(unixTime * 1000).toISOString();
    }

    function decodeVolume(startIndex) {
        const rawValue = (bytes[startIndex] |
            (bytes[startIndex + 1] << 8) |
            (bytes[startIndex + 2] << 16) |
            (bytes[startIndex + 3] << 24)) >>> 0;
        return rawValue / 1000;
    }

    function decodeDeltaVolume(startIndex) {
        const rawValue = (bytes[startIndex] | (bytes[startIndex + 1] << 8));
        return rawValue / 1000;
    }

    // Decoding the Base64 payload 
    function decodePayloadFromBase64() {

        const decoded = {};
        decoded.currentDateTime = decodeTimestamp(0);
        decoded.statusCode = bytes[4];
        decoded.currentVolume = decodeVolume(5);
        decoded.logDateTime = decodeTimestamp(9);
        decoded.logVolume = decodeVolume(13);
        decoded.deltaVolumes = [];
        for (let i = 17, j = 1; j <= 15; i += 2, j++) {
            decoded.deltaVolumes.push(decodeDeltaVolume(i));
        }
        return decoded;
    }

    //decode alerts from port 103
    function alertsDecoded(){
        // const bytes = base64ToBytes(base64Payload);
        const decoded = {}
        decoded.type = "Alert";
        decoded.currentDateTime = decodeTimestamp(0);

        switch (bytes[4]) {
            case 2:
                decoded.status = "Battery Low"
                break;
            case 3:
                decoded.status = "Hardware error / Tamper"
                break;
            case 4:
                decoded.status = "Backflow"
                break;        
            default:
                decoded.status = bytes[4]
                break;
        }
        return decoded
    }

    //condition for the action depending on the port
    const decodedDataFromBase64 = fPort == 100 ? decodePayloadFromBase64() : alertsDecoded();
    return decodedDataFromBase64;

}

app.get('/', (req, res) => {
    var payload = req.body.data
    var lora_port = req.body.fPort
    res.status(200).json({server: Decode(lora_port,payload)})
})

app.listen(port, hostname, () => {
    console.log(`Server is running at http://${hostname}:${port}`)
})