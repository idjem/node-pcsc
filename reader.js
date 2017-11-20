'use strict';

const TAG_ISO_14443_3 = 'TAG_ISO_14443_3';
const TAG_ISO_14443_4 = 'TAG_ISO_14443_4';

const promisify       = require('nyks/function/promisify');
const Event           = require('eventemitter-co');
const log             = require('debug')('nfc');

const SCARD_STATE_PRESENT = 'SCARD_STATE_PRESENT';
const SCARD_STATE_EMPTY   = 'SCARD_STATE_EMPTY';

class Reader extends Event{
  constructor(reader){
    super();
    this.name   = reader.name;
    this.card   = null;      
    this.connect    = promisify(reader.connect, reader);
    this.disconnect = promisify(reader.disconnect, reader);
    this.transmit   = promisify(reader.transmit, reader);
 
    reader.on('error', function(err) {
      log(`Error( ${this.name} ): ${err.message}`);
    });
    reader.on('end', function() {
      log(`Reader ${this.name} removed`);
    });
    
    reader.on('status', async (status) => {
      var changes = reader.state ^ status.state;
      if (changes) {
        if ((changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY)) {
          log("card removed");
          this.card = null;
          this.emit(SCARD_STATE_EMPTY, this.card).catch(log);
          var disconnected = await this.disconnect(reader.SCARD_LEAVE_CARD);
        } else if ((changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT)) {
          log("card inserted");
          this.card = {};
          if (status.atr) {
            this.card.standard = Reader.selectStandardByAtr(status.atr);
          }  
          this.card.protocol = await this.connect({ share_mode : reader.SCARD_SHARE_SHARED });
          log("card connected " , this.card);
          this.emit(SCARD_STATE_PRESENT, this.card).catch(log);
        }
      }
    });
  }

  async _write(blockNumber, data, blockSize ){
    if(!this.card || !this.card.protocol)
      throw new Error('No card present !');

    if(!blockSize)
      blockSize = 4;
    
    if (data.length < blockSize || data.length % blockSize !== 0) {
      throw new Error('invalid_data_length', 'Invalid data length. You can only update the entire data block(s).');
    }

    if (data.length > blockSize) {
      const p = data.length / blockSize;
      for (let i = 0; i < p; i++) {
          const block = blockNumber + i;
          const start = i * blockSize;
          const end = (i + 1) * blockSize;
          const part = data.slice(start, end);
          await this._write(block, part, blockSize);
      }
      return true;
    }
    // APDU CMD: Update Binary Block
    var packetHeader = new Buffer([0xff, 0xd6, 0x00, blockNumber, blockSize]);
    var packet       = Buffer.concat([packetHeader, data]);
    var response     = await this.transmit(packet, 2, this.card.protocol);
    const statusCode = response.readUInt16BE(0);
    if (statusCode !== 0x9000) {
      throw new Error(`Write operation failed: Status code: 0x${statusCode.toString(16)}`);
    }
    return true;
  }

  async write(start, txt){
    console.log
    var data = Buffer.allocUnsafe(txt.length);
    data.fill(0);
    data.write(txt);
    await this._write(start, data);
  }
  

  async uid(){
    if(!this.card || !this.card.protocol)
      throw new Error('No card present !');
    
    var packet = null ;
    if(this.card.standard !== TAG_ISO_14443_3)
      throw new Error('read tag to implement not TAG_ISO_14443_3');

    var packet = new Buffer([0xff, 0xca, 0x00, 0x00, 0x00]);
    var response = await this.transmit(packet, 40, this.card.protocol);
    if (response.length < 2) 
		  throw new Error('invalid_response', `Invalid response length ${response.length}. Expected minimal length was 2 bytes.`);
    // last 2 bytes are the status code
		var statusCode = response.slice(-2).readUInt16BE(0);
    if (statusCode !== 0x9000)
		  throw new Error('Could not get card UID.');
		// strip out the status code (the rest is UID)
		this.card.uid= response.slice(0, -2).toString('hex');
	  this.card.uuidReverse = Reader.reverseBuffer(response.slice(0, -2)).toString('hex');
    return this.card;
  }

  async read(start, length){
    var tag = await this._read(start, length);
    return tag.toString('utf-8');
  }

  async _read(blockNumber, length, blockSize, packetSize) {
    if(!this.card || !this.card.protocol)
      throw new Error('No card present !');

    blockSize = blockSize   || 4;
    packetSize = packetSize || 16;

		if (length > packetSize) {
			const p = Math.ceil(length / packetSize);
			const commands = [];
			for (let i = 0; i < p; i++) {
				const block = blockNumber + ((i * packetSize) / blockSize);
        const size = ((i + 1) * packetSize) < length ? packetSize : length - ((i) * packetSize);
        var data = await this._read(block, size, blockSize, packetSize)
				commands.push(data);
      }
      return commands.join('');
		}
		// APDU CMD: Read Binary Blocks
		const packet = new Buffer([0xff, 0xb0, 0x00, blockNumber, length]);
		var response = await this.transmit(packet, length + 2, this.card.protocol);
		const statusCode = response.slice(-2).readUInt16BE(0);
		if (statusCode !== 0x9000) {
			throw new Error(`Read operation failed: Status code: 0x${statusCode.toString(16)}`);
		}
		return response.slice(0, -2);
	}

  static reverseBuffer(src) {
		const buffer = new Buffer(src.length);
		for (let i = 0, j = src.length - 1; i <= j; ++i, --j) {
			buffer[i] = src[j];
			buffer[j] = src[i];
		}
		return buffer;
	}

  static selectStandardByAtr(atr){
    if (atr[5] && atr[5] === 0x4f) {
    return TAG_ISO_14443_3;
    }
    else {
      return TAG_ISO_14443_4;
    }
  }
}

Reader.SCARD_STATE_PRESENT = SCARD_STATE_PRESENT;
Reader.SCARD_STATE_EMPTY   = SCARD_STATE_EMPTY;
module.exports = Reader ;