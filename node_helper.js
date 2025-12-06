const NodeHelper = require('node_helper'); // eslint-disable-line import/no-unresolved
const request = require('request'); // eslint-disable-line import/no-extraneous-dependencies

module.exports = NodeHelper.create({
  start() {
    this._startedModules = {};
  },

  socketNotificationReceived(notificationName, payload) {
    const self = this;

    if (notificationName === 'MMM-ANYCUBIC.INIT') {
      if (!self._startedModules[payload.moduleId]) {
        self._init(payload.moduleId, payload.config);
        self.sendSocketNotification('MMM-ANYCUBIC.STARTED', true);
        self._startedModules[payload.moduleId] = true;
      }
    }
  },

  _init(moduleId, config) {
    const self = this;

    // Get the data immediately right after the module initialization has completed.
    setTimeout(() => {
      self._getData(moduleId, config);
    }, 0);

    setInterval(() => {
      self._getData(moduleId, config);
    }, config.updateInterval);
  },

  _getData(moduleId, config) {
    const self = this;

    const url = 'https://samples.json-format.com/employees/json/employees_1KB.json';

    request(url, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        self._processResponse(moduleId, body);
      } else {
        console.error(`MMM-Anycubic Node helper: Failed to load data in the background. Error: ${error}. Status code: ${response.statusCode}. Body: ${body}`); // eslint-disable-line no-console
      }
    });
  },

  _processResponse(moduleId, responseBody) {
    const response = JSON.parse(responseBody);
    const payload = {

      // eslint-disable-next-line object-shorthand -- Property shorthand may not be supported in older Node versions.
      moduleId: moduleId,
      data: response
    };
    this.sendSocketNotification('MMM-ANYCUBIC.VALUE_RECEIVED', payload);
  }
});
