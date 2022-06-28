const mongoose = require("mongoose");
const config = require('../config/config');
const Pixel = require('../models/pixel');

console.log('--------------------------------');
console.log('DATABASE MIGRATOR');
console.log('USE WITH EXTREME CAUTION');
console.log('PLEASE BACKUP YOUR DATABASE BEFORE RUNNING THIS TOOL');
console.log('--------------------------------');

// Flag variables
var doneReading = false;
let i = 0;
let saved = 0;

mongoose.connect(config.database, {useMongoClient: true}).then(() => console.info('已连接至数据库'));
mongoose.Promise = global.Promise;

let cursor = Pixel.find().cursor();

let count = 0;
Pixel.count().then(c => {
    count = c;
    const printStatus = () => {
        const rawPercentage = saved / count;
        console.log(`嘿，我们更新了 ${rawPercentage * 100}% 个像素`);
    }
    setInterval(() => printStatus(), 15000);
});

cursor.on('data', (pixel) => {
    i++;
    
    pixel.xPos += 100
    pixel.yPos += 100
    
    pixel.save(function(err, n) {
        if (err) return console.error("保存像素错误 " + err);
        saved++;
        if (i === saved && doneReading) {
            console.log(`已更新 ${i} 像素`);
            process.exit();
        }
    });
});

cursor.on('close', function() {
    doneReading = true;
});

cursor.on('error', function(err) {
    console.error("保存像素错误 " + err);
});
