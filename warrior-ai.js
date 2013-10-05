/**
 * Fishbone.js v1.0.1
 * http://raw.github.com/aemkei/fishbone.js/
 */
Model=function a(b,c,d,e){function f(){var a=this,f={};a.on=function(a,b){(f[a]||(f[a]=[])).push(b)},a.trigger=function(a,b){for(var c=f[a],d=0;c&&d<c.length;)c[d++](b)},a.off=function(a,b){for(d=f[a]||[];b&&(c=d.indexOf(b))>-1;)d.splice(c,1);f[a]=b?d:[]};for(c in b)d=b[c],a[c]=typeof d=="function"?function(){return(d=this.apply(a,arguments))===e?a:d}.bind(d):d;a.init&&a.init.apply(a,arguments)}return f.extend=function(f){d={};for(c in b)d[c]=b[c];for(c in f)d[c]=f[c],b[c]!==e&&(d["__"+c]=b[c]);return a(d)},f},typeof module=="object"&&(module.exports=Model);

jsWarrior = typeof jsWarrior === 'undefined' ? {} : jsWarrior;

/**
 * Namespace for Warrior AI.
 * @type {Object}
 **/
var WAI = {};


/**
 * A collection of behaviors with predicates, actions, and priorities.
 * Priority is sorted in descending order when determining the behavior.
 * Predicate elements in the array are joined logically by OR, and the string format
 * (a predicate-set) is comma-separated and the expressions within the
 * predicate-set are joined by AND.
 * expression = (!|NOT)(PREDICATENAME(:ARGUMENT(:ARGUMENT2|More Arguments)))
 * predicate-set = expression,expression,...
 *
 * @type {Object}
 */
WAI.Behavior = {
  explore: {
    action: 'walk',
    priority: 0,
    predicate: [
      '!underAttack,!foundWall'
    ]
  },
  exploreBehind: {
    action: 'pivot',
    priority: 2,
    predicate: [
      '!underAttack,unmapped:-1'
    ]
  },
  attack: {
    action: 'attack',
    priority: 5,
    predicate: [
      'map:1:enemy'
    ]
  },
  charge: {
    action: 'walk',
    priority: 6,
    predicate: [
      'map:2:enemy,healthAbove:14',
      'map:3:enemy,healthAbove:16'
    ]
  },
  retreat: {
    action: 'retreat',
    priority: 10,
    predicate: [
      'underAttack,healthUnder:8',
      'lastActionsUnder:retreat:3'
    ]
  },
  rest: {
    action: 'rest',
    priority: 20,
    predicate: [
      '!underAttack,healthUnder:20'
    ]
  }
};

/**
 * A an Exception class for errors in Warrior AI config or execution.
 * @class
 */
WAI.Exception = function(module, message) {
  this.name = 'WAIException';
  this.message = '[' + module + '] ' + message;
};

/**
 * A collection of predicate methods, which will be bound
 * to the WarriorAI instance.  Predicates determine whether
 * a particular behavior is valid given the situation.
 *
 * @type object
 */
WAI.Predicate = {
  underAttack: function() {
    return this.warrior.getHealth() < this.endHealth
  },
  unmapped: function(pos) {
    return this.map[pos] === undefined;
  },
  map: function(pos, value) {
    return this.map[pos] === value;
  },
  lastActionsUnder: function(action, num) {
    var idx = this.actions.length - 1;
    var rcount = 0;
    while (idx > 0 && this.actions[idx] === action) {
      rcount++;
      idx--;
    }
    return rcount < num;
  },
  healthUnder: function(num) {
    return this.warrior.getHealth() < num;
  },
  healthAbove: function(num) {
    return this.warrior.getHealth() > num;
  },
  // have we found the wall in the direction we're facing?
  foundWall: function() {
    if (!this.foundWallFacing) {
      this.foundWallFacing = {};
    }
    if (this.foundWallFacing[this.facing]) {
      return true;
    }
    var p;
    var inc = this.facing === 'forward' ? 1 : -1;
    var found = false;
    for (p = this.position; this.map[p]; p += inc) {
      if (this.map[p] === 'wall') {
        found = true;
        this.foundWallFacing[this.facing] = true;
        break;
      }
    }
    return found;
  }
};

/**
 * Parse a predicate expression string and returns a function that will
 * evaluate the predicate when given a WAI.Warrior instance as an argument.
 */
WAI.parsePredicate = function(expr) {
  WAI._parsedPredicate = WAI._parsedPredicate || {};
  if (!WAI._parsedPredicate[expr]) {
    var plist = [];
    var elist = expr.split(/,/);
    var ei, el, p, arg, fname;
    for (ei = 0, el = elist.length; ei < el; ei++) {
      arg = elist[ei].split(/:/);
      fname = arg.shift();
      p = {};
      if (fname.charAt(0) === '!') {
        p.neg = true;
        fname = fname.substr(1);
      }
      p.fn = WAI.Predicate[fname];
      if (!p.fn) {
        throw new WAI.Exception("WAI.parsePredicate", "Predicate not defined: " + fname);
      }
      p.args = args;
      plist.push(p);
    }

    WAI._parsedPredicate[expr] = function(waiWarrior) {
      var r, pass = true;
      for (var i = 0, l = plist.length; i < l; i++) {
        r = !!plist[i]['fn'].apply(waiWarrior, plist['args'])
        r = plist[i]['neg'] ? !r : r;
        if (!r) {
          pass = false;
          break;
        }
      }
      return pass;
    };
  }
  return WAI._parsedPredicate[expr];
};

/**
 * A wrapper class for the warrior object which maintains state
 * which will be used to make decisions.
 *
 * @class
 */
WAI.Warrior = Model({

  /**
   * Track the current position of the warrior relative to the initial position.
   * @type {Number}
   */
  position: 0,

  /**
   * Direction the warrior is facing.  1 for forward, -1 for backward.
   * @type {Number}
   */
  facing: 1,

  /**
   * Records the known cell values of explored positions.
   * @type {Object<Number:String>}
   */
  map: {0: 'empty'},

  /**
   * List of performed actions, e.g. history.
   * @type {Array<String>}
   */
  actions: [],

  /**
   * Default action for warrior if no action is determined by behavioral rules.
   * @type {String}
   */
  defaultAction: 'rest',

  /**
   * Initialize warrior state.
   * @param {Warrior} warrior The warrior object provided by the game.
   */
  init: function(warrior) {
    this.warrior = warrior;
    this.endHealth = this.warrior.getHealth();
  },

  /**
   * Execute a turn for the warrior by updating the position map and selecting
   * an action.
   */
  turn: function() {
    this.initTurn();

    var action = this.getAction();
    // Do we have a wrapper function for this action?
    if (typeof this[action] === 'function') {
      this[action]();
    }
    else {
      this.warrior[action]();
    }
    this.actions.push(action);
    this.endHealth = this.warrior.getHealth();
  },

  /**
   * Get an action by checking if warrior can execute each behavior, and choosing
   * the behavior with the highest priority.
   *
   * @return {String} Name of method to execute on the warrior, or the AI object if a wrapper is defined.
   */
  getAction: function() {
    var validBehaviors = [];
    for (var behavior in WarriorBehavior) {
      if (this.can(behavior)) {
        validBehaviors.push(behavior);
      }
    }
    validBehaviors.sort(function(a, b) {
      return a.priority > b.priority;
    });
    return validBehaviors.length > 0 ? validBehaviors[0].action : this.defaultAction;
  },

  /**
   * Determines if the warrior can execute a particular behavior by evaluating the behavior's predicate set.
   *
   * @return {Boolean} true if the warrior can perform the action, false otherwise.
   */
  can: function(behavior) {
    var spec = WarriorBehavior[behavior];
    var can = true;
    var pred;
    if (spec.predicate) {
      can = false;
      pred = WAI.parsePredicate(spec.predicate);
      if (pred(this)) {
        can = true;
      }
    }
    return can;
  },

  /**
   * Prepare Warrior AI state at the beginning of a turn.
   */
  initTurn: function() {
    this.nextPosition = this.position + this.facing;
    this.prevPosition = this.position - this.facing;
    if (!this.map[this.nextPosition]) {
      this.map[this.nextPosition] = this.warrior.check();
    }
  },

  /**
   * Wrapper for warrior pivot action to update facing state.
   */
  pivot: function() {
    this.facing = -1 * this.facing;
    this.warrior.pivot();
  },

  /**
   * Wrapper for warrior walk action to update position state.
   */
  walk: function(dir) {
    this.warrior.walk(dir);
    this.position += ((dir === 'backward' ? -1 : 1) * this.facing);
  },

  /**
   * Alias for walk('backward').
   */
  retreat: function() {
    this.walk('backward');
  }
});

/**
 * Update state and execute warrior action on a single turn.
 * @param {Warrior} warrior Warrior instance.
 */
jsWarrior.turn = function(warrior) {
  (this.wai = this.wai || new WAI.Warrior(warrior)).turn();
};
