# "Mere" - library for JavaScript

Library that allows to bind functions to the string-formed tasks (JavaScript's Strings) and then execute functions through their related tasks.
Together with this, a collection of associated tools is attached. 

### Installation

```
npm i mere --save
```

### Usage

In our context tasks are mappings { string : function } or their derivatives.
The world "derivative" means all task combinations that can be achived through using such methods as  
    "task".task  
    "task".with(...)  
    "task".then(...)  
    [task1, task2, ...]  

##### Require Mere library

```javascript
require("mere");
```

##### Bind a function

```javascript
"task name".bind((arg1, arg2, ...) => {
	/* some logic */
});

"task name".bind(task); /* bind from another task  */
```

Also `.bind()` returns a string that was binded to the function.

##### Execute a task

```javascript
const res = "task name".make(arg1, arg2, ...); /* may throw Errors! */
```

##### Return a task wrapped in promise

```javascript
const promise = "task name".promise(arg1, arg2, ...); /* errors will call the promise's reject branch! */
```

##### Return a task with inlined first n arguments

```javascript
const newTask = "task name".with(arg1, arg2, ..., argn); /* return a task with last input arguments starts from n+1 */
```

##### Return a task that will call another task after (put the first result as the first argument of the second one, if result !== undefined)

```javascript
const newTask = "first task name".then("second task name", arg1_or_2, arg2_or_3, ...); /* return a chained task with no input arguments for the first one */
```

i.e `newTask` takes arguments for the first task and after takes the result (if exist) and args in `.then()` for the second task.

##### Put one task as the argument for another one

```javascript
const res = "task with one arg".make("second task name".task); /* if second task has no arguments */

const res = "task with one arg".make("second task name".with(arg1, arg2, ...)); /* otherwise */
```

##### Try interesting combinations

```javascript
const promise = "first task name".then("second task name", secondArgs...).with(firstArgs...).promise(lastargs...);
```

That one is stupid, but You will do it better!

##### Task arrays also want to be in the topic!

```javascript
["task name 1", "task name 2", "task name 3"].make();
["task name 1", "task name 2", "task name 3"].promise();

/* as fact, it works the same as the next code: */
"task name 1".then("task name 2").then("task name 3").make();
"task name 1".then("task name 2").then("task name 3").promise();

/* task arrays as arguments */
"first task name".make(["second task name", "third task name"].task);

/* and even task arrays in task arrays! */
["task name 1", ["task name 2"], "task name 3"].make();
```

##### Wrap task array into a generator

```javascript
/* each next(args) executes a task and returns a value */
["task name 1", "task name 2", "task name 3"].generate(); /* equally: generate(false) */

/* each next(args) executes a task with the first argument from the previous result
 * and put given args starting from the second formal argument; returns a value.
 * If previous result === undefined, the first argument will not be put this way. */ 
["task name 1", "task name 2", "task name 3"].generate(true);

/* works the same as */
"task name 1".then("task name 2", args2).then("task name 3", args3).make(args1);
/* and */
["task name 1".with(args1), "task name 2".with(args2), "task name 3".make(args3)].make();
```

##### Memoization

```javascript
task.memoize();
```

Application will save the result for each argument combination. Note that responsibility of task memoization is laid on user.
Excess arguments are removed when checking memoization data, as well as missing arguments are put undefined.

##### Additional options

```javascript
const mere = require("mere");

console.log(mere.getArgCheck()); /* return 1 === mere.NOT_MORE */

/* if argument number must equal with the formal argument number (or an Error occured) */
mere.setArgCheck(mere.MUST_EQUAL);

/* if argument number must not be more than the formal argument number (or an Error occured) */
mere.setArgCheck(mere.NOT_MORE); /* the default setting */

/* if argument number must not be less than the formal argument number (or an Error occured) */
mere.setArgCheck(mere.NOT_LESS);

/* if We don't want to think about argument number mismatch */
mere.setArgCheck(mere.NO_CHECK);
```

### Examples

##### Hello-world

```javascript
require("mere");

"say hello-world".bind(() => {
	console.log("Hello, world!");
});

"say hello-world".make();
```

##### Sum two numbers

```javascript
require("mere");

"sum".bind((num1, num2) => num1 + num2);

console.log("sum".make(2, 3));

"sum".promise(2, 3).then(
	(res) => {
    	console.log(res);
    },
    (error) => {
		console.log("That is impossible!");
    });
```

##### Fibonacci with memoization

```javascript
require("mere");

"fib".bind((k) => {
	if (k <= 2)
		return 1;
	
	return "fib".make(k - 1) + "fib".make(k - 2);
});

"fib".memoize();

console.log("fib".make(50));
```

##### Sum and call

```javascript
require("mere");

"sum"  .bind((num1, num2) => num1 + num2);
"print".bind((msg) => {
	console.log(msg);
});

"sum".then("print").make(2, 2);
```

##### Number doubler

```javascript
require("mere");

"mult"  .bind((num1, num2) => num1 * num2);
"double".bind("mult".with(2));

console.log("double".make(2));
```

##### Faggot thrower

```javascript
require("mere");

"print".bind((msg) => {
	console.log(msg);
});

"who I am".bind(() => "you are a faggot");

"print".make("who I am".task);
/* or what is equally (almost: first one will execute the task later in some cases): */
"print".make("who I am".make());
/* or even this way */
"who I am".then("print").make();
```

##### Some arithmetic

```javascript
require("mere");

"sum" .bind((num1, num2) => num1 + num2);
"mult".bind((num1, num2) => num1 * num2);

console.log(["sum", "mult".with(2)].make(2, 2)); /* I hope You know that is eight */
```

##### Sum generators

```javascript
require("mere");

"sum".bind((num1, num2) => num1 + num2);

let gen = ["sum", "sum"].generate(); /* is equal to generate(false) */

console.log(gen.next([2, 3]).value);   /* 5 */
console.log(gen.next([20, 30]).value); /* 50 */

gen = ["sum", "sum"].generate(true);

console.log(gen.next([2, 3]).value); /* 5 */
console.log(gen.next(20).value);   /* 25 */
```

##### Don't do this things

```javascript
require("mere");

"lol".bind(() => "lol".make());
"lol".task.task.with().with().task.task;
[[], [].task, [].with()].make();

```

Because of its inanity.

### Future releases

- memorization control methods.