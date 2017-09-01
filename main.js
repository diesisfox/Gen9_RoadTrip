const fs = require('fs');
const util = require('util');
const SerialPort = require('serialport');
const chalk = require('chalk');
const ansi = require('ansi-escapes');
const dateformat = require('dateformat');

const log = console.log;
var ports = [];
var logs = [];
var logdir = `./logs/${dateformat(new Date(),'yyyymmdd-HHMMss')}`;

fs.stat(`./logs`,(err,stat)=>{
	if(stat && stat.isDirectory()){
		fs.mkdir(logdir, openPorts);
	}else{
		fs.mkdir('./logs',()=>{
			fs.mkdir(logdir, openPorts);
		})
	}
})

function openPorts(){
	SerialPort.list((err,portList)=>{
		if(portList.length){
			portList.map((port,i,l)=>{
				ports[i] = new SerialPort(port.comName,{
					baudRate:9600
				});
				let parser = new SerialPort.parsers.Readline();
				logs[i] = fs.createWriteStream(`${logdir}/sensor${i}.log`);
				ports[i].pipe(parser);
				parser.on('data', (d)=>{
					logs[i].write(`${dateformat(new Date(),'HH:MM:ss.l')},${d}`)
				})
			});
			setTimeout(printStatus, 1000);
		}else{
			process.stdout.write(`${chalk.red('NO PORTS ENUMERATED, EXITING!!!')}`);
			process.exit();
		}
	});
}

function printStatus(){
	let [w,h] = process.stdout.getWindowSize();
	let portAlive = ports.map((el)=>{return el.isOpen});
	process.stdout.write(`${ansi.clearScreen}${('#').repeat(w)}
${chalk.cyan('PORTS ALIVE:')}
${portAlive.map((el,i)=>`${i}: ${el?'alive':'dieded'}`).join('\n')}

${chalk.cyan('BYTES WRITTEN:')}
${logs.map((el,i)=>`${i}: ${el.bytesWritten}`).join('\n')}
${('#').repeat(w)}
`);
	if(portAlive.indexOf(true) == -1){
		process.stdout.write(`${chalk.red('ALL PORTS ARE DED, EXITING!!!')}`);
		process.exit();
	}else{
		setTimeout(printStatus, 200);
	}
}
