'use strict';

const pcsc   = require('pcsclite')();
const Reader = require('./reader');
const Event  = require('events');

const READER_EVENT     = 'reader';
const PCSC_ERROR_EVENT = 'PCSC_ERROR_EVENT';


const _PCSC = new Event();

pcsc.on('reader', (reader) => {
  var reader = new Reader(reader);
  _PCSC.emit(READER_EVENT, reader);
});

pcsc.on('error', (err) => {
  _PCSC.emit(PCSC_ERROR, err.message);
});

_PCSC.SCARD_STATE_PRESENT = pcsc.SCARD_STATE_PRESENT;
_PCSC.SCARD_STATE_EMPTY   = pcsc.SCARD_STATE_EMPTY;
_PCSC.READER_EVENT        = READER_EVENT;
_PCSC.PCSC_ERROR_EVENT    = PCSC_ERROR_EVENT;


module.exports = _PCSC;

