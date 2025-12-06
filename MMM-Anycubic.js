/* global Module, moment, config */

/* Magic Mirror Module: MMM-Anycubic (https://github.com/balassy/MMM-Anycubic)
 * By György Balássy (https://www.linkedin.com/in/balassy)
 * MIT Licensed.  */

// Source: https://github.com/WaresWichall/hass-anycubic_cloud/blob/master/custom_components/anycubic_cloud/anycubic_cloud_api/const/enums.py#L10
const PRINT_STATUS = {
  Printing: 1,
  Complete: 2,
  Cancelled: 3,
  Downloading: 4,
  Checking: 5,
  Preheating: 6,
  Slicing: 7
};

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
    self.viewModel = {
      printer: {},
      project: {}
    };
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

    if (this.viewModel.printer.name && this.viewModel.project.name) {
      // Printer row.
      const printerRowEl = document.createElement('div');
      wrapper.appendChild(printerRowEl);

      const printerRowLeftColumnEl = document.createElement('div');
      printerRowLeftColumnEl.classList = 'left-column';
      printerRowEl.appendChild(printerRowLeftColumnEl);

      const photoEl = document.createElement('img');
      photoEl.src = this.viewModel.printer.imageUrl;
      photoEl.classList = 'photo';
      printerRowLeftColumnEl.appendChild(photoEl);

      const printerRowRightColumnEl = document.createElement('div');
      printerRowRightColumnEl.classList = 'right-column';
      printerRowEl.appendChild(printerRowRightColumnEl);

      const printerNameEl = document.createElement('div');
      printerNameEl.innerHTML = this.viewModel.printer.name;
      printerRowRightColumnEl.appendChild(printerNameEl);

      const printerStatusEl = document.createElement('div');
      printerStatusEl.innerHTML = this.viewModel.printer.statusName;
      printerStatusEl.classList = 'bright small';
      printerRowRightColumnEl.appendChild(printerStatusEl);

      const tempsEl = document.createElement('div');
      tempsEl.classList = 'small';
      printerRowRightColumnEl.appendChild(tempsEl);

      const hotbedSymbolEl = document.createElement('span');
      hotbedSymbolEl.classList = 'symbol xsmall fa fa-object-group';
      tempsEl.appendChild(hotbedSymbolEl);

      const hotbedTempEl = document.createElement('span');
      hotbedTempEl.innerHTML = `${this.viewModel.printer.hotbedTemp} °C`;
      tempsEl.appendChild(hotbedTempEl);

      const nozzleSymbolEl = document.createElement('span');
      nozzleSymbolEl.classList = 'symbol symbol-second xsmall fa fa-get-pocket';
      tempsEl.appendChild(nozzleSymbolEl);

      const nozzleTempEl = document.createElement('span');
      nozzleTempEl.innerHTML = `${this.viewModel.printer.nozzleTemp} °C`;
      tempsEl.appendChild(nozzleTempEl);

      // Project row.
      const projectRowEl = document.createElement('div');
      projectRowEl.classList = 'project-row';
      wrapper.appendChild(projectRowEl);

      const projectRowLeftColumnEl = document.createElement('div');
      projectRowLeftColumnEl.classList = 'left-column';
      projectRowEl.appendChild(projectRowLeftColumnEl);

      const projectPhotoEl = document.createElement('img');
      projectPhotoEl.src = this.viewModel.project.imageUrl;
      projectPhotoEl.classList = 'photo';
      projectRowLeftColumnEl.appendChild(projectPhotoEl);

      const projectRowRightColumnEl = document.createElement('div');
      projectRowRightColumnEl.classList = 'right-column';
      projectRowEl.appendChild(projectRowRightColumnEl);

      const projectNameEl = document.createElement('div');
      projectNameEl.innerHTML = this.viewModel.project.name;
      projectNameEl.classList = 'medium light';
      projectRowRightColumnEl.appendChild(projectNameEl);

      const projectStatusEl = document.createElement('div');
      projectStatusEl.innerHTML = this.viewModel.project.printStatusName;
      projectStatusEl.classList = 'bright small';
      projectRowRightColumnEl.appendChild(projectStatusEl);

      const projectProgressEl = document.createElement('div');
      projectProgressEl.classList = 'small';
      projectRowRightColumnEl.appendChild(projectProgressEl);

      const clockSymbolEl = document.createElement('span');
      clockSymbolEl.classList = 'symbol xsmall fa fa-clock-o';
      projectProgressEl.appendChild(clockSymbolEl);

      const projectRemainingTimeEl = document.createElement('span');
      projectRemainingTimeEl.innerHTML = `${this.viewModel.project.remainingTime} minutes`;
      projectProgressEl.appendChild(projectRemainingTimeEl);

      const progressSymbolEl = document.createElement('span');
      progressSymbolEl.classList = 'symbol symbol-second xsmall fa fa-spinner';
      projectProgressEl.appendChild(progressSymbolEl);

      const projectProgressPercentEl = document.createElement('span');
      projectProgressPercentEl.innerHTML = `${this.viewModel.project.progress}%`;
      projectProgressEl.appendChild(projectProgressPercentEl);
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
    } else if ((notificationName === 'MMM-ANYCUBIC.PRINTER_VALUE_RECEIVED' || notificationName === 'MMM-ANYCUBIC.PROJECT_VALUE_RECEIVED') && payload.moduleId === this.identifier) {
      this.hasData = true;
      this._processResponseJson(payload.data, notificationName);
      this.updateDom();
    }
  },

  _processResponseJson(response, notificationName) {
    if (notificationName === 'MMM-ANYCUBIC.PRINTER_VALUE_RECEIVED') {
      this.viewModel.printer = {
        name: response.name,
        imageUrl: response.img,
        statusCode: response.device_status,
        statusName: this._capitalizeFirstLetter(response.reason),
        hotbedTemp: response.parameter.curr_hotbed_temp,
        nozzleTemp: response.parameter.curr_nozzle_temp
      };
    }

    if (notificationName === 'MMM-ANYCUBIC.PROJECT_VALUE_RECEIVED') {
      this.viewModel.project = {
        name: response.gcode_name,
        printStatusName: this._getPrintStatusName(response.print_status),
        remainingTime: response.remain_time,
        progress: response.progress,
        imageUrl: response.img
      };
    }

    if (!this.hasData) {
      this.updateDom();
    }

    this.hasData = true;
  },

  _capitalizeFirstLetter(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  _getPrintStatusName(value) {
    return Object.keys(PRINT_STATUS).find((k) => PRINT_STATUS[k] === value);
  }
});
