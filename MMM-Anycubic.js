/* global Module, Log, moment, config */

/* Magic Mirror Module: MMM-Anycubic (https://github.com/balassy/MMM-Anycubic)
 * By György Balássy (https://www.linkedin.com/in/balassy)
 * MIT Licensed.  */

Module.register('MMM-Anycubic', {
  defaults: {
    authToken: 'TODO_TOKEN',
    updateInterval: 5000
  },

  requiresVersion: '2.1.0',

  getScripts() {
    return [
      'moment.js',
      'moment-timezone.js'
    ];
  },

  getStyles() {
    return [
      'MMM-Anycubic.css',
      'font-awesome.css'
    ];
  },

  getTranslations() {
    return {
      en: 'translations/en.json',
      hu: 'translations/hu.json'
    };
  },

  start() {
    const self = this;
    self.viewModel = null;
    self.hasData = false;

    moment.locale(config.language);

    const payload = {
      moduleId: self.identifier,
      config: self.config
    };

    self.sendSocketNotification('MMM-ANYCUBIC.INIT', payload);
  },

  getDom() {
    const wrapper = document.createElement('div');

    if (this.viewModel) {
      const leftColumnEl = document.createElement('div');
      leftColumnEl.classList = 'left-column';
      wrapper.appendChild(leftColumnEl);

      const photoEl = document.createElement('img');
      photoEl.src = this.viewModel.imageUrl;
      photoEl.classList = 'photo';
      leftColumnEl.appendChild(photoEl);


      const rightColumnEl = document.createElement('div');
      rightColumnEl.classList = 'right-column';
      wrapper.appendChild(rightColumnEl); 

      const printerNameEl = document.createElement('div');
      printerNameEl.innerHTML = this.viewModel.name;
      rightColumnEl.appendChild(printerNameEl);

      const printerStatusEl = document.createElement('div');
      printerStatusEl.innerHTML = this.viewModel.statusName;
      printerStatusEl.classList = 'bright small';
      rightColumnEl.appendChild(printerStatusEl);

      const tempsEl = document.createElement('div');
      tempsEl.classList = 'small';
      rightColumnEl.appendChild(tempsEl);

      const hotbedSymbolEl = document.createElement('span');
      hotbedSymbolEl.classList = 'symbol xsmall fa fa-square-o';
      tempsEl.appendChild(hotbedSymbolEl);

      const hotbedTempEl = document.createElement('span');
      hotbedTempEl.innerHTML = `${this.viewModel.hotbedTemp} °C`;
      hotbedTempEl.classList = 'temp';
      tempsEl.appendChild(hotbedTempEl);

      const nozzleSymbolEl = document.createElement('span');
      nozzleSymbolEl.classList = 'symbol fa fa-caret-down';
      tempsEl.appendChild(nozzleSymbolEl);

      const nozzleTempEl = document.createElement('span');
      nozzleTempEl.innerHTML = `${this.viewModel.nozzleTemp} °C`;
      tempsEl.appendChild(nozzleTempEl);
    } else {
      const loadingEl = this._getDomForLoading();
      wrapper.appendChild(loadingEl);
    }

    return wrapper;
  },

  _getDomForLoading() {
    const loadingEl = document.createElement('div');
    loadingEl.innerHTML = this.translate('LOADING');
    loadingEl.classList = 'dimmed small';
    return loadingEl;
  },

  socketNotificationReceived(notificationName, payload) {
    if (notificationName === 'MMM-ANYCUBIC.STARTED') {
      this.updateDom();
    } else if (notificationName === 'MMM-ANYCUBIC.VALUE_RECEIVED' && payload.moduleId === this.identifier) {
      this.hasData = true;
      this._processResponseJson(payload.data);
      this.updateDom();
    }
  },

  _processResponseJson(response) {
    console.log(response);
    this.viewModel = {
      name: response.name,
      imageUrl: response.img,
      statusCode: response.device_status,
      statusName: this._capitalizeFirstLetter(response.reason),
      hotbedTemp: response.parameter.curr_hotbed_temp,
      nozzleTemp: response.parameter.curr_nozzle_temp,
    };

    if (!this.hasData) {
      this.updateDom();
    }

    this.hasData = true;
  },

  _capitalizeFirstLetter(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }  
});
