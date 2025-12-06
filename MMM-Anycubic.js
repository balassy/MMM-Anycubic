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
      // TODO
      const el = document.createElement('div');
      el.innerHTML = this.viewModel.name;
      wrapper.appendChild(el);
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
    this.viewModel = {
      name: response[0].employee.name
    };

    if (!this.hasData) {
      this.updateDom();
    }

    this.hasData = true;
  }
});
