const readline = require('readline');
const fs = require('fs');
const util = require('util');
const SerialPort = require('serialport');
const chalk = require('chalk');
const ansi = require('ansi-escapes');
const dateformat = require('dateformat');
const CanParser = require('./CanParser.js');

const stdio = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const log = console.log;
var radioPort, canParser, logFile, frameBank = [];

fs.stat(`./logs`,(err,stat)=>{
	if(stat && stat.isDirectory()){
		logFile = fs.createWriteStream(`./logs/${dateformat(new Date(),'yyyymmdd-HHMMss')}.log`);
	}else{
		fs.mkdir('./logs',(e)=>{
			if(e) log(e);
			logFile = fs.createWriteStream(`./logs/${dateformat(new Date(),'yyyymmdd-HHMMss')}.log`);
		})
	}
})

SerialPort.list((err,ports)=>{
	if(ports.length){
		radioPort = ports;
		log('Choose a serial port:');
		for(let i=0; i<ports.length; i++){
			log(chalk.yellow(i)+') ' + chalk.cyan(ports[i].comName) + ', manufacturer: ' + chalk.dim(ports[i].manufacturer));
		}
		choosePort();
	}
});

function choosePort(){
	stdio.question('> ', (res)=>{
		res = parseInt(res);
		if(Number.isNaN(res) || res >= radioPort.length || res<0){
			log(chalk.red("Pls no fucktarderino"));
			choosePort();
		}else{
			radioPort = new SerialPort(radioPort[res].comName,{
				baudRate:115200
			});
			canParser = new CanParser();
			radioPort.pipe(canParser);
			canParser.on('frame', displayFrame);
		}
	})
}

function displayFrame(frame){
	frameBank[frame.id] = frame;
	drawReport(frame);
	logFile.write(util.inspect(frame)+',\n');
}

function drawReport(frame){
	[w,h] = process.stdout.getWindowSize();
	process.stdout.write(`${ansi.clearScreen}${('#').repeat(w)}

${chalk.cyan('BATTERY POWER:')}
Voltage: ${
	frameBank[0x201] ? chalk.yellow((frameBank[0x201].data.readInt32BE(0)/1E6).toFixed(3)) : '?'
} V,	Current: ${
	frameBank[0x201] ? chalk.yellow((frameBank[0x201].data.readInt32BE(4)/1E6).toFixed(3)) : '?'
} A,	Power: ${
	frameBank[0x201] ? chalk.yellow(((frameBank[0x201].data.readInt32BE(0)/1E6) * (frameBank[0x201].data.readInt32BE(4)/1E6)).toFixed(3)) : '?'
} W

${chalk.cyan('CELL VOLTAGES:')}
${
	Array(9).join(0).split(0).map((item, i) => `L${Math.floor(i/3)}C${(i%3)*4+0}: ${
		frameBank[0x350+i] ? chalk.yellow((frameBank[0x350+i].data.readUInt16BE(0)/1E4).toFixed(3)) : '?'
	} V,	L${Math.floor(i/3)}C${(i%3)*4+1}: ${
		frameBank[0x350+i] ? chalk.yellow((frameBank[0x350+i].data.readUInt16BE(2)/1E4).toFixed(3)) : '?'
	} V,	L${Math.floor(i/3)}C${(i%3)*4+2}: ${
		frameBank[0x350+i] ? chalk.yellow((frameBank[0x350+i].data.readUInt16BE(4)/1E4).toFixed(3)) : '?'
	} V,	L${Math.floor(i/3)}C${(i%3)*4+3}: ${
		frameBank[0x350+i] ? chalk.yellow((frameBank[0x350+i].data.readUInt16BE(6)/1E4).toFixed(3)) : '?'
	} V`).join('\n')
}

${chalk.cyan('CELL TEMPERATURES:')}
${
	Array(8).join(0).split(0).map((item, i) => `${
		Array(2).join(0).split(0).map((item, j) => `${i*4+j*2+0}: ${
			frameBank[0x500+i*2+j] ? chalk.yellow((frameBank[0x500+i*2+j].data.readInt32BE(0)/1E6).toFixed(3)) : '?'
		} °C,	${i*4+j*2+1}: ${
			frameBank[0x500+i*2+j] ? chalk.yellow((frameBank[0x500+i*2+j].data.readInt32BE(4)/1E6).toFixed(3)) : '?'
		} °C,`).join('\t')
	}`).join('\n')
}

${chalk.cyan('PPT POWERS:')}
${
	Array(3).join(0).split(0).map((item, i) => `PPT${i}: Voltage: ${
		frameBank[0x20A+i] ? chalk.yellow((frameBank[0x20A+i].data.readInt32BE(0)/1E6).toFixed(3)) : '?'
	} V,	Current: ${
		frameBank[0x20A+i] ? chalk.yellow((frameBank[0x20A+i].data.readInt32BE(4)/1E6).toFixed(3)) : '?'
	} A,	Power: ${
		frameBank[0x20A+i] ? chalk.yellow(((frameBank[0x20A+i].data.readInt32BE(0)/1E6) * (frameBank[0x201].data.readInt32BE(4)/1E6)).toFixed(3)) : '?'
	} W`).join('\n')
}

${chalk.cyan('MOTOR CONTROL:')}
Last Reset: ${frameBank[0x503] ? chalk.magenta(frameBank[0x503].timestamp.toLocaleDateString()) : '?'}
Drive:	Velocity: ${frameBank[0x501] ? chalk.yellow((frameBank[0x501].data.readFloatLE(0)).toFixed(3)) : '?'} rpm,	Current: ${frameBank[0x501] ? chalk.yellow((frameBank[0x501].data.readFloatLE(4)*100).toFixed(3)) : '?'} %
Power: ${frameBank[0x502] ? chalk.yellow((frameBank[0x502].data.readFloatLE(0)).toFixed(3) + ', ' + (frameBank[0x502].data.readFloatLE(4)).toFixed(3)) : '?'}
Stats: ${frameBank[0x403] ? chalk.yellow((frameBank[0x403].data.readFloatLE(0)).toFixed(3) + ', ' + (frameBank[0x403].data.readFloatLE(4)).toFixed(3)) : '?'}

${chalk.cyan('HEARTBEAT TIMESTAMPS:')}
${
	Array(16).join(0).split(0).map((item, i) => `${i}: ${
		frameBank[0x050+i] ? chalk.magenta(frameBank[0x050+i].timestamp.toLocaleTimeString()) : '?'
	}, `).join('')
}

${('#').repeat(w)}

${util.inspect(frame,{colors:true})}
`);
}
