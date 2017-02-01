/****************************
 * Launcher and the only module. Remakes String prototype and keeps all the generators.
 *
 * @author Evgeny Savelyev
 * @since 29.01.17
 ****************************/

"use strict";

/**
 * Map {string} task : {function} module.
 */
const taskModuleMap = {};

/**
 * Library configuration.
 */
const config = {
	lessArgAllowed : true,
	moreArgAllowed : false
};

const ARG_CHECK_ENUM = {
	NO_CHECK   : 0,
	NOT_MORE   : 1,
	NOT_LESS   : 2,
	MUST_EQUAL : 3
};

//** utility functions

const execFunc = (task, ...args) => {
	const
		trueArgs = [],
		argLimit = Math.min(args.length, task.argNum);

	for (let i = 0; i < argLimit; i += 1)
		if (args[i] && args[i].constructor && args[i].constructor.name === "MereTask")
			trueArgs.push(args[i].make());
		else
			trueArgs.push(args[i]);

	for (let i = argLimit; i < task.argNum; i += 1)
		trueArgs.push(undefined);

	if (task.memo !== null) {
		const argsKey = JSON.stringify(trueArgs); /* => memoization works with serializable arguments only */

		if (task.memo[argsKey] !== undefined)
			return task.memo[argsKey];

		const res = task.func(...trueArgs);

		task.memo[argsKey] = res;
		return res;
	}

	return task.func(...trueArgs);
};

const ensureArgNum = (given, expected) => {
	if (!config.lessArgAllowed && given < expected)
		throw new Error(`too few arguments: given ${given}, expected ${expected}`);

	if (!config.moreArgAllowed && given > expected)
		throw new Error(`too more arguments: given ${given}, expected ${expected}`);
};

const isTask = (obj) => {
	if (!obj)
		return false;

	const task = obj.task;

	return task && task.constructor && task.constructor.name === "MereTask";
};

const wrapInArr = (obj) => {
	if (obj && obj.constructor && obj.constructor.name === "Array")
		return obj;

	return [obj];
};

//** task definition. Main logic part

class MereTask {
	constructor (func, argNum) {
		this.task   = this;
		this.func   = func;
		this.argNum = argNum || func.length;
		this.memo   = null; /* null means no memo (by default) */
	}

	make (...args) {
		if (typeof this.func !== "function")
			throw new Error(`task ${this} is not binded to the function`);

		ensureArgNum(args.length, this.argNum);

		return execFunc(this, ...args);
	}

	promise (...args) {
		if (typeof this.func !== "function")
			throw new Error(`task ${this} is not binded to the function`);

		ensureArgNum(args.length, this.argNum);

		return new Promise((resolve, reject) => {
			try {
				resolve(execFunc(this, ...args));
			} catch (err) {
				reject(err);
			}
		});
	}

	with (...args) {
		const formalArgNum = this.argNum;

		if (!config.moreArgAllowed && args.length > formalArgNum)
			throw new Error(`too more arguments: given ${args.length}, expected ${formalArgNum}`);

		return new MereTask((...lastArgs) =>
			execFunc(this, ...args, ...lastArgs),
			formalArgNum - args.length
		);
	}

	then (task, ...secondArgs) {
		if (!task)
			throw new Error(`task expected, got ${task}`);

		const trueTask = task.task;

		if (!trueTask)
			throw new Error(`task expected, got ${trueTask}`);

		ensureArgNum(secondArgs.length, trueTask.argNum);

		return new MereTask((...args) => {
			const firstRes = execFunc(this, ...args);

			return firstRes === undefined
				? execFunc(trueTask, ...secondArgs)
				: execFunc(trueTask, firstRes, ...secondArgs);
		},
			this.argNum
		);
	}

	memoize () {
		if (this.memo === null)
			this.memo = {};

		return this;
	}
}

/* eslint-disable no-extend-native */

//** string prototype

String.prototype.bind = function (func) {
	if (func && func.constructor) {
		if (func.constructor.name === "MereTask")
			taskModuleMap[this] = func; /* func === task */

		if (func.constructor.name === "Array")
			taskModuleMap[this] = getArrayTask(func, "binding"); /* func === task array */
		else if (typeof func === "function")
			taskModuleMap[this] = new MereTask(func);
	} else
		throw new Error("task must be binded to the function or to another task");

	return this;
};

String.prototype.__defineGetter__("task", function () {
	return taskModuleMap[this];
});

String.prototype.make = function (...args) {
	return taskModuleMap[this].make(...args);
};

String.prototype.promise = function (...args) {
	return taskModuleMap[this].promise(...args);
};

String.prototype.with = function (...args) {
	return taskModuleMap[this].with(...args);
};

String.prototype.then = function (task, ...args) {
	return taskModuleMap[this].then(task, ...args);
};

String.prototype.memoize = function () {
	return taskModuleMap[this].memoize();
};

//** array prototype

const getArrayTask = (arr, errFuncName) => {
	if (arr.length === 0)
		return new MereTask(() => {});

	let finalTask = typeof arr[0] === "string" ? taskModuleMap[arr[0]] : arr[0];

	if (finalTask && finalTask.constructor && finalTask.constructor.name === "Array")
		finalTask = getArrayTask(finalTask);

	if (!finalTask || !finalTask.constructor || finalTask.constructor.name !== "MereTask")
		throw new Error(`array must contain only tasks to call ${errFuncName}`);

	for (let i = 1; i < arr.length; i += 1) {
		if (typeof arr[i] !== "string" && (!arr[i] || !arr[i].constructor || arr[i].constructor.name !== "MereTask"))
			throw new Error(`array must contain only tasks to call ${errFuncName}`);

		finalTask = finalTask.then(arr[i]);
	}

	return finalTask;
};

Array.prototype.__defineGetter__("task", function () {
	return getArrayTask(this, "to the task property");
});

Array.prototype.make = function (...args) {
	if (this.length !== 0)
		return getArrayTask(this, "make()").make(...args);

	return undefined;
};

Array.prototype.promise = function (...args) {
	if (this.length !== 0)
		return getArrayTask(this, "promise()").promise(...args);

	return new Promise((resolve) => {
		resolve();
	});
};

Array.prototype.generate = function (passArgs = false) {
	for (const task of this)
		if (!isTask(task))
			throw new Error("array must contain only tasks to call generate()");

	const gen = (function *(arr) {
		let res = undefined;

		if (passArgs)
			for (const task of arr)
				res = res === undefined ? task.make(...wrapInArr(yield)) : task.make(res, ...wrapInArr(yield res));
		else
			for (const task of arr)
				res = task.make(...wrapInArr(yield res));

		return res;
	})(this);

	gen.next();

	return gen;
};

Array.prototype.with = function (...args) {
	return getArrayTask(this, "with()").with(...args);
};

Array.prototype.then = function (task, ...args) {
	return getArrayTask(this, "then()").then(task, ...args);
};

Array.prototype.memoize = function () {
	return getArrayTask(this, "memoize()").memoize();
};

/**
 * Exports.
 */
exports = module.exports = {
	NO_CHECK       : ARG_CHECK_ENUM.NO_CHECK,
	NOT_MORE       : ARG_CHECK_ENUM.NOT_MORE,
	NOT_LESS       : ARG_CHECK_ENUM.NOT_LESS,
	MUST_EQUAL     : ARG_CHECK_ENUM.MUST_EQUAL,
	getArgCheck    : () => {
		if (config.lessArgAllowed && config.moreArgAllowed)
			return ARG_CHECK_ENUM.NO_CHECK;

		if (config.lessArgAllowed)
			return ARG_CHECK_ENUM.NOT_MORE;

		if (config.moreArgAllowed)
			return ARG_CHECK_ENUM.NOT_LESS;

		return ARG_CHECK_ENUM.MUST_EQUAL;
	},
	setArgCheck    : (type) => {
		if (type > ARG_CHECK_ENUM.MUST_EQUAL)
			throw new Error(`invalid argument checking type: ${type} (use mere.ARG_CHECK_ENUM)`);

		if (type < ARG_CHECK_ENUM.NOT_LESS)
			config.lessArgAllowed = true;

		if (type === ARG_CHECK_ENUM.NO_CHECK)
			config.moreArgAllowed = true;
	}
};
