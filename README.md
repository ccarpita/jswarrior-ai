# WarriorAI

This is a work in progress.  The goal is to develop a general AI to beat the The Javascript Warrior.

See: http://jswarrior.fusioncharts.com/

# Game Instructions

The game is played in turns. At every turn, the jsWarrior.turn is executed to determine what action the warrior will take. It's your responsibility to define the behavior using this function.

## Actions

An action is something that the warrior can do. You can perform one action per turn

### warrior.walk()

Walks in the direction the warrior is currently facing. Use warrior.walk('backward') to walk backward.

### warrior.attack()

Attack one step in the direction that you're facing. An attack deals 5 points of damage.

### warrior.rest()

Rest for the turn and gain 2 points of health.

### warrior.pivot()

Turn around and face the other direction.

### warrior.collect()

Collect a diamond if it's there one step in the direction that you're facing.


## Checking your surroundings

You can check to see what lies in your immediate surroundings. Simply call warrior.check() to see what's in the next step, in the direction you're facing, and warrior.check('backward') to see what's behind you. The function returns a string, and the possible values are:

### empty

Nothing in the next cell

### enemy

An enemy in the next cell

### diamond

A gem that you can collect.

### wall

A wall of the room

## Enemies

### Crab

A small animal with a meelee attack.

### Troll

A much stronger enemy with a more powerful meelee attack

### JavaLiner

A frustrated developer who hates jsWarrior. Throws JavaLins at you from a distance. Has a limited range.
