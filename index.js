import { SerialPort } from 'serialport'
import clipboard from 'clipboardy';
import readline from 'node:readline';

const hexToDec = (array) => Buffer.from(array).toString();

const BASE_COMMANDS = {
    RESET_WEIGHT: hexToDec([0x00, 0x00, 0x01]),
    SEND_PRICE: hexToDec([0x00, 0x00, 0x02]),
    GET_DATA: hexToDec([0x00, 0x00, 0x03])
}

const argument = process.argv[2];

const exit = () => {
    if(!argument) return;
    port.close(() => process.exit());
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const port = new SerialPort({
    path: 'COM13',
    baudRate: 4800,
    parity: "even"
})

const resetWeight = () => new Promise(resolve => 
    port.write(BASE_COMMANDS.RESET_WEIGHT, resolve)
);

const setPrice = () => new Promise(resolve => {
    const price = Number(clipboard.readSync());
    if(Number.isNaN(price) || price > 1000) resolve();
    const stringForSending = Array.from(price.toFixed(2).replace(".", "").padStart(6, 0)).reverse().join("");
    port.write(BASE_COMMANDS.SEND_PRICE + stringForSending, resolve);
});

const readData = (type) => new Promise(resolve => {
    let buffer = "";
    port.on('data', function callback (data) {
        if(buffer.length < 18) {
            buffer += Buffer.from(data).toString();
        }
        if(buffer.length === 18) {
            const arrayBuffer = Array.from(buffer).reverse();
            const data = {
                totalPrice:  Number(arrayBuffer.slice(0, 6).join("")) / 100,
                price: Number(arrayBuffer.slice(6, 12).join("")) / 100,
                weight: Number(arrayBuffer.slice(12, 18).join("")) / 1000
            }
            clipboard.writeSync(String(data[type]))
            port.off("data", callback)
            console.log("DATA", data);
            resolve();
        }
    })
    port.write(BASE_COMMANDS.GET_DATA)
})

const message = `Оберіть операцію:
    1. Скинути вагу
    2. Встановити ціну
    3. Отримати вагу
    4. Отримати ціну
    5. Отримати вартість
    6. Встановити ціну і отримати вартість
    7. Закрити
`
const handleCommand = async (value) => {
    switch(value) {
        case "1": 
            await resetWeight();
            exit();
        case "2": 
            await setPrice();
            exit();
        case "3": 
            await readData("weight");
            exit();
        case "4": 
            await readData("price");
            exit();
        case "5": 
            await readData("totalPrice");
            exit();
        case "6": 
            await setPrice();
            await readData("totalPrice");
            exit();
        case "7":
            exit();
    }
}

const showMenu = () => 
    rl.question(message, (value) => {
        handleCommand(value);
        showMenu()
    });

if(argument) {
    handleCommand(argument);
} else {
    showMenu();
}
