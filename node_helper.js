const crypto = require('crypto');
const request = require('request'); // eslint-disable-line import/no-extraneous-dependencies
const uuidv1 = require('uuid').v1;
const NodeHelper = require('node_helper'); // eslint-disable-line import/no-unresolved

// Source: https://github.com/WaresWichall/hass-anycubic_cloud/blob/master/custom_components/anycubic_cloud/anycubic_cloud_api/const/const.py#L27
const APP_ID = 'f9b3528877c94d5c9c5af32245db46ef';
const APP_SECRET = '0cf75926606049a3937f56b0373b99fb';
const APP_VERSION = '1.0.0';

// Source: https://github.com/WaresWichall/hass-anycubic_cloud/blob/master/custom_components/anycubic_cloud/anycubic_cloud_api/const/api_endpoints.py#L6
const API_BASE_URL = 'https://cloud-universe.anycubic.com/p/p/workbench/api/';
const API_URLS = {
  GET_PRINTERS: 'work/printer/getPrinters',
  GET_PROJECTS: '/work/project/getProjects',
  GET_USER_INFO: 'user/profile/userInfo'
};

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
      self._sendRequests(moduleId, config);
    }, 0);

    setInterval(() => {
      self._sendRequests(moduleId, config);
    }, config.updateInterval);
  },

  _sendRequests(moduleId, config) {
    this._getData(API_URLS.GET_PRINTERS, moduleId, config, 'MMM-ANYCUBIC.PRINTER_VALUE_RECEIVED');
    this._getData(`${API_URLS.GET_PROJECTS}?limit=1`, moduleId, config, 'MMM-ANYCUBIC.PROJECT_VALUE_RECEIVED');
  },

  _getData(url, moduleId, config, notificationName) {
    const self = this;

    const options = {
      url: API_BASE_URL + url,
      headers: self._buildRequestHeaders(config),
      method: 'GET'
    };

    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        self._processResponse(moduleId, body, notificationName);
      } else {
        console.error(`MMM-Anycubic Node helper: Failed to load data in the background. Error: ${error}. Status code: ${response.statusCode}. Body: ${body}`); // eslint-disable-line no-console
      }
    });
  },

  _processResponse(moduleId, responseBody, notificationName) {
    const response = JSON.parse(responseBody);
    const payload = {

      // eslint-disable-next-line object-shorthand -- Property shorthand may not be supported in older Node versions.
      moduleId: moduleId,
      data: response.data[0]
    };
    this.sendSocketNotification(notificationName, payload);
  },

  // Source: https://github.com/WaresWichall/hass-anycubic_cloud/blob/master/custom_components/anycubic_cloud/anycubic_cloud_api/models/auth.py#L257
  _buildRequestHeaders(config) {
    const nonce = uuidv1();
    const timestamp = Date.now().toString();

    return {
      'Xx-Device-Type': 'web',
      'Xx-Is-Cn': '1',
      'Xx-Nonce': nonce,
      'Xx-Token': config.authToken,
      'Xx-Signature': this._generateSignature(timestamp, nonce),
      'Xx-Timestamp': timestamp,
      'Xx-Version': '1.0.0',
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  },

  _generateSignature(timestamp, nonce) {
    const input = `${APP_ID}${timestamp}${APP_VERSION}${APP_SECRET}${nonce}${APP_ID}`;
    const signature = this._stringToUtf8Md5(input);
    return signature;
  },

  _stringToUtf8Md5(str) {
    const utf8Buffer = Buffer.from(str, 'utf8');
    const hash = crypto.createHash('md5').update(utf8Buffer).digest('hex');
    return hash;
  },

  // Format a timestamp to local time `YYYY-MM-DD HH:mm`.
  // Accepts seconds or milliseconds.
  _formatTimestampLocal(ts) {
    const millis = ts > 1e12 ? ts : ts * 1000;
    const d = new Date(millis);
    const pad = (n) => String(n).padStart(2, '0');
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    return `${Y}-${M}-${D} ${h}:${m}`;
  }
});
