'use strict';
const pcsc   = require('pcsclite')();
const Reader = require('./reader');
const guid   = require('mout/random/guid');
const forIn  = require('mout/object/forIn');
const Event  = require('eventemitter-co');

const SCARD_STATE_PRESENT = Reader.SCARD_STATE_PRESENT;
const SCARD_STATE_EMPTY   = Reader.SCARD_STATE_EMPTY;

class PCSC extends Event{
  constructor(name){
    super();
    name = decodeURI(name)
    console.log(name)
    pcsc.on('reader', (reader) => {
      if(name && reader.name != name)
          return
      this.reader = new Reader(reader)
      this.reader.on(Reader.SCARD_STATE_EMPTY  , this.emit.bind(this, PCSC.SCARD_STATE_EMPTY));
      this.reader.on(Reader.SCARD_STATE_PRESENT, this.emit.bind(this, PCSC.SCARD_STATE_PRESENT));
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

PCSC.SCARD_STATE_PRESENT = SCARD_STATE_PRESENT;
PCSC.SCARD_STATE_EMPTY   = SCARD_STATE_EMPTY;

module.exports = PCSC;

