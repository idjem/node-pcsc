'use strict';

const pcsc   = require('pcsclite')();
const Reader = require('./reader');
const Event  = require('events');

const READER_EVENT     = 'reader';
const PCSC_ERROR_EVENT = 'PCSC_ERROR_EVENT';


const _PCSC = new Event();

pcsc.on('reader', (reader) => {
  var readerI = new Reader(reader);
  _PCSC.emit(READER_EVENT, readerI);
});

pcsc.on('error', (err) => {
  _PCSC.emit(PCSC_ERROR_EVENT, err.message);
});

_PCSC.SCARD_STATE_PRESENT = Reader.SCARD_STATE_PRESENT;
_PCSC.SCARD_STATE_EMPTY   = Reader.SCARD_STATE_EMPTY;
_PCSC.READER_EVENT        = READER_EVENT;
_PCSC.PCSC_ERROR_EVENT    = PCSC_ERROR_EVENT;
_PCSC.close               = pcsc.close.bind(pcsc);

module.exports = _PCSC;
