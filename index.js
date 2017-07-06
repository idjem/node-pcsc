'use strict';
const pcsc   = require('pcsclite')();
const Reader = require('./reader');
const guid   = require('mout/random/guid');
const forIn  = require('mout/object/forIn');

class PCSC {
    constructor(name){
        name = decodeURI(name)
        console.log(name)
        pcsc.on('reader', (reader) => {
            if(name && reader.name != name)
                return
            this.reader = new Reader(reader)
        });
        
        pcsc.on('error', (err) => {
            this.reader = null;
            console.log('PCSC error', err.message);
        });
    }

    *uid(){
        if(!this.reader)
            return console.log('no reader detect');
        return yield this.reader.uid();
    }

    *write(start, txt){
        if(!this.reader)
            return console.log('no reader detect');
        var data = Buffer.allocUnsafe(txt.length);
        data.fill(0);
        data.write(txt);
        yield this.reader.write(start, data);
    }

    *read(start, length){
        if(!this.reader)
            return console.log('no reader detect');
        var tag = yield this.reader.read(4, 36);
        return tag.toString('utf-8');
    }
} 

module.exports = PCSC;

