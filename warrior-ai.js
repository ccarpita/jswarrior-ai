
/**
 * A collection of predicate methods, which will be bound
 * to the WarriorAI instance.  Predicates determine whether
 * a particular behavior is valid given the situation.
 *
 * @object
 */
var WarriorPredicate = {
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
 * A collection of behaviors with predicates, actions, and priorities.
 * Priority is sorted in descending order when determining the behavior.
 * Predicate elements in the array are joined logically by OR, and the string format
 * (a predicate-set) is comma-separated and the expressions within the
 * predicate-set are joined by AND.
 * expression = (!|NOT)(PREDICATENAME(:ARGUMENT(:ARGUMENT2|More Arguments)))
 * predicate-set = expression,expression,...
 */
var WarriorBehavior = {
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
}

/**
 * A wrapper class for the warrior object which maintains state
 * which will be used to make decisions.
 */
var WarriorAI = function(warrior) {
  this.warrior = warrior;
  this.position = 0;
  this.facing = 'forward';
  this.map = {};
  this.map[this.position] = 'empty';
  this.actions = [];
  this.defaultAction = 'rest';
  this.endHealth = this.warrior.getHealth();
};

WarriorAI.prototype.can = function(behavior) {
  var spec = WarriorBehavior[behavior];
  var can = true;
  if (spec.predicate) {
    can = false;
    // todo: eval predicates
  }
};

WarriorAI.prototype.getAction = function() {
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
};

WarriorAI.prototype.initTurn = function() {
  this.nextPosition = this.facing === 'forward' ? (this.position + 1) : (this.position - 1);
  this.prevPosition = this.facing === 'forward' ? (this.position - 1) : (this.position + 1);
};

WarriorAI.prototype.pivot = function() {
  this.facing = this.facing === 'forward' ? 'backward' : 'forward';
  this.warrior.pivot();
};

WarriorAI.prototype.walk = function(dir) {
  this.warrior.walk(dir);
  this.position += ((dir == 'backward' ? -1 : 1) * (this.facing === 'forward' ? 1 : -1));
};

WarriorAI.prototype.retreat = function() {
  this.walk('backward');
};

WarriorAI.prototype.turn = function() {
  this.initTurn();
  if (!this.map[this.nextPosition]) {
    this.map[this.nextPosition] = this.warrior.check();
  }
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
};

jsWarrior.turn = function(warrior) {
  if (!this.wai) {
    this.wai= new WarriorAI(warrior);
  }
  this.wai.turn();
};
