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
