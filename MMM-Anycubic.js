/* global Module, Log, moment, config */

/* Magic Mirror Module: MMM-Anycubic (https://github.com/balassy/MMM-Anycubic)
 * By György Balássy (https://www.linkedin.com/in/balassy)
 * MIT Licensed.  */

// Source: https://github.com/WaresWichall/hass-anycubic_cloud/blob/master/custom_components/anycubic_cloud/anycubic_cloud_api/const/enums.py#L10
const PROJECT_PRINT_STATUS = {
  Printing: 1,
  Complete: 2,
  Cancelled: 3,
  Downloading: 4,
  Checking: 5,
  Heating: 6,
  Slicing: 7,
  AutoLeveling: 9
};

const PRINTER_DEVICE_STATUS = {
  Free: 1,
  Offline: 2
};

const PRINTER_STATUS_NAME = {
  Free: 'Free',
  Busy: 'Busy',
  Offline: 'Offline'
};

Module.register('MMM-Anycubic', {
  defaults: {
    authToken: 'TODO_TOKEN',
    updateInterval: 5000,
    useColors: true
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
      this._writeDomForPrinterRow(wrapper);

      if (this.viewModel.printer.isOnline) {
        this._writeDomForProjectRow(wrapper);
      }

      this._writeDomForTimestampRow(wrapper);
    } else {
      this._writeDomForLoading(wrapper);
    }

    return wrapper;
  },

  _writeDomForLoading(wrapper) {
    const loadingEl = document.createElement('div');
    loadingEl.innerHTML = this.translate('LOADING');
    loadingEl.classList = 'dimmed small';
    wrapper.appendChild(loadingEl);
  },

  _writeDomForPrinterRow(wrapper) {
    const printerRowEl = document.createElement('div');
    wrapper.appendChild(printerRowEl);

    const printerRowLeftColumnEl = document.createElement('div');
    printerRowLeftColumnEl.classList = 'left-column';
    printerRowEl.appendChild(printerRowLeftColumnEl);

    const photoEl = document.createElement('img');
    photoEl.src = this.viewModel.printer.imageUrl;
    photoEl.classList = 'photo printer-photo';
    printerRowLeftColumnEl.appendChild(photoEl);

    const printerRowRightColumnEl = document.createElement('div');
    printerRowRightColumnEl.classList = 'right-column';
    printerRowEl.appendChild(printerRowRightColumnEl);

    const printerNameEl = document.createElement('div');
    printerNameEl.innerHTML = this.viewModel.printer.name;
    printerNameEl.classList = 'small';
    printerRowRightColumnEl.appendChild(printerNameEl);

    const printerStatusEl = document.createElement('div');
    printerStatusEl.innerHTML = this.viewModel.printer.statusName;
    printerStatusEl.classList = 'bright small light';
    if (this.config.useColors) {
      const statusColor = this._getColorForPrinterStatusName(this.viewModel.printer.statusName);
      if (statusColor) {
        printerStatusEl.style.color = statusColor;
      }
    }
    printerRowRightColumnEl.appendChild(printerStatusEl);

    // Show temps only if the printer is online.
    if (this.viewModel.printer.isOnline) {
      const tempsEl = document.createElement('div');
      tempsEl.classList = 'small dimmed';
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
    }
  },

  _writeDomForProjectRow(wrapper) {
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
    projectNameEl.classList = 'small light';
    projectRowRightColumnEl.appendChild(projectNameEl);

    const projectStatusEl = document.createElement('div');
    projectStatusEl.innerHTML = this.viewModel.project.printStatusName;
    projectStatusEl.classList = 'bright small light';
    if (this.config.useColors) {
      const statusColor = this._getColorForProjectStatus(this.viewModel.project.printStatusCode);
      if (statusColor) {
        projectStatusEl.style.color = statusColor;
      }
    }
    projectRowRightColumnEl.appendChild(projectStatusEl);

    // Show progress only if it is available.
    if (this.viewModel.project.hasProgress) {
      const projectProgressEl = document.createElement('div');
      projectProgressEl.classList = 'small dimmed';
      projectRowRightColumnEl.appendChild(projectProgressEl);

      const clockSymbolEl = document.createElement('span');
      clockSymbolEl.classList = 'symbol xsmall fa fa-clock-o';
      projectProgressEl.appendChild(clockSymbolEl);

      const projectRemainingTimeEl = document.createElement('span');
      projectRemainingTimeEl.innerHTML = `${this.viewModel.project.remainingTime} mins`;
      projectProgressEl.appendChild(projectRemainingTimeEl);

      const progressSymbolEl = document.createElement('span');
      progressSymbolEl.classList = 'symbol symbol-second xsmall fa fa-spinner';
      projectProgressEl.appendChild(progressSymbolEl);

      const projectProgressPercentEl = document.createElement('span');
      const layerInfo = this.viewModel.project.currentLayer && this.viewModel.project.totalLayers
        ? `(${this.viewModel.project.currentLayer}/${this.viewModel.project.totalLayers})`
        : '';
      projectProgressPercentEl.innerHTML = `${this.viewModel.project.progress}% ${layerInfo}`;
      projectProgressEl.appendChild(projectProgressPercentEl);
    }
  },

  _writeDomForTimestampRow(wrapper) {
    const timestampRowEl = document.createElement('div');
    timestampRowEl.classList = 'timestamp-row dimmed xsmall';
    wrapper.appendChild(timestampRowEl);

    const timestampRowLeftColumnEl = document.createElement('div');
    timestampRowLeftColumnEl.classList = 'left-column';
    timestampRowEl.appendChild(timestampRowLeftColumnEl);

    const timestampRowRightColumnEl = document.createElement('div');
    timestampRowRightColumnEl.classList = 'right-column';
    timestampRowEl.appendChild(timestampRowRightColumnEl);

    const timestampIconEl = document.createElement('span');
    timestampIconEl.classList = 'symbol fa fa-refresh';
    timestampRowRightColumnEl.appendChild(timestampIconEl);

    const timestampEl = document.createTextNode(this.viewModel.timestamp);
    timestampRowRightColumnEl.appendChild(timestampEl);
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
        nozzleTemp: response.parameter.curr_nozzle_temp,
        isOnline: response.device_status !== PRINTER_DEVICE_STATUS.Offline
      };
    }

    if (notificationName === 'MMM-ANYCUBIC.PROJECT_VALUE_RECEIVED') {
      const settings = this._getLayerInfoFromSettings(response.settings);
      this.viewModel.project = {
        name: response.gcode_name,
        printStatusCode: response.print_status,
        printStatusName: this._getProjectPrintStatusName(response.print_status),
        remainingTime: response.remain_time,
        progress: response.progress,
        imageUrl: response.img,
        currentLayer: settings.currentLayer,
        totalLayers: settings.totalLayers,
        hasProgress: response.print_status === PROJECT_PRINT_STATUS.Printing || response.print_status === PROJECT_PRINT_STATUS.Heating
      };
    }

    this.viewModel.timestamp = this._formatTimestamp(Date.now());

    if (!this.hasData) {
      this.updateDom();
    }

    this.hasData = true;
  },

  _capitalizeFirstLetter(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  _getProjectPrintStatusName(value) {
    return Object.keys(PROJECT_PRINT_STATUS).find((k) => PROJECT_PRINT_STATUS[k] === value);
  },

  _formatTimestamp(timestamp) {
    return moment(timestamp).format('HH:mm');
  },

  _getColorForPrinterStatusName(statusName) {
    switch (statusName) {
      case PRINTER_STATUS_NAME.Free:
        return '#5cbc82'; // green-ish
      case PRINTER_STATUS_NAME.Busy:
        return '#ffcf42'; // yellow-ish
      case PRINTER_STATUS_NAME.Offline:
      default:
        return null;
    }
  },

  _getColorForProjectStatus(statusCode) {
    switch (statusCode) {
      case PROJECT_PRINT_STATUS.Printing:
      case PROJECT_PRINT_STATUS.Downloading:
      case PROJECT_PRINT_STATUS.Checking:
      case PROJECT_PRINT_STATUS.Heating:
      case PROJECT_PRINT_STATUS.Slicing:
      case PROJECT_PRINT_STATUS.AutoLeveling:
        return '#ffcf42'; // yellow-ish
      case PROJECT_PRINT_STATUS.Complete:
        return '#5cbc82'; // green-ish
      case PROJECT_PRINT_STATUS.Cancelled:
        return '#d35400'; // red-ish
      default:
        return null;
    }
  },

  _getLayerInfoFromSettings(settingsStr) {
    if (!settingsStr) {
      return {};
    }

    try {
      const settingsJson = JSON.parse(settingsStr);
      return {
        currentLayer: settingsJson.curr_layer,
        totalLayers: settingsJson.total_layers
      };
    } catch {
      Log.error(this.name, 'MMM-Anycubic: Failed to parse settings JSON string:', settingsStr);
      return {};
    }
  }
});
