const { printSuccess, printError, printWarn, printInfo } = require('../../lib/consoleLogger');

/**
 * Compatibility wrapper: keeps the same Logger.log(content, type) API used
 * across the music subsystem, but renders through the same boxed badge
 * style used everywhere else in the console (LOAD/OK/INFO/WARN/ERR).
 */
class Logger {
  static log(content, type = 'log') {
    switch (type) {
      case 'ready':
        printSuccess(content);
        break;
      case 'warn':
        printWarn(content);
        break;
      case 'error':
        printError(content);
        break;
      case 'log':
      case 'debug':
      case 'cmd':
      case 'event':
        printInfo(content);
        break;
      default:
        printInfo(content);
    }
  }
}

module.exports = Logger;
