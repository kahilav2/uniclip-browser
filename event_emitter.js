class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  emit(eventName, ...args) {
    const listeners = this.events[eventName];
    if (Array.isArray(listeners)) {
      listeners.forEach(listener => listener(...args));
    }
  }

  once(eventName, listener) {
    const onceWrapper = (...args) => {
      this.removeListener(eventName, onceWrapper);
      listener(...args);
    };
    this.on(eventName, onceWrapper);
  }

  removeListener(eventName, listenerToRemove) {
    const listeners = this.events[eventName];
    if (Array.isArray(listeners)) {
      this.events[eventName] = listeners.filter(listener => listener !== listenerToRemove);
    }
  }

  removeAllListeners(eventName) {
    delete this.events[eventName];
  }
}

export default EventEmitter