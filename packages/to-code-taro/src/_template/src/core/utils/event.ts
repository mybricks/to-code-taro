type EventName = 'rootScroll' | string;

export class EventEmitter {

  private eventsCache = {};

  constructor() {
    
  }

  addEventListner = (evtName: EventName, listner) => {
  	if (!this.eventsCache[evtName]) {
			this.eventsCache[evtName] = new Set([listner])
  		return;
  	}
		this.eventsCache[evtName].add(listner)
  }

  removeEventListner = (evtName: EventName, listner) => {
  	if (this.eventsCache[evtName]) {
  		this.eventsCache[evtName].delete(listner);
  	}
  }

  dispatch = (evtName: EventName, detail) => {
  	if (!this.eventsCache[evtName]) {
  		// console.warn(`no listner on this ${evtName}`);
  		return;
  	}

  	let hasPreventDefault = false;

  	(this.eventsCache[evtName] ?? []).forEach(listner => listner(detail));

  	return hasPreventDefault;
  }
}