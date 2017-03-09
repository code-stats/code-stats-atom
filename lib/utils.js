'use babel';

// From http://stackoverflow.com/a/17415677/3533441
function getISOTimestamp(date) {
  const offset = -date.getTimezoneOffset();
  const prefix = (offset >= 0)? '+' : '-';

  function pad(num) {
    const norm = Math.abs(Math.floor(num));
    return ((norm < 10)? '0' : '') + norm;
  }

  return date.getFullYear()
    + '-' + pad(date.getMonth() + 1)
    + '-' + pad(date.getDate())
    + 'T' + pad(date.getHours())
    + ':' + pad(date.getMinutes())
    + ':' + pad(date.getSeconds())
    + prefix + pad(offset / 60)
    + pad(offset % 60);
}

export default getISOTimestamp;
