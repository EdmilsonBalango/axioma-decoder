const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(morgan('combined')); // Logging

function Decode(fPort, bytes, variables) {

    // Convert Base64 string to a byte array
    function decodeTimestamp(startIndex) {
        const unixTime = (bytes[startIndex] | (bytes[startIndex + 1] << 8) | (bytes[startIndex + 2] << 16) | (bytes[startIndex + 3] << 24)) >>> 0;
        return new Date(unixTime * 1000).toISOString();
    }
    function decodeTimestampTB(startIndex) {
        const unixTime = (bytes[startIndex] | (bytes[startIndex + 1] << 8) | (bytes[startIndex + 2] << 16)) >>> 0;
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
        var rawValue = (bytes[startIndex] | (bytes[startIndex + 1] << 8));
        return rawValue / 1000;
    }

    // Decoding the Base64 payload 
    function decodePayloadFromBase64() {
        var decoded = {};
        decoded.currentDateTime = decodeTimestamp(0);
        decoded.statusCode = bytes[4];
        decoded.currentVolume = decodeVolume(5);
        decoded.logDateTime = decodeTimestamp(9);
        decoded.logVolume = decodeVolume(13);
        decoded.deltaVolumes = [];
        for (var i = 17, j = 1; j <= 15; i += 2, j++) {
            decoded.deltaVolumes.push(decodeDeltaVolume(i));
        }
        return decoded;
    }

    //decode alerts from port 103
    function alertsDecoded() {
        // var bytes = base64ToBytes(base64Payload);
        var decoded = {};
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

    function parameterConfigDecoded() {

        var decoded = {};
        decoded.type = "Programming";
        decoded.type = [0];
        decoded.currentDateTime = (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16)) >>> 0;
        decoded.statusCode = bytes[4];
        return decoded
    }

    //condition for the action depending on the port
    const decodedDataFromBase64 = fPort == 100 ? decodePayloadFromBase64() : alertsDecoded();
    return decodedDataFromBase64;

}


function Decode101(){
    function decodePayload(base64Payload) {
        // Decode Base64 payload into a Uint8Array
        const binaryPayload = Uint8Array.from(atob(base64Payload), char => char.charCodeAt(0));
        
        const result = [];
        let i = 0;
    
        // Function to read specific bytes
        function readBytes(count) {
            const bytes = binaryPayload.slice(i, i + count);
            i += count;
            return bytes;
        }
    
        // Function to interpret bytes as an integer
        function parseIntFromBytes(bytes) {
            return bytes.reduce((acc, byte, index) => acc + (byte << (8 * (bytes.length - 1 - index))), 0);
        }
    
        // Parse the payload
        while (i < binaryPayload.length) {
            const dif = readBytes(1)[0]; // DIF is always 1 byte
    
            if (dif === 0x04) {
                // DIF: 32-bit integer
                const vif = readBytes(1)[0]; // VIF is 1 byte
                const data = parseIntFromBytes(readBytes(4)); // 32-bit data
                result.push({ dif: '32-bit', vif: `0x${vif.toString(16)}`, data });
            } else if (dif === 0x31) {
                // DIF: 8-bit integer
                const vif = readBytes(1)[0]; // VIF is 1 byte
                const data = parseIntFromBytes(readBytes(1)); // 8-bit data
                result.push({ dif: '8-bit', vif: `0x${vif.toString(16)}`, data });
            } else if (dif === 0x02) {
                // DIF: 16-bit integer
                const vif = readBytes(1)[0]; // VIF is 1 byte
                const data = parseIntFromBytes(readBytes(2)); // 16-bit data
                result.push({ dif: '16-bit', vif: `0x${vif.toString(16)}`, data });
            } else if (dif === 0x44 || dif === 0x4D) {
                // DIF: 32-bit integer with storage
                const vif = readBytes(1)[0]; // VIF is 1 byte
                const data = parseIntFromBytes(readBytes(4)); // 32-bit data
                result.push({ dif: '32-bit (with storage)', vif: `0x${vif.toString(16)}`, data });
            } else if (dif === 0x20) {
                // Special case: Length byte
                const length = readBytes(1)[0] - 2; // Real length
                result.push({ dif: 'Length', data: length });
            } else if (dif === 0x62) {
                // Special case: Spacing control
                const spacing = readBytes(1)[0];
                result.push({
                    dif: 'Spacing Control',
                    increment: (spacing >> 6) & 0x03,
                    periodUnit: (spacing >> 4) & 0x03,
                    deltaSize: spacing & 0x0F
                });
            } else {
                // Unknown DIF
                result.push({ dif: `Unknown (0x${dif.toString(16)})` });
            }
        }
    
        return result;
    }
    
    // Example usage
    const payload = 'BP+JEzH9FwQTRP+JE0STTZMeIGIB';
    const decodedData = decodePayload(payload);
    return decodedData;
}

app.get('/', (req, res) => {
    var payload = req.body.data
    var lora_port = req.body.fPort
    // res.status(200).json({server: Decode(lora_port,payload)})
    res.status(200).json({server: 'all ok'})
})

app.listen(port, hostname, () => {
    console.log(`Server is running at http://${hostname}:${port}`)
})