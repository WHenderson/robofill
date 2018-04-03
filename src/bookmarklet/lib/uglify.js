(function(exports) {
    "use strict";
    function characters(str) {
        return str.split("");
    }
    function member(name, array) {
        return array.indexOf(name) >= 0;
    }
    function find_if(func, array) {
        for (var i = 0, n = array.length; i < n; ++i) {
            if (func(array[i])) return array[i];
        }
    }
    function repeat_string(str, i) {
        if (i <= 0) return "";
        if (i == 1) return str;
        var d = repeat_string(str, i >> 1);
        d += d;
        if (i & 1) d += str;
        return d;
    }
    function configure_error_stack(fn) {
        Object.defineProperty(fn.prototype, "stack", {
            get: function() {
                var err = new Error(this.message);
                err.name = this.name;
                try {
                    throw err;
                } catch (e) {
                    return e.stack;
                }
            }
        });
    }
    function DefaultsError(msg, defs) {
        this.message = msg;
        this.defs = defs;
    }
    DefaultsError.prototype = Object.create(Error.prototype);
    DefaultsError.prototype.constructor = DefaultsError;
    DefaultsError.prototype.name = "DefaultsError";
    configure_error_stack(DefaultsError);
    DefaultsError.croak = function(msg, defs) {
        throw new DefaultsError(msg, defs);
    };
    function defaults(args, defs, croak) {
        if (args === true) args = {};
        var ret = args || {};
        if (croak) for (var i in ret) if (HOP(ret, i) && !HOP(defs, i)) DefaultsError.croak("`" + i + "` is not a supported option", defs);
        for (var i in defs) if (HOP(defs, i)) {
            ret[i] = args && HOP(args, i) ? args[i] : defs[i];
        }
        return ret;
    }
    function merge(obj, ext) {
        var count = 0;
        for (var i in ext) if (HOP(ext, i)) {
            obj[i] = ext[i];
            count++;
        }
        return count;
    }
    function noop() {}
    function return_false() {
        return false;
    }
    function return_true() {
        return true;
    }
    function return_this() {
        return this;
    }
    function return_null() {
        return null;
    }
    var MAP = function() {
        function MAP(a, f, backwards) {
            var ret = [], top = [], i;
            function doit() {
                var val = f(a[i], i);
                var is_last = val instanceof Last;
                if (is_last) val = val.v;
                if (val instanceof AtTop) {
                    val = val.v;
                    if (val instanceof Splice) {
                        top.push.apply(top, backwards ? val.v.slice().reverse() : val.v);
                    } else {
                        top.push(val);
                    }
                } else if (val !== skip) {
                    if (val instanceof Splice) {
                        ret.push.apply(ret, backwards ? val.v.slice().reverse() : val.v);
                    } else {
                        ret.push(val);
                    }
                }
                return is_last;
            }
            if (a instanceof Array) {
                if (backwards) {
                    for (i = a.length; --i >= 0; ) if (doit()) break;
                    ret.reverse();
                    top.reverse();
                } else {
                    for (i = 0; i < a.length; ++i) if (doit()) break;
                }
            } else {
                for (i in a) if (HOP(a, i)) if (doit()) break;
            }
            return top.concat(ret);
        }
        MAP.at_top = function(val) {
            return new AtTop(val);
        };
        MAP.splice = function(val) {
            return new Splice(val);
        };
        MAP.last = function(val) {
            return new Last(val);
        };
        var skip = MAP.skip = {};
        function AtTop(val) {
            this.v = val;
        }
        function Splice(val) {
            this.v = val;
        }
        function Last(val) {
            this.v = val;
        }
        return MAP;
    }();
    function push_uniq(array, el) {
        if (array.indexOf(el) < 0) array.push(el);
    }
    function string_template(text, props) {
        return text.replace(/\{(.+?)\}/g, function(str, p) {
            return props && props[p];
        });
    }
    function remove(array, el) {
        for (var i = array.length; --i >= 0; ) {
            if (array[i] === el) array.splice(i, 1);
        }
    }
    function mergeSort(array, cmp) {
        if (array.length < 2) return array.slice();
        function merge(a, b) {
            var r = [], ai = 0, bi = 0, i = 0;
            while (ai < a.length && bi < b.length) {
                cmp(a[ai], b[bi]) <= 0 ? r[i++] = a[ai++] : r[i++] = b[bi++];
            }
            if (ai < a.length) r.push.apply(r, a.slice(ai));
            if (bi < b.length) r.push.apply(r, b.slice(bi));
            return r;
        }
        function _ms(a) {
            if (a.length <= 1) return a;
            var m = Math.floor(a.length / 2), left = a.slice(0, m), right = a.slice(m);
            left = _ms(left);
            right = _ms(right);
            return merge(left, right);
        }
        return _ms(array);
    }
    function makePredicate(words) {
        if (!(words instanceof Array)) words = words.split(" ");
        var f = "", cats = [];
        out: for (var i = 0; i < words.length; ++i) {
            for (var j = 0; j < cats.length; ++j) if (cats[j][0].length == words[i].length) {
                cats[j].push(words[i]);
                continue out;
            }
            cats.push([ words[i] ]);
        }
        function quote(word) {
            return JSON.stringify(word).replace(/[\u2028\u2029]/g, function(s) {
                switch (s) {
                  case "\u2028":
                    return "\\u2028";

                  case "\u2029":
                    return "\\u2029";
                }
                return s;
            });
        }
        function compareTo(arr) {
            if (arr.length == 1) return f += "return str === " + quote(arr[0]) + ";";
            f += "switch(str){";
            for (var i = 0; i < arr.length; ++i) f += "case " + quote(arr[i]) + ":";
            f += "return true}return false;";
        }
        if (cats.length > 3) {
            cats.sort(function(a, b) {
                return b.length - a.length;
            });
            f += "switch(str.length){";
            for (var i = 0; i < cats.length; ++i) {
                var cat = cats[i];
                f += "case " + cat[0].length + ":";
                compareTo(cat);
            }
            f += "}";
        } else {
            compareTo(words);
        }
        return new Function("str", f);
    }
    function all(array, predicate) {
        for (var i = array.length; --i >= 0; ) if (!predicate(array[i])) return false;
        return true;
    }
    function Dictionary() {
        this._values = Object.create(null);
        this._size = 0;
    }
    Dictionary.prototype = {
        set: function(key, val) {
            if (!this.has(key)) ++this._size;
            this._values["$" + key] = val;
            return this;
        },
        add: function(key, val) {
            if (this.has(key)) {
                this.get(key).push(val);
            } else {
                this.set(key, [ val ]);
            }
            return this;
        },
        get: function(key) {
            return this._values["$" + key];
        },
        del: function(key) {
            if (this.has(key)) {
                --this._size;
                delete this._values["$" + key];
            }
            return this;
        },
        has: function(key) {
            return "$" + key in this._values;
        },
        each: function(f) {
            for (var i in this._values) f(this._values[i], i.substr(1));
        },
        size: function() {
            return this._size;
        },
        map: function(f) {
            var ret = [];
            for (var i in this._values) ret.push(f(this._values[i], i.substr(1)));
            return ret;
        },
        clone: function() {
            var ret = new Dictionary();
            for (var i in this._values) ret._values[i] = this._values[i];
            ret._size = this._size;
            return ret;
        },
        toObject: function() {
            return this._values;
        }
    };
    Dictionary.fromObject = function(obj) {
        var dict = new Dictionary();
        dict._size = merge(dict._values, obj);
        return dict;
    };
    function HOP(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }
    function first_in_statement(stack) {
        var node = stack.parent(-1);
        for (var i = 0, p; p = stack.parent(i); i++) {
            if (p instanceof AST_Statement && p.body === node) return true;
            if (p instanceof AST_Sequence && p.expressions[0] === node || p.TYPE == "Call" && p.expression === node || p instanceof AST_Dot && p.expression === node || p instanceof AST_Sub && p.expression === node || p instanceof AST_Conditional && p.condition === node || p instanceof AST_Binary && p.left === node || p instanceof AST_UnaryPostfix && p.expression === node) {
                node = p;
            } else {
                return false;
            }
        }
    }
    "use strict";
    function DEFNODE(type, props, methods, base) {
        if (arguments.length < 4) base = AST_Node;
        if (!props) props = []; else props = props.split(/\s+/);
        var self_props = props;
        if (base && base.PROPS) props = props.concat(base.PROPS);
        var code = "return function AST_" + type + "(props){ if (props) { ";
        for (var i = props.length; --i >= 0; ) {
            code += "this." + props[i] + " = props." + props[i] + ";";
        }
        var proto = base && new base();
        if (proto && proto.initialize || methods && methods.initialize) code += "this.initialize();";
        code += "}}";
        var ctor = new Function(code)();
        if (proto) {
            ctor.prototype = proto;
            ctor.BASE = base;
        }
        if (base) base.SUBCLASSES.push(ctor);
        ctor.prototype.CTOR = ctor;
        ctor.PROPS = props || null;
        ctor.SELF_PROPS = self_props;
        ctor.SUBCLASSES = [];
        if (type) {
            ctor.prototype.TYPE = ctor.TYPE = type;
        }
        if (methods) for (i in methods) if (HOP(methods, i)) {
            if (/^\$/.test(i)) {
                ctor[i.substr(1)] = methods[i];
            } else {
                ctor.prototype[i] = methods[i];
            }
        }
        ctor.DEFMETHOD = function(name, method) {
            this.prototype[name] = method;
        };
        if (typeof exports !== "undefined") {
            exports["AST_" + type] = ctor;
        }
        return ctor;
    }
    var AST_Token = DEFNODE("Token", "type value line col pos endline endcol endpos nlb comments_before comments_after file raw", {}, null);
    var AST_Node = DEFNODE("Node", "start end", {
        _clone: function(deep) {
            if (deep) {
                var self = this.clone();
                return self.transform(new TreeTransformer(function(node) {
                    if (node !== self) {
                        return node.clone(true);
                    }
                }));
            }
            return new this.CTOR(this);
        },
        clone: function(deep) {
            return this._clone(deep);
        },
        $documentation: "Base class of all AST nodes",
        $propdoc: {
            start: "[AST_Token] The first token of this node",
            end: "[AST_Token] The last token of this node"
        },
        _walk: function(visitor) {
            return visitor._visit(this);
        },
        walk: function(visitor) {
            return this._walk(visitor);
        }
    }, null);
    AST_Node.warn_function = null;
    AST_Node.warn = function(txt, props) {
        if (AST_Node.warn_function) AST_Node.warn_function(string_template(txt, props));
    };
    var AST_Statement = DEFNODE("Statement", null, {
        $documentation: "Base class of all statements"
    });
    var AST_Debugger = DEFNODE("Debugger", null, {
        $documentation: "Represents a debugger statement"
    }, AST_Statement);
    var AST_Directive = DEFNODE("Directive", "value quote", {
        $documentation: 'Represents a directive, like "use strict";',
        $propdoc: {
            value: "[string] The value of this directive as a plain string (it's not an AST_String!)",
            quote: "[string] the original quote character"
        }
    }, AST_Statement);
    var AST_SimpleStatement = DEFNODE("SimpleStatement", "body", {
        $documentation: "A statement consisting of an expression, i.e. a = 1 + 2",
        $propdoc: {
            body: "[AST_Node] an expression node (should not be instanceof AST_Statement)"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.body._walk(visitor);
            });
        }
    }, AST_Statement);
    function walk_body(node, visitor) {
        var body = node.body;
        if (body instanceof AST_Statement) {
            body._walk(visitor);
        } else for (var i = 0, len = body.length; i < len; i++) {
            body[i]._walk(visitor);
        }
    }
    var AST_Block = DEFNODE("Block", "body", {
        $documentation: "A body of statements (usually braced)",
        $propdoc: {
            body: "[AST_Statement*] an array of statements"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                walk_body(this, visitor);
            });
        }
    }, AST_Statement);
    var AST_BlockStatement = DEFNODE("BlockStatement", null, {
        $documentation: "A block statement"
    }, AST_Block);
    var AST_EmptyStatement = DEFNODE("EmptyStatement", null, {
        $documentation: "The empty statement (empty block or simply a semicolon)"
    }, AST_Statement);
    var AST_StatementWithBody = DEFNODE("StatementWithBody", "body", {
        $documentation: "Base class for all statements that contain one nested body: `For`, `ForIn`, `Do`, `While`, `With`",
        $propdoc: {
            body: "[AST_Statement] the body; this should always be present, even if it's an AST_EmptyStatement"
        }
    }, AST_Statement);
    var AST_LabeledStatement = DEFNODE("LabeledStatement", "label", {
        $documentation: "Statement with a label",
        $propdoc: {
            label: "[AST_Label] a label definition"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.label._walk(visitor);
                this.body._walk(visitor);
            });
        },
        clone: function(deep) {
            var node = this._clone(deep);
            if (deep) {
                var label = node.label;
                var def = this.label;
                node.walk(new TreeWalker(function(node) {
                    if (node instanceof AST_LoopControl && node.label && node.label.thedef === def) {
                        node.label.thedef = label;
                        label.references.push(node);
                    }
                }));
            }
            return node;
        }
    }, AST_StatementWithBody);
    var AST_IterationStatement = DEFNODE("IterationStatement", null, {
        $documentation: "Internal class.  All loops inherit from it."
    }, AST_StatementWithBody);
    var AST_DWLoop = DEFNODE("DWLoop", "condition", {
        $documentation: "Base class for do/while statements",
        $propdoc: {
            condition: "[AST_Node] the loop condition.  Should not be instanceof AST_Statement"
        }
    }, AST_IterationStatement);
    var AST_Do = DEFNODE("Do", null, {
        $documentation: "A `do` statement",
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.body._walk(visitor);
                this.condition._walk(visitor);
            });
        }
    }, AST_DWLoop);
    var AST_While = DEFNODE("While", null, {
        $documentation: "A `while` statement",
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.condition._walk(visitor);
                this.body._walk(visitor);
            });
        }
    }, AST_DWLoop);
    var AST_For = DEFNODE("For", "init condition step", {
        $documentation: "A `for` statement",
        $propdoc: {
            init: "[AST_Node?] the `for` initialization code, or null if empty",
            condition: "[AST_Node?] the `for` termination clause, or null if empty",
            step: "[AST_Node?] the `for` update clause, or null if empty"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                if (this.init) this.init._walk(visitor);
                if (this.condition) this.condition._walk(visitor);
                if (this.step) this.step._walk(visitor);
                this.body._walk(visitor);
            });
        }
    }, AST_IterationStatement);
    var AST_ForIn = DEFNODE("ForIn", "init object", {
        $documentation: "A `for ... in` statement",
        $propdoc: {
            init: "[AST_Node] the `for/in` initialization code",
            object: "[AST_Node] the object that we're looping through"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.init._walk(visitor);
                this.object._walk(visitor);
                this.body._walk(visitor);
            });
        }
    }, AST_IterationStatement);
    var AST_With = DEFNODE("With", "expression", {
        $documentation: "A `with` statement",
        $propdoc: {
            expression: "[AST_Node] the `with` expression"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.expression._walk(visitor);
                this.body._walk(visitor);
            });
        }
    }, AST_StatementWithBody);
    var AST_Scope = DEFNODE("Scope", "variables functions uses_with uses_eval parent_scope enclosed cname", {
        $documentation: "Base class for all statements introducing a lexical scope",
        $propdoc: {
            variables: "[Object/S] a map of name -> SymbolDef for all variables/functions defined in this scope",
            functions: "[Object/S] like `variables`, but only lists function declarations",
            uses_with: "[boolean/S] tells whether this scope uses the `with` statement",
            uses_eval: "[boolean/S] tells whether this scope contains a direct call to the global `eval`",
            parent_scope: "[AST_Scope?/S] link to the parent scope",
            enclosed: "[SymbolDef*/S] a list of all symbol definitions that are accessed from this scope or any subscopes",
            cname: "[integer/S] current index for mangling variables (used internally by the mangler)"
        },
        clone: function(deep) {
            var node = this._clone(deep);
            if (this.variables) node.variables = this.variables.clone();
            if (this.functions) node.functions = this.functions.clone();
            if (this.enclosed) node.enclosed = this.enclosed.slice();
            return node;
        }
    }, AST_Block);
    var AST_Toplevel = DEFNODE("Toplevel", "globals", {
        $documentation: "The toplevel scope",
        $propdoc: {
            globals: "[Object/S] a map of name -> SymbolDef for all undeclared names"
        },
        wrap_commonjs: function(name) {
            var body = this.body;
            var wrapped_tl = "(function(exports){'$ORIG';})(typeof " + name + "=='undefined'?(" + name + "={}):" + name + ");";
            wrapped_tl = parse(wrapped_tl);
            wrapped_tl = wrapped_tl.transform(new TreeTransformer(function before(node) {
                if (node instanceof AST_Directive && node.value == "$ORIG") {
                    return MAP.splice(body);
                }
            }));
            return wrapped_tl;
        }
    }, AST_Scope);
    var AST_Lambda = DEFNODE("Lambda", "name argnames uses_arguments", {
        $documentation: "Base class for functions",
        $propdoc: {
            name: "[AST_SymbolDeclaration?] the name of this function",
            argnames: "[AST_SymbolFunarg*] array of function arguments",
            uses_arguments: "[boolean/S] tells whether this function accesses the arguments array"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                if (this.name) this.name._walk(visitor);
                var argnames = this.argnames;
                for (var i = 0, len = argnames.length; i < len; i++) {
                    argnames[i]._walk(visitor);
                }
                walk_body(this, visitor);
            });
        }
    }, AST_Scope);
    var AST_Accessor = DEFNODE("Accessor", null, {
        $documentation: "A setter/getter function.  The `name` property is always null."
    }, AST_Lambda);
    var AST_Function = DEFNODE("Function", "inlined", {
        $documentation: "A function expression"
    }, AST_Lambda);
    var AST_Defun = DEFNODE("Defun", "inlined", {
        $documentation: "A function definition"
    }, AST_Lambda);
    var AST_Jump = DEFNODE("Jump", null, {
        $documentation: "Base class for “jumps” (for now that's `return`, `throw`, `break` and `continue`)"
    }, AST_Statement);
    var AST_Exit = DEFNODE("Exit", "value", {
        $documentation: "Base class for “exits” (`return` and `throw`)",
        $propdoc: {
            value: "[AST_Node?] the value returned or thrown by this statement; could be null for AST_Return"
        },
        _walk: function(visitor) {
            return visitor._visit(this, this.value && function() {
                this.value._walk(visitor);
            });
        }
    }, AST_Jump);
    var AST_Return = DEFNODE("Return", null, {
        $documentation: "A `return` statement"
    }, AST_Exit);
    var AST_Throw = DEFNODE("Throw", null, {
        $documentation: "A `throw` statement"
    }, AST_Exit);
    var AST_LoopControl = DEFNODE("LoopControl", "label", {
        $documentation: "Base class for loop control statements (`break` and `continue`)",
        $propdoc: {
            label: "[AST_LabelRef?] the label, or null if none"
        },
        _walk: function(visitor) {
            return visitor._visit(this, this.label && function() {
                this.label._walk(visitor);
            });
        }
    }, AST_Jump);
    var AST_Break = DEFNODE("Break", null, {
        $documentation: "A `break` statement"
    }, AST_LoopControl);
    var AST_Continue = DEFNODE("Continue", null, {
        $documentation: "A `continue` statement"
    }, AST_LoopControl);
    var AST_If = DEFNODE("If", "condition alternative", {
        $documentation: "A `if` statement",
        $propdoc: {
            condition: "[AST_Node] the `if` condition",
            alternative: "[AST_Statement?] the `else` part, or null if not present"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.condition._walk(visitor);
                this.body._walk(visitor);
                if (this.alternative) this.alternative._walk(visitor);
            });
        }
    }, AST_StatementWithBody);
    var AST_Switch = DEFNODE("Switch", "expression", {
        $documentation: "A `switch` statement",
        $propdoc: {
            expression: "[AST_Node] the `switch` “discriminant”"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.expression._walk(visitor);
                walk_body(this, visitor);
            });
        }
    }, AST_Block);
    var AST_SwitchBranch = DEFNODE("SwitchBranch", null, {
        $documentation: "Base class for `switch` branches"
    }, AST_Block);
    var AST_Default = DEFNODE("Default", null, {
        $documentation: "A `default` switch branch"
    }, AST_SwitchBranch);
    var AST_Case = DEFNODE("Case", "expression", {
        $documentation: "A `case` switch branch",
        $propdoc: {
            expression: "[AST_Node] the `case` expression"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.expression._walk(visitor);
                walk_body(this, visitor);
            });
        }
    }, AST_SwitchBranch);
    var AST_Try = DEFNODE("Try", "bcatch bfinally", {
        $documentation: "A `try` statement",
        $propdoc: {
            bcatch: "[AST_Catch?] the catch block, or null if not present",
            bfinally: "[AST_Finally?] the finally block, or null if not present"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                walk_body(this, visitor);
                if (this.bcatch) this.bcatch._walk(visitor);
                if (this.bfinally) this.bfinally._walk(visitor);
            });
        }
    }, AST_Block);
    var AST_Catch = DEFNODE("Catch", "argname", {
        $documentation: "A `catch` node; only makes sense as part of a `try` statement",
        $propdoc: {
            argname: "[AST_SymbolCatch] symbol for the exception"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.argname._walk(visitor);
                walk_body(this, visitor);
            });
        }
    }, AST_Block);
    var AST_Finally = DEFNODE("Finally", null, {
        $documentation: "A `finally` node; only makes sense as part of a `try` statement"
    }, AST_Block);
    var AST_Definitions = DEFNODE("Definitions", "definitions", {
        $documentation: "Base class for `var` nodes (variable declarations/initializations)",
        $propdoc: {
            definitions: "[AST_VarDef*] array of variable definitions"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                var definitions = this.definitions;
                for (var i = 0, len = definitions.length; i < len; i++) {
                    definitions[i]._walk(visitor);
                }
            });
        }
    }, AST_Statement);
    var AST_Var = DEFNODE("Var", null, {
        $documentation: "A `var` statement"
    }, AST_Definitions);
    var AST_VarDef = DEFNODE("VarDef", "name value", {
        $documentation: "A variable declaration; only appears in a AST_Definitions node",
        $propdoc: {
            name: "[AST_SymbolVar] name of the variable",
            value: "[AST_Node?] initializer, or null of there's no initializer"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.name._walk(visitor);
                if (this.value) this.value._walk(visitor);
            });
        }
    });
    var AST_Call = DEFNODE("Call", "expression args", {
        $documentation: "A function call expression",
        $propdoc: {
            expression: "[AST_Node] expression to invoke as function",
            args: "[AST_Node*] array of arguments"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                var args = this.args;
                for (var i = 0, len = args.length; i < len; i++) {
                    args[i]._walk(visitor);
                }
                this.expression._walk(visitor);
            });
        }
    });
    var AST_New = DEFNODE("New", null, {
        $documentation: "An object instantiation.  Derives from a function call since it has exactly the same properties"
    }, AST_Call);
    var AST_Sequence = DEFNODE("Sequence", "expressions", {
        $documentation: "A sequence expression (comma-separated expressions)",
        $propdoc: {
            expressions: "[AST_Node*] array of expressions (at least two)"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.expressions.forEach(function(node) {
                    node._walk(visitor);
                });
            });
        }
    });
    var AST_PropAccess = DEFNODE("PropAccess", "expression property", {
        $documentation: 'Base class for property access expressions, i.e. `a.foo` or `a["foo"]`',
        $propdoc: {
            expression: "[AST_Node] the “container” expression",
            property: "[AST_Node|string] the property to access.  For AST_Dot this is always a plain string, while for AST_Sub it's an arbitrary AST_Node"
        }
    });
    var AST_Dot = DEFNODE("Dot", null, {
        $documentation: "A dotted property access expression",
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.expression._walk(visitor);
            });
        }
    }, AST_PropAccess);
    var AST_Sub = DEFNODE("Sub", null, {
        $documentation: 'Index-style property access, i.e. `a["foo"]`',
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.expression._walk(visitor);
                this.property._walk(visitor);
            });
        }
    }, AST_PropAccess);
    var AST_Unary = DEFNODE("Unary", "operator expression", {
        $documentation: "Base class for unary expressions",
        $propdoc: {
            operator: "[string] the operator",
            expression: "[AST_Node] expression that this unary operator applies to"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.expression._walk(visitor);
            });
        }
    });
    var AST_UnaryPrefix = DEFNODE("UnaryPrefix", null, {
        $documentation: "Unary prefix expression, i.e. `typeof i` or `++i`"
    }, AST_Unary);
    var AST_UnaryPostfix = DEFNODE("UnaryPostfix", null, {
        $documentation: "Unary postfix expression, i.e. `i++`"
    }, AST_Unary);
    var AST_Binary = DEFNODE("Binary", "operator left right", {
        $documentation: "Binary expression, i.e. `a + b`",
        $propdoc: {
            left: "[AST_Node] left-hand side expression",
            operator: "[string] the operator",
            right: "[AST_Node] right-hand side expression"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.left._walk(visitor);
                this.right._walk(visitor);
            });
        }
    });
    var AST_Conditional = DEFNODE("Conditional", "condition consequent alternative", {
        $documentation: "Conditional expression using the ternary operator, i.e. `a ? b : c`",
        $propdoc: {
            condition: "[AST_Node]",
            consequent: "[AST_Node]",
            alternative: "[AST_Node]"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.condition._walk(visitor);
                this.consequent._walk(visitor);
                this.alternative._walk(visitor);
            });
        }
    });
    var AST_Assign = DEFNODE("Assign", null, {
        $documentation: "An assignment expression — `a = b + 5`"
    }, AST_Binary);
    var AST_Array = DEFNODE("Array", "elements", {
        $documentation: "An array literal",
        $propdoc: {
            elements: "[AST_Node*] array of elements"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                var elements = this.elements;
                for (var i = 0, len = elements.length; i < len; i++) {
                    elements[i]._walk(visitor);
                }
            });
        }
    });
    var AST_Object = DEFNODE("Object", "properties", {
        $documentation: "An object literal",
        $propdoc: {
            properties: "[AST_ObjectProperty*] array of properties"
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                var properties = this.properties;
                for (var i = 0, len = properties.length; i < len; i++) {
                    properties[i]._walk(visitor);
                }
            });
        }
    });
    var AST_ObjectProperty = DEFNODE("ObjectProperty", "key value", {
        $documentation: "Base class for literal object properties",
        $propdoc: {
            key: "[string|AST_SymbolAccessor] property name. For ObjectKeyVal this is a string. For getters and setters this is an AST_SymbolAccessor.",
            value: "[AST_Node] property value.  For getters and setters this is an AST_Accessor."
        },
        _walk: function(visitor) {
            return visitor._visit(this, function() {
                this.value._walk(visitor);
            });
        }
    });
    var AST_ObjectKeyVal = DEFNODE("ObjectKeyVal", "quote", {
        $documentation: "A key: value object property",
        $propdoc: {
            quote: "[string] the original quote character"
        }
    }, AST_ObjectProperty);
    var AST_ObjectSetter = DEFNODE("ObjectSetter", null, {
        $documentation: "An object setter property"
    }, AST_ObjectProperty);
    var AST_ObjectGetter = DEFNODE("ObjectGetter", null, {
        $documentation: "An object getter property"
    }, AST_ObjectProperty);
    var AST_Symbol = DEFNODE("Symbol", "scope name thedef", {
        $propdoc: {
            name: "[string] name of this symbol",
            scope: "[AST_Scope/S] the current scope (not necessarily the definition scope)",
            thedef: "[SymbolDef/S] the definition of this symbol"
        },
        $documentation: "Base class for all symbols"
    });
    var AST_SymbolAccessor = DEFNODE("SymbolAccessor", null, {
        $documentation: "The name of a property accessor (setter/getter function)"
    }, AST_Symbol);
    var AST_SymbolDeclaration = DEFNODE("SymbolDeclaration", "init", {
        $documentation: "A declaration symbol (symbol in var, function name or argument, symbol in catch)"
    }, AST_Symbol);
    var AST_SymbolVar = DEFNODE("SymbolVar", null, {
        $documentation: "Symbol defining a variable"
    }, AST_SymbolDeclaration);
    var AST_SymbolFunarg = DEFNODE("SymbolFunarg", null, {
        $documentation: "Symbol naming a function argument"
    }, AST_SymbolVar);
    var AST_SymbolDefun = DEFNODE("SymbolDefun", null, {
        $documentation: "Symbol defining a function"
    }, AST_SymbolDeclaration);
    var AST_SymbolLambda = DEFNODE("SymbolLambda", null, {
        $documentation: "Symbol naming a function expression"
    }, AST_SymbolDeclaration);
    var AST_SymbolCatch = DEFNODE("SymbolCatch", null, {
        $documentation: "Symbol naming the exception in catch"
    }, AST_SymbolDeclaration);
    var AST_Label = DEFNODE("Label", "references", {
        $documentation: "Symbol naming a label (declaration)",
        $propdoc: {
            references: "[AST_LoopControl*] a list of nodes referring to this label"
        },
        initialize: function() {
            this.references = [];
            this.thedef = this;
        }
    }, AST_Symbol);
    var AST_SymbolRef = DEFNODE("SymbolRef", null, {
        $documentation: "Reference to some symbol (not definition/declaration)"
    }, AST_Symbol);
    var AST_LabelRef = DEFNODE("LabelRef", null, {
        $documentation: "Reference to a label symbol"
    }, AST_Symbol);
    var AST_This = DEFNODE("This", null, {
        $documentation: "The `this` symbol"
    }, AST_Symbol);
    var AST_Constant = DEFNODE("Constant", null, {
        $documentation: "Base class for all constants",
        getValue: function() {
            return this.value;
        }
    });
    var AST_String = DEFNODE("String", "value quote", {
        $documentation: "A string literal",
        $propdoc: {
            value: "[string] the contents of this string",
            quote: "[string] the original quote character"
        }
    }, AST_Constant);
    var AST_Number = DEFNODE("Number", "value literal", {
        $documentation: "A number literal",
        $propdoc: {
            value: "[number] the numeric value",
            literal: "[string] numeric value as string (optional)"
        }
    }, AST_Constant);
    var AST_RegExp = DEFNODE("RegExp", "value", {
        $documentation: "A regexp literal",
        $propdoc: {
            value: "[RegExp] the actual regexp"
        }
    }, AST_Constant);
    var AST_Atom = DEFNODE("Atom", null, {
        $documentation: "Base class for atoms"
    }, AST_Constant);
    var AST_Null = DEFNODE("Null", null, {
        $documentation: "The `null` atom",
        value: null
    }, AST_Atom);
    var AST_NaN = DEFNODE("NaN", null, {
        $documentation: "The impossible value",
        value: 0 / 0
    }, AST_Atom);
    var AST_Undefined = DEFNODE("Undefined", null, {
        $documentation: "The `undefined` value",
        value: function() {}()
    }, AST_Atom);
    var AST_Hole = DEFNODE("Hole", null, {
        $documentation: "A hole in an array",
        value: function() {}()
    }, AST_Atom);
    var AST_Infinity = DEFNODE("Infinity", null, {
        $documentation: "The `Infinity` value",
        value: 1 / 0
    }, AST_Atom);
    var AST_Boolean = DEFNODE("Boolean", null, {
        $documentation: "Base class for booleans"
    }, AST_Atom);
    var AST_False = DEFNODE("False", null, {
        $documentation: "The `false` atom",
        value: false
    }, AST_Boolean);
    var AST_True = DEFNODE("True", null, {
        $documentation: "The `true` atom",
        value: true
    }, AST_Boolean);
    function TreeWalker(callback) {
        this.visit = callback;
        this.stack = [];
        this.directives = Object.create(null);
    }
    TreeWalker.prototype = {
        _visit: function(node, descend) {
            this.push(node);
            var ret = this.visit(node, descend ? function() {
                descend.call(node);
            } : noop);
            if (!ret && descend) {
                descend.call(node);
            }
            this.pop();
            return ret;
        },
        parent: function(n) {
            return this.stack[this.stack.length - 2 - (n || 0)];
        },
        push: function(node) {
            if (node instanceof AST_Lambda) {
                this.directives = Object.create(this.directives);
            } else if (node instanceof AST_Directive && !this.directives[node.value]) {
                this.directives[node.value] = node;
            }
            this.stack.push(node);
        },
        pop: function() {
            if (this.stack.pop() instanceof AST_Lambda) {
                this.directives = Object.getPrototypeOf(this.directives);
            }
        },
        self: function() {
            return this.stack[this.stack.length - 1];
        },
        find_parent: function(type) {
            var stack = this.stack;
            for (var i = stack.length; --i >= 0; ) {
                var x = stack[i];
                if (x instanceof type) return x;
            }
        },
        has_directive: function(type) {
            var dir = this.directives[type];
            if (dir) return dir;
            var node = this.stack[this.stack.length - 1];
            if (node instanceof AST_Scope) {
                for (var i = 0; i < node.body.length; ++i) {
                    var st = node.body[i];
                    if (!(st instanceof AST_Directive)) break;
                    if (st.value == type) return st;
                }
            }
        },
        loopcontrol_target: function(node) {
            var stack = this.stack;
            if (node.label) for (var i = stack.length; --i >= 0; ) {
                var x = stack[i];
                if (x instanceof AST_LabeledStatement && x.label.name == node.label.name) return x.body;
            } else for (var i = stack.length; --i >= 0; ) {
                var x = stack[i];
                if (x instanceof AST_IterationStatement || node instanceof AST_Break && x instanceof AST_Switch) return x;
            }
        },
        in_boolean_context: function() {
            var self = this.self();
            for (var i = 0, p; p = this.parent(i); i++) {
                if (p instanceof AST_SimpleStatement || p instanceof AST_Conditional && p.condition === self || p instanceof AST_DWLoop && p.condition === self || p instanceof AST_For && p.condition === self || p instanceof AST_If && p.condition === self || p instanceof AST_UnaryPrefix && p.operator == "!" && p.expression === self) {
                    return true;
                }
                if (p instanceof AST_Binary && (p.operator == "&&" || p.operator == "||") || p instanceof AST_Conditional || p.tail_node() === self) {
                    self = p;
                } else {
                    return false;
                }
            }
        }
    };
    "use strict";
    var KEYWORDS = "break case catch const continue debugger default delete do else finally for function if in instanceof new return switch throw try typeof var void while with";
    var KEYWORDS_ATOM = "false null true";
    var RESERVED_WORDS = "abstract boolean byte char class double enum export extends final float goto implements import int interface let long native package private protected public short static super synchronized this throws transient volatile yield" + " " + KEYWORDS_ATOM + " " + KEYWORDS;
    var KEYWORDS_BEFORE_EXPRESSION = "return new delete throw else case";
    KEYWORDS = makePredicate(KEYWORDS);
    RESERVED_WORDS = makePredicate(RESERVED_WORDS);
    KEYWORDS_BEFORE_EXPRESSION = makePredicate(KEYWORDS_BEFORE_EXPRESSION);
    KEYWORDS_ATOM = makePredicate(KEYWORDS_ATOM);
    var OPERATOR_CHARS = makePredicate(characters("+-*&%=<>!?|~^"));
    var RE_HEX_NUMBER = /^0x[0-9a-f]+$/i;
    var RE_OCT_NUMBER = /^0[0-7]+$/;
    var OPERATORS = makePredicate([ "in", "instanceof", "typeof", "new", "void", "delete", "++", "--", "+", "-", "!", "~", "&", "|", "^", "*", "/", "%", ">>", "<<", ">>>", "<", ">", "<=", ">=", "==", "===", "!=", "!==", "?", "=", "+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "^=", "&=", "&&", "||" ]);
    var WHITESPACE_CHARS = makePredicate(characters("  \n\r\t\f\v​           \u2028\u2029  　\ufeff"));
    var NEWLINE_CHARS = makePredicate(characters("\n\r\u2028\u2029"));
    var PUNC_BEFORE_EXPRESSION = makePredicate(characters("[{(,;:"));
    var PUNC_CHARS = makePredicate(characters("[]{}(),;:"));
    var UNICODE = {
        letter: new RegExp("[\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u037F\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u052F\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0-\\u08B2\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0980\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u16EE-\\u16F8\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191E\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2160-\\u2188\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA69D\\uA6A0-\\uA6EF\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA7AD\\uA7B0\\uA7B1\\uA7F7-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uA9E0-\\uA9E4\\uA9E6-\\uA9EF\\uA9FA-\\uA9FE\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA7E-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uAB30-\\uAB5A\\uAB5C-\\uAB5F\\uAB64\\uAB65\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"),
        digit: new RegExp("[\\u0030-\\u0039\\u0660-\\u0669\\u06F0-\\u06F9\\u07C0-\\u07C9\\u0966-\\u096F\\u09E6-\\u09EF\\u0A66-\\u0A6F\\u0AE6-\\u0AEF\\u0B66-\\u0B6F\\u0BE6-\\u0BEF\\u0C66-\\u0C6F\\u0CE6-\\u0CEF\\u0D66-\\u0D6F\\u0DE6-\\u0DEF\\u0E50-\\u0E59\\u0ED0-\\u0ED9\\u0F20-\\u0F29\\u1040-\\u1049\\u1090-\\u1099\\u17E0-\\u17E9\\u1810-\\u1819\\u1946-\\u194F\\u19D0-\\u19D9\\u1A80-\\u1A89\\u1A90-\\u1A99\\u1B50-\\u1B59\\u1BB0-\\u1BB9\\u1C40-\\u1C49\\u1C50-\\u1C59\\uA620-\\uA629\\uA8D0-\\uA8D9\\uA900-\\uA909\\uA9D0-\\uA9D9\\uA9F0-\\uA9F9\\uAA50-\\uAA59\\uABF0-\\uABF9\\uFF10-\\uFF19]"),
        non_spacing_mark: new RegExp("[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065E\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0900-\\u0902\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0955\\u0962\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2\\u09E3\\u0A01\\u0A02\\u0A3C\\u0A41\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70\\u0A71\\u0A75\\u0A81\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7\\u0AC8\\u0ACD\\u0AE2\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C62\\u0C63\\u0CBC\\u0CBF\\u0CC6\\u0CCC\\u0CCD\\u0CE2\\u0CE3\\u0D41-\\u0D44\\u0D4D\\u0D62\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB\\u0EBC\\u0EC8-\\u0ECD\\u0F18\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86\\u0F87\\u0F90-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039\\u103A\\u103D\\u103E\\u1058\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085\\u1086\\u108D\\u109D\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752\\u1753\\u1772\\u1773\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927\\u1928\\u1932\\u1939-\\u193B\\u1A17\\u1A18\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80\\u1B81\\u1BA2-\\u1BA5\\u1BA8\\u1BA9\\u1C2C-\\u1C33\\u1C36\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1DC0-\\u1DE6\\u1DFD-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2DE0-\\u2DFF\\u302A-\\u302F\\u3099\\u309A\\uA66F\\uA67C\\uA67D\\uA6F0\\uA6F1\\uA802\\uA806\\uA80B\\uA825\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uAA29-\\uAA2E\\uAA31\\uAA32\\uAA35\\uAA36\\uAA43\\uAA4C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7\\uAAB8\\uAABE\\uAABF\\uAAC1\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE26]"),
        space_combining_mark: new RegExp("[\\u0903\\u093E-\\u0940\\u0949-\\u094C\\u094E\\u0982\\u0983\\u09BE-\\u09C0\\u09C7\\u09C8\\u09CB\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB\\u0ACC\\u0B02\\u0B03\\u0B3E\\u0B40\\u0B47\\u0B48\\u0B4B\\u0B4C\\u0B57\\u0BBE\\u0BBF\\u0BC1\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7\\u0CC8\\u0CCA\\u0CCB\\u0CD5\\u0CD6\\u0D02\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0F3E\\u0F3F\\u0F7F\\u102B\\u102C\\u1031\\u1038\\u103B\\u103C\\u1056\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930\\u1931\\u1933-\\u1938\\u19B0-\\u19C0\\u19C8\\u19C9\\u1A19-\\u1A1B\\u1A55\\u1A57\\u1A61\\u1A63\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43\\u1B44\\u1B82\\u1BA1\\u1BA6\\u1BA7\\u1BAA\\u1C24-\\u1C2B\\u1C34\\u1C35\\u1CE1\\u1CF2\\uA823\\uA824\\uA827\\uA880\\uA881\\uA8B4-\\uA8C3\\uA952\\uA953\\uA983\\uA9B4\\uA9B5\\uA9BA\\uA9BB\\uA9BD-\\uA9C0\\uAA2F\\uAA30\\uAA33\\uAA34\\uAA4D\\uAA7B\\uABE3\\uABE4\\uABE6\\uABE7\\uABE9\\uABEA\\uABEC]"),
        connector_punctuation: new RegExp("[\\u005F\\u203F\\u2040\\u2054\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFF3F]")
    };
    function is_letter(code) {
        return code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 170 && UNICODE.letter.test(String.fromCharCode(code));
    }
    function is_surrogate_pair_head(code) {
        if (typeof code == "string") code = code.charCodeAt(0);
        return code >= 55296 && code <= 56319;
    }
    function is_surrogate_pair_tail(code) {
        if (typeof code == "string") code = code.charCodeAt(0);
        return code >= 56320 && code <= 57343;
    }
    function is_digit(code) {
        return code >= 48 && code <= 57;
    }
    function is_alphanumeric_char(code) {
        return is_digit(code) || is_letter(code);
    }
    function is_unicode_digit(code) {
        return UNICODE.digit.test(String.fromCharCode(code));
    }
    function is_unicode_combining_mark(ch) {
        return UNICODE.non_spacing_mark.test(ch) || UNICODE.space_combining_mark.test(ch);
    }
    function is_unicode_connector_punctuation(ch) {
        return UNICODE.connector_punctuation.test(ch);
    }
    function is_identifier(name) {
        return !RESERVED_WORDS(name) && /^[a-z_$][a-z0-9_$]*$/i.test(name);
    }
    function is_identifier_start(code) {
        return code == 36 || code == 95 || is_letter(code);
    }
    function is_identifier_char(ch) {
        var code = ch.charCodeAt(0);
        return is_identifier_start(code) || is_digit(code) || code == 8204 || code == 8205 || is_unicode_combining_mark(ch) || is_unicode_connector_punctuation(ch) || is_unicode_digit(code);
    }
    function is_identifier_string(str) {
        return /^[a-z_$][a-z0-9_$]*$/i.test(str);
    }
    function parse_js_number(num) {
        if (RE_HEX_NUMBER.test(num)) {
            return parseInt(num.substr(2), 16);
        } else if (RE_OCT_NUMBER.test(num)) {
            return parseInt(num.substr(1), 8);
        } else {
            var val = parseFloat(num);
            if (val == num) return val;
        }
    }
    function JS_Parse_Error(message, filename, line, col, pos) {
        this.message = message;
        this.filename = filename;
        this.line = line;
        this.col = col;
        this.pos = pos;
    }
    JS_Parse_Error.prototype = Object.create(Error.prototype);
    JS_Parse_Error.prototype.constructor = JS_Parse_Error;
    JS_Parse_Error.prototype.name = "SyntaxError";
    configure_error_stack(JS_Parse_Error);
    function js_error(message, filename, line, col, pos) {
        throw new JS_Parse_Error(message, filename, line, col, pos);
    }
    function is_token(token, type, val) {
        return token.type == type && (val == null || token.value == val);
    }
    var EX_EOF = {};
    function tokenizer($TEXT, filename, html5_comments, shebang) {
        var S = {
            text: $TEXT,
            filename: filename,
            pos: 0,
            tokpos: 0,
            line: 1,
            tokline: 0,
            col: 0,
            tokcol: 0,
            newline_before: false,
            regex_allowed: false,
            comments_before: [],
            directives: {},
            directive_stack: []
        };
        function peek() {
            return S.text.charAt(S.pos);
        }
        function next(signal_eof, in_string) {
            var ch = S.text.charAt(S.pos++);
            if (signal_eof && !ch) throw EX_EOF;
            if (NEWLINE_CHARS(ch)) {
                S.newline_before = S.newline_before || !in_string;
                ++S.line;
                S.col = 0;
                if (!in_string && ch == "\r" && peek() == "\n") {
                    ++S.pos;
                    ch = "\n";
                }
            } else {
                ++S.col;
            }
            return ch;
        }
        function forward(i) {
            while (i-- > 0) next();
        }
        function looking_at(str) {
            return S.text.substr(S.pos, str.length) == str;
        }
        function find_eol() {
            var text = S.text;
            for (var i = S.pos, n = S.text.length; i < n; ++i) {
                var ch = text[i];
                if (NEWLINE_CHARS(ch)) return i;
            }
            return -1;
        }
        function find(what, signal_eof) {
            var pos = S.text.indexOf(what, S.pos);
            if (signal_eof && pos == -1) throw EX_EOF;
            return pos;
        }
        function start_token() {
            S.tokline = S.line;
            S.tokcol = S.col;
            S.tokpos = S.pos;
        }
        var prev_was_dot = false;
        function token(type, value, is_comment) {
            S.regex_allowed = type == "operator" && !UNARY_POSTFIX(value) || type == "keyword" && KEYWORDS_BEFORE_EXPRESSION(value) || type == "punc" && PUNC_BEFORE_EXPRESSION(value);
            if (type == "punc" && value == ".") {
                prev_was_dot = true;
            } else if (!is_comment) {
                prev_was_dot = false;
            }
            var ret = {
                type: type,
                value: value,
                line: S.tokline,
                col: S.tokcol,
                pos: S.tokpos,
                endline: S.line,
                endcol: S.col,
                endpos: S.pos,
                nlb: S.newline_before,
                file: filename
            };
            if (/^(?:num|string|regexp)$/i.test(type)) {
                ret.raw = $TEXT.substring(ret.pos, ret.endpos);
            }
            if (!is_comment) {
                ret.comments_before = S.comments_before;
                ret.comments_after = S.comments_before = [];
            }
            S.newline_before = false;
            return new AST_Token(ret);
        }
        function skip_whitespace() {
            while (WHITESPACE_CHARS(peek())) next();
        }
        function read_while(pred) {
            var ret = "", ch, i = 0;
            while ((ch = peek()) && pred(ch, i++)) ret += next();
            return ret;
        }
        function parse_error(err) {
            js_error(err, filename, S.tokline, S.tokcol, S.tokpos);
        }
        function read_num(prefix) {
            var has_e = false, after_e = false, has_x = false, has_dot = prefix == ".";
            var num = read_while(function(ch, i) {
                var code = ch.charCodeAt(0);
                switch (code) {
                  case 120:
                  case 88:
                    return has_x ? false : has_x = true;

                  case 101:
                  case 69:
                    return has_x ? true : has_e ? false : has_e = after_e = true;

                  case 45:
                    return after_e || i == 0 && !prefix;

                  case 43:
                    return after_e;

                  case after_e = false, 46:
                    return !has_dot && !has_x && !has_e ? has_dot = true : false;
                }
                return is_alphanumeric_char(code);
            });
            if (prefix) num = prefix + num;
            if (RE_OCT_NUMBER.test(num) && next_token.has_directive("use strict")) {
                parse_error("Legacy octal literals are not allowed in strict mode");
            }
            var valid = parse_js_number(num);
            if (!isNaN(valid)) {
                return token("num", valid);
            } else {
                parse_error("Invalid syntax: " + num);
            }
        }
        function read_escaped_char(in_string) {
            var ch = next(true, in_string);
            switch (ch.charCodeAt(0)) {
              case 110:
                return "\n";

              case 114:
                return "\r";

              case 116:
                return "\t";

              case 98:
                return "\b";

              case 118:
                return "\v";

              case 102:
                return "\f";

              case 120:
                return String.fromCharCode(hex_bytes(2));

              case 117:
                return String.fromCharCode(hex_bytes(4));

              case 10:
                return "";

              case 13:
                if (peek() == "\n") {
                    next(true, in_string);
                    return "";
                }
            }
            if (ch >= "0" && ch <= "7") return read_octal_escape_sequence(ch);
            return ch;
        }
        function read_octal_escape_sequence(ch) {
            var p = peek();
            if (p >= "0" && p <= "7") {
                ch += next(true);
                if (ch[0] <= "3" && (p = peek()) >= "0" && p <= "7") ch += next(true);
            }
            if (ch === "0") return "\0";
            if (ch.length > 0 && next_token.has_directive("use strict")) parse_error("Legacy octal escape sequences are not allowed in strict mode");
            return String.fromCharCode(parseInt(ch, 8));
        }
        function hex_bytes(n) {
            var num = 0;
            for (;n > 0; --n) {
                var digit = parseInt(next(true), 16);
                if (isNaN(digit)) parse_error("Invalid hex-character pattern in string");
                num = num << 4 | digit;
            }
            return num;
        }
        var read_string = with_eof_error("Unterminated string constant", function(quote_char) {
            var quote = next(), ret = "";
            for (;;) {
                var ch = next(true, true);
                if (ch == "\\") ch = read_escaped_char(true); else if (NEWLINE_CHARS(ch)) parse_error("Unterminated string constant"); else if (ch == quote) break;
                ret += ch;
            }
            var tok = token("string", ret);
            tok.quote = quote_char;
            return tok;
        });
        function skip_line_comment(type) {
            var regex_allowed = S.regex_allowed;
            var i = find_eol(), ret;
            if (i == -1) {
                ret = S.text.substr(S.pos);
                S.pos = S.text.length;
            } else {
                ret = S.text.substring(S.pos, i);
                S.pos = i;
            }
            S.col = S.tokcol + (S.pos - S.tokpos);
            S.comments_before.push(token(type, ret, true));
            S.regex_allowed = regex_allowed;
            return next_token;
        }
        var skip_multiline_comment = with_eof_error("Unterminated multiline comment", function() {
            var regex_allowed = S.regex_allowed;
            var i = find("*/", true);
            var text = S.text.substring(S.pos, i).replace(/\r\n|\r|\u2028|\u2029/g, "\n");
            forward(text.length + 2);
            S.comments_before.push(token("comment2", text, true));
            S.regex_allowed = regex_allowed;
            return next_token;
        });
        function read_name() {
            var backslash = false, name = "", ch, escaped = false, hex;
            while ((ch = peek()) != null) {
                if (!backslash) {
                    if (ch == "\\") escaped = backslash = true, next(); else if (is_identifier_char(ch)) name += next(); else break;
                } else {
                    if (ch != "u") parse_error("Expecting UnicodeEscapeSequence -- uXXXX");
                    ch = read_escaped_char();
                    if (!is_identifier_char(ch)) parse_error("Unicode char: " + ch.charCodeAt(0) + " is not valid in identifier");
                    name += ch;
                    backslash = false;
                }
            }
            if (KEYWORDS(name) && escaped) {
                hex = name.charCodeAt(0).toString(16).toUpperCase();
                name = "\\u" + "0000".substr(hex.length) + hex + name.slice(1);
            }
            return name;
        }
        var read_regexp = with_eof_error("Unterminated regular expression", function(source) {
            var prev_backslash = false, ch, in_class = false;
            while (ch = next(true)) if (NEWLINE_CHARS(ch)) {
                parse_error("Unexpected line terminator");
            } else if (prev_backslash) {
                source += "\\" + ch;
                prev_backslash = false;
            } else if (ch == "[") {
                in_class = true;
                source += ch;
            } else if (ch == "]" && in_class) {
                in_class = false;
                source += ch;
            } else if (ch == "/" && !in_class) {
                break;
            } else if (ch == "\\") {
                prev_backslash = true;
            } else {
                source += ch;
            }
            var mods = read_name();
            try {
                var regexp = new RegExp(source, mods);
                regexp.raw_source = source;
                return token("regexp", regexp);
            } catch (e) {
                parse_error(e.message);
            }
        });
        function read_operator(prefix) {
            function grow(op) {
                if (!peek()) return op;
                var bigger = op + peek();
                if (OPERATORS(bigger)) {
                    next();
                    return grow(bigger);
                } else {
                    return op;
                }
            }
            return token("operator", grow(prefix || next()));
        }
        function handle_slash() {
            next();
            switch (peek()) {
              case "/":
                next();
                return skip_line_comment("comment1");

              case "*":
                next();
                return skip_multiline_comment();
            }
            return S.regex_allowed ? read_regexp("") : read_operator("/");
        }
        function handle_dot() {
            next();
            return is_digit(peek().charCodeAt(0)) ? read_num(".") : token("punc", ".");
        }
        function read_word() {
            var word = read_name();
            if (prev_was_dot) return token("name", word);
            return KEYWORDS_ATOM(word) ? token("atom", word) : !KEYWORDS(word) ? token("name", word) : OPERATORS(word) ? token("operator", word) : token("keyword", word);
        }
        function with_eof_error(eof_error, cont) {
            return function(x) {
                try {
                    return cont(x);
                } catch (ex) {
                    if (ex === EX_EOF) parse_error(eof_error); else throw ex;
                }
            };
        }
        function next_token(force_regexp) {
            if (force_regexp != null) return read_regexp(force_regexp);
            if (shebang && S.pos == 0 && looking_at("#!")) {
                start_token();
                forward(2);
                skip_line_comment("comment5");
            }
            for (;;) {
                skip_whitespace();
                start_token();
                if (html5_comments) {
                    if (looking_at("\x3c!--")) {
                        forward(4);
                        skip_line_comment("comment3");
                        continue;
                    }
                    if (looking_at("--\x3e") && S.newline_before) {
                        forward(3);
                        skip_line_comment("comment4");
                        continue;
                    }
                }
                var ch = peek();
                if (!ch) return token("eof");
                var code = ch.charCodeAt(0);
                switch (code) {
                  case 34:
                  case 39:
                    return read_string(ch);

                  case 46:
                    return handle_dot();

                  case 47:
                    {
                        var tok = handle_slash();
                        if (tok === next_token) continue;
                        return tok;
                    }
                }
                if (is_digit(code)) return read_num();
                if (PUNC_CHARS(ch)) return token("punc", next());
                if (OPERATOR_CHARS(ch)) return read_operator();
                if (code == 92 || is_identifier_start(code)) return read_word();
                break;
            }
            parse_error("Unexpected character '" + ch + "'");
        }
        next_token.context = function(nc) {
            if (nc) S = nc;
            return S;
        };
        next_token.add_directive = function(directive) {
            S.directive_stack[S.directive_stack.length - 1].push(directive);
            if (S.directives[directive] === undefined) {
                S.directives[directive] = 1;
            } else {
                S.directives[directive]++;
            }
        };
        next_token.push_directives_stack = function() {
            S.directive_stack.push([]);
        };
        next_token.pop_directives_stack = function() {
            var directives = S.directive_stack[S.directive_stack.length - 1];
            for (var i = 0; i < directives.length; i++) {
                S.directives[directives[i]]--;
            }
            S.directive_stack.pop();
        };
        next_token.has_directive = function(directive) {
            return S.directives[directive] > 0;
        };
        return next_token;
    }
    var UNARY_PREFIX = makePredicate([ "typeof", "void", "delete", "--", "++", "!", "~", "-", "+" ]);
    var UNARY_POSTFIX = makePredicate([ "--", "++" ]);
    var ASSIGNMENT = makePredicate([ "=", "+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "^=", "&=" ]);
    var PRECEDENCE = function(a, ret) {
        for (var i = 0; i < a.length; ++i) {
            var b = a[i];
            for (var j = 0; j < b.length; ++j) {
                ret[b[j]] = i + 1;
            }
        }
        return ret;
    }([ [ "||" ], [ "&&" ], [ "|" ], [ "^" ], [ "&" ], [ "==", "===", "!=", "!==" ], [ "<", ">", "<=", ">=", "in", "instanceof" ], [ ">>", "<<", ">>>" ], [ "+", "-" ], [ "*", "/", "%" ] ], {});
    var ATOMIC_START_TOKEN = makePredicate([ "atom", "num", "string", "regexp", "name" ]);
    function parse($TEXT, options) {
        options = defaults(options, {
            bare_returns: false,
            expression: false,
            filename: null,
            html5_comments: true,
            shebang: true,
            strict: false,
            toplevel: null
        }, true);
        var S = {
            input: typeof $TEXT == "string" ? tokenizer($TEXT, options.filename, options.html5_comments, options.shebang) : $TEXT,
            token: null,
            prev: null,
            peeked: null,
            in_function: 0,
            in_directives: true,
            in_loop: 0,
            labels: []
        };
        S.token = next();
        function is(type, value) {
            return is_token(S.token, type, value);
        }
        function peek() {
            return S.peeked || (S.peeked = S.input());
        }
        function next() {
            S.prev = S.token;
            if (S.peeked) {
                S.token = S.peeked;
                S.peeked = null;
            } else {
                S.token = S.input();
            }
            S.in_directives = S.in_directives && (S.token.type == "string" || is("punc", ";"));
            return S.token;
        }
        function prev() {
            return S.prev;
        }
        function croak(msg, line, col, pos) {
            var ctx = S.input.context();
            js_error(msg, ctx.filename, line != null ? line : ctx.tokline, col != null ? col : ctx.tokcol, pos != null ? pos : ctx.tokpos);
        }
        function token_error(token, msg) {
            croak(msg, token.line, token.col);
        }
        function unexpected(token) {
            if (token == null) token = S.token;
            token_error(token, "Unexpected token: " + token.type + " (" + token.value + ")");
        }
        function expect_token(type, val) {
            if (is(type, val)) {
                return next();
            }
            token_error(S.token, "Unexpected token " + S.token.type + " «" + S.token.value + "»" + ", expected " + type + " «" + val + "»");
        }
        function expect(punc) {
            return expect_token("punc", punc);
        }
        function has_newline_before(token) {
            return token.nlb || !all(token.comments_before, function(comment) {
                return !comment.nlb;
            });
        }
        function can_insert_semicolon() {
            return !options.strict && (is("eof") || is("punc", "}") || has_newline_before(S.token));
        }
        function semicolon(optional) {
            if (is("punc", ";")) next(); else if (!optional && !can_insert_semicolon()) unexpected();
        }
        function parenthesised() {
            expect("(");
            var exp = expression(true);
            expect(")");
            return exp;
        }
        function embed_tokens(parser) {
            return function() {
                var start = S.token;
                var expr = parser.apply(null, arguments);
                var end = prev();
                expr.start = start;
                expr.end = end;
                return expr;
            };
        }
        function handle_regexp() {
            if (is("operator", "/") || is("operator", "/=")) {
                S.peeked = null;
                S.token = S.input(S.token.value.substr(1));
            }
        }
        var statement = embed_tokens(function(strict_defun) {
            handle_regexp();
            switch (S.token.type) {
              case "string":
                if (S.in_directives) {
                    var token = peek();
                    if (S.token.raw.indexOf("\\") == -1 && (is_token(token, "punc", ";") || is_token(token, "punc", "}") || has_newline_before(token) || is_token(token, "eof"))) {
                        S.input.add_directive(S.token.value);
                    } else {
                        S.in_directives = false;
                    }
                }
                var dir = S.in_directives, stat = simple_statement();
                return dir ? new AST_Directive(stat.body) : stat;

              case "num":
              case "regexp":
              case "operator":
              case "atom":
                return simple_statement();

              case "name":
                return is_token(peek(), "punc", ":") ? labeled_statement() : simple_statement();

              case "punc":
                switch (S.token.value) {
                  case "{":
                    return new AST_BlockStatement({
                        start: S.token,
                        body: block_(),
                        end: prev()
                    });

                  case "[":
                  case "(":
                    return simple_statement();

                  case ";":
                    S.in_directives = false;
                    next();
                    return new AST_EmptyStatement();

                  default:
                    unexpected();
                }

              case "keyword":
                switch (S.token.value) {
                  case "break":
                    next();
                    return break_cont(AST_Break);

                  case "continue":
                    next();
                    return break_cont(AST_Continue);

                  case "debugger":
                    next();
                    semicolon();
                    return new AST_Debugger();

                  case "do":
                    next();
                    var body = in_loop(statement);
                    expect_token("keyword", "while");
                    var condition = parenthesised();
                    semicolon(true);
                    return new AST_Do({
                        body: body,
                        condition: condition
                    });

                  case "while":
                    next();
                    return new AST_While({
                        condition: parenthesised(),
                        body: in_loop(statement)
                    });

                  case "for":
                    next();
                    return for_();

                  case "function":
                    if (!strict_defun && S.input.has_directive("use strict")) {
                        croak("In strict mode code, functions can only be declared at top level or immediately within another function.");
                    }
                    next();
                    return function_(AST_Defun);

                  case "if":
                    next();
                    return if_();

                  case "return":
                    if (S.in_function == 0 && !options.bare_returns) croak("'return' outside of function");
                    next();
                    var value = null;
                    if (is("punc", ";")) {
                        next();
                    } else if (!can_insert_semicolon()) {
                        value = expression(true);
                        semicolon();
                    }
                    return new AST_Return({
                        value: value
                    });

                  case "switch":
                    next();
                    return new AST_Switch({
                        expression: parenthesised(),
                        body: in_loop(switch_body_)
                    });

                  case "throw":
                    next();
                    if (has_newline_before(S.token)) croak("Illegal newline after 'throw'");
                    var value = expression(true);
                    semicolon();
                    return new AST_Throw({
                        value: value
                    });

                  case "try":
                    next();
                    return try_();

                  case "var":
                    next();
                    var node = var_();
                    semicolon();
                    return node;

                  case "with":
                    if (S.input.has_directive("use strict")) {
                        croak("Strict mode may not include a with statement");
                    }
                    next();
                    return new AST_With({
                        expression: parenthesised(),
                        body: statement()
                    });
                }
            }
            unexpected();
        });
        function labeled_statement() {
            var label = as_symbol(AST_Label);
            if (!all(S.labels, function(l) {
                return l.name != label.name;
            })) {
                croak("Label " + label.name + " defined twice");
            }
            expect(":");
            S.labels.push(label);
            var stat = statement();
            S.labels.pop();
            if (!(stat instanceof AST_IterationStatement)) {
                label.references.forEach(function(ref) {
                    if (ref instanceof AST_Continue) {
                        ref = ref.label.start;
                        croak("Continue label `" + label.name + "` refers to non-IterationStatement.", ref.line, ref.col, ref.pos);
                    }
                });
            }
            return new AST_LabeledStatement({
                body: stat,
                label: label
            });
        }
        function simple_statement(tmp) {
            return new AST_SimpleStatement({
                body: (tmp = expression(true), semicolon(), tmp)
            });
        }
        function break_cont(type) {
            var label = null, ldef;
            if (!can_insert_semicolon()) {
                label = as_symbol(AST_LabelRef, true);
            }
            if (label != null) {
                ldef = find_if(function(l) {
                    return l.name == label.name;
                }, S.labels);
                if (!ldef) croak("Undefined label " + label.name);
                label.thedef = ldef;
            } else if (S.in_loop == 0) croak(type.TYPE + " not inside a loop or switch");
            semicolon();
            var stat = new type({
                label: label
            });
            if (ldef) ldef.references.push(stat);
            return stat;
        }
        function for_() {
            expect("(");
            var init = null;
            if (!is("punc", ";")) {
                init = is("keyword", "var") ? (next(), var_(true)) : expression(true, true);
                if (is("operator", "in")) {
                    if (init instanceof AST_Var) {
                        if (init.definitions.length > 1) croak("Only one variable declaration allowed in for..in loop", init.start.line, init.start.col, init.start.pos);
                    } else if (!is_assignable(init)) {
                        croak("Invalid left-hand side in for..in loop", init.start.line, init.start.col, init.start.pos);
                    }
                    next();
                    return for_in(init);
                }
            }
            return regular_for(init);
        }
        function regular_for(init) {
            expect(";");
            var test = is("punc", ";") ? null : expression(true);
            expect(";");
            var step = is("punc", ")") ? null : expression(true);
            expect(")");
            return new AST_For({
                init: init,
                condition: test,
                step: step,
                body: in_loop(statement)
            });
        }
        function for_in(init) {
            var obj = expression(true);
            expect(")");
            return new AST_ForIn({
                init: init,
                object: obj,
                body: in_loop(statement)
            });
        }
        var function_ = function(ctor) {
            var in_statement = ctor === AST_Defun;
            var name = is("name") ? as_symbol(in_statement ? AST_SymbolDefun : AST_SymbolLambda) : null;
            if (in_statement && !name) unexpected();
            if (name && ctor !== AST_Accessor && !(name instanceof AST_SymbolDeclaration)) unexpected(prev());
            expect("(");
            var argnames = [];
            for (var first = true; !is("punc", ")"); ) {
                if (first) first = false; else expect(",");
                argnames.push(as_symbol(AST_SymbolFunarg));
            }
            next();
            var loop = S.in_loop;
            var labels = S.labels;
            ++S.in_function;
            S.in_directives = true;
            S.input.push_directives_stack();
            S.in_loop = 0;
            S.labels = [];
            var body = block_(true);
            if (S.input.has_directive("use strict")) {
                if (name) strict_verify_symbol(name);
                argnames.forEach(strict_verify_symbol);
            }
            S.input.pop_directives_stack();
            --S.in_function;
            S.in_loop = loop;
            S.labels = labels;
            return new ctor({
                name: name,
                argnames: argnames,
                body: body
            });
        };
        function if_() {
            var cond = parenthesised(), body = statement(), belse = null;
            if (is("keyword", "else")) {
                next();
                belse = statement();
            }
            return new AST_If({
                condition: cond,
                body: body,
                alternative: belse
            });
        }
        function block_(strict_defun) {
            expect("{");
            var a = [];
            while (!is("punc", "}")) {
                if (is("eof")) unexpected();
                a.push(statement(strict_defun));
            }
            next();
            return a;
        }
        function switch_body_() {
            expect("{");
            var a = [], cur = null, branch = null, tmp;
            while (!is("punc", "}")) {
                if (is("eof")) unexpected();
                if (is("keyword", "case")) {
                    if (branch) branch.end = prev();
                    cur = [];
                    branch = new AST_Case({
                        start: (tmp = S.token, next(), tmp),
                        expression: expression(true),
                        body: cur
                    });
                    a.push(branch);
                    expect(":");
                } else if (is("keyword", "default")) {
                    if (branch) branch.end = prev();
                    cur = [];
                    branch = new AST_Default({
                        start: (tmp = S.token, next(), expect(":"), tmp),
                        body: cur
                    });
                    a.push(branch);
                } else {
                    if (!cur) unexpected();
                    cur.push(statement());
                }
            }
            if (branch) branch.end = prev();
            next();
            return a;
        }
        function try_() {
            var body = block_(), bcatch = null, bfinally = null;
            if (is("keyword", "catch")) {
                var start = S.token;
                next();
                expect("(");
                var name = as_symbol(AST_SymbolCatch);
                expect(")");
                bcatch = new AST_Catch({
                    start: start,
                    argname: name,
                    body: block_(),
                    end: prev()
                });
            }
            if (is("keyword", "finally")) {
                var start = S.token;
                next();
                bfinally = new AST_Finally({
                    start: start,
                    body: block_(),
                    end: prev()
                });
            }
            if (!bcatch && !bfinally) croak("Missing catch/finally blocks");
            return new AST_Try({
                body: body,
                bcatch: bcatch,
                bfinally: bfinally
            });
        }
        function vardefs(no_in) {
            var a = [];
            for (;;) {
                a.push(new AST_VarDef({
                    start: S.token,
                    name: as_symbol(AST_SymbolVar),
                    value: is("operator", "=") ? (next(), expression(false, no_in)) : null,
                    end: prev()
                }));
                if (!is("punc", ",")) break;
                next();
            }
            return a;
        }
        var var_ = function(no_in) {
            return new AST_Var({
                start: prev(),
                definitions: vardefs(no_in),
                end: prev()
            });
        };
        var new_ = function(allow_calls) {
            var start = S.token;
            expect_token("operator", "new");
            var newexp = expr_atom(false), args;
            if (is("punc", "(")) {
                next();
                args = expr_list(")");
            } else {
                args = [];
            }
            var call = new AST_New({
                start: start,
                expression: newexp,
                args: args,
                end: prev()
            });
            mark_pure(call);
            return subscripts(call, allow_calls);
        };
        function as_atom_node() {
            var tok = S.token, ret;
            switch (tok.type) {
              case "name":
                ret = _make_symbol(AST_SymbolRef);
                break;

              case "num":
                ret = new AST_Number({
                    start: tok,
                    end: tok,
                    value: tok.value
                });
                break;

              case "string":
                ret = new AST_String({
                    start: tok,
                    end: tok,
                    value: tok.value,
                    quote: tok.quote
                });
                break;

              case "regexp":
                ret = new AST_RegExp({
                    start: tok,
                    end: tok,
                    value: tok.value
                });
                break;

              case "atom":
                switch (tok.value) {
                  case "false":
                    ret = new AST_False({
                        start: tok,
                        end: tok
                    });
                    break;

                  case "true":
                    ret = new AST_True({
                        start: tok,
                        end: tok
                    });
                    break;

                  case "null":
                    ret = new AST_Null({
                        start: tok,
                        end: tok
                    });
                    break;
                }
                break;
            }
            next();
            return ret;
        }
        var expr_atom = function(allow_calls) {
            if (is("operator", "new")) {
                return new_(allow_calls);
            }
            var start = S.token;
            if (is("punc")) {
                switch (start.value) {
                  case "(":
                    next();
                    var ex = expression(true);
                    var len = start.comments_before.length;
                    [].unshift.apply(ex.start.comments_before, start.comments_before);
                    start.comments_before = ex.start.comments_before;
                    start.comments_before_length = len;
                    if (len == 0 && start.comments_before.length > 0) {
                        var comment = start.comments_before[0];
                        if (!comment.nlb) {
                            comment.nlb = start.nlb;
                            start.nlb = false;
                        }
                    }
                    start.comments_after = ex.start.comments_after;
                    ex.start = start;
                    expect(")");
                    var end = prev();
                    end.comments_before = ex.end.comments_before;
                    [].push.apply(ex.end.comments_after, end.comments_after);
                    end.comments_after = ex.end.comments_after;
                    ex.end = end;
                    if (ex instanceof AST_Call) mark_pure(ex);
                    return subscripts(ex, allow_calls);

                  case "[":
                    return subscripts(array_(), allow_calls);

                  case "{":
                    return subscripts(object_(), allow_calls);
                }
                unexpected();
            }
            if (is("keyword", "function")) {
                next();
                var func = function_(AST_Function);
                func.start = start;
                func.end = prev();
                return subscripts(func, allow_calls);
            }
            if (ATOMIC_START_TOKEN(S.token.type)) {
                return subscripts(as_atom_node(), allow_calls);
            }
            unexpected();
        };
        function expr_list(closing, allow_trailing_comma, allow_empty) {
            var first = true, a = [];
            while (!is("punc", closing)) {
                if (first) first = false; else expect(",");
                if (allow_trailing_comma && is("punc", closing)) break;
                if (is("punc", ",") && allow_empty) {
                    a.push(new AST_Hole({
                        start: S.token,
                        end: S.token
                    }));
                } else {
                    a.push(expression(false));
                }
            }
            next();
            return a;
        }
        var array_ = embed_tokens(function() {
            expect("[");
            return new AST_Array({
                elements: expr_list("]", !options.strict, true)
            });
        });
        var create_accessor = embed_tokens(function() {
            return function_(AST_Accessor);
        });
        var object_ = embed_tokens(function() {
            expect("{");
            var first = true, a = [];
            while (!is("punc", "}")) {
                if (first) first = false; else expect(",");
                if (!options.strict && is("punc", "}")) break;
                var start = S.token;
                var type = start.type;
                var name = as_property_name();
                if (type == "name" && !is("punc", ":")) {
                    var key = new AST_SymbolAccessor({
                        start: S.token,
                        name: "" + as_property_name(),
                        end: prev()
                    });
                    if (name == "get") {
                        a.push(new AST_ObjectGetter({
                            start: start,
                            key: key,
                            value: create_accessor(),
                            end: prev()
                        }));
                        continue;
                    }
                    if (name == "set") {
                        a.push(new AST_ObjectSetter({
                            start: start,
                            key: key,
                            value: create_accessor(),
                            end: prev()
                        }));
                        continue;
                    }
                }
                expect(":");
                a.push(new AST_ObjectKeyVal({
                    start: start,
                    quote: start.quote,
                    key: "" + name,
                    value: expression(false),
                    end: prev()
                }));
            }
            next();
            return new AST_Object({
                properties: a
            });
        });
        function as_property_name() {
            var tmp = S.token;
            switch (tmp.type) {
              case "operator":
                if (!KEYWORDS(tmp.value)) unexpected();

              case "num":
              case "string":
              case "name":
              case "keyword":
              case "atom":
                next();
                return tmp.value;

              default:
                unexpected();
            }
        }
        function as_name() {
            var tmp = S.token;
            if (tmp.type != "name") unexpected();
            next();
            return tmp.value;
        }
        function _make_symbol(type) {
            var name = S.token.value;
            return new (name == "this" ? AST_This : type)({
                name: String(name),
                start: S.token,
                end: S.token
            });
        }
        function strict_verify_symbol(sym) {
            if (sym.name == "arguments" || sym.name == "eval") croak("Unexpected " + sym.name + " in strict mode", sym.start.line, sym.start.col, sym.start.pos);
        }
        function as_symbol(type, noerror) {
            if (!is("name")) {
                if (!noerror) croak("Name expected");
                return null;
            }
            var sym = _make_symbol(type);
            if (S.input.has_directive("use strict") && sym instanceof AST_SymbolDeclaration) {
                strict_verify_symbol(sym);
            }
            next();
            return sym;
        }
        function mark_pure(call) {
            var start = call.start;
            var comments = start.comments_before;
            var i = HOP(start, "comments_before_length") ? start.comments_before_length : comments.length;
            while (--i >= 0) {
                var comment = comments[i];
                if (/[@#]__PURE__/.test(comment.value)) {
                    call.pure = comment;
                    break;
                }
            }
        }
        var subscripts = function(expr, allow_calls) {
            var start = expr.start;
            if (is("punc", ".")) {
                next();
                return subscripts(new AST_Dot({
                    start: start,
                    expression: expr,
                    property: as_name(),
                    end: prev()
                }), allow_calls);
            }
            if (is("punc", "[")) {
                next();
                var prop = expression(true);
                expect("]");
                return subscripts(new AST_Sub({
                    start: start,
                    expression: expr,
                    property: prop,
                    end: prev()
                }), allow_calls);
            }
            if (allow_calls && is("punc", "(")) {
                next();
                var call = new AST_Call({
                    start: start,
                    expression: expr,
                    args: expr_list(")"),
                    end: prev()
                });
                mark_pure(call);
                return subscripts(call, true);
            }
            return expr;
        };
        var maybe_unary = function(allow_calls) {
            var start = S.token;
            if (is("operator") && UNARY_PREFIX(start.value)) {
                next();
                handle_regexp();
                var ex = make_unary(AST_UnaryPrefix, start, maybe_unary(allow_calls));
                ex.start = start;
                ex.end = prev();
                return ex;
            }
            var val = expr_atom(allow_calls);
            while (is("operator") && UNARY_POSTFIX(S.token.value) && !has_newline_before(S.token)) {
                val = make_unary(AST_UnaryPostfix, S.token, val);
                val.start = start;
                val.end = S.token;
                next();
            }
            return val;
        };
        function make_unary(ctor, token, expr) {
            var op = token.value;
            switch (op) {
              case "++":
              case "--":
                if (!is_assignable(expr)) croak("Invalid use of " + op + " operator", token.line, token.col, token.pos);
                break;

              case "delete":
                if (expr instanceof AST_SymbolRef && S.input.has_directive("use strict")) croak("Calling delete on expression not allowed in strict mode", expr.start.line, expr.start.col, expr.start.pos);
                break;
            }
            return new ctor({
                operator: op,
                expression: expr
            });
        }
        var expr_op = function(left, min_prec, no_in) {
            var op = is("operator") ? S.token.value : null;
            if (op == "in" && no_in) op = null;
            var prec = op != null ? PRECEDENCE[op] : null;
            if (prec != null && prec > min_prec) {
                next();
                var right = expr_op(maybe_unary(true), prec, no_in);
                return expr_op(new AST_Binary({
                    start: left.start,
                    left: left,
                    operator: op,
                    right: right,
                    end: right.end
                }), min_prec, no_in);
            }
            return left;
        };
        function expr_ops(no_in) {
            return expr_op(maybe_unary(true), 0, no_in);
        }
        var maybe_conditional = function(no_in) {
            var start = S.token;
            var expr = expr_ops(no_in);
            if (is("operator", "?")) {
                next();
                var yes = expression(false);
                expect(":");
                return new AST_Conditional({
                    start: start,
                    condition: expr,
                    consequent: yes,
                    alternative: expression(false, no_in),
                    end: prev()
                });
            }
            return expr;
        };
        function is_assignable(expr) {
            return expr instanceof AST_PropAccess || expr instanceof AST_SymbolRef;
        }
        var maybe_assign = function(no_in) {
            var start = S.token;
            var left = maybe_conditional(no_in), val = S.token.value;
            if (is("operator") && ASSIGNMENT(val)) {
                if (is_assignable(left)) {
                    next();
                    return new AST_Assign({
                        start: start,
                        left: left,
                        operator: val,
                        right: maybe_assign(no_in),
                        end: prev()
                    });
                }
                croak("Invalid assignment");
            }
            return left;
        };
        var expression = function(commas, no_in) {
            var start = S.token;
            var exprs = [];
            while (true) {
                exprs.push(maybe_assign(no_in));
                if (!commas || !is("punc", ",")) break;
                next();
                commas = true;
            }
            return exprs.length == 1 ? exprs[0] : new AST_Sequence({
                start: start,
                expressions: exprs,
                end: peek()
            });
        };
        function in_loop(cont) {
            ++S.in_loop;
            var ret = cont();
            --S.in_loop;
            return ret;
        }
        if (options.expression) {
            return expression(true);
        }
        return function() {
            var start = S.token;
            var body = [];
            S.input.push_directives_stack();
            while (!is("eof")) body.push(statement(true));
            S.input.pop_directives_stack();
            var end = prev();
            var toplevel = options.toplevel;
            if (toplevel) {
                toplevel.body = toplevel.body.concat(body);
                toplevel.end = end;
            } else {
                toplevel = new AST_Toplevel({
                    start: start,
                    body: body,
                    end: end
                });
            }
            return toplevel;
        }();
    }
    "use strict";
    function TreeTransformer(before, after) {
        TreeWalker.call(this);
        this.before = before;
        this.after = after;
    }
    TreeTransformer.prototype = new TreeWalker();
    (function(undefined) {
        function _(node, descend) {
            node.DEFMETHOD("transform", function(tw, in_list) {
                var x, y;
                tw.push(this);
                if (tw.before) x = tw.before(this, descend, in_list);
                if (x === undefined) {
                    x = this;
                    descend(x, tw);
                    if (tw.after) {
                        y = tw.after(x, in_list);
                        if (y !== undefined) x = y;
                    }
                }
                tw.pop();
                return x;
            });
        }
        function do_list(list, tw) {
            return MAP(list, function(node) {
                return node.transform(tw, true);
            });
        }
        _(AST_Node, noop);
        _(AST_LabeledStatement, function(self, tw) {
            self.label = self.label.transform(tw);
            self.body = self.body.transform(tw);
        });
        _(AST_SimpleStatement, function(self, tw) {
            self.body = self.body.transform(tw);
        });
        _(AST_Block, function(self, tw) {
            self.body = do_list(self.body, tw);
        });
        _(AST_DWLoop, function(self, tw) {
            self.condition = self.condition.transform(tw);
            self.body = self.body.transform(tw);
        });
        _(AST_For, function(self, tw) {
            if (self.init) self.init = self.init.transform(tw);
            if (self.condition) self.condition = self.condition.transform(tw);
            if (self.step) self.step = self.step.transform(tw);
            self.body = self.body.transform(tw);
        });
        _(AST_ForIn, function(self, tw) {
            self.init = self.init.transform(tw);
            self.object = self.object.transform(tw);
            self.body = self.body.transform(tw);
        });
        _(AST_With, function(self, tw) {
            self.expression = self.expression.transform(tw);
            self.body = self.body.transform(tw);
        });
        _(AST_Exit, function(self, tw) {
            if (self.value) self.value = self.value.transform(tw);
        });
        _(AST_LoopControl, function(self, tw) {
            if (self.label) self.label = self.label.transform(tw);
        });
        _(AST_If, function(self, tw) {
            self.condition = self.condition.transform(tw);
            self.body = self.body.transform(tw);
            if (self.alternative) self.alternative = self.alternative.transform(tw);
        });
        _(AST_Switch, function(self, tw) {
            self.expression = self.expression.transform(tw);
            self.body = do_list(self.body, tw);
        });
        _(AST_Case, function(self, tw) {
            self.expression = self.expression.transform(tw);
            self.body = do_list(self.body, tw);
        });
        _(AST_Try, function(self, tw) {
            self.body = do_list(self.body, tw);
            if (self.bcatch) self.bcatch = self.bcatch.transform(tw);
            if (self.bfinally) self.bfinally = self.bfinally.transform(tw);
        });
        _(AST_Catch, function(self, tw) {
            self.argname = self.argname.transform(tw);
            self.body = do_list(self.body, tw);
        });
        _(AST_Definitions, function(self, tw) {
            self.definitions = do_list(self.definitions, tw);
        });
        _(AST_VarDef, function(self, tw) {
            self.name = self.name.transform(tw);
            if (self.value) self.value = self.value.transform(tw);
        });
        _(AST_Lambda, function(self, tw) {
            if (self.name) self.name = self.name.transform(tw);
            self.argnames = do_list(self.argnames, tw);
            self.body = do_list(self.body, tw);
        });
        _(AST_Call, function(self, tw) {
            self.expression = self.expression.transform(tw);
            self.args = do_list(self.args, tw);
        });
        _(AST_Sequence, function(self, tw) {
            self.expressions = do_list(self.expressions, tw);
        });
        _(AST_Dot, function(self, tw) {
            self.expression = self.expression.transform(tw);
        });
        _(AST_Sub, function(self, tw) {
            self.expression = self.expression.transform(tw);
            self.property = self.property.transform(tw);
        });
        _(AST_Unary, function(self, tw) {
            self.expression = self.expression.transform(tw);
        });
        _(AST_Binary, function(self, tw) {
            self.left = self.left.transform(tw);
            self.right = self.right.transform(tw);
        });
        _(AST_Conditional, function(self, tw) {
            self.condition = self.condition.transform(tw);
            self.consequent = self.consequent.transform(tw);
            self.alternative = self.alternative.transform(tw);
        });
        _(AST_Array, function(self, tw) {
            self.elements = do_list(self.elements, tw);
        });
        _(AST_Object, function(self, tw) {
            self.properties = do_list(self.properties, tw);
        });
        _(AST_ObjectProperty, function(self, tw) {
            self.value = self.value.transform(tw);
        });
    })();
    "use strict";
    function SymbolDef(scope, orig, init) {
        this.name = orig.name;
        this.orig = [ orig ];
        this.init = init;
        this.eliminated = 0;
        this.scope = scope;
        this.references = [];
        this.replaced = 0;
        this.global = false;
        this.mangled_name = null;
        this.undeclared = false;
        this.id = SymbolDef.next_id++;
    }
    SymbolDef.next_id = 1;
    SymbolDef.prototype = {
        unmangleable: function(options) {
            if (!options) options = {};
            return this.global && !options.toplevel || this.undeclared || !options.eval && (this.scope.uses_eval || this.scope.uses_with) || options.keep_fnames && (this.orig[0] instanceof AST_SymbolLambda || this.orig[0] instanceof AST_SymbolDefun);
        },
        mangle: function(options) {
            var cache = options.cache && options.cache.props;
            if (this.global && cache && cache.has(this.name)) {
                this.mangled_name = cache.get(this.name);
            } else if (!this.mangled_name && !this.unmangleable(options)) {
                var def;
                if (def = this.redefined()) {
                    this.mangled_name = def.mangled_name || def.name;
                } else {
                    this.mangled_name = next_mangled_name(this.scope, options, this);
                }
                if (this.global && cache) {
                    cache.set(this.name, this.mangled_name);
                }
            }
        },
        redefined: function() {
            return this.defun && this.defun.variables.get(this.name);
        }
    };
    AST_Toplevel.DEFMETHOD("figure_out_scope", function(options) {
        options = defaults(options, {
            cache: null,
            ie8: false
        });
        var self = this;
        var scope = self.parent_scope = null;
        var defun = null;
        var tw = new TreeWalker(function(node, descend) {
            if (node instanceof AST_Catch) {
                var save_scope = scope;
                scope = new AST_Scope(node);
                scope.init_scope_vars(save_scope);
                descend();
                scope = save_scope;
                return true;
            }
            if (node instanceof AST_Scope) {
                node.init_scope_vars(scope);
                var save_scope = scope;
                var save_defun = defun;
                defun = scope = node;
                descend();
                scope = save_scope;
                defun = save_defun;
                return true;
            }
            if (node instanceof AST_With) {
                for (var s = scope; s; s = s.parent_scope) s.uses_with = true;
                return;
            }
            if (node instanceof AST_Symbol) {
                node.scope = scope;
            }
            if (node instanceof AST_Label) {
                node.thedef = node;
                node.references = [];
            }
            if (node instanceof AST_SymbolLambda) {
                defun.def_function(node, node.name == "arguments" ? undefined : defun);
            } else if (node instanceof AST_SymbolDefun) {
                (node.scope = defun.parent_scope).def_function(node, defun);
            } else if (node instanceof AST_SymbolVar) {
                defun.def_variable(node, node.TYPE == "SymbolVar" ? null : undefined);
                if (defun !== scope) {
                    node.mark_enclosed(options);
                    var def = scope.find_variable(node);
                    if (node.thedef !== def) {
                        node.thedef = def;
                    }
                    node.reference(options);
                }
            } else if (node instanceof AST_SymbolCatch) {
                scope.def_variable(node).defun = defun;
            }
        });
        self.walk(tw);
        self.globals = new Dictionary();
        var tw = new TreeWalker(function(node, descend) {
            if (node instanceof AST_LoopControl && node.label) {
                node.label.thedef.references.push(node);
                return true;
            }
            if (node instanceof AST_SymbolRef) {
                var name = node.name;
                if (name == "eval" && tw.parent() instanceof AST_Call) {
                    for (var s = node.scope; s && !s.uses_eval; s = s.parent_scope) {
                        s.uses_eval = true;
                    }
                }
                var sym = node.scope.find_variable(name);
                if (!sym) {
                    sym = self.def_global(node);
                } else if (sym.scope instanceof AST_Lambda && name == "arguments") {
                    sym.scope.uses_arguments = true;
                }
                node.thedef = sym;
                node.reference(options);
                return true;
            }
            var def;
            if (node instanceof AST_SymbolCatch && (def = node.definition().redefined())) {
                var s = node.scope;
                while (s) {
                    push_uniq(s.enclosed, def);
                    if (s === def.scope) break;
                    s = s.parent_scope;
                }
            }
        });
        self.walk(tw);
        if (options.ie8) {
            self.walk(new TreeWalker(function(node, descend) {
                if (node instanceof AST_SymbolCatch) {
                    var name = node.name;
                    var refs = node.thedef.references;
                    var scope = node.thedef.defun;
                    var def = scope.find_variable(name) || self.globals.get(name) || scope.def_variable(node);
                    refs.forEach(function(ref) {
                        ref.thedef = def;
                        ref.reference(options);
                    });
                    node.thedef = def;
                    node.reference(options);
                    return true;
                }
            }));
        }
    });
    AST_Toplevel.DEFMETHOD("def_global", function(node) {
        var globals = this.globals, name = node.name;
        if (globals.has(name)) {
            return globals.get(name);
        } else {
            var g = new SymbolDef(this, node);
            g.undeclared = true;
            g.global = true;
            globals.set(name, g);
            return g;
        }
    });
    AST_Scope.DEFMETHOD("init_scope_vars", function(parent_scope) {
        this.variables = new Dictionary();
        this.functions = new Dictionary();
        this.uses_with = false;
        this.uses_eval = false;
        this.parent_scope = parent_scope;
        this.enclosed = [];
        this.cname = -1;
    });
    AST_Lambda.DEFMETHOD("init_scope_vars", function() {
        AST_Scope.prototype.init_scope_vars.apply(this, arguments);
        this.uses_arguments = false;
        this.def_variable(new AST_SymbolFunarg({
            name: "arguments",
            start: this.start,
            end: this.end
        }));
    });
    AST_Symbol.DEFMETHOD("mark_enclosed", function(options) {
        var def = this.definition();
        var s = this.scope;
        while (s) {
            push_uniq(s.enclosed, def);
            if (options.keep_fnames) {
                s.functions.each(function(d) {
                    push_uniq(def.scope.enclosed, d);
                });
            }
            if (s === def.scope) break;
            s = s.parent_scope;
        }
    });
    AST_Symbol.DEFMETHOD("reference", function(options) {
        this.definition().references.push(this);
        this.mark_enclosed(options);
    });
    AST_Scope.DEFMETHOD("find_variable", function(name) {
        if (name instanceof AST_Symbol) name = name.name;
        return this.variables.get(name) || this.parent_scope && this.parent_scope.find_variable(name);
    });
    AST_Scope.DEFMETHOD("def_function", function(symbol, init) {
        var def = this.def_variable(symbol, init);
        if (!def.init || def.init instanceof AST_Defun) def.init = init;
        this.functions.set(symbol.name, def);
        return def;
    });
    AST_Scope.DEFMETHOD("def_variable", function(symbol, init) {
        var def = this.variables.get(symbol.name);
        if (def) {
            def.orig.push(symbol);
            if (def.init && (def.scope !== symbol.scope || def.init instanceof AST_Function)) {
                def.init = init;
            }
        } else {
            def = new SymbolDef(this, symbol, init);
            this.variables.set(symbol.name, def);
            def.global = !this.parent_scope;
        }
        return symbol.thedef = def;
    });
    function names_in_use(scope, options) {
        var names = scope.names_in_use;
        if (!names) {
            scope.names_in_use = names = Object.create(scope.mangled_names || null);
            scope.cname_holes = [];
            scope.enclosed.forEach(function(def) {
                if (def.unmangleable(options)) names[def.name] = true;
            });
        }
        return names;
    }
    function next_mangled_name(scope, options, def) {
        var in_use = names_in_use(scope, options);
        var holes = scope.cname_holes;
        var names = Object.create(null);
        if (scope instanceof AST_Function && scope.name && def.orig[0] instanceof AST_SymbolFunarg) {
            var tricky_def = scope.name.definition();
            names[tricky_def.mangled_name || tricky_def.name] = true;
        }
        var scopes = [ scope ];
        def.references.forEach(function(sym) {
            var scope = sym.scope;
            do {
                if (scopes.indexOf(scope) < 0) {
                    for (var name in names_in_use(scope, options)) {
                        names[name] = true;
                    }
                    scopes.push(scope);
                } else break;
            } while (scope = scope.parent_scope);
        });
        var name;
        for (var i = 0, len = holes.length; i < len; i++) {
            name = base54(holes[i]);
            if (names[name]) continue;
            holes.splice(i, 1);
            scope.names_in_use[name] = true;
            return name;
        }
        while (true) {
            name = base54(++scope.cname);
            if (in_use[name] || !is_identifier(name) || member(name, options.reserved)) continue;
            if (!names[name]) break;
            holes.push(scope.cname);
        }
        scope.names_in_use[name] = true;
        if (options.ie8 && def.orig[0] instanceof AST_SymbolLambda) {
            names_in_use(scope.parent_scope, options)[name] = true;
        }
        return name;
    }
    AST_Symbol.DEFMETHOD("unmangleable", function(options) {
        var def = this.definition();
        return !def || def.unmangleable(options);
    });
    AST_Label.DEFMETHOD("unmangleable", return_false);
    AST_Symbol.DEFMETHOD("unreferenced", function() {
        return this.definition().references.length == 0 && !(this.scope.uses_eval || this.scope.uses_with);
    });
    AST_Symbol.DEFMETHOD("definition", function() {
        return this.thedef;
    });
    AST_Symbol.DEFMETHOD("global", function() {
        return this.definition().global;
    });
    function _default_mangler_options(options) {
        options = defaults(options, {
            eval: false,
            ie8: false,
            keep_fnames: false,
            reserved: [],
            toplevel: false
        });
        if (!Array.isArray(options.reserved)) options.reserved = [];
        push_uniq(options.reserved, "arguments");
        return options;
    }
    AST_Toplevel.DEFMETHOD("mangle_names", function(options) {
        options = _default_mangler_options(options);
        var lname = -1;
        if (options.cache && options.cache.props) {
            var mangled_names = this.mangled_names = Object.create(null);
            options.cache.props.each(function(mangled_name) {
                mangled_names[mangled_name] = true;
            });
        }
        var redefined = [];
        var tw = new TreeWalker(function(node, descend) {
            if (node instanceof AST_LabeledStatement) {
                var save_nesting = lname;
                descend();
                lname = save_nesting;
                return true;
            }
            if (node instanceof AST_Scope) {
                descend();
                if (options.cache && node instanceof AST_Toplevel) {
                    node.globals.each(mangle);
                }
                node.variables.each(mangle);
                return true;
            }
            if (node instanceof AST_Label) {
                var name;
                do {
                    name = base54(++lname);
                } while (!is_identifier(name));
                node.mangled_name = name;
                return true;
            }
            if (!options.ie8 && node instanceof AST_Catch) {
                var def = node.argname.definition();
                var redef = def.redefined();
                if (redef) {
                    redefined.push(def);
                    reference(node.argname);
                    def.references.forEach(reference);
                }
                descend();
                if (!redef) mangle(def);
                return true;
            }
            function reference(sym) {
                sym.thedef = redef;
                sym.reference(options);
                sym.thedef = def;
            }
        });
        this.walk(tw);
        redefined.forEach(mangle);
        function mangle(def) {
            if (!member(def.name, options.reserved)) {
                def.mangle(options);
            }
        }
    });
    AST_Toplevel.DEFMETHOD("find_colliding_names", function(options) {
        var cache = options.cache && options.cache.props;
        var avoid = Object.create(null);
        options.reserved.forEach(to_avoid);
        this.globals.each(add_def);
        this.walk(new TreeWalker(function(node) {
            if (node instanceof AST_Scope) node.variables.each(add_def);
            if (node instanceof AST_SymbolCatch) add_def(node.definition());
        }));
        return avoid;
        function to_avoid(name) {
            avoid[name] = true;
        }
        function add_def(def) {
            var name = def.name;
            if (def.global && cache && cache.has(name)) name = cache.get(name); else if (!def.unmangleable(options)) return;
            to_avoid(name);
        }
    });
    AST_Toplevel.DEFMETHOD("expand_names", function(options) {
        base54.reset();
        base54.sort();
        options = _default_mangler_options(options);
        var avoid = this.find_colliding_names(options);
        var cname = 0;
        this.globals.each(rename);
        this.walk(new TreeWalker(function(node) {
            if (node instanceof AST_Scope) node.variables.each(rename);
            if (node instanceof AST_SymbolCatch) rename(node.definition());
        }));
        function next_name() {
            var name;
            do {
                name = base54(cname++);
            } while (avoid[name] || !is_identifier(name));
            return name;
        }
        function rename(def) {
            if (def.global && options.cache) return;
            if (def.unmangleable(options)) return;
            if (member(def.name, options.reserved)) return;
            var d = def.redefined();
            def.name = d ? d.name : next_name();
            def.orig.forEach(function(sym) {
                sym.name = def.name;
            });
            def.references.forEach(function(sym) {
                sym.name = def.name;
            });
        }
    });
    AST_Node.DEFMETHOD("tail_node", return_this);
    AST_Sequence.DEFMETHOD("tail_node", function() {
        return this.expressions[this.expressions.length - 1];
    });
    AST_Toplevel.DEFMETHOD("compute_char_frequency", function(options) {
        options = _default_mangler_options(options);
        base54.reset();
        try {
            AST_Node.prototype.print = function(stream, force_parens) {
                this._print(stream, force_parens);
                if (this instanceof AST_Symbol && !this.unmangleable(options)) {
                    base54.consider(this.name, -1);
                } else if (options.properties) {
                    if (this instanceof AST_Dot) {
                        base54.consider(this.property, -1);
                    } else if (this instanceof AST_Sub) {
                        skip_string(this.property);
                    }
                }
            };
            base54.consider(this.print_to_string(), 1);
        } finally {
            AST_Node.prototype.print = AST_Node.prototype._print;
        }
        base54.sort();
        function skip_string(node) {
            if (node instanceof AST_String) {
                base54.consider(node.value, -1);
            } else if (node instanceof AST_Conditional) {
                skip_string(node.consequent);
                skip_string(node.alternative);
            } else if (node instanceof AST_Sequence) {
                skip_string(node.tail_node());
            }
        }
    });
    var base54 = function() {
        var leading = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_".split("");
        var digits = "0123456789".split("");
        var chars, frequency;
        function reset() {
            frequency = Object.create(null);
            leading.forEach(function(ch) {
                frequency[ch] = 0;
            });
            digits.forEach(function(ch) {
                frequency[ch] = 0;
            });
        }
        base54.consider = function(str, delta) {
            for (var i = str.length; --i >= 0; ) {
                frequency[str[i]] += delta;
            }
        };
        function compare(a, b) {
            return frequency[b] - frequency[a];
        }
        base54.sort = function() {
            chars = mergeSort(leading, compare).concat(mergeSort(digits, compare));
        };
        base54.reset = reset;
        reset();
        function base54(num) {
            var ret = "", base = 54;
            num++;
            do {
                num--;
                ret += chars[num % base];
                num = Math.floor(num / base);
                base = 64;
            } while (num > 0);
            return ret;
        }
        return base54;
    }();
    "use strict";
    var EXPECT_DIRECTIVE = /^$|[;{][\s\n]*$/;
    function is_some_comments(comment) {
        return comment.type == "comment2" && /@preserve|@license|@cc_on/i.test(comment.value);
    }
    function OutputStream(options) {
        var readonly = !options;
        options = defaults(options, {
            ascii_only: false,
            beautify: false,
            braces: false,
            comments: false,
            ie8: false,
            indent_level: 4,
            indent_start: 0,
            inline_script: true,
            keep_quoted_props: false,
            max_line_len: false,
            preamble: null,
            preserve_line: false,
            quote_keys: false,
            quote_style: 0,
            semicolons: true,
            shebang: true,
            source_map: null,
            webkit: false,
            width: 80,
            wrap_iife: false
        }, true);
        var comment_filter = return_false;
        if (options.comments) {
            var comments = options.comments;
            if (typeof options.comments === "string" && /^\/.*\/[a-zA-Z]*$/.test(options.comments)) {
                var regex_pos = options.comments.lastIndexOf("/");
                comments = new RegExp(options.comments.substr(1, regex_pos - 1), options.comments.substr(regex_pos + 1));
            }
            if (comments instanceof RegExp) {
                comment_filter = function(comment) {
                    return comment.type != "comment5" && comments.test(comment.value);
                };
            } else if (typeof comments === "function") {
                comment_filter = function(comment) {
                    return comment.type != "comment5" && comments(this, comment);
                };
            } else if (comments === "some") {
                comment_filter = is_some_comments;
            } else {
                comment_filter = return_true;
            }
        }
        var indentation = 0;
        var current_col = 0;
        var current_line = 1;
        var current_pos = 0;
        var OUTPUT = "";
        var to_utf8 = options.ascii_only ? function(str, identifier) {
            return str.replace(/[\u0000-\u001f\u007f-\uffff]/g, function(ch) {
                var code = ch.charCodeAt(0).toString(16);
                if (code.length <= 2 && !identifier) {
                    while (code.length < 2) code = "0" + code;
                    return "\\x" + code;
                } else {
                    while (code.length < 4) code = "0" + code;
                    return "\\u" + code;
                }
            });
        } : function(str) {
            var s = "";
            for (var i = 0, len = str.length; i < len; i++) {
                if (is_surrogate_pair_head(str[i]) && !is_surrogate_pair_tail(str[i + 1]) || is_surrogate_pair_tail(str[i]) && !is_surrogate_pair_head(str[i - 1])) {
                    s += "\\u" + str.charCodeAt(i).toString(16);
                } else {
                    s += str[i];
                }
            }
            return s;
        };
        function make_string(str, quote) {
            var dq = 0, sq = 0;
            str = str.replace(/[\\\b\f\n\r\v\t\x22\x27\u2028\u2029\0\ufeff]/g, function(s, i) {
                switch (s) {
                  case '"':
                    ++dq;
                    return '"';

                  case "'":
                    ++sq;
                    return "'";

                  case "\\":
                    return "\\\\";

                  case "\n":
                    return "\\n";

                  case "\r":
                    return "\\r";

                  case "\t":
                    return "\\t";

                  case "\b":
                    return "\\b";

                  case "\f":
                    return "\\f";

                  case "\v":
                    return options.ie8 ? "\\x0B" : "\\v";

                  case "\u2028":
                    return "\\u2028";

                  case "\u2029":
                    return "\\u2029";

                  case "\ufeff":
                    return "\\ufeff";

                  case "\0":
                    return /[0-9]/.test(str.charAt(i + 1)) ? "\\x00" : "\\0";
                }
                return s;
            });
            function quote_single() {
                return "'" + str.replace(/\x27/g, "\\'") + "'";
            }
            function quote_double() {
                return '"' + str.replace(/\x22/g, '\\"') + '"';
            }
            str = to_utf8(str);
            switch (options.quote_style) {
              case 1:
                return quote_single();

              case 2:
                return quote_double();

              case 3:
                return quote == "'" ? quote_single() : quote_double();

              default:
                return dq > sq ? quote_single() : quote_double();
            }
        }
        function encode_string(str, quote) {
            var ret = make_string(str, quote);
            if (options.inline_script) {
                ret = ret.replace(/<\x2f(script)([>\/\t\n\f\r ])/gi, "<\\/$1$2");
                ret = ret.replace(/\x3c!--/g, "\\x3c!--");
                ret = ret.replace(/--\x3e/g, "--\\x3e");
            }
            return ret;
        }
        function make_name(name) {
            name = name.toString();
            name = to_utf8(name, true);
            return name;
        }
        function make_indent(back) {
            return repeat_string(" ", options.indent_start + indentation - back * options.indent_level);
        }
        var might_need_space = false;
        var might_need_semicolon = false;
        var might_add_newline = 0;
        var need_newline_indented = false;
        var need_space = false;
        var newline_insert = -1;
        var last = "";
        var mapping_token, mapping_name, mappings = options.source_map && [];
        var do_add_mapping = mappings ? function() {
            mappings.forEach(function(mapping) {
                try {
                    options.source_map.add(mapping.token.file, mapping.line, mapping.col, mapping.token.line, mapping.token.col, !mapping.name && mapping.token.type == "name" ? mapping.token.value : mapping.name);
                } catch (ex) {
                    AST_Node.warn("Couldn't figure out mapping for {file}:{line},{col} → {cline},{ccol} [{name}]", {
                        file: mapping.token.file,
                        line: mapping.token.line,
                        col: mapping.token.col,
                        cline: mapping.line,
                        ccol: mapping.col,
                        name: mapping.name || ""
                    });
                }
            });
            mappings = [];
        } : noop;
        var ensure_line_len = options.max_line_len ? function() {
            if (current_col > options.max_line_len) {
                if (might_add_newline) {
                    var left = OUTPUT.slice(0, might_add_newline);
                    var right = OUTPUT.slice(might_add_newline);
                    if (mappings) {
                        var delta = right.length - current_col;
                        mappings.forEach(function(mapping) {
                            mapping.line++;
                            mapping.col += delta;
                        });
                    }
                    OUTPUT = left + "\n" + right;
                    current_line++;
                    current_pos++;
                    current_col = right.length;
                }
                if (current_col > options.max_line_len) {
                    AST_Node.warn("Output exceeds {max_line_len} characters", options);
                }
            }
            if (might_add_newline) {
                might_add_newline = 0;
                do_add_mapping();
            }
        } : noop;
        var requireSemicolonChars = makePredicate("( [ + * / - , .");
        function print(str) {
            str = String(str);
            var ch = str.charAt(0);
            if (need_newline_indented && ch) {
                need_newline_indented = false;
                if (ch != "\n") {
                    print("\n");
                    indent();
                }
            }
            if (need_space && ch) {
                need_space = false;
                if (!/[\s;})]/.test(ch)) {
                    space();
                }
            }
            newline_insert = -1;
            var prev = last.charAt(last.length - 1);
            if (might_need_semicolon) {
                might_need_semicolon = false;
                if (prev == ":" && ch == "}" || (!ch || ";}".indexOf(ch) < 0) && prev != ";") {
                    if (options.semicolons || requireSemicolonChars(ch)) {
                        OUTPUT += ";";
                        current_col++;
                        current_pos++;
                    } else {
                        ensure_line_len();
                        OUTPUT += "\n";
                        current_pos++;
                        current_line++;
                        current_col = 0;
                        if (/^\s+$/.test(str)) {
                            might_need_semicolon = true;
                        }
                    }
                    if (!options.beautify) might_need_space = false;
                }
            }
            if (!options.beautify && options.preserve_line && stack[stack.length - 1]) {
                var target_line = stack[stack.length - 1].start.line;
                while (current_line < target_line) {
                    ensure_line_len();
                    OUTPUT += "\n";
                    current_pos++;
                    current_line++;
                    current_col = 0;
                    might_need_space = false;
                }
            }
            if (might_need_space) {
                if (is_identifier_char(prev) && (is_identifier_char(ch) || ch == "\\") || ch == "/" && ch == prev || (ch == "+" || ch == "-") && ch == last) {
                    OUTPUT += " ";
                    current_col++;
                    current_pos++;
                }
                might_need_space = false;
            }
            if (mapping_token) {
                mappings.push({
                    token: mapping_token,
                    name: mapping_name,
                    line: current_line,
                    col: current_col
                });
                mapping_token = false;
                if (!might_add_newline) do_add_mapping();
            }
            OUTPUT += str;
            current_pos += str.length;
            var a = str.split(/\r?\n/), n = a.length - 1;
            current_line += n;
            current_col += a[0].length;
            if (n > 0) {
                ensure_line_len();
                current_col = a[n].length;
            }
            last = str;
        }
        var space = options.beautify ? function() {
            print(" ");
        } : function() {
            might_need_space = true;
        };
        var indent = options.beautify ? function(half) {
            if (options.beautify) {
                print(make_indent(half ? .5 : 0));
            }
        } : noop;
        var with_indent = options.beautify ? function(col, cont) {
            if (col === true) col = next_indent();
            var save_indentation = indentation;
            indentation = col;
            var ret = cont();
            indentation = save_indentation;
            return ret;
        } : function(col, cont) {
            return cont();
        };
        var newline = options.beautify ? function() {
            if (newline_insert < 0) return print("\n");
            if (OUTPUT[newline_insert] != "\n") {
                OUTPUT = OUTPUT.slice(0, newline_insert) + "\n" + OUTPUT.slice(newline_insert);
                current_pos++;
                current_line++;
            }
            newline_insert++;
        } : options.max_line_len ? function() {
            ensure_line_len();
            might_add_newline = OUTPUT.length;
        } : noop;
        var semicolon = options.beautify ? function() {
            print(";");
        } : function() {
            might_need_semicolon = true;
        };
        function force_semicolon() {
            might_need_semicolon = false;
            print(";");
        }
        function next_indent() {
            return indentation + options.indent_level;
        }
        function with_block(cont) {
            var ret;
            print("{");
            newline();
            with_indent(next_indent(), function() {
                ret = cont();
            });
            indent();
            print("}");
            return ret;
        }
        function with_parens(cont) {
            print("(");
            var ret = cont();
            print(")");
            return ret;
        }
        function with_square(cont) {
            print("[");
            var ret = cont();
            print("]");
            return ret;
        }
        function comma() {
            print(",");
            space();
        }
        function colon() {
            print(":");
            space();
        }
        var add_mapping = mappings ? function(token, name) {
            mapping_token = token;
            mapping_name = name;
        } : noop;
        function get() {
            if (might_add_newline) {
                ensure_line_len();
            }
            return OUTPUT;
        }
        function has_nlb() {
            var index = OUTPUT.lastIndexOf("\n");
            return /^ *$/.test(OUTPUT.slice(index + 1));
        }
        function prepend_comments(node) {
            var self = this;
            var start = node.start;
            if (!start) return;
            if (start.comments_before && start.comments_before._dumped === self) return;
            var comments = start.comments_before;
            if (!comments) {
                comments = start.comments_before = [];
            }
            comments._dumped = self;
            if (node instanceof AST_Exit && node.value) {
                var tw = new TreeWalker(function(node) {
                    var parent = tw.parent();
                    if (parent instanceof AST_Exit || parent instanceof AST_Binary && parent.left === node || parent.TYPE == "Call" && parent.expression === node || parent instanceof AST_Conditional && parent.condition === node || parent instanceof AST_Dot && parent.expression === node || parent instanceof AST_Sequence && parent.expressions[0] === node || parent instanceof AST_Sub && parent.expression === node || parent instanceof AST_UnaryPostfix) {
                        var text = node.start.comments_before;
                        if (text && text._dumped !== self) {
                            text._dumped = self;
                            comments = comments.concat(text);
                        }
                    } else {
                        return true;
                    }
                });
                tw.push(node);
                node.value.walk(tw);
            }
            if (current_pos == 0) {
                if (comments.length > 0 && options.shebang && comments[0].type == "comment5") {
                    print("#!" + comments.shift().value + "\n");
                    indent();
                }
                var preamble = options.preamble;
                if (preamble) {
                    print(preamble.replace(/\r\n?|[\n\u2028\u2029]|\s*$/g, "\n"));
                }
            }
            comments = comments.filter(comment_filter, node);
            if (comments.length == 0) return;
            var last_nlb = has_nlb();
            comments.forEach(function(c, i) {
                if (!last_nlb) {
                    if (c.nlb) {
                        print("\n");
                        indent();
                        last_nlb = true;
                    } else if (i > 0) {
                        space();
                    }
                }
                if (/comment[134]/.test(c.type)) {
                    print("//" + c.value.replace(/[@#]__PURE__/g, " ") + "\n");
                    indent();
                    last_nlb = true;
                } else if (c.type == "comment2") {
                    print("/*" + c.value.replace(/[@#]__PURE__/g, " ") + "*/");
                    last_nlb = false;
                }
            });
            if (!last_nlb) {
                if (start.nlb) {
                    print("\n");
                    indent();
                } else {
                    space();
                }
            }
        }
        function append_comments(node, tail) {
            var self = this;
            var token = node.end;
            if (!token) return;
            var comments = token[tail ? "comments_before" : "comments_after"];
            if (!comments || comments._dumped === self) return;
            if (!(node instanceof AST_Statement || all(comments, function(c) {
                return !/comment[134]/.test(c.type);
            }))) return;
            comments._dumped = self;
            var insert = OUTPUT.length;
            comments.filter(comment_filter, node).forEach(function(c, i) {
                need_space = false;
                if (need_newline_indented) {
                    print("\n");
                    indent();
                    need_newline_indented = false;
                } else if (c.nlb && (i > 0 || !has_nlb())) {
                    print("\n");
                    indent();
                } else if (i > 0 || !tail) {
                    space();
                }
                if (/comment[134]/.test(c.type)) {
                    print("//" + c.value.replace(/[@#]__PURE__/g, " "));
                    need_newline_indented = true;
                } else if (c.type == "comment2") {
                    print("/*" + c.value.replace(/[@#]__PURE__/g, " ") + "*/");
                    need_space = true;
                }
            });
            if (OUTPUT.length > insert) newline_insert = insert;
        }
        var stack = [];
        return {
            get: get,
            toString: get,
            indent: indent,
            indentation: function() {
                return indentation;
            },
            current_width: function() {
                return current_col - indentation;
            },
            should_break: function() {
                return options.width && this.current_width() >= options.width;
            },
            has_parens: function() {
                return OUTPUT[OUTPUT.length - 1] == "(";
            },
            newline: newline,
            print: print,
            space: space,
            comma: comma,
            colon: colon,
            last: function() {
                return last;
            },
            semicolon: semicolon,
            force_semicolon: force_semicolon,
            to_utf8: to_utf8,
            print_name: function(name) {
                print(make_name(name));
            },
            print_string: function(str, quote, escape_directive) {
                var encoded = encode_string(str, quote);
                if (escape_directive === true && encoded.indexOf("\\") === -1) {
                    if (!EXPECT_DIRECTIVE.test(OUTPUT)) {
                        force_semicolon();
                    }
                    force_semicolon();
                }
                print(encoded);
            },
            encode_string: encode_string,
            next_indent: next_indent,
            with_indent: with_indent,
            with_block: with_block,
            with_parens: with_parens,
            with_square: with_square,
            add_mapping: add_mapping,
            option: function(opt) {
                return options[opt];
            },
            prepend_comments: readonly ? noop : prepend_comments,
            append_comments: readonly || comment_filter === return_false ? noop : append_comments,
            line: function() {
                return current_line;
            },
            col: function() {
                return current_col;
            },
            pos: function() {
                return current_pos;
            },
            push_node: function(node) {
                stack.push(node);
            },
            pop_node: function() {
                return stack.pop();
            },
            parent: function(n) {
                return stack[stack.length - 2 - (n || 0)];
            }
        };
    }
    (function() {
        function DEFPRINT(nodetype, generator) {
            nodetype.DEFMETHOD("_codegen", generator);
        }
        var in_directive = false;
        var active_scope = null;
        var use_asm = null;
        AST_Node.DEFMETHOD("print", function(stream, force_parens) {
            var self = this, generator = self._codegen;
            if (self instanceof AST_Scope) {
                active_scope = self;
            } else if (!use_asm && self instanceof AST_Directive && self.value == "use asm") {
                use_asm = active_scope;
            }
            function doit() {
                stream.prepend_comments(self);
                self.add_source_map(stream);
                generator(self, stream);
                stream.append_comments(self);
            }
            stream.push_node(self);
            if (force_parens || self.needs_parens(stream)) {
                stream.with_parens(doit);
            } else {
                doit();
            }
            stream.pop_node();
            if (self === use_asm) {
                use_asm = null;
            }
        });
        AST_Node.DEFMETHOD("_print", AST_Node.prototype.print);
        AST_Node.DEFMETHOD("print_to_string", function(options) {
            var s = OutputStream(options);
            this.print(s);
            return s.get();
        });
        function PARENS(nodetype, func) {
            if (Array.isArray(nodetype)) {
                nodetype.forEach(function(nodetype) {
                    PARENS(nodetype, func);
                });
            } else {
                nodetype.DEFMETHOD("needs_parens", func);
            }
        }
        PARENS(AST_Node, return_false);
        PARENS(AST_Function, function(output) {
            if (!output.has_parens() && first_in_statement(output)) {
                return true;
            }
            if (output.option("webkit")) {
                var p = output.parent();
                if (p instanceof AST_PropAccess && p.expression === this) {
                    return true;
                }
            }
            if (output.option("wrap_iife")) {
                var p = output.parent();
                return p instanceof AST_Call && p.expression === this;
            }
            return false;
        });
        PARENS(AST_Object, function(output) {
            return !output.has_parens() && first_in_statement(output);
        });
        PARENS(AST_Unary, function(output) {
            var p = output.parent();
            return p instanceof AST_PropAccess && p.expression === this || p instanceof AST_Call && p.expression === this;
        });
        PARENS(AST_Sequence, function(output) {
            var p = output.parent();
            return p instanceof AST_Call || p instanceof AST_Unary || p instanceof AST_Binary || p instanceof AST_VarDef || p instanceof AST_PropAccess || p instanceof AST_Array || p instanceof AST_ObjectProperty || p instanceof AST_Conditional;
        });
        PARENS(AST_Binary, function(output) {
            var p = output.parent();
            if (p instanceof AST_Call && p.expression === this) return true;
            if (p instanceof AST_Unary) return true;
            if (p instanceof AST_PropAccess && p.expression === this) return true;
            if (p instanceof AST_Binary) {
                var po = p.operator, pp = PRECEDENCE[po];
                var so = this.operator, sp = PRECEDENCE[so];
                if (pp > sp || pp == sp && this === p.right) {
                    return true;
                }
            }
        });
        PARENS(AST_PropAccess, function(output) {
            var p = output.parent();
            if (p instanceof AST_New && p.expression === this) {
                var parens = false;
                this.walk(new TreeWalker(function(node) {
                    if (parens || node instanceof AST_Scope) return true;
                    if (node instanceof AST_Call) {
                        parens = true;
                        return true;
                    }
                }));
                return parens;
            }
        });
        PARENS(AST_Call, function(output) {
            var p = output.parent(), p1;
            if (p instanceof AST_New && p.expression === this) return true;
            return this.expression instanceof AST_Function && p instanceof AST_PropAccess && p.expression === this && (p1 = output.parent(1)) instanceof AST_Assign && p1.left === p;
        });
        PARENS(AST_New, function(output) {
            var p = output.parent();
            if (!need_constructor_parens(this, output) && (p instanceof AST_PropAccess || p instanceof AST_Call && p.expression === this)) return true;
        });
        PARENS(AST_Number, function(output) {
            var p = output.parent();
            if (p instanceof AST_PropAccess && p.expression === this) {
                var value = this.getValue();
                if (value < 0 || /^0/.test(make_num(value))) {
                    return true;
                }
            }
        });
        PARENS([ AST_Assign, AST_Conditional ], function(output) {
            var p = output.parent();
            if (p instanceof AST_Unary) return true;
            if (p instanceof AST_Binary && !(p instanceof AST_Assign)) return true;
            if (p instanceof AST_Call && p.expression === this) return true;
            if (p instanceof AST_Conditional && p.condition === this) return true;
            if (p instanceof AST_PropAccess && p.expression === this) return true;
        });
        DEFPRINT(AST_Directive, function(self, output) {
            output.print_string(self.value, self.quote);
            output.semicolon();
        });
        DEFPRINT(AST_Debugger, function(self, output) {
            output.print("debugger");
            output.semicolon();
        });
        function display_body(body, is_toplevel, output, allow_directives) {
            var last = body.length - 1;
            in_directive = allow_directives;
            body.forEach(function(stmt, i) {
                if (in_directive === true && !(stmt instanceof AST_Directive || stmt instanceof AST_EmptyStatement || stmt instanceof AST_SimpleStatement && stmt.body instanceof AST_String)) {
                    in_directive = false;
                }
                if (!(stmt instanceof AST_EmptyStatement)) {
                    output.indent();
                    stmt.print(output);
                    if (!(i == last && is_toplevel)) {
                        output.newline();
                        if (is_toplevel) output.newline();
                    }
                }
                if (in_directive === true && stmt instanceof AST_SimpleStatement && stmt.body instanceof AST_String) {
                    in_directive = false;
                }
            });
            in_directive = false;
        }
        AST_StatementWithBody.DEFMETHOD("_do_print_body", function(output) {
            force_statement(this.body, output);
        });
        DEFPRINT(AST_Statement, function(self, output) {
            self.body.print(output);
            output.semicolon();
        });
        DEFPRINT(AST_Toplevel, function(self, output) {
            display_body(self.body, true, output, true);
            output.print("");
        });
        DEFPRINT(AST_LabeledStatement, function(self, output) {
            self.label.print(output);
            output.colon();
            self.body.print(output);
        });
        DEFPRINT(AST_SimpleStatement, function(self, output) {
            self.body.print(output);
            output.semicolon();
        });
        function print_braced_empty(self, output) {
            output.print("{");
            output.with_indent(output.next_indent(), function() {
                output.append_comments(self, true);
            });
            output.print("}");
        }
        function print_braced(self, output, allow_directives) {
            if (self.body.length > 0) {
                output.with_block(function() {
                    display_body(self.body, false, output, allow_directives);
                });
            } else print_braced_empty(self, output);
        }
        DEFPRINT(AST_BlockStatement, function(self, output) {
            print_braced(self, output);
        });
        DEFPRINT(AST_EmptyStatement, function(self, output) {
            output.semicolon();
        });
        DEFPRINT(AST_Do, function(self, output) {
            output.print("do");
            output.space();
            make_block(self.body, output);
            output.space();
            output.print("while");
            output.space();
            output.with_parens(function() {
                self.condition.print(output);
            });
            output.semicolon();
        });
        DEFPRINT(AST_While, function(self, output) {
            output.print("while");
            output.space();
            output.with_parens(function() {
                self.condition.print(output);
            });
            output.space();
            self._do_print_body(output);
        });
        DEFPRINT(AST_For, function(self, output) {
            output.print("for");
            output.space();
            output.with_parens(function() {
                if (self.init) {
                    if (self.init instanceof AST_Definitions) {
                        self.init.print(output);
                    } else {
                        parenthesize_for_noin(self.init, output, true);
                    }
                    output.print(";");
                    output.space();
                } else {
                    output.print(";");
                }
                if (self.condition) {
                    self.condition.print(output);
                    output.print(";");
                    output.space();
                } else {
                    output.print(";");
                }
                if (self.step) {
                    self.step.print(output);
                }
            });
            output.space();
            self._do_print_body(output);
        });
        DEFPRINT(AST_ForIn, function(self, output) {
            output.print("for");
            output.space();
            output.with_parens(function() {
                self.init.print(output);
                output.space();
                output.print("in");
                output.space();
                self.object.print(output);
            });
            output.space();
            self._do_print_body(output);
        });
        DEFPRINT(AST_With, function(self, output) {
            output.print("with");
            output.space();
            output.with_parens(function() {
                self.expression.print(output);
            });
            output.space();
            self._do_print_body(output);
        });
        AST_Lambda.DEFMETHOD("_do_print", function(output, nokeyword) {
            var self = this;
            if (!nokeyword) {
                output.print("function");
            }
            if (self.name) {
                output.space();
                self.name.print(output);
            }
            output.with_parens(function() {
                self.argnames.forEach(function(arg, i) {
                    if (i) output.comma();
                    arg.print(output);
                });
            });
            output.space();
            print_braced(self, output, true);
        });
        DEFPRINT(AST_Lambda, function(self, output) {
            self._do_print(output);
        });
        AST_Exit.DEFMETHOD("_do_print", function(output, kind) {
            output.print(kind);
            if (this.value) {
                output.space();
                this.value.print(output);
            }
            output.semicolon();
        });
        DEFPRINT(AST_Return, function(self, output) {
            self._do_print(output, "return");
        });
        DEFPRINT(AST_Throw, function(self, output) {
            self._do_print(output, "throw");
        });
        AST_LoopControl.DEFMETHOD("_do_print", function(output, kind) {
            output.print(kind);
            if (this.label) {
                output.space();
                this.label.print(output);
            }
            output.semicolon();
        });
        DEFPRINT(AST_Break, function(self, output) {
            self._do_print(output, "break");
        });
        DEFPRINT(AST_Continue, function(self, output) {
            self._do_print(output, "continue");
        });
        function make_then(self, output) {
            var b = self.body;
            if (output.option("braces") || output.option("ie8") && b instanceof AST_Do) return make_block(b, output);
            if (!b) return output.force_semicolon();
            while (true) {
                if (b instanceof AST_If) {
                    if (!b.alternative) {
                        make_block(self.body, output);
                        return;
                    }
                    b = b.alternative;
                } else if (b instanceof AST_StatementWithBody) {
                    b = b.body;
                } else break;
            }
            force_statement(self.body, output);
        }
        DEFPRINT(AST_If, function(self, output) {
            output.print("if");
            output.space();
            output.with_parens(function() {
                self.condition.print(output);
            });
            output.space();
            if (self.alternative) {
                make_then(self, output);
                output.space();
                output.print("else");
                output.space();
                if (self.alternative instanceof AST_If) self.alternative.print(output); else force_statement(self.alternative, output);
            } else {
                self._do_print_body(output);
            }
        });
        DEFPRINT(AST_Switch, function(self, output) {
            output.print("switch");
            output.space();
            output.with_parens(function() {
                self.expression.print(output);
            });
            output.space();
            var last = self.body.length - 1;
            if (last < 0) print_braced_empty(self, output); else output.with_block(function() {
                self.body.forEach(function(branch, i) {
                    output.indent(true);
                    branch.print(output);
                    if (i < last && branch.body.length > 0) output.newline();
                });
            });
        });
        AST_SwitchBranch.DEFMETHOD("_do_print_body", function(output) {
            output.newline();
            this.body.forEach(function(stmt) {
                output.indent();
                stmt.print(output);
                output.newline();
            });
        });
        DEFPRINT(AST_Default, function(self, output) {
            output.print("default:");
            self._do_print_body(output);
        });
        DEFPRINT(AST_Case, function(self, output) {
            output.print("case");
            output.space();
            self.expression.print(output);
            output.print(":");
            self._do_print_body(output);
        });
        DEFPRINT(AST_Try, function(self, output) {
            output.print("try");
            output.space();
            print_braced(self, output);
            if (self.bcatch) {
                output.space();
                self.bcatch.print(output);
            }
            if (self.bfinally) {
                output.space();
                self.bfinally.print(output);
            }
        });
        DEFPRINT(AST_Catch, function(self, output) {
            output.print("catch");
            output.space();
            output.with_parens(function() {
                self.argname.print(output);
            });
            output.space();
            print_braced(self, output);
        });
        DEFPRINT(AST_Finally, function(self, output) {
            output.print("finally");
            output.space();
            print_braced(self, output);
        });
        AST_Definitions.DEFMETHOD("_do_print", function(output, kind) {
            output.print(kind);
            output.space();
            this.definitions.forEach(function(def, i) {
                if (i) output.comma();
                def.print(output);
            });
            var p = output.parent();
            var in_for = p instanceof AST_For || p instanceof AST_ForIn;
            var avoid_semicolon = in_for && p.init === this;
            if (!avoid_semicolon) output.semicolon();
        });
        DEFPRINT(AST_Var, function(self, output) {
            self._do_print(output, "var");
        });
        function parenthesize_for_noin(node, output, noin) {
            var parens = false;
            if (noin) node.walk(new TreeWalker(function(node) {
                if (parens || node instanceof AST_Scope) return true;
                if (node instanceof AST_Binary && node.operator == "in") {
                    parens = true;
                    return true;
                }
            }));
            node.print(output, parens);
        }
        DEFPRINT(AST_VarDef, function(self, output) {
            self.name.print(output);
            if (self.value) {
                output.space();
                output.print("=");
                output.space();
                var p = output.parent(1);
                var noin = p instanceof AST_For || p instanceof AST_ForIn;
                parenthesize_for_noin(self.value, output, noin);
            }
        });
        DEFPRINT(AST_Call, function(self, output) {
            self.expression.print(output);
            if (self instanceof AST_New && !need_constructor_parens(self, output)) return;
            if (self.expression instanceof AST_Call || self.expression instanceof AST_Lambda) {
                output.add_mapping(self.start);
            }
            output.with_parens(function() {
                self.args.forEach(function(expr, i) {
                    if (i) output.comma();
                    expr.print(output);
                });
            });
        });
        DEFPRINT(AST_New, function(self, output) {
            output.print("new");
            output.space();
            AST_Call.prototype._codegen(self, output);
        });
        AST_Sequence.DEFMETHOD("_do_print", function(output) {
            this.expressions.forEach(function(node, index) {
                if (index > 0) {
                    output.comma();
                    if (output.should_break()) {
                        output.newline();
                        output.indent();
                    }
                }
                node.print(output);
            });
        });
        DEFPRINT(AST_Sequence, function(self, output) {
            self._do_print(output);
        });
        DEFPRINT(AST_Dot, function(self, output) {
            var expr = self.expression;
            expr.print(output);
            var prop = self.property;
            if (output.option("ie8") && RESERVED_WORDS(prop)) {
                output.print("[");
                output.add_mapping(self.end);
                output.print_string(prop);
                output.print("]");
            } else {
                if (expr instanceof AST_Number && expr.getValue() >= 0) {
                    if (!/[xa-f.)]/i.test(output.last())) {
                        output.print(".");
                    }
                }
                output.print(".");
                output.add_mapping(self.end);
                output.print_name(prop);
            }
        });
        DEFPRINT(AST_Sub, function(self, output) {
            self.expression.print(output);
            output.print("[");
            self.property.print(output);
            output.print("]");
        });
        DEFPRINT(AST_UnaryPrefix, function(self, output) {
            var op = self.operator;
            output.print(op);
            if (/^[a-z]/i.test(op) || /[+-]$/.test(op) && self.expression instanceof AST_UnaryPrefix && /^[+-]/.test(self.expression.operator)) {
                output.space();
            }
            self.expression.print(output);
        });
        DEFPRINT(AST_UnaryPostfix, function(self, output) {
            self.expression.print(output);
            output.print(self.operator);
        });
        DEFPRINT(AST_Binary, function(self, output) {
            var op = self.operator;
            self.left.print(output);
            if (op[0] == ">" && self.left instanceof AST_UnaryPostfix && self.left.operator == "--") {
                output.print(" ");
            } else {
                output.space();
            }
            output.print(op);
            if ((op == "<" || op == "<<") && self.right instanceof AST_UnaryPrefix && self.right.operator == "!" && self.right.expression instanceof AST_UnaryPrefix && self.right.expression.operator == "--") {
                output.print(" ");
            } else {
                output.space();
            }
            self.right.print(output);
        });
        DEFPRINT(AST_Conditional, function(self, output) {
            self.condition.print(output);
            output.space();
            output.print("?");
            output.space();
            self.consequent.print(output);
            output.space();
            output.colon();
            self.alternative.print(output);
        });
        DEFPRINT(AST_Array, function(self, output) {
            output.with_square(function() {
                var a = self.elements, len = a.length;
                if (len > 0) output.space();
                a.forEach(function(exp, i) {
                    if (i) output.comma();
                    exp.print(output);
                    if (i === len - 1 && exp instanceof AST_Hole) output.comma();
                });
                if (len > 0) output.space();
            });
        });
        DEFPRINT(AST_Object, function(self, output) {
            if (self.properties.length > 0) output.with_block(function() {
                self.properties.forEach(function(prop, i) {
                    if (i) {
                        output.print(",");
                        output.newline();
                    }
                    output.indent();
                    prop.print(output);
                });
                output.newline();
            }); else print_braced_empty(self, output);
        });
        function print_property_name(key, quote, output) {
            if (output.option("quote_keys")) {
                output.print_string(key);
            } else if ("" + +key == key && key >= 0) {
                output.print(make_num(key));
            } else if (RESERVED_WORDS(key) ? !output.option("ie8") : is_identifier_string(key)) {
                if (quote && output.option("keep_quoted_props")) {
                    output.print_string(key, quote);
                } else {
                    output.print_name(key);
                }
            } else {
                output.print_string(key, quote);
            }
        }
        DEFPRINT(AST_ObjectKeyVal, function(self, output) {
            print_property_name(self.key, self.quote, output);
            output.colon();
            self.value.print(output);
        });
        AST_ObjectProperty.DEFMETHOD("_print_getter_setter", function(type, output) {
            output.print(type);
            output.space();
            print_property_name(this.key.name, this.quote, output);
            this.value._do_print(output, true);
        });
        DEFPRINT(AST_ObjectSetter, function(self, output) {
            self._print_getter_setter("set", output);
        });
        DEFPRINT(AST_ObjectGetter, function(self, output) {
            self._print_getter_setter("get", output);
        });
        DEFPRINT(AST_Symbol, function(self, output) {
            var def = self.definition();
            output.print_name(def ? def.mangled_name || def.name : self.name);
        });
        DEFPRINT(AST_Hole, noop);
        DEFPRINT(AST_This, function(self, output) {
            output.print("this");
        });
        DEFPRINT(AST_Constant, function(self, output) {
            output.print(self.getValue());
        });
        DEFPRINT(AST_String, function(self, output) {
            output.print_string(self.getValue(), self.quote, in_directive);
        });
        DEFPRINT(AST_Number, function(self, output) {
            if (use_asm && self.start && self.start.raw != null) {
                output.print(self.start.raw);
            } else {
                output.print(make_num(self.getValue()));
            }
        });
        DEFPRINT(AST_RegExp, function(self, output) {
            var regexp = self.getValue();
            var str = regexp.toString();
            if (regexp.raw_source) {
                str = "/" + regexp.raw_source + str.slice(str.lastIndexOf("/"));
            }
            str = output.to_utf8(str);
            output.print(str);
            var p = output.parent();
            if (p instanceof AST_Binary && /^in/.test(p.operator) && p.left === self) output.print(" ");
        });
        function force_statement(stat, output) {
            if (output.option("braces")) {
                make_block(stat, output);
            } else {
                if (!stat || stat instanceof AST_EmptyStatement) output.force_semicolon(); else stat.print(output);
            }
        }
        function need_constructor_parens(self, output) {
            if (self.args.length > 0) return true;
            return output.option("beautify");
        }
        function best_of(a) {
            var best = a[0], len = best.length;
            for (var i = 1; i < a.length; ++i) {
                if (a[i].length < len) {
                    best = a[i];
                    len = best.length;
                }
            }
            return best;
        }
        function make_num(num) {
            var str = num.toString(10), a = [ str.replace(/^0\./, ".").replace("e+", "e") ], m;
            if (Math.floor(num) === num) {
                if (num >= 0) {
                    a.push("0x" + num.toString(16).toLowerCase(), "0" + num.toString(8));
                } else {
                    a.push("-0x" + (-num).toString(16).toLowerCase(), "-0" + (-num).toString(8));
                }
                if (m = /^(.*?)(0+)$/.exec(num)) {
                    a.push(m[1] + "e" + m[2].length);
                }
            } else if (m = /^0?\.(0+)(.*)$/.exec(num)) {
                a.push(m[2] + "e-" + (m[1].length + m[2].length), str.substr(str.indexOf(".")));
            }
            return best_of(a);
        }
        function make_block(stmt, output) {
            if (!stmt || stmt instanceof AST_EmptyStatement) output.print("{}"); else if (stmt instanceof AST_BlockStatement) stmt.print(output); else output.with_block(function() {
                output.indent();
                stmt.print(output);
                output.newline();
            });
        }
        function DEFMAP(nodetype, generator) {
            nodetype.forEach(function(nodetype) {
                nodetype.DEFMETHOD("add_source_map", generator);
            });
        }
        DEFMAP([ AST_Node, AST_LabeledStatement, AST_Toplevel ], noop);
        DEFMAP([ AST_Array, AST_BlockStatement, AST_Catch, AST_Constant, AST_Debugger, AST_Definitions, AST_Directive, AST_Finally, AST_Jump, AST_Lambda, AST_New, AST_Object, AST_StatementWithBody, AST_Symbol, AST_Switch, AST_SwitchBranch, AST_Try ], function(output) {
            output.add_mapping(this.start);
        });
        DEFMAP([ AST_ObjectGetter, AST_ObjectSetter ], function(output) {
            output.add_mapping(this.start, this.key.name);
        });
        DEFMAP([ AST_ObjectProperty ], function(output) {
            output.add_mapping(this.start, this.key);
        });
    })();
    "use strict";
    function Compressor(options, false_by_default) {
        if (!(this instanceof Compressor)) return new Compressor(options, false_by_default);
        TreeTransformer.call(this, this.before, this.after);
        this.options = defaults(options, {
            arguments: !false_by_default,
            booleans: !false_by_default,
            collapse_vars: !false_by_default,
            comparisons: !false_by_default,
            conditionals: !false_by_default,
            dead_code: !false_by_default,
            drop_console: false,
            drop_debugger: !false_by_default,
            evaluate: !false_by_default,
            expression: false,
            global_defs: {},
            hoist_funs: false,
            hoist_props: !false_by_default,
            hoist_vars: false,
            ie8: false,
            if_return: !false_by_default,
            inline: !false_by_default,
            join_vars: !false_by_default,
            keep_fargs: true,
            keep_fnames: false,
            keep_infinity: false,
            loops: !false_by_default,
            negate_iife: !false_by_default,
            passes: 1,
            properties: !false_by_default,
            pure_getters: !false_by_default && "strict",
            pure_funcs: null,
            reduce_funcs: !false_by_default,
            reduce_vars: !false_by_default,
            sequences: !false_by_default,
            side_effects: !false_by_default,
            switches: !false_by_default,
            top_retain: null,
            toplevel: !!(options && options["top_retain"]),
            typeofs: !false_by_default,
            unsafe: false,
            unsafe_comps: false,
            unsafe_Function: false,
            unsafe_math: false,
            unsafe_proto: false,
            unsafe_regexp: false,
            unsafe_undefined: false,
            unused: !false_by_default,
            warnings: false
        }, true);
        var global_defs = this.options["global_defs"];
        if (typeof global_defs == "object") for (var key in global_defs) {
            if (/^@/.test(key) && HOP(global_defs, key)) {
                global_defs[key.slice(1)] = parse(global_defs[key], {
                    expression: true
                });
            }
        }
        if (this.options["inline"] === true) this.options["inline"] = 3;
        var pure_funcs = this.options["pure_funcs"];
        if (typeof pure_funcs == "function") {
            this.pure_funcs = pure_funcs;
        } else {
            this.pure_funcs = pure_funcs ? function(node) {
                return pure_funcs.indexOf(node.expression.print_to_string()) < 0;
            } : return_true;
        }
        var top_retain = this.options["top_retain"];
        if (top_retain instanceof RegExp) {
            this.top_retain = function(def) {
                return top_retain.test(def.name);
            };
        } else if (typeof top_retain == "function") {
            this.top_retain = top_retain;
        } else if (top_retain) {
            if (typeof top_retain == "string") {
                top_retain = top_retain.split(/,/);
            }
            this.top_retain = function(def) {
                return top_retain.indexOf(def.name) >= 0;
            };
        }
        var toplevel = this.options["toplevel"];
        this.toplevel = typeof toplevel == "string" ? {
            funcs: /funcs/.test(toplevel),
            vars: /vars/.test(toplevel)
        } : {
            funcs: toplevel,
            vars: toplevel
        };
        var sequences = this.options["sequences"];
        this.sequences_limit = sequences == 1 ? 800 : sequences | 0;
        this.warnings_produced = {};
    }
    Compressor.prototype = new TreeTransformer();
    merge(Compressor.prototype, {
        option: function(key) {
            return this.options[key];
        },
        exposed: function(def) {
            if (def.global) for (var i = 0, len = def.orig.length; i < len; i++) if (!this.toplevel[def.orig[i] instanceof AST_SymbolDefun ? "funcs" : "vars"]) return true;
            return false;
        },
        compress: function(node) {
            if (this.option("expression")) {
                node.process_expression(true);
            }
            var passes = +this.options.passes || 1;
            var min_count = 1 / 0;
            var stopping = false;
            var mangle = {
                ie8: this.option("ie8")
            };
            for (var pass = 0; pass < passes; pass++) {
                node.figure_out_scope(mangle);
                if (pass > 0 || this.option("reduce_vars")) node.reset_opt_flags(this);
                node = node.transform(this);
                if (passes > 1) {
                    var count = 0;
                    node.walk(new TreeWalker(function() {
                        count++;
                    }));
                    this.info("pass " + pass + ": last_count: " + min_count + ", count: " + count);
                    if (count < min_count) {
                        min_count = count;
                        stopping = false;
                    } else if (stopping) {
                        break;
                    } else {
                        stopping = true;
                    }
                }
            }
            if (this.option("expression")) {
                node.process_expression(false);
            }
            return node;
        },
        info: function() {
            if (this.options.warnings == "verbose") {
                AST_Node.warn.apply(AST_Node, arguments);
            }
        },
        warn: function(text, props) {
            if (this.options.warnings) {
                var message = string_template(text, props);
                if (!(message in this.warnings_produced)) {
                    this.warnings_produced[message] = true;
                    AST_Node.warn.apply(AST_Node, arguments);
                }
            }
        },
        clear_warnings: function() {
            this.warnings_produced = {};
        },
        before: function(node, descend, in_list) {
            if (node._squeezed) return node;
            var was_scope = false;
            if (node instanceof AST_Scope) {
                node = node.hoist_properties(this);
                node = node.hoist_declarations(this);
                was_scope = true;
            }
            descend(node, this);
            descend(node, this);
            var opt = node.optimize(this);
            if (was_scope && opt instanceof AST_Scope) {
                opt.drop_unused(this);
                descend(opt, this);
            }
            if (opt === node) opt._squeezed = true;
            return opt;
        }
    });
    (function() {
        function OPT(node, optimizer) {
            node.DEFMETHOD("optimize", function(compressor) {
                var self = this;
                if (self._optimized) return self;
                if (compressor.has_directive("use asm")) return self;
                var opt = optimizer(self, compressor);
                opt._optimized = true;
                return opt;
            });
        }
        OPT(AST_Node, function(self, compressor) {
            return self;
        });
        AST_Node.DEFMETHOD("equivalent_to", function(node) {
            return this.TYPE == node.TYPE && this.print_to_string() == node.print_to_string();
        });
        AST_Scope.DEFMETHOD("process_expression", function(insert, compressor) {
            var self = this;
            var tt = new TreeTransformer(function(node) {
                if (insert && node instanceof AST_SimpleStatement) {
                    return make_node(AST_Return, node, {
                        value: node.body
                    });
                }
                if (!insert && node instanceof AST_Return) {
                    if (compressor) {
                        var value = node.value && node.value.drop_side_effect_free(compressor, true);
                        return value ? make_node(AST_SimpleStatement, node, {
                            body: value
                        }) : make_node(AST_EmptyStatement, node);
                    }
                    return make_node(AST_SimpleStatement, node, {
                        body: node.value || make_node(AST_UnaryPrefix, node, {
                            operator: "void",
                            expression: make_node(AST_Number, node, {
                                value: 0
                            })
                        })
                    });
                }
                if (node instanceof AST_Lambda && node !== self) {
                    return node;
                }
                if (node instanceof AST_Block) {
                    var index = node.body.length - 1;
                    if (index >= 0) {
                        node.body[index] = node.body[index].transform(tt);
                    }
                } else if (node instanceof AST_If) {
                    node.body = node.body.transform(tt);
                    if (node.alternative) {
                        node.alternative = node.alternative.transform(tt);
                    }
                } else if (node instanceof AST_With) {
                    node.body = node.body.transform(tt);
                }
                return node;
            });
            self.transform(tt);
        });
        (function(def) {
            def(AST_Node, noop);
            function reset_def(compressor, def) {
                def.assignments = 0;
                def.chained = false;
                def.direct_access = false;
                def.escaped = false;
                if (def.scope.uses_eval || def.scope.uses_with) {
                    def.fixed = false;
                } else if (!compressor.exposed(def)) {
                    def.fixed = def.init;
                } else {
                    def.fixed = false;
                }
                def.recursive_refs = 0;
                def.references = [];
                def.should_replace = undefined;
                def.single_use = undefined;
            }
            function reset_variables(tw, compressor, node) {
                node.variables.each(function(def) {
                    reset_def(compressor, def);
                    if (def.fixed === null) {
                        def.safe_ids = tw.safe_ids;
                        mark(tw, def, true);
                    } else if (def.fixed) {
                        tw.loop_ids[def.id] = tw.in_loop;
                        mark(tw, def, true);
                    }
                });
            }
            function push(tw) {
                tw.safe_ids = Object.create(tw.safe_ids);
            }
            function pop(tw) {
                tw.safe_ids = Object.getPrototypeOf(tw.safe_ids);
            }
            function mark(tw, def, safe) {
                tw.safe_ids[def.id] = safe;
            }
            function safe_to_read(tw, def) {
                if (tw.safe_ids[def.id]) {
                    if (def.fixed == null) {
                        var orig = def.orig[0];
                        if (orig instanceof AST_SymbolFunarg || orig.name == "arguments") return false;
                        def.fixed = make_node(AST_Undefined, orig);
                    }
                    return true;
                }
                return def.fixed instanceof AST_Defun;
            }
            function safe_to_assign(tw, def, value) {
                if (def.fixed === undefined) return true;
                if (def.fixed === null && def.safe_ids) {
                    def.safe_ids[def.id] = false;
                    delete def.safe_ids;
                    return true;
                }
                if (!HOP(tw.safe_ids, def.id)) return false;
                if (!safe_to_read(tw, def)) return false;
                if (def.fixed === false) return false;
                if (def.fixed != null && (!value || def.references.length > def.assignments)) return false;
                return all(def.orig, function(sym) {
                    return !(sym instanceof AST_SymbolDefun || sym instanceof AST_SymbolLambda);
                });
            }
            function ref_once(tw, compressor, def) {
                return compressor.option("unused") && !def.scope.uses_eval && !def.scope.uses_with && def.references.length - def.recursive_refs == 1 && tw.loop_ids[def.id] === tw.in_loop;
            }
            function is_immutable(value) {
                if (!value) return false;
                return value.is_constant() || value instanceof AST_Lambda || value instanceof AST_This;
            }
            function read_property(obj, key) {
                key = get_value(key);
                if (key instanceof AST_Node) return;
                var value;
                if (obj instanceof AST_Array) {
                    var elements = obj.elements;
                    if (key == "length") return make_node_from_constant(elements.length, obj);
                    if (typeof key == "number" && key in elements) value = elements[key];
                } else if (obj instanceof AST_Object) {
                    key = "" + key;
                    var props = obj.properties;
                    for (var i = props.length; --i >= 0; ) {
                        var prop = props[i];
                        if (!(prop instanceof AST_ObjectKeyVal)) return;
                        if (!value && props[i].key === key) value = props[i].value;
                    }
                }
                return value instanceof AST_SymbolRef && value.fixed_value() || value;
            }
            function is_modified(tw, node, value, level, immutable) {
                var parent = tw.parent(level);
                if (is_lhs(node, parent) || !immutable && parent instanceof AST_Call && parent.expression === node && (!(value instanceof AST_Function) || !(parent instanceof AST_New) && value.contains_this())) {
                    return true;
                } else if (parent instanceof AST_Array) {
                    return is_modified(tw, parent, parent, level + 1);
                } else if (parent instanceof AST_ObjectKeyVal && node === parent.value) {
                    var obj = tw.parent(level + 1);
                    return is_modified(tw, obj, obj, level + 2);
                } else if (parent instanceof AST_PropAccess && parent.expression === node) {
                    return !immutable && is_modified(tw, parent, read_property(value, parent.property), level + 1);
                }
            }
            function mark_escaped(tw, d, scope, node, value, level, depth) {
                var parent = tw.parent(level);
                if (value && value.is_constant()) return;
                if (parent instanceof AST_Assign && parent.operator == "=" && node === parent.right || parent instanceof AST_Call && (node !== parent.expression || parent instanceof AST_New) || parent instanceof AST_Exit && node === parent.value && node.scope !== d.scope || parent instanceof AST_VarDef && node === parent.value) {
                    if (depth > 1 && !(value && value.is_constant_expression(scope))) depth = 1;
                    if (!d.escaped || d.escaped > depth) d.escaped = depth;
                    return;
                } else if (parent instanceof AST_Array || parent instanceof AST_Binary && lazy_op(parent.operator) || parent instanceof AST_Conditional && node !== parent.condition || parent instanceof AST_Sequence && node === parent.tail_node()) {
                    mark_escaped(tw, d, scope, parent, parent, level + 1, depth);
                } else if (parent instanceof AST_ObjectKeyVal && node === parent.value) {
                    var obj = tw.parent(level + 1);
                    mark_escaped(tw, d, scope, obj, obj, level + 2, depth);
                } else if (parent instanceof AST_PropAccess && node === parent.expression) {
                    value = read_property(value, parent.property);
                    mark_escaped(tw, d, scope, parent, value, level + 1, depth + 1);
                    if (value) return;
                }
                if (level == 0) d.direct_access = true;
            }
            var suppressor = new TreeWalker(function(node) {
                if (!(node instanceof AST_Symbol)) return;
                var d = node.definition();
                if (!d) return;
                if (node instanceof AST_SymbolRef) d.references.push(node);
                d.fixed = false;
            });
            def(AST_Accessor, function(tw, descend, compressor) {
                push(tw);
                reset_variables(tw, compressor, this);
                descend();
                pop(tw);
                return true;
            });
            def(AST_Assign, function(tw) {
                var node = this;
                if (!(node.left instanceof AST_SymbolRef)) return;
                var d = node.left.definition();
                var fixed = d.fixed;
                if (!fixed && node.operator != "=") return;
                if (!safe_to_assign(tw, d, node.right)) return;
                d.references.push(node.left);
                d.assignments++;
                if (node.operator != "=") d.chained = true;
                d.fixed = node.operator == "=" ? function() {
                    return node.right;
                } : function() {
                    return make_node(AST_Binary, node, {
                        operator: node.operator.slice(0, -1),
                        left: fixed instanceof AST_Node ? fixed : fixed(),
                        right: node.right
                    });
                };
                mark(tw, d, false);
                node.right.walk(tw);
                mark(tw, d, true);
                return true;
            });
            def(AST_Binary, function(tw) {
                if (!lazy_op(this.operator)) return;
                this.left.walk(tw);
                push(tw);
                this.right.walk(tw);
                pop(tw);
                return true;
            });
            def(AST_Case, function(tw) {
                push(tw);
                this.expression.walk(tw);
                pop(tw);
                push(tw);
                walk_body(this, tw);
                pop(tw);
                return true;
            });
            def(AST_Conditional, function(tw) {
                this.condition.walk(tw);
                push(tw);
                this.consequent.walk(tw);
                pop(tw);
                push(tw);
                this.alternative.walk(tw);
                pop(tw);
                return true;
            });
            def(AST_Default, function(tw, descend) {
                push(tw);
                descend();
                pop(tw);
                return true;
            });
            def(AST_Defun, function(tw, descend, compressor) {
                this.inlined = false;
                var save_ids = tw.safe_ids;
                tw.safe_ids = Object.create(null);
                reset_variables(tw, compressor, this);
                descend();
                tw.safe_ids = save_ids;
                return true;
            });
            def(AST_Do, function(tw) {
                var saved_loop = tw.in_loop;
                tw.in_loop = this;
                push(tw);
                this.body.walk(tw);
                this.condition.walk(tw);
                pop(tw);
                tw.in_loop = saved_loop;
                return true;
            });
            def(AST_For, function(tw) {
                if (this.init) this.init.walk(tw);
                var saved_loop = tw.in_loop;
                tw.in_loop = this;
                if (this.condition) {
                    push(tw);
                    this.condition.walk(tw);
                    pop(tw);
                }
                push(tw);
                this.body.walk(tw);
                pop(tw);
                if (this.step) {
                    push(tw);
                    this.step.walk(tw);
                    pop(tw);
                }
                tw.in_loop = saved_loop;
                return true;
            });
            def(AST_ForIn, function(tw) {
                this.init.walk(suppressor);
                this.object.walk(tw);
                var saved_loop = tw.in_loop;
                tw.in_loop = this;
                push(tw);
                this.body.walk(tw);
                pop(tw);
                tw.in_loop = saved_loop;
                return true;
            });
            def(AST_Function, function(tw, descend, compressor) {
                var node = this;
                node.inlined = false;
                push(tw);
                reset_variables(tw, compressor, node);
                var iife;
                if (!node.name && (iife = tw.parent()) instanceof AST_Call && iife.expression === node) {
                    node.argnames.forEach(function(arg, i) {
                        var d = arg.definition();
                        if (!node.uses_arguments && d.fixed === undefined) {
                            d.fixed = function() {
                                return iife.args[i] || make_node(AST_Undefined, iife);
                            };
                            tw.loop_ids[d.id] = tw.in_loop;
                            mark(tw, d, true);
                        } else {
                            d.fixed = false;
                        }
                    });
                }
                descend();
                pop(tw);
                return true;
            });
            def(AST_If, function(tw) {
                this.condition.walk(tw);
                push(tw);
                this.body.walk(tw);
                pop(tw);
                if (this.alternative) {
                    push(tw);
                    this.alternative.walk(tw);
                    pop(tw);
                }
                return true;
            });
            def(AST_LabeledStatement, function(tw) {
                push(tw);
                this.body.walk(tw);
                pop(tw);
                return true;
            });
            def(AST_SymbolCatch, function() {
                this.definition().fixed = false;
            });
            def(AST_SymbolRef, function(tw, descend, compressor) {
                var d = this.definition();
                d.references.push(this);
                if (d.references.length == 1 && !d.fixed && d.orig[0] instanceof AST_SymbolDefun) {
                    tw.loop_ids[d.id] = tw.in_loop;
                }
                var value;
                if (d.fixed === undefined || !safe_to_read(tw, d) || d.single_use == "m") {
                    d.fixed = false;
                } else if (d.fixed) {
                    value = this.fixed_value();
                    if (value instanceof AST_Lambda && recursive_ref(tw, d)) {
                        d.recursive_refs++;
                    } else if (value && ref_once(tw, compressor, d)) {
                        d.single_use = value instanceof AST_Lambda || d.scope === this.scope && value.is_constant_expression();
                    } else {
                        d.single_use = false;
                    }
                    if (is_modified(tw, this, value, 0, is_immutable(value))) {
                        if (d.single_use) {
                            d.single_use = "m";
                        } else {
                            d.fixed = false;
                        }
                    }
                }
                mark_escaped(tw, d, this.scope, this, value, 0, 1);
            });
            def(AST_Toplevel, function(tw, descend, compressor) {
                this.globals.each(function(def) {
                    reset_def(compressor, def);
                });
                reset_variables(tw, compressor, this);
            });
            def(AST_Try, function(tw) {
                push(tw);
                walk_body(this, tw);
                pop(tw);
                if (this.bcatch) {
                    push(tw);
                    this.bcatch.walk(tw);
                    pop(tw);
                }
                if (this.bfinally) this.bfinally.walk(tw);
                return true;
            });
            def(AST_Unary, function(tw, descend) {
                var node = this;
                if (node.operator != "++" && node.operator != "--") return;
                if (!(node.expression instanceof AST_SymbolRef)) return;
                var d = node.expression.definition();
                var fixed = d.fixed;
                if (!fixed) return;
                if (!safe_to_assign(tw, d, true)) return;
                d.references.push(node.expression);
                d.assignments++;
                d.chained = true;
                d.fixed = function() {
                    return make_node(AST_Binary, node, {
                        operator: node.operator.slice(0, -1),
                        left: make_node(AST_UnaryPrefix, node, {
                            operator: "+",
                            expression: fixed instanceof AST_Node ? fixed : fixed()
                        }),
                        right: make_node(AST_Number, node, {
                            value: 1
                        })
                    });
                };
                mark(tw, d, true);
                return true;
            });
            def(AST_VarDef, function(tw, descend) {
                var node = this;
                var d = node.name.definition();
                if (node.value) {
                    if (safe_to_assign(tw, d, node.value)) {
                        d.fixed = function() {
                            return node.value;
                        };
                        tw.loop_ids[d.id] = tw.in_loop;
                        mark(tw, d, false);
                        descend();
                        mark(tw, d, true);
                        return true;
                    } else {
                        d.fixed = false;
                    }
                }
            });
            def(AST_While, function(tw) {
                var saved_loop = tw.in_loop;
                tw.in_loop = this;
                push(tw);
                this.condition.walk(tw);
                this.body.walk(tw);
                pop(tw);
                tw.in_loop = saved_loop;
                return true;
            });
        })(function(node, func) {
            node.DEFMETHOD("reduce_vars", func);
        });
        AST_Toplevel.DEFMETHOD("reset_opt_flags", function(compressor) {
            var reduce_vars = compressor.option("reduce_vars");
            var tw = new TreeWalker(function(node, descend) {
                node._squeezed = false;
                node._optimized = false;
                if (reduce_vars) return node.reduce_vars(tw, descend, compressor);
            });
            tw.safe_ids = Object.create(null);
            tw.in_loop = null;
            tw.loop_ids = Object.create(null);
            this.walk(tw);
        });
        AST_Symbol.DEFMETHOD("fixed_value", function() {
            var fixed = this.definition().fixed;
            if (!fixed || fixed instanceof AST_Node) return fixed;
            return fixed();
        });
        AST_SymbolRef.DEFMETHOD("is_immutable", function() {
            var orig = this.definition().orig;
            return orig.length == 1 && orig[0] instanceof AST_SymbolLambda;
        });
        function is_lhs_read_only(lhs) {
            if (lhs instanceof AST_This) return true;
            if (lhs instanceof AST_SymbolRef) return lhs.definition().orig[0] instanceof AST_SymbolLambda;
            if (lhs instanceof AST_PropAccess) {
                lhs = lhs.expression;
                if (lhs instanceof AST_SymbolRef) {
                    if (lhs.is_immutable()) return false;
                    lhs = lhs.fixed_value();
                }
                if (!lhs) return true;
                if (lhs.is_constant()) return true;
                return is_lhs_read_only(lhs);
            }
            return false;
        }
        function find_variable(compressor, name) {
            var scope, i = 0;
            while (scope = compressor.parent(i++)) {
                if (scope instanceof AST_Scope) break;
                if (scope instanceof AST_Catch) {
                    scope = scope.argname.definition().scope;
                    break;
                }
            }
            return scope.find_variable(name);
        }
        function make_node(ctor, orig, props) {
            if (!props) props = {};
            if (orig) {
                if (!props.start) props.start = orig.start;
                if (!props.end) props.end = orig.end;
            }
            return new ctor(props);
        }
        function make_sequence(orig, expressions) {
            if (expressions.length == 1) return expressions[0];
            return make_node(AST_Sequence, orig, {
                expressions: expressions.reduce(merge_sequence, [])
            });
        }
        function make_node_from_constant(val, orig) {
            switch (typeof val) {
              case "string":
                return make_node(AST_String, orig, {
                    value: val
                });

              case "number":
                if (isNaN(val)) return make_node(AST_NaN, orig);
                if (isFinite(val)) {
                    return 1 / val < 0 ? make_node(AST_UnaryPrefix, orig, {
                        operator: "-",
                        expression: make_node(AST_Number, orig, {
                            value: -val
                        })
                    }) : make_node(AST_Number, orig, {
                        value: val
                    });
                }
                return val < 0 ? make_node(AST_UnaryPrefix, orig, {
                    operator: "-",
                    expression: make_node(AST_Infinity, orig)
                }) : make_node(AST_Infinity, orig);

              case "boolean":
                return make_node(val ? AST_True : AST_False, orig);

              case "undefined":
                return make_node(AST_Undefined, orig);

              default:
                if (val === null) {
                    return make_node(AST_Null, orig, {
                        value: null
                    });
                }
                if (val instanceof RegExp) {
                    return make_node(AST_RegExp, orig, {
                        value: val
                    });
                }
                throw new Error(string_template("Can't handle constant of type: {type}", {
                    type: typeof val
                }));
            }
        }
        function maintain_this_binding(parent, orig, val) {
            if (parent instanceof AST_UnaryPrefix && parent.operator == "delete" || parent instanceof AST_Call && parent.expression === orig && (val instanceof AST_PropAccess || val instanceof AST_SymbolRef && val.name == "eval")) {
                return make_sequence(orig, [ make_node(AST_Number, orig, {
                    value: 0
                }), val ]);
            }
            return val;
        }
        function merge_sequence(array, node) {
            if (node instanceof AST_Sequence) {
                array.push.apply(array, node.expressions);
            } else {
                array.push(node);
            }
            return array;
        }
        function as_statement_array(thing) {
            if (thing === null) return [];
            if (thing instanceof AST_BlockStatement) return thing.body;
            if (thing instanceof AST_EmptyStatement) return [];
            if (thing instanceof AST_Statement) return [ thing ];
            throw new Error("Can't convert thing to statement array");
        }
        function is_empty(thing) {
            if (thing === null) return true;
            if (thing instanceof AST_EmptyStatement) return true;
            if (thing instanceof AST_BlockStatement) return thing.body.length == 0;
            return false;
        }
        function loop_body(x) {
            if (x instanceof AST_IterationStatement) {
                return x.body instanceof AST_BlockStatement ? x.body : x;
            }
            return x;
        }
        function root_expr(prop) {
            while (prop instanceof AST_PropAccess) prop = prop.expression;
            return prop;
        }
        function is_iife_call(node) {
            if (node.TYPE != "Call") return false;
            return node.expression instanceof AST_Function || is_iife_call(node.expression);
        }
        function is_undeclared_ref(node) {
            return node instanceof AST_SymbolRef && node.definition().undeclared;
        }
        var global_names = makePredicate("Array Boolean clearInterval clearTimeout console Date decodeURI decodeURIComponent encodeURI encodeURIComponent Error escape eval EvalError Function isFinite isNaN JSON Math Number parseFloat parseInt RangeError ReferenceError RegExp Object setInterval setTimeout String SyntaxError TypeError unescape URIError");
        AST_SymbolRef.DEFMETHOD("is_declared", function(compressor) {
            return !this.definition().undeclared || compressor.option("unsafe") && global_names(this.name);
        });
        var identifier_atom = makePredicate("Infinity NaN undefined");
        function is_identifier_atom(node) {
            return node instanceof AST_Infinity || node instanceof AST_NaN || node instanceof AST_Undefined;
        }
        function tighten_body(statements, compressor) {
            var in_loop, in_try, scope;
            find_loop_scope_try();
            var CHANGED, max_iter = 10;
            do {
                CHANGED = false;
                eliminate_spurious_blocks(statements);
                if (compressor.option("dead_code")) {
                    eliminate_dead_code(statements, compressor);
                }
                if (compressor.option("if_return")) {
                    handle_if_return(statements, compressor);
                }
                if (compressor.sequences_limit > 0) {
                    sequencesize(statements, compressor);
                    sequencesize_2(statements, compressor);
                }
                if (compressor.option("join_vars")) {
                    join_consecutive_vars(statements);
                }
                if (compressor.option("collapse_vars")) {
                    collapse(statements, compressor);
                }
            } while (CHANGED && max_iter-- > 0);
            function find_loop_scope_try() {
                var node = compressor.self(), level = 0;
                do {
                    if (node instanceof AST_Catch || node instanceof AST_Finally) {
                        level++;
                    } else if (node instanceof AST_IterationStatement) {
                        in_loop = true;
                    } else if (node instanceof AST_Scope) {
                        scope = node;
                        break;
                    } else if (node instanceof AST_Try) {
                        in_try = true;
                    }
                } while (node = compressor.parent(level++));
            }
            function collapse(statements, compressor) {
                if (scope.uses_eval || scope.uses_with) return statements;
                var args;
                var candidates = [];
                var stat_index = statements.length;
                var scanner = new TreeTransformer(function(node) {
                    if (abort) return node;
                    if (!hit) {
                        if (node !== hit_stack[hit_index]) return node;
                        hit_index++;
                        if (hit_index < hit_stack.length) return handle_custom_scan_order(node);
                        hit = true;
                        stop_after = find_stop(node, 0);
                        if (stop_after === node) abort = true;
                        return node;
                    }
                    var parent = scanner.parent();
                    if (node instanceof AST_Assign && node.operator != "=" && lhs.equivalent_to(node.left) || node instanceof AST_Call && lhs instanceof AST_PropAccess && lhs.equivalent_to(node.expression) || node instanceof AST_Debugger || node instanceof AST_IterationStatement && !(node instanceof AST_For) || node instanceof AST_LoopControl || node instanceof AST_Try || node instanceof AST_With || parent instanceof AST_For && node !== parent.init || !replace_all && (node instanceof AST_SymbolRef && !node.is_declared(compressor))) {
                        abort = true;
                        return node;
                    }
                    if (!stop_if_hit && (parent instanceof AST_Binary && lazy_op(parent.operator) && parent.left !== node || parent instanceof AST_Conditional && parent.condition !== node || parent instanceof AST_If && parent.condition !== node)) {
                        stop_if_hit = parent;
                    }
                    var hit_lhs, hit_rhs;
                    if (can_replace && !(node instanceof AST_SymbolDeclaration) && (scan_lhs && (hit_lhs = lhs.equivalent_to(node)) || scan_rhs && (hit_rhs = scan_rhs(node, this)))) {
                        if (stop_if_hit && (hit_rhs || !lhs_local || !replace_all)) {
                            abort = true;
                            return node;
                        }
                        if (is_lhs(node, parent)) {
                            if (value_def) replaced++;
                            return node;
                        }
                        CHANGED = abort = true;
                        replaced++;
                        compressor.info("Collapsing {name} [{file}:{line},{col}]", {
                            name: node.print_to_string(),
                            file: node.start.file,
                            line: node.start.line,
                            col: node.start.col
                        });
                        if (candidate instanceof AST_UnaryPostfix) {
                            return make_node(AST_UnaryPrefix, candidate, candidate);
                        }
                        if (candidate instanceof AST_VarDef) {
                            if (value_def) {
                                abort = false;
                                return node;
                            }
                            var def = candidate.name.definition();
                            var value = candidate.value;
                            if (def.references.length - def.replaced == 1 && !compressor.exposed(def)) {
                                def.replaced++;
                                if (funarg && is_identifier_atom(value)) {
                                    return value.transform(compressor);
                                } else {
                                    return maintain_this_binding(parent, node, value);
                                }
                            }
                            return make_node(AST_Assign, candidate, {
                                operator: "=",
                                left: make_node(AST_SymbolRef, candidate.name, candidate.name),
                                right: value
                            });
                        }
                        candidate.write_only = false;
                        return candidate;
                    }
                    var sym;
                    if (node instanceof AST_Call || node instanceof AST_Exit && (side_effects || lhs instanceof AST_PropAccess || may_modify(lhs)) || node instanceof AST_PropAccess && (side_effects || node.expression.may_throw_on_access(compressor)) || node instanceof AST_SymbolRef && (symbol_in_lvalues(node) || side_effects && may_modify(node)) || node instanceof AST_This && symbol_in_lvalues(node) || node instanceof AST_VarDef && node.value && (node.name.name in lvalues || side_effects && may_modify(node.name)) || (sym = is_lhs(node.left, node)) && (sym instanceof AST_PropAccess || sym.name in lvalues) || may_throw && (in_try ? node.has_side_effects(compressor) : side_effects_external(node))) {
                        stop_after = node;
                        if (node instanceof AST_Scope) abort = true;
                    }
                    return handle_custom_scan_order(node);
                }, function(node) {
                    if (abort) return;
                    if (stop_after === node) abort = true;
                    if (stop_if_hit === node) stop_if_hit = null;
                });
                var multi_replacer = new TreeTransformer(function(node) {
                    if (abort) return node;
                    if (!hit) {
                        if (node !== hit_stack[hit_index]) return node;
                        hit_index++;
                        if (hit_index < hit_stack.length) return;
                        hit = true;
                        return node;
                    }
                    if (node instanceof AST_SymbolRef && node.name == def.name) {
                        if (!--replaced) abort = true;
                        if (is_lhs(node, multi_replacer.parent())) return node;
                        def.replaced++;
                        value_def.replaced--;
                        return candidate.value;
                    }
                    if (node instanceof AST_Default || node instanceof AST_Scope) return node;
                });
                while (--stat_index >= 0) {
                    if (stat_index == 0 && compressor.option("unused")) extract_args();
                    var hit_stack = [];
                    extract_candidates(statements[stat_index]);
                    while (candidates.length > 0) {
                        hit_stack = candidates.pop();
                        var hit_index = 0;
                        var candidate = hit_stack[hit_stack.length - 1];
                        var value_def = null;
                        var stop_after = null;
                        var stop_if_hit = null;
                        var lhs = get_lhs(candidate);
                        var rhs = get_rhs(candidate);
                        var side_effects = lhs && lhs.has_side_effects(compressor);
                        var scan_lhs = lhs && !side_effects && !is_lhs_read_only(lhs);
                        var scan_rhs = rhs && foldable(rhs);
                        if (!scan_lhs && !scan_rhs) continue;
                        var lvalues = get_lvalues(candidate);
                        var lhs_local = is_lhs_local(lhs);
                        if (!side_effects) side_effects = value_has_side_effects(candidate);
                        var replace_all = replace_all_symbols();
                        var may_throw = candidate.may_throw(compressor);
                        var funarg = candidate.name instanceof AST_SymbolFunarg;
                        var hit = funarg;
                        var abort = false, replaced = 0, can_replace = !args || !hit;
                        if (!can_replace) {
                            for (var j = compressor.self().argnames.lastIndexOf(candidate.name) + 1; !abort && j < args.length; j++) {
                                args[j].transform(scanner);
                            }
                            can_replace = true;
                        }
                        for (var i = stat_index; !abort && i < statements.length; i++) {
                            statements[i].transform(scanner);
                        }
                        if (value_def) {
                            var def = candidate.name.definition();
                            if (abort && def.references.length - def.replaced > replaced) replaced = false; else {
                                abort = false;
                                hit_index = 0;
                                hit = funarg;
                                for (var i = stat_index; !abort && i < statements.length; i++) {
                                    statements[i].transform(multi_replacer);
                                }
                                value_def.single_use = false;
                            }
                        }
                        if (replaced && !remove_candidate(candidate)) statements.splice(stat_index, 1);
                    }
                }
                function handle_custom_scan_order(node) {
                    if (node instanceof AST_Scope) return node;
                    if (node instanceof AST_Switch) {
                        node.expression = node.expression.transform(scanner);
                        for (var i = 0, len = node.body.length; !abort && i < len; i++) {
                            var branch = node.body[i];
                            if (branch instanceof AST_Case) {
                                if (!hit) {
                                    if (branch !== hit_stack[hit_index]) continue;
                                    hit_index++;
                                }
                                branch.expression = branch.expression.transform(scanner);
                                if (!replace_all) break;
                            }
                        }
                        abort = true;
                        return node;
                    }
                }
                function extract_args() {
                    var iife, fn = compressor.self();
                    if (fn instanceof AST_Function && !fn.name && !fn.uses_arguments && !fn.uses_eval && (iife = compressor.parent()) instanceof AST_Call && iife.expression === fn) {
                        var fn_strict = compressor.has_directive("use strict");
                        if (fn_strict && !member(fn_strict, fn.body)) fn_strict = false;
                        var len = fn.argnames.length;
                        args = iife.args.slice(len);
                        var names = Object.create(null);
                        for (var i = len; --i >= 0; ) {
                            var sym = fn.argnames[i];
                            var arg = iife.args[i];
                            args.unshift(make_node(AST_VarDef, sym, {
                                name: sym,
                                value: arg
                            }));
                            if (sym.name in names) continue;
                            names[sym.name] = true;
                            if (!arg) arg = make_node(AST_Undefined, sym).transform(compressor); else {
                                var tw = new TreeWalker(function(node) {
                                    if (!arg) return true;
                                    if (node instanceof AST_SymbolRef && fn.variables.has(node.name)) {
                                        var s = node.definition().scope;
                                        if (s !== scope) while (s = s.parent_scope) {
                                            if (s === scope) return true;
                                        }
                                        arg = null;
                                    }
                                    if (node instanceof AST_This && (fn_strict || !tw.find_parent(AST_Scope))) {
                                        arg = null;
                                        return true;
                                    }
                                });
                                arg.walk(tw);
                            }
                            if (arg) candidates.unshift([ make_node(AST_VarDef, sym, {
                                name: sym,
                                value: arg
                            }) ]);
                        }
                    }
                }
                function extract_candidates(expr) {
                    hit_stack.push(expr);
                    if (expr instanceof AST_Assign) {
                        candidates.push(hit_stack.slice());
                        extract_candidates(expr.right);
                    } else if (expr instanceof AST_Binary) {
                        extract_candidates(expr.left);
                        extract_candidates(expr.right);
                    } else if (expr instanceof AST_Call) {
                        extract_candidates(expr.expression);
                        expr.args.forEach(extract_candidates);
                    } else if (expr instanceof AST_Case) {
                        extract_candidates(expr.expression);
                    } else if (expr instanceof AST_Conditional) {
                        extract_candidates(expr.condition);
                        extract_candidates(expr.consequent);
                        extract_candidates(expr.alternative);
                    } else if (expr instanceof AST_Definitions) {
                        expr.definitions.forEach(extract_candidates);
                    } else if (expr instanceof AST_DWLoop) {
                        extract_candidates(expr.condition);
                        if (!(expr.body instanceof AST_Block)) {
                            extract_candidates(expr.body);
                        }
                    } else if (expr instanceof AST_Exit) {
                        if (expr.value) extract_candidates(expr.value);
                    } else if (expr instanceof AST_For) {
                        if (expr.init) extract_candidates(expr.init);
                        if (expr.condition) extract_candidates(expr.condition);
                        if (expr.step) extract_candidates(expr.step);
                        if (!(expr.body instanceof AST_Block)) {
                            extract_candidates(expr.body);
                        }
                    } else if (expr instanceof AST_ForIn) {
                        extract_candidates(expr.object);
                        if (!(expr.body instanceof AST_Block)) {
                            extract_candidates(expr.body);
                        }
                    } else if (expr instanceof AST_If) {
                        extract_candidates(expr.condition);
                        if (!(expr.body instanceof AST_Block)) {
                            extract_candidates(expr.body);
                        }
                        if (expr.alternative && !(expr.alternative instanceof AST_Block)) {
                            extract_candidates(expr.alternative);
                        }
                    } else if (expr instanceof AST_Sequence) {
                        expr.expressions.forEach(extract_candidates);
                    } else if (expr instanceof AST_SimpleStatement) {
                        extract_candidates(expr.body);
                    } else if (expr instanceof AST_Switch) {
                        extract_candidates(expr.expression);
                        expr.body.forEach(extract_candidates);
                    } else if (expr instanceof AST_Unary) {
                        if (expr.operator == "++" || expr.operator == "--") {
                            candidates.push(hit_stack.slice());
                        } else {
                            extract_candidates(expr.expression);
                        }
                    } else if (expr instanceof AST_VarDef) {
                        if (expr.value) {
                            candidates.push(hit_stack.slice());
                            extract_candidates(expr.value);
                        }
                    }
                    hit_stack.pop();
                }
                function find_stop(node, level, write_only) {
                    var parent = scanner.parent(level);
                    if (parent instanceof AST_Assign) {
                        if (write_only && !(parent.left instanceof AST_PropAccess || parent.left.name in lvalues)) {
                            return find_stop(parent, level + 1, write_only);
                        }
                        return node;
                    }
                    if (parent instanceof AST_Binary) {
                        if (write_only && (!lazy_op(parent.operator) || parent.left === node)) {
                            return find_stop(parent, level + 1, write_only);
                        }
                        return node;
                    }
                    if (parent instanceof AST_Call) return node;
                    if (parent instanceof AST_Case) return node;
                    if (parent instanceof AST_Conditional) {
                        if (write_only && parent.condition === node) {
                            return find_stop(parent, level + 1, write_only);
                        }
                        return node;
                    }
                    if (parent instanceof AST_Definitions) {
                        return find_stop(parent, level + 1, true);
                    }
                    if (parent instanceof AST_Exit) {
                        return write_only ? find_stop(parent, level + 1, write_only) : node;
                    }
                    if (parent instanceof AST_If) {
                        if (write_only && parent.condition === node) {
                            return find_stop(parent, level + 1, write_only);
                        }
                        return node;
                    }
                    if (parent instanceof AST_IterationStatement) return node;
                    if (parent instanceof AST_Sequence) {
                        return find_stop(parent, level + 1, parent.tail_node() !== node);
                    }
                    if (parent instanceof AST_SimpleStatement) {
                        return find_stop(parent, level + 1, true);
                    }
                    if (parent instanceof AST_Switch) return node;
                    if (parent instanceof AST_Unary) return node;
                    if (parent instanceof AST_VarDef) return node;
                    return null;
                }
                function mangleable_var(var_def) {
                    var value = var_def.value;
                    if (!(value instanceof AST_SymbolRef)) return;
                    if (value.name == "arguments") return;
                    var def = value.definition();
                    if (def.undeclared) return;
                    return value_def = def;
                }
                function get_lhs(expr) {
                    if (expr instanceof AST_VarDef) {
                        var def = expr.name.definition();
                        if (!member(expr.name, def.orig)) return;
                        var declared = def.orig.length - def.eliminated;
                        var referenced = def.references.length - def.replaced;
                        if (declared > 1 && !(expr.name instanceof AST_SymbolFunarg) || (referenced > 1 ? mangleable_var(expr) : !compressor.exposed(def))) {
                            return make_node(AST_SymbolRef, expr.name, expr.name);
                        }
                    } else {
                        return expr[expr instanceof AST_Assign ? "left" : "expression"];
                    }
                }
                function get_rhs(expr) {
                    if (!(candidate instanceof AST_Assign && candidate.operator == "=")) return;
                    return candidate.right;
                }
                function get_rvalue(expr) {
                    return expr[expr instanceof AST_Assign ? "right" : "value"];
                }
                function foldable(expr) {
                    if (expr instanceof AST_SymbolRef) {
                        var value = expr.evaluate(compressor);
                        if (value === expr) return rhs_exact_match;
                        return rhs_fuzzy_match(value, rhs_exact_match);
                    }
                    if (expr instanceof AST_This) return rhs_exact_match;
                    if (expr.is_truthy()) return rhs_fuzzy_match(true, return_false);
                    if (expr.is_constant()) {
                        return rhs_fuzzy_match(expr.evaluate(compressor), rhs_exact_match);
                    }
                    if (!(lhs instanceof AST_SymbolRef)) return false;
                    if (expr.has_side_effects(compressor)) return false;
                    var circular;
                    var def = lhs.definition();
                    expr.walk(new TreeWalker(function(node) {
                        if (circular) return true;
                        if (node instanceof AST_SymbolRef && node.definition() === def) {
                            circular = true;
                        }
                    }));
                    return !circular && rhs_exact_match;
                }
                function rhs_exact_match(node) {
                    return rhs.equivalent_to(node);
                }
                function rhs_fuzzy_match(value, fallback) {
                    return function(node, tw) {
                        if (tw.in_boolean_context()) {
                            if (value && node.is_truthy() && !node.has_side_effects(compressor)) {
                                return true;
                            }
                            if (node.is_constant()) {
                                return !node.evaluate(compressor) == !value;
                            }
                        }
                        return fallback(node);
                    };
                }
                function get_lvalues(expr) {
                    var lvalues = Object.create(null);
                    if (candidate instanceof AST_VarDef) {
                        lvalues[candidate.name.name] = lhs;
                    }
                    var tw = new TreeWalker(function(node) {
                        var sym = root_expr(node);
                        if (sym instanceof AST_SymbolRef || sym instanceof AST_This) {
                            lvalues[sym.name] = lvalues[sym.name] || is_lhs(node, tw.parent());
                        }
                    });
                    expr.walk(tw);
                    return lvalues;
                }
                function remove_candidate(expr) {
                    if (expr.name instanceof AST_SymbolFunarg) {
                        var index = compressor.self().argnames.indexOf(expr.name);
                        var args = compressor.parent().args;
                        if (args[index]) args[index] = make_node(AST_Number, args[index], {
                            value: 0
                        });
                        return true;
                    }
                    var found = false;
                    return statements[stat_index].transform(new TreeTransformer(function(node, descend, in_list) {
                        if (found) return node;
                        if (node === expr || node.body === expr) {
                            found = true;
                            if (node instanceof AST_VarDef) {
                                node.value = null;
                                return node;
                            }
                            return in_list ? MAP.skip : null;
                        }
                    }, function(node) {
                        if (node instanceof AST_Sequence) switch (node.expressions.length) {
                          case 0:
                            return null;

                          case 1:
                            return node.expressions[0];
                        }
                    }));
                }
                function is_lhs_local(lhs) {
                    var sym = root_expr(lhs);
                    return sym instanceof AST_SymbolRef && sym.definition().scope === scope && !(in_loop && (sym.name in lvalues && lvalues[sym.name] !== lhs || candidate instanceof AST_Unary || candidate instanceof AST_Assign && candidate.operator != "="));
                }
                function value_has_side_effects(expr) {
                    if (expr instanceof AST_Unary) return false;
                    return get_rvalue(expr).has_side_effects(compressor);
                }
                function replace_all_symbols() {
                    if (side_effects) return false;
                    if (value_def) return true;
                    if (lhs instanceof AST_SymbolRef) {
                        var def = lhs.definition();
                        if (def.references.length - def.replaced == (candidate instanceof AST_VarDef ? 1 : 2)) {
                            return true;
                        }
                    }
                    return false;
                }
                function symbol_in_lvalues(sym) {
                    var lvalue = lvalues[sym.name];
                    if (!lvalue) return;
                    if (lvalue !== lhs) return true;
                    scan_rhs = false;
                }
                function may_modify(sym) {
                    var def = sym.definition();
                    if (def.orig.length == 1 && def.orig[0] instanceof AST_SymbolDefun) return false;
                    if (def.scope !== scope) return true;
                    return !all(def.references, function(ref) {
                        var s = ref.scope;
                        if (s.TYPE == "Scope") s = s.parent_scope;
                        return s === scope;
                    });
                }
                function side_effects_external(node, lhs) {
                    if (node instanceof AST_Assign) return side_effects_external(node.left, true);
                    if (node instanceof AST_Unary) return side_effects_external(node.expression, true);
                    if (node instanceof AST_VarDef) return node.value && side_effects_external(node.value);
                    if (lhs) {
                        if (node instanceof AST_Dot) return side_effects_external(node.expression, true);
                        if (node instanceof AST_Sub) return side_effects_external(node.expression, true);
                        if (node instanceof AST_SymbolRef) return node.definition().scope !== scope;
                    }
                    return false;
                }
            }
            function eliminate_spurious_blocks(statements) {
                var seen_dirs = [];
                for (var i = 0; i < statements.length; ) {
                    var stat = statements[i];
                    if (stat instanceof AST_BlockStatement) {
                        CHANGED = true;
                        eliminate_spurious_blocks(stat.body);
                        [].splice.apply(statements, [ i, 1 ].concat(stat.body));
                        i += stat.body.length;
                    } else if (stat instanceof AST_EmptyStatement) {
                        CHANGED = true;
                        statements.splice(i, 1);
                    } else if (stat instanceof AST_Directive) {
                        if (seen_dirs.indexOf(stat.value) < 0) {
                            i++;
                            seen_dirs.push(stat.value);
                        } else {
                            CHANGED = true;
                            statements.splice(i, 1);
                        }
                    } else i++;
                }
            }
            function handle_if_return(statements, compressor) {
                var self = compressor.self();
                var multiple_if_returns = has_multiple_if_returns(statements);
                var in_lambda = self instanceof AST_Lambda;
                for (var i = statements.length; --i >= 0; ) {
                    var stat = statements[i];
                    var j = next_index(i);
                    var next = statements[j];
                    if (in_lambda && !next && stat instanceof AST_Return) {
                        if (!stat.value) {
                            CHANGED = true;
                            statements.splice(i, 1);
                            continue;
                        }
                        if (stat.value instanceof AST_UnaryPrefix && stat.value.operator == "void") {
                            CHANGED = true;
                            statements[i] = make_node(AST_SimpleStatement, stat, {
                                body: stat.value.expression
                            });
                            continue;
                        }
                    }
                    if (stat instanceof AST_If) {
                        var ab = aborts(stat.body);
                        if (can_merge_flow(ab)) {
                            if (ab.label) {
                                remove(ab.label.thedef.references, ab);
                            }
                            CHANGED = true;
                            stat = stat.clone();
                            stat.condition = stat.condition.negate(compressor);
                            var body = as_statement_array_with_return(stat.body, ab);
                            stat.body = make_node(AST_BlockStatement, stat, {
                                body: as_statement_array(stat.alternative).concat(extract_functions())
                            });
                            stat.alternative = make_node(AST_BlockStatement, stat, {
                                body: body
                            });
                            statements[i] = stat.transform(compressor);
                            continue;
                        }
                        var ab = aborts(stat.alternative);
                        if (can_merge_flow(ab)) {
                            if (ab.label) {
                                remove(ab.label.thedef.references, ab);
                            }
                            CHANGED = true;
                            stat = stat.clone();
                            stat.body = make_node(AST_BlockStatement, stat.body, {
                                body: as_statement_array(stat.body).concat(extract_functions())
                            });
                            var body = as_statement_array_with_return(stat.alternative, ab);
                            stat.alternative = make_node(AST_BlockStatement, stat.alternative, {
                                body: body
                            });
                            statements[i] = stat.transform(compressor);
                            continue;
                        }
                    }
                    if (stat instanceof AST_If && stat.body instanceof AST_Return) {
                        var value = stat.body.value;
                        if (!value && !stat.alternative && (in_lambda && !next || next instanceof AST_Return && !next.value)) {
                            CHANGED = true;
                            statements[i] = make_node(AST_SimpleStatement, stat.condition, {
                                body: stat.condition
                            });
                            continue;
                        }
                        if (value && !stat.alternative && next instanceof AST_Return && next.value) {
                            CHANGED = true;
                            stat = stat.clone();
                            stat.alternative = next;
                            statements.splice(i, 1, stat.transform(compressor));
                            statements.splice(j, 1);
                            continue;
                        }
                        if (value && !stat.alternative && (!next && in_lambda && multiple_if_returns || next instanceof AST_Return)) {
                            CHANGED = true;
                            stat = stat.clone();
                            stat.alternative = next || make_node(AST_Return, stat, {
                                value: null
                            });
                            statements.splice(i, 1, stat.transform(compressor));
                            if (next) statements.splice(j, 1);
                            continue;
                        }
                        var prev = statements[prev_index(i)];
                        if (compressor.option("sequences") && in_lambda && !stat.alternative && prev instanceof AST_If && prev.body instanceof AST_Return && next_index(j) == statements.length && next instanceof AST_SimpleStatement) {
                            CHANGED = true;
                            stat = stat.clone();
                            stat.alternative = make_node(AST_BlockStatement, next, {
                                body: [ next, make_node(AST_Return, next, {
                                    value: null
                                }) ]
                            });
                            statements.splice(i, 1, stat.transform(compressor));
                            statements.splice(j, 1);
                            continue;
                        }
                    }
                }
                function has_multiple_if_returns(statements) {
                    var n = 0;
                    for (var i = statements.length; --i >= 0; ) {
                        var stat = statements[i];
                        if (stat instanceof AST_If && stat.body instanceof AST_Return) {
                            if (++n > 1) return true;
                        }
                    }
                    return false;
                }
                function is_return_void(value) {
                    return !value || value instanceof AST_UnaryPrefix && value.operator == "void";
                }
                function can_merge_flow(ab) {
                    if (!ab) return false;
                    var lct = ab instanceof AST_LoopControl ? compressor.loopcontrol_target(ab) : null;
                    return ab instanceof AST_Return && in_lambda && is_return_void(ab.value) || ab instanceof AST_Continue && self === loop_body(lct) || ab instanceof AST_Break && lct instanceof AST_BlockStatement && self === lct;
                }
                function extract_functions() {
                    var tail = statements.slice(i + 1);
                    statements.length = i + 1;
                    return tail.filter(function(stat) {
                        if (stat instanceof AST_Defun) {
                            statements.push(stat);
                            return false;
                        }
                        return true;
                    });
                }
                function as_statement_array_with_return(node, ab) {
                    var body = as_statement_array(node).slice(0, -1);
                    if (ab.value) {
                        body.push(make_node(AST_SimpleStatement, ab.value, {
                            body: ab.value.expression
                        }));
                    }
                    return body;
                }
                function next_index(i) {
                    for (var j = i + 1, len = statements.length; j < len; j++) {
                        var stat = statements[j];
                        if (!(stat instanceof AST_Var && declarations_only(stat))) {
                            break;
                        }
                    }
                    return j;
                }
                function prev_index(i) {
                    for (var j = i; --j >= 0; ) {
                        var stat = statements[j];
                        if (!(stat instanceof AST_Var && declarations_only(stat))) {
                            break;
                        }
                    }
                    return j;
                }
            }
            function eliminate_dead_code(statements, compressor) {
                var has_quit;
                var self = compressor.self();
                for (var i = 0, n = 0, len = statements.length; i < len; i++) {
                    var stat = statements[i];
                    if (stat instanceof AST_LoopControl) {
                        var lct = compressor.loopcontrol_target(stat);
                        if (stat instanceof AST_Break && !(lct instanceof AST_IterationStatement) && loop_body(lct) === self || stat instanceof AST_Continue && loop_body(lct) === self) {
                            if (stat.label) {
                                remove(stat.label.thedef.references, stat);
                            }
                        } else {
                            statements[n++] = stat;
                        }
                    } else {
                        statements[n++] = stat;
                    }
                    if (aborts(stat)) {
                        has_quit = statements.slice(i + 1);
                        break;
                    }
                }
                statements.length = n;
                CHANGED = n != len;
                if (has_quit) has_quit.forEach(function(stat) {
                    extract_declarations_from_unreachable_code(compressor, stat, statements);
                });
            }
            function declarations_only(node) {
                return all(node.definitions, function(var_def) {
                    return !var_def.value;
                });
            }
            function sequencesize(statements, compressor) {
                if (statements.length < 2) return;
                var seq = [], n = 0;
                function push_seq() {
                    if (!seq.length) return;
                    var body = make_sequence(seq[0], seq);
                    statements[n++] = make_node(AST_SimpleStatement, body, {
                        body: body
                    });
                    seq = [];
                }
                for (var i = 0, len = statements.length; i < len; i++) {
                    var stat = statements[i];
                    if (stat instanceof AST_SimpleStatement) {
                        if (seq.length >= compressor.sequences_limit) push_seq();
                        var body = stat.body;
                        if (seq.length > 0) body = body.drop_side_effect_free(compressor);
                        if (body) merge_sequence(seq, body);
                    } else if (stat instanceof AST_Definitions && declarations_only(stat) || stat instanceof AST_Defun) {
                        statements[n++] = stat;
                    } else {
                        push_seq();
                        statements[n++] = stat;
                    }
                }
                push_seq();
                statements.length = n;
                if (n != len) CHANGED = true;
            }
            function to_simple_statement(block, decls) {
                if (!(block instanceof AST_BlockStatement)) return block;
                var stat = null;
                for (var i = 0, len = block.body.length; i < len; i++) {
                    var line = block.body[i];
                    if (line instanceof AST_Var && declarations_only(line)) {
                        decls.push(line);
                    } else if (stat) {
                        return false;
                    } else {
                        stat = line;
                    }
                }
                return stat;
            }
            function sequencesize_2(statements, compressor) {
                function cons_seq(right) {
                    n--;
                    CHANGED = true;
                    var left = prev.body;
                    return make_sequence(left, [ left, right ]).transform(compressor);
                }
                var n = 0, prev;
                for (var i = 0; i < statements.length; i++) {
                    var stat = statements[i];
                    if (prev) {
                        if (stat instanceof AST_Exit) {
                            stat.value = cons_seq(stat.value || make_node(AST_Undefined, stat).transform(compressor));
                        } else if (stat instanceof AST_For) {
                            if (!(stat.init instanceof AST_Definitions)) {
                                var abort = false;
                                prev.body.walk(new TreeWalker(function(node) {
                                    if (abort || node instanceof AST_Scope) return true;
                                    if (node instanceof AST_Binary && node.operator == "in") {
                                        abort = true;
                                        return true;
                                    }
                                }));
                                if (!abort) {
                                    if (stat.init) stat.init = cons_seq(stat.init); else {
                                        stat.init = prev.body;
                                        n--;
                                        CHANGED = true;
                                    }
                                }
                            }
                        } else if (stat instanceof AST_ForIn) {
                            stat.object = cons_seq(stat.object);
                        } else if (stat instanceof AST_If) {
                            stat.condition = cons_seq(stat.condition);
                        } else if (stat instanceof AST_Switch) {
                            stat.expression = cons_seq(stat.expression);
                        } else if (stat instanceof AST_With) {
                            stat.expression = cons_seq(stat.expression);
                        }
                    }
                    if (compressor.option("conditionals") && stat instanceof AST_If) {
                        var decls = [];
                        var body = to_simple_statement(stat.body, decls);
                        var alt = to_simple_statement(stat.alternative, decls);
                        if (body !== false && alt !== false && decls.length > 0) {
                            var len = decls.length;
                            decls.push(make_node(AST_If, stat, {
                                condition: stat.condition,
                                body: body || make_node(AST_EmptyStatement, stat.body),
                                alternative: alt
                            }));
                            decls.unshift(n, 1);
                            [].splice.apply(statements, decls);
                            i += len;
                            n += len + 1;
                            prev = null;
                            CHANGED = true;
                            continue;
                        }
                    }
                    statements[n++] = stat;
                    prev = stat instanceof AST_SimpleStatement ? stat : null;
                }
                statements.length = n;
            }
            function join_object_assignments(defn, body) {
                if (!(defn instanceof AST_Definitions)) return;
                var def = defn.definitions[defn.definitions.length - 1];
                if (!(def.value instanceof AST_Object)) return;
                var exprs;
                if (body instanceof AST_Assign) {
                    exprs = [ body ];
                } else if (body instanceof AST_Sequence) {
                    exprs = body.expressions.slice();
                }
                if (!exprs) return;
                var trimmed = false;
                do {
                    var node = exprs[0];
                    if (!(node instanceof AST_Assign)) break;
                    if (node.operator != "=") break;
                    if (!(node.left instanceof AST_PropAccess)) break;
                    var sym = node.left.expression;
                    if (!(sym instanceof AST_SymbolRef)) break;
                    if (def.name.name != sym.name) break;
                    if (!node.right.is_constant_expression(scope)) break;
                    var prop = node.left.property;
                    if (prop instanceof AST_Node) {
                        prop = prop.evaluate(compressor);
                    }
                    if (prop instanceof AST_Node) break;
                    prop = "" + prop;
                    var diff = compressor.has_directive("use strict") ? function(node) {
                        return node.key != prop && node.key.name != prop;
                    } : function(node) {
                        return node.key.name != prop;
                    };
                    if (!all(def.value.properties, diff)) break;
                    def.value.properties.push(make_node(AST_ObjectKeyVal, node, {
                        key: prop,
                        value: node.right
                    }));
                    exprs.shift();
                    trimmed = true;
                } while (exprs.length);
                return trimmed && exprs;
            }
            function join_consecutive_vars(statements) {
                var defs;
                for (var i = 0, j = -1, len = statements.length; i < len; i++) {
                    var stat = statements[i];
                    var prev = statements[j];
                    if (stat instanceof AST_Definitions) {
                        if (prev && prev.TYPE == stat.TYPE) {
                            prev.definitions = prev.definitions.concat(stat.definitions);
                            CHANGED = true;
                        } else if (defs && defs.TYPE == stat.TYPE && declarations_only(stat)) {
                            defs.definitions = defs.definitions.concat(stat.definitions);
                            CHANGED = true;
                        } else {
                            statements[++j] = stat;
                            defs = stat;
                        }
                    } else if (stat instanceof AST_Exit) {
                        stat.value = extract_object_assignments(stat.value);
                    } else if (stat instanceof AST_For) {
                        var exprs = join_object_assignments(prev, stat.init);
                        if (exprs) {
                            CHANGED = true;
                            stat.init = exprs.length ? make_sequence(stat.init, exprs) : null;
                            statements[++j] = stat;
                        } else if (prev instanceof AST_Var && (!stat.init || stat.init.TYPE == prev.TYPE)) {
                            if (stat.init) {
                                prev.definitions = prev.definitions.concat(stat.init.definitions);
                            }
                            stat.init = prev;
                            statements[j] = stat;
                            CHANGED = true;
                        } else if (defs && stat.init && defs.TYPE == stat.init.TYPE && declarations_only(stat.init)) {
                            defs.definitions = defs.definitions.concat(stat.init.definitions);
                            stat.init = null;
                            statements[++j] = stat;
                            CHANGED = true;
                        } else {
                            statements[++j] = stat;
                        }
                    } else if (stat instanceof AST_ForIn) {
                        stat.object = extract_object_assignments(stat.object);
                    } else if (stat instanceof AST_If) {
                        stat.condition = extract_object_assignments(stat.condition);
                    } else if (stat instanceof AST_SimpleStatement) {
                        var exprs = join_object_assignments(prev, stat.body);
                        if (exprs) {
                            CHANGED = true;
                            if (!exprs.length) continue;
                            stat.body = make_sequence(stat.body, exprs);
                        }
                        statements[++j] = stat;
                    } else if (stat instanceof AST_Switch) {
                        stat.expression = extract_object_assignments(stat.expression);
                    } else if (stat instanceof AST_With) {
                        stat.expression = extract_object_assignments(stat.expression);
                    } else {
                        statements[++j] = stat;
                    }
                }
                statements.length = j + 1;
                function extract_object_assignments(value) {
                    statements[++j] = stat;
                    var exprs = join_object_assignments(prev, value);
                    if (exprs) {
                        CHANGED = true;
                        if (exprs.length) {
                            return make_sequence(value, exprs);
                        } else if (value instanceof AST_Sequence) {
                            return value.tail_node().left;
                        } else {
                            return value.left;
                        }
                    }
                    return value;
                }
            }
        }
        function extract_declarations_from_unreachable_code(compressor, stat, target) {
            if (!(stat instanceof AST_Defun)) {
                compressor.warn("Dropping unreachable code [{file}:{line},{col}]", stat.start);
            }
            stat.walk(new TreeWalker(function(node) {
                if (node instanceof AST_Definitions) {
                    compressor.warn("Declarations in unreachable code! [{file}:{line},{col}]", node.start);
                    node.remove_initializers();
                    target.push(node);
                    return true;
                }
                if (node instanceof AST_Defun) {
                    target.push(node);
                    return true;
                }
                if (node instanceof AST_Scope) {
                    return true;
                }
            }));
        }
        function get_value(key) {
            if (key instanceof AST_Constant) {
                return key.getValue();
            }
            if (key instanceof AST_UnaryPrefix && key.operator == "void" && key.expression instanceof AST_Constant) {
                return;
            }
            return key;
        }
        function is_undefined(node, compressor) {
            return node.is_undefined || node instanceof AST_Undefined || node instanceof AST_UnaryPrefix && node.operator == "void" && !node.expression.has_side_effects(compressor);
        }
        (function(def) {
            def(AST_Node, return_false);
            def(AST_Array, return_true);
            def(AST_Assign, function() {
                return this.operator == "=" && this.right.is_truthy();
            });
            def(AST_Lambda, return_true);
            def(AST_Object, return_true);
            def(AST_RegExp, return_true);
            def(AST_Sequence, function() {
                return this.tail_node().is_truthy();
            });
            def(AST_SymbolRef, function() {
                var fixed = this.fixed_value();
                return fixed && fixed.is_truthy();
            });
        })(function(node, func) {
            node.DEFMETHOD("is_truthy", func);
        });
        (function(def) {
            AST_Node.DEFMETHOD("may_throw_on_access", function(compressor) {
                return !compressor.option("pure_getters") || this._dot_throw(compressor);
            });
            function is_strict(compressor) {
                return /strict/.test(compressor.option("pure_getters"));
            }
            def(AST_Node, is_strict);
            def(AST_Null, return_true);
            def(AST_Undefined, return_true);
            def(AST_Constant, return_false);
            def(AST_Array, return_false);
            def(AST_Object, function(compressor) {
                if (!is_strict(compressor)) return false;
                for (var i = this.properties.length; --i >= 0; ) if (this.properties[i].value instanceof AST_Accessor) return true;
                return false;
            });
            def(AST_Lambda, return_false);
            def(AST_UnaryPostfix, return_false);
            def(AST_UnaryPrefix, function() {
                return this.operator == "void";
            });
            def(AST_Binary, function(compressor) {
                return (this.operator == "&&" || this.operator == "||") && (this.left._dot_throw(compressor) || this.right._dot_throw(compressor));
            });
            def(AST_Assign, function(compressor) {
                return this.operator == "=" && this.right._dot_throw(compressor);
            });
            def(AST_Conditional, function(compressor) {
                return this.consequent._dot_throw(compressor) || this.alternative._dot_throw(compressor);
            });
            def(AST_Dot, function(compressor) {
                if (!is_strict(compressor)) return false;
                var exp = this.expression;
                if (exp instanceof AST_SymbolRef) exp = exp.fixed_value();
                return !(exp instanceof AST_Lambda && this.property == "prototype");
            });
            def(AST_Sequence, function(compressor) {
                return this.tail_node()._dot_throw(compressor);
            });
            def(AST_SymbolRef, function(compressor) {
                if (this.is_undefined) return true;
                if (!is_strict(compressor)) return false;
                if (is_undeclared_ref(this) && this.is_declared(compressor)) return false;
                if (this.is_immutable()) return false;
                var fixed = this.fixed_value();
                return !fixed || fixed._dot_throw(compressor);
            });
        })(function(node, func) {
            node.DEFMETHOD("_dot_throw", func);
        });
        (function(def) {
            var unary_bool = [ "!", "delete" ];
            var binary_bool = [ "in", "instanceof", "==", "!=", "===", "!==", "<", "<=", ">=", ">" ];
            def(AST_Node, return_false);
            def(AST_UnaryPrefix, function() {
                return member(this.operator, unary_bool);
            });
            def(AST_Binary, function() {
                return member(this.operator, binary_bool) || lazy_op(this.operator) && this.left.is_boolean() && this.right.is_boolean();
            });
            def(AST_Conditional, function() {
                return this.consequent.is_boolean() && this.alternative.is_boolean();
            });
            def(AST_Assign, function() {
                return this.operator == "=" && this.right.is_boolean();
            });
            def(AST_Sequence, function() {
                return this.tail_node().is_boolean();
            });
            def(AST_True, return_true);
            def(AST_False, return_true);
        })(function(node, func) {
            node.DEFMETHOD("is_boolean", func);
        });
        (function(def) {
            def(AST_Node, return_false);
            def(AST_Number, return_true);
            var unary = makePredicate("+ - ~ ++ --");
            def(AST_Unary, function() {
                return unary(this.operator);
            });
            var binary = makePredicate("- * / % & | ^ << >> >>>");
            def(AST_Binary, function(compressor) {
                return binary(this.operator) || this.operator == "+" && this.left.is_number(compressor) && this.right.is_number(compressor);
            });
            def(AST_Assign, function(compressor) {
                return binary(this.operator.slice(0, -1)) || this.operator == "=" && this.right.is_number(compressor);
            });
            def(AST_Sequence, function(compressor) {
                return this.tail_node().is_number(compressor);
            });
            def(AST_Conditional, function(compressor) {
                return this.consequent.is_number(compressor) && this.alternative.is_number(compressor);
            });
        })(function(node, func) {
            node.DEFMETHOD("is_number", func);
        });
        (function(def) {
            def(AST_Node, return_false);
            def(AST_String, return_true);
            def(AST_UnaryPrefix, function() {
                return this.operator == "typeof";
            });
            def(AST_Binary, function(compressor) {
                return this.operator == "+" && (this.left.is_string(compressor) || this.right.is_string(compressor));
            });
            def(AST_Assign, function(compressor) {
                return (this.operator == "=" || this.operator == "+=") && this.right.is_string(compressor);
            });
            def(AST_Sequence, function(compressor) {
                return this.tail_node().is_string(compressor);
            });
            def(AST_Conditional, function(compressor) {
                return this.consequent.is_string(compressor) && this.alternative.is_string(compressor);
            });
        })(function(node, func) {
            node.DEFMETHOD("is_string", func);
        });
        var lazy_op = makePredicate("&& ||");
        var unary_side_effects = makePredicate("delete ++ --");
        function is_lhs(node, parent) {
            if (parent instanceof AST_Unary && unary_side_effects(parent.operator)) return parent.expression;
            if (parent instanceof AST_Assign && parent.left === node) return node;
        }
        (function(def) {
            AST_Node.DEFMETHOD("resolve_defines", function(compressor) {
                if (!compressor.option("global_defs")) return;
                var def = this._find_defs(compressor, "");
                if (def) {
                    var node, parent = this, level = 0;
                    do {
                        node = parent;
                        parent = compressor.parent(level++);
                    } while (parent instanceof AST_PropAccess && parent.expression === node);
                    if (is_lhs(node, parent)) {
                        compressor.warn("global_defs " + this.print_to_string() + " redefined [{file}:{line},{col}]", this.start);
                    } else {
                        return def;
                    }
                }
            });
            function to_node(value, orig) {
                if (value instanceof AST_Node) return make_node(value.CTOR, orig, value);
                if (Array.isArray(value)) return make_node(AST_Array, orig, {
                    elements: value.map(function(value) {
                        return to_node(value, orig);
                    })
                });
                if (value && typeof value == "object") {
                    var props = [];
                    for (var key in value) if (HOP(value, key)) {
                        props.push(make_node(AST_ObjectKeyVal, orig, {
                            key: key,
                            value: to_node(value[key], orig)
                        }));
                    }
                    return make_node(AST_Object, orig, {
                        properties: props
                    });
                }
                return make_node_from_constant(value, orig);
            }
            def(AST_Node, noop);
            def(AST_Dot, function(compressor, suffix) {
                return this.expression._find_defs(compressor, "." + this.property + suffix);
            });
            def(AST_SymbolRef, function(compressor, suffix) {
                if (!this.global()) return;
                var name;
                var defines = compressor.option("global_defs");
                if (defines && HOP(defines, name = this.name + suffix)) {
                    var node = to_node(defines[name], this);
                    var top = compressor.find_parent(AST_Toplevel);
                    node.walk(new TreeWalker(function(node) {
                        if (node instanceof AST_SymbolRef) {
                            node.scope = top;
                            node.thedef = top.def_global(node);
                        }
                    }));
                    return node;
                }
            });
        })(function(node, func) {
            node.DEFMETHOD("_find_defs", func);
        });
        function best_of_expression(ast1, ast2) {
            return ast1.print_to_string().length > ast2.print_to_string().length ? ast2 : ast1;
        }
        function best_of_statement(ast1, ast2) {
            return best_of_expression(make_node(AST_SimpleStatement, ast1, {
                body: ast1
            }), make_node(AST_SimpleStatement, ast2, {
                body: ast2
            })).body;
        }
        function best_of(compressor, ast1, ast2) {
            return (first_in_statement(compressor) ? best_of_statement : best_of_expression)(ast1, ast2);
        }
        function convert_to_predicate(obj) {
            for (var key in obj) {
                obj[key] = makePredicate(obj[key]);
            }
        }
        var object_fns = [ "constructor", "toString", "valueOf" ];
        var native_fns = {
            Array: [ "indexOf", "join", "lastIndexOf", "slice" ].concat(object_fns),
            Boolean: object_fns,
            Function: object_fns,
            Number: [ "toExponential", "toFixed", "toPrecision" ].concat(object_fns),
            Object: object_fns,
            RegExp: [ "test" ].concat(object_fns),
            String: [ "charAt", "charCodeAt", "concat", "indexOf", "italics", "lastIndexOf", "match", "replace", "search", "slice", "split", "substr", "substring", "toLowerCase", "toUpperCase", "trim" ].concat(object_fns)
        };
        convert_to_predicate(native_fns);
        var static_fns = {
            Array: [ "isArray" ],
            Math: [ "abs", "acos", "asin", "atan", "ceil", "cos", "exp", "floor", "log", "round", "sin", "sqrt", "tan", "atan2", "pow", "max", "min" ],
            Number: [ "isFinite", "isNaN" ],
            Object: [ "create", "getOwnPropertyDescriptor", "getOwnPropertyNames", "getPrototypeOf", "isExtensible", "isFrozen", "isSealed", "keys" ],
            String: [ "fromCharCode" ]
        };
        convert_to_predicate(static_fns);
        (function(def) {
            AST_Node.DEFMETHOD("evaluate", function(compressor) {
                if (!compressor.option("evaluate")) return this;
                var cached = [];
                var val = this._eval(compressor, cached, 1);
                cached.forEach(function(node) {
                    delete node._eval;
                });
                if (!val || val instanceof RegExp) return val;
                if (typeof val == "function" || typeof val == "object") return this;
                return val;
            });
            var unaryPrefix = makePredicate("! ~ - + void");
            AST_Node.DEFMETHOD("is_constant", function() {
                if (this instanceof AST_Constant) {
                    return !(this instanceof AST_RegExp);
                } else {
                    return this instanceof AST_UnaryPrefix && this.expression instanceof AST_Constant && unaryPrefix(this.operator);
                }
            });
            def(AST_Statement, function() {
                throw new Error(string_template("Cannot evaluate a statement [{file}:{line},{col}]", this.start));
            });
            def(AST_Lambda, return_this);
            def(AST_Node, return_this);
            def(AST_Constant, function() {
                return this.getValue();
            });
            def(AST_Function, function(compressor) {
                if (compressor.option("unsafe")) {
                    var fn = function() {};
                    fn.node = this;
                    fn.toString = function() {
                        return "function(){}";
                    };
                    return fn;
                }
                return this;
            });
            def(AST_Array, function(compressor, cached, depth) {
                if (compressor.option("unsafe")) {
                    var elements = [];
                    for (var i = 0, len = this.elements.length; i < len; i++) {
                        var element = this.elements[i];
                        var value = element._eval(compressor, cached, depth);
                        if (element === value) return this;
                        elements.push(value);
                    }
                    return elements;
                }
                return this;
            });
            def(AST_Object, function(compressor, cached, depth) {
                if (compressor.option("unsafe")) {
                    var val = {};
                    for (var i = 0, len = this.properties.length; i < len; i++) {
                        var prop = this.properties[i];
                        var key = prop.key;
                        if (key instanceof AST_Symbol) {
                            key = key.name;
                        } else if (key instanceof AST_Node) {
                            key = key._eval(compressor, cached, depth);
                            if (key === prop.key) return this;
                        }
                        if (typeof Object.prototype[key] === "function") {
                            return this;
                        }
                        if (prop.value instanceof AST_Function) continue;
                        val[key] = prop.value._eval(compressor, cached, depth);
                        if (val[key] === prop.value) return this;
                    }
                    return val;
                }
                return this;
            });
            var non_converting_unary = makePredicate("! typeof void");
            def(AST_UnaryPrefix, function(compressor, cached, depth) {
                var e = this.expression;
                if (compressor.option("typeofs") && this.operator == "typeof" && (e instanceof AST_Lambda || e instanceof AST_SymbolRef && e.fixed_value() instanceof AST_Lambda)) {
                    return typeof function() {};
                }
                if (!non_converting_unary(this.operator)) depth++;
                e = e._eval(compressor, cached, depth);
                if (e === this.expression) return this;
                switch (this.operator) {
                  case "!":
                    return !e;

                  case "typeof":
                    if (e instanceof RegExp) return this;
                    return typeof e;

                  case "void":
                    return void e;

                  case "~":
                    return ~e;

                  case "-":
                    return -e;

                  case "+":
                    return +e;
                }
                return this;
            });
            var non_converting_binary = makePredicate("&& || === !==");
            def(AST_Binary, function(compressor, cached, depth) {
                if (!non_converting_binary(this.operator)) depth++;
                var left = this.left._eval(compressor, cached, depth);
                if (left === this.left) return this;
                var right = this.right._eval(compressor, cached, depth);
                if (right === this.right) return this;
                var result;
                switch (this.operator) {
                  case "&&":
                    result = left && right;
                    break;

                  case "||":
                    result = left || right;
                    break;

                  case "|":
                    result = left | right;
                    break;

                  case "&":
                    result = left & right;
                    break;

                  case "^":
                    result = left ^ right;
                    break;

                  case "+":
                    result = left + right;
                    break;

                  case "*":
                    result = left * right;
                    break;

                  case "/":
                    result = left / right;
                    break;

                  case "%":
                    result = left % right;
                    break;

                  case "-":
                    result = left - right;
                    break;

                  case "<<":
                    result = left << right;
                    break;

                  case ">>":
                    result = left >> right;
                    break;

                  case ">>>":
                    result = left >>> right;
                    break;

                  case "==":
                    result = left == right;
                    break;

                  case "===":
                    result = left === right;
                    break;

                  case "!=":
                    result = left != right;
                    break;

                  case "!==":
                    result = left !== right;
                    break;

                  case "<":
                    result = left < right;
                    break;

                  case "<=":
                    result = left <= right;
                    break;

                  case ">":
                    result = left > right;
                    break;

                  case ">=":
                    result = left >= right;
                    break;

                  default:
                    return this;
                }
                if (isNaN(result) && compressor.find_parent(AST_With)) {
                    return this;
                }
                return result;
            });
            def(AST_Conditional, function(compressor, cached, depth) {
                var condition = this.condition._eval(compressor, cached, depth);
                if (condition === this.condition) return this;
                var node = condition ? this.consequent : this.alternative;
                var value = node._eval(compressor, cached, depth);
                return value === node ? this : value;
            });
            def(AST_SymbolRef, function(compressor, cached, depth) {
                var fixed = this.fixed_value();
                if (!fixed) return this;
                var value;
                if (cached.indexOf(fixed) >= 0) {
                    value = fixed._eval();
                } else {
                    this._eval = return_this;
                    value = fixed._eval(compressor, cached, depth);
                    delete this._eval;
                    if (value === fixed) return this;
                    fixed._eval = function() {
                        return value;
                    };
                    cached.push(fixed);
                }
                if (value && typeof value == "object") {
                    var escaped = this.definition().escaped;
                    if (escaped && depth > escaped) return this;
                }
                return value;
            });
            var global_objs = {
                Array: Array,
                Math: Math,
                Number: Number,
                Object: Object,
                String: String
            };
            var static_values = {
                Math: [ "E", "LN10", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2" ],
                Number: [ "MAX_VALUE", "MIN_VALUE", "NaN", "NEGATIVE_INFINITY", "POSITIVE_INFINITY" ]
            };
            convert_to_predicate(static_values);
            def(AST_PropAccess, function(compressor, cached, depth) {
                if (compressor.option("unsafe")) {
                    var key = this.property;
                    if (key instanceof AST_Node) {
                        key = key._eval(compressor, cached, depth);
                        if (key === this.property) return this;
                    }
                    var exp = this.expression;
                    var val;
                    if (is_undeclared_ref(exp)) {
                        if (!(static_values[exp.name] || return_false)(key)) return this;
                        val = global_objs[exp.name];
                    } else {
                        val = exp._eval(compressor, cached, depth + 1);
                        if (!val || val === exp || !HOP(val, key)) return this;
                        if (typeof val == "function") switch (key) {
                          case "name":
                            return val.node.name ? val.node.name.name : "";

                          case "length":
                            return val.node.argnames.length;

                          default:
                            return this;
                        }
                    }
                    return val[key];
                }
                return this;
            });
            def(AST_Call, function(compressor, cached, depth) {
                var exp = this.expression;
                if (compressor.option("unsafe") && exp instanceof AST_PropAccess) {
                    var key = exp.property;
                    if (key instanceof AST_Node) {
                        key = key._eval(compressor, cached, depth);
                        if (key === exp.property) return this;
                    }
                    var val;
                    var e = exp.expression;
                    if (is_undeclared_ref(e)) {
                        if (!(static_fns[e.name] || return_false)(key)) return this;
                        val = global_objs[e.name];
                    } else {
                        val = e._eval(compressor, cached, depth + 1);
                        if (val === e || !(val && native_fns[val.constructor.name] || return_false)(key)) return this;
                    }
                    var args = [];
                    for (var i = 0, len = this.args.length; i < len; i++) {
                        var arg = this.args[i];
                        var value = arg._eval(compressor, cached, depth);
                        if (arg === value) return this;
                        args.push(value);
                    }
                    try {
                        return val[key].apply(val, args);
                    } catch (ex) {
                        compressor.warn("Error evaluating {code} [{file}:{line},{col}]", {
                            code: this.print_to_string(),
                            file: this.start.file,
                            line: this.start.line,
                            col: this.start.col
                        });
                    }
                }
                return this;
            });
            def(AST_New, return_this);
        })(function(node, func) {
            node.DEFMETHOD("_eval", func);
        });
        (function(def) {
            function basic_negation(exp) {
                return make_node(AST_UnaryPrefix, exp, {
                    operator: "!",
                    expression: exp
                });
            }
            function best(orig, alt, first_in_statement) {
                var negated = basic_negation(orig);
                if (first_in_statement) {
                    var stat = make_node(AST_SimpleStatement, alt, {
                        body: alt
                    });
                    return best_of_expression(negated, stat) === stat ? alt : negated;
                }
                return best_of_expression(negated, alt);
            }
            def(AST_Node, function() {
                return basic_negation(this);
            });
            def(AST_Statement, function() {
                throw new Error("Cannot negate a statement");
            });
            def(AST_Function, function() {
                return basic_negation(this);
            });
            def(AST_UnaryPrefix, function() {
                if (this.operator == "!") return this.expression;
                return basic_negation(this);
            });
            def(AST_Sequence, function(compressor) {
                var expressions = this.expressions.slice();
                expressions.push(expressions.pop().negate(compressor));
                return make_sequence(this, expressions);
            });
            def(AST_Conditional, function(compressor, first_in_statement) {
                var self = this.clone();
                self.consequent = self.consequent.negate(compressor);
                self.alternative = self.alternative.negate(compressor);
                return best(this, self, first_in_statement);
            });
            def(AST_Binary, function(compressor, first_in_statement) {
                var self = this.clone(), op = this.operator;
                if (compressor.option("unsafe_comps")) {
                    switch (op) {
                      case "<=":
                        self.operator = ">";
                        return self;

                      case "<":
                        self.operator = ">=";
                        return self;

                      case ">=":
                        self.operator = "<";
                        return self;

                      case ">":
                        self.operator = "<=";
                        return self;
                    }
                }
                switch (op) {
                  case "==":
                    self.operator = "!=";
                    return self;

                  case "!=":
                    self.operator = "==";
                    return self;

                  case "===":
                    self.operator = "!==";
                    return self;

                  case "!==":
                    self.operator = "===";
                    return self;

                  case "&&":
                    self.operator = "||";
                    self.left = self.left.negate(compressor, first_in_statement);
                    self.right = self.right.negate(compressor);
                    return best(this, self, first_in_statement);

                  case "||":
                    self.operator = "&&";
                    self.left = self.left.negate(compressor, first_in_statement);
                    self.right = self.right.negate(compressor);
                    return best(this, self, first_in_statement);
                }
                return basic_negation(this);
            });
        })(function(node, func) {
            node.DEFMETHOD("negate", function(compressor, first_in_statement) {
                return func.call(this, compressor, first_in_statement);
            });
        });
        var global_pure_fns = makePredicate("Boolean decodeURI decodeURIComponent Date encodeURI encodeURIComponent Error escape EvalError isFinite isNaN Number Object parseFloat parseInt RangeError ReferenceError String SyntaxError TypeError unescape URIError");
        AST_Call.DEFMETHOD("is_expr_pure", function(compressor) {
            if (compressor.option("unsafe")) {
                var expr = this.expression;
                if (is_undeclared_ref(expr) && global_pure_fns(expr.name)) return true;
                if (expr instanceof AST_Dot && is_undeclared_ref(expr.expression) && (static_fns[expr.expression.name] || return_false)(expr.property)) {
                    return true;
                }
            }
            return this.pure || !compressor.pure_funcs(this);
        });
        AST_Node.DEFMETHOD("is_call_pure", return_false);
        AST_Dot.DEFMETHOD("is_call_pure", function(compressor) {
            if (!compressor.option("unsafe")) return;
            var expr = this.expression;
            var fns = return_false;
            if (expr instanceof AST_Array) {
                fns = native_fns.Array;
            } else if (expr.is_boolean()) {
                fns = native_fns.Boolean;
            } else if (expr.is_number(compressor)) {
                fns = native_fns.Number;
            } else if (expr instanceof AST_RegExp) {
                fns = native_fns.RegExp;
            } else if (expr.is_string(compressor)) {
                fns = native_fns.String;
            } else if (!this.may_throw_on_access(compressor)) {
                fns = native_fns.Object;
            }
            return fns(this.property);
        });
        (function(def) {
            def(AST_Node, return_true);
            def(AST_EmptyStatement, return_false);
            def(AST_Constant, return_false);
            def(AST_This, return_false);
            function any(list, compressor) {
                for (var i = list.length; --i >= 0; ) if (list[i].has_side_effects(compressor)) return true;
                return false;
            }
            def(AST_Block, function(compressor) {
                return any(this.body, compressor);
            });
            def(AST_Call, function(compressor) {
                if (!this.is_expr_pure(compressor) && (!this.expression.is_call_pure(compressor) || this.expression.has_side_effects(compressor))) {
                    return true;
                }
                return any(this.args, compressor);
            });
            def(AST_Switch, function(compressor) {
                return this.expression.has_side_effects(compressor) || any(this.body, compressor);
            });
            def(AST_Case, function(compressor) {
                return this.expression.has_side_effects(compressor) || any(this.body, compressor);
            });
            def(AST_Try, function(compressor) {
                return any(this.body, compressor) || this.bcatch && this.bcatch.has_side_effects(compressor) || this.bfinally && this.bfinally.has_side_effects(compressor);
            });
            def(AST_If, function(compressor) {
                return this.condition.has_side_effects(compressor) || this.body && this.body.has_side_effects(compressor) || this.alternative && this.alternative.has_side_effects(compressor);
            });
            def(AST_LabeledStatement, function(compressor) {
                return this.body.has_side_effects(compressor);
            });
            def(AST_SimpleStatement, function(compressor) {
                return this.body.has_side_effects(compressor);
            });
            def(AST_Lambda, return_false);
            def(AST_Binary, function(compressor) {
                return this.left.has_side_effects(compressor) || this.right.has_side_effects(compressor);
            });
            def(AST_Assign, return_true);
            def(AST_Conditional, function(compressor) {
                return this.condition.has_side_effects(compressor) || this.consequent.has_side_effects(compressor) || this.alternative.has_side_effects(compressor);
            });
            def(AST_Unary, function(compressor) {
                return unary_side_effects(this.operator) || this.expression.has_side_effects(compressor);
            });
            def(AST_SymbolRef, function(compressor) {
                return !this.is_declared(compressor);
            });
            def(AST_SymbolDeclaration, return_false);
            def(AST_Object, function(compressor) {
                return any(this.properties, compressor);
            });
            def(AST_ObjectProperty, function(compressor) {
                return this.value.has_side_effects(compressor);
            });
            def(AST_Array, function(compressor) {
                return any(this.elements, compressor);
            });
            def(AST_Dot, function(compressor) {
                return this.expression.may_throw_on_access(compressor) || this.expression.has_side_effects(compressor);
            });
            def(AST_Sub, function(compressor) {
                return this.expression.may_throw_on_access(compressor) || this.expression.has_side_effects(compressor) || this.property.has_side_effects(compressor);
            });
            def(AST_Sequence, function(compressor) {
                return any(this.expressions, compressor);
            });
            def(AST_Definitions, function(compressor) {
                return any(this.definitions, compressor);
            });
            def(AST_VarDef, function(compressor) {
                return this.value;
            });
        })(function(node, func) {
            node.DEFMETHOD("has_side_effects", func);
        });
        (function(def) {
            def(AST_Node, return_true);
            def(AST_Constant, return_false);
            def(AST_EmptyStatement, return_false);
            def(AST_Lambda, return_false);
            def(AST_SymbolDeclaration, return_false);
            def(AST_This, return_false);
            function any(list, compressor) {
                for (var i = list.length; --i >= 0; ) if (list[i].may_throw(compressor)) return true;
                return false;
            }
            def(AST_Array, function(compressor) {
                return any(this.elements, compressor);
            });
            def(AST_Assign, function(compressor) {
                if (this.right.may_throw(compressor)) return true;
                if (!compressor.has_directive("use strict") && this.operator == "=" && this.left instanceof AST_SymbolRef) {
                    return false;
                }
                return this.left.may_throw(compressor);
            });
            def(AST_Binary, function(compressor) {
                return this.left.may_throw(compressor) || this.right.may_throw(compressor);
            });
            def(AST_Block, function(compressor) {
                return any(this.body, compressor);
            });
            def(AST_Call, function(compressor) {
                if (any(this.args, compressor)) return true;
                if (this.is_expr_pure(compressor)) return false;
                if (this.expression.may_throw(compressor)) return true;
                return !(this.expression instanceof AST_Lambda) || any(this.expression.body, compressor);
            });
            def(AST_Case, function(compressor) {
                return this.expression.may_throw(compressor) || any(this.body, compressor);
            });
            def(AST_Conditional, function(compressor) {
                return this.condition.may_throw(compressor) || this.consequent.may_throw(compressor) || this.alternative.may_throw(compressor);
            });
            def(AST_Definitions, function(compressor) {
                return any(this.definitions, compressor);
            });
            def(AST_Dot, function(compressor) {
                return this.expression.may_throw_on_access(compressor) || this.expression.may_throw(compressor);
            });
            def(AST_If, function(compressor) {
                return this.condition.may_throw(compressor) || this.body && this.body.may_throw(compressor) || this.alternative && this.alternative.may_throw(compressor);
            });
            def(AST_LabeledStatement, function(compressor) {
                return this.body.may_throw(compressor);
            });
            def(AST_Object, function(compressor) {
                return any(this.properties, compressor);
            });
            def(AST_ObjectProperty, function(compressor) {
                return this.value.may_throw(compressor);
            });
            def(AST_Return, function(compressor) {
                return this.value && this.value.may_throw(compressor);
            });
            def(AST_Sequence, function(compressor) {
                return any(this.expressions, compressor);
            });
            def(AST_SimpleStatement, function(compressor) {
                return this.body.may_throw(compressor);
            });
            def(AST_Sub, function(compressor) {
                return this.expression.may_throw_on_access(compressor) || this.expression.may_throw(compressor) || this.property.may_throw(compressor);
            });
            def(AST_Switch, function(compressor) {
                return this.expression.may_throw(compressor) || any(this.body, compressor);
            });
            def(AST_SymbolRef, function(compressor) {
                return !this.is_declared(compressor);
            });
            def(AST_Try, function(compressor) {
                return this.bcatch ? this.bcatch.may_throw(compressor) : any(this.body, compressor) || this.bfinally && this.bfinally.may_throw(compressor);
            });
            def(AST_Unary, function(compressor) {
                if (this.operator == "typeof" && this.expression instanceof AST_SymbolRef) return false;
                return this.expression.may_throw(compressor);
            });
            def(AST_VarDef, function(compressor) {
                if (!this.value) return false;
                return this.value.may_throw(compressor);
            });
        })(function(node, func) {
            node.DEFMETHOD("may_throw", func);
        });
        (function(def) {
            function all(list) {
                for (var i = list.length; --i >= 0; ) if (!list[i].is_constant_expression()) return false;
                return true;
            }
            def(AST_Node, return_false);
            def(AST_Constant, return_true);
            def(AST_Lambda, function(scope) {
                var self = this;
                var result = true;
                self.walk(new TreeWalker(function(node) {
                    if (!result) return true;
                    if (node instanceof AST_SymbolRef) {
                        if (self.inlined) {
                            result = false;
                            return true;
                        }
                        var def = node.definition();
                        if (member(def, self.enclosed) && !self.variables.has(def.name)) {
                            if (scope) {
                                var scope_def = scope.find_variable(node);
                                if (def.undeclared ? !scope_def : scope_def === def) {
                                    result = "f";
                                    return true;
                                }
                            }
                            result = false;
                        }
                        return true;
                    }
                }));
                return result;
            });
            def(AST_Unary, function() {
                return this.expression.is_constant_expression();
            });
            def(AST_Binary, function() {
                return this.left.is_constant_expression() && this.right.is_constant_expression();
            });
            def(AST_Array, function() {
                return all(this.elements);
            });
            def(AST_Object, function() {
                return all(this.properties);
            });
            def(AST_ObjectProperty, function() {
                return this.value.is_constant_expression();
            });
        })(function(node, func) {
            node.DEFMETHOD("is_constant_expression", func);
        });
        function aborts(thing) {
            return thing && thing.aborts();
        }
        (function(def) {
            def(AST_Statement, return_null);
            def(AST_Jump, return_this);
            function block_aborts() {
                var n = this.body.length;
                return n > 0 && aborts(this.body[n - 1]);
            }
            def(AST_BlockStatement, block_aborts);
            def(AST_SwitchBranch, block_aborts);
            def(AST_If, function() {
                return this.alternative && aborts(this.body) && aborts(this.alternative) && this;
            });
        })(function(node, func) {
            node.DEFMETHOD("aborts", func);
        });
        OPT(AST_Directive, function(self, compressor) {
            if (compressor.has_directive(self.value) !== self) {
                return make_node(AST_EmptyStatement, self);
            }
            return self;
        });
        OPT(AST_Debugger, function(self, compressor) {
            if (compressor.option("drop_debugger")) return make_node(AST_EmptyStatement, self);
            return self;
        });
        OPT(AST_LabeledStatement, function(self, compressor) {
            if (self.body instanceof AST_Break && compressor.loopcontrol_target(self.body) === self.body) {
                return make_node(AST_EmptyStatement, self);
            }
            return self.label.references.length == 0 ? self.body : self;
        });
        OPT(AST_Block, function(self, compressor) {
            tighten_body(self.body, compressor);
            return self;
        });
        OPT(AST_BlockStatement, function(self, compressor) {
            tighten_body(self.body, compressor);
            switch (self.body.length) {
              case 1:
                return self.body[0];

              case 0:
                return make_node(AST_EmptyStatement, self);
            }
            return self;
        });
        OPT(AST_Lambda, function(self, compressor) {
            tighten_body(self.body, compressor);
            if (compressor.option("side_effects") && self.body.length == 1 && self.body[0] === compressor.has_directive("use strict")) {
                self.body.length = 0;
            }
            return self;
        });
        AST_Scope.DEFMETHOD("drop_unused", function(compressor) {
            if (!compressor.option("unused")) return;
            if (compressor.has_directive("use asm")) return;
            var self = this;
            if (self.uses_eval || self.uses_with) return;
            var drop_funcs = !(self instanceof AST_Toplevel) || compressor.toplevel.funcs;
            var drop_vars = !(self instanceof AST_Toplevel) || compressor.toplevel.vars;
            var assign_as_unused = /keep_assign/.test(compressor.option("unused")) ? return_false : function(node, props) {
                var sym;
                if (node instanceof AST_Assign && (node.write_only || node.operator == "=")) {
                    sym = node.left;
                } else if (node instanceof AST_Unary && node.write_only) {
                    sym = node.expression;
                }
                if (/strict/.test(compressor.option("pure_getters"))) {
                    while (sym instanceof AST_PropAccess && !sym.expression.may_throw_on_access(compressor)) {
                        if (sym instanceof AST_Sub) props.unshift(sym.property);
                        sym = sym.expression;
                    }
                }
                return sym;
            };
            var in_use = [];
            var in_use_ids = Object.create(null);
            var fixed_ids = Object.create(null);
            var value_read = Object.create(null);
            var value_modified = Object.create(null);
            if (self instanceof AST_Toplevel && compressor.top_retain) {
                self.variables.each(function(def) {
                    if (compressor.top_retain(def) && !(def.id in in_use_ids)) {
                        in_use_ids[def.id] = true;
                        in_use.push(def);
                    }
                });
            }
            var var_defs_by_id = new Dictionary();
            var initializations = new Dictionary();
            var scope = this;
            var tw = new TreeWalker(function(node, descend) {
                if (node === self) return;
                if (node instanceof AST_Defun) {
                    var node_def = node.name.definition();
                    if (!drop_funcs && scope === self) {
                        if (!(node_def.id in in_use_ids)) {
                            in_use_ids[node_def.id] = true;
                            in_use.push(node_def);
                        }
                    }
                    initializations.add(node_def.id, node);
                    return true;
                }
                if (node instanceof AST_SymbolFunarg && scope === self) {
                    var_defs_by_id.add(node.definition().id, node);
                }
                if (node instanceof AST_Definitions && scope === self) {
                    node.definitions.forEach(function(def) {
                        var node_def = def.name.definition();
                        if (def.name instanceof AST_SymbolVar) {
                            var_defs_by_id.add(node_def.id, def);
                        }
                        if (!drop_vars) {
                            if (!(node_def.id in in_use_ids)) {
                                in_use_ids[node_def.id] = true;
                                in_use.push(node_def);
                            }
                        }
                        if (def.value) {
                            initializations.add(node_def.id, def.value);
                            if (def.value.has_side_effects(compressor)) {
                                def.value.walk(tw);
                            }
                            if (!node_def.chained && def.name.fixed_value() === def.value) {
                                fixed_ids[node_def.id] = def;
                            }
                        }
                    });
                    return true;
                }
                return scan_ref_scoped(node, descend);
            });
            self.walk(tw);
            tw = new TreeWalker(scan_ref_scoped);
            for (var i = 0; i < in_use.length; i++) {
                var init = initializations.get(in_use[i].id);
                if (init) init.forEach(function(init) {
                    init.walk(tw);
                });
            }
            var tt = new TreeTransformer(function before(node, descend, in_list) {
                var parent = tt.parent();
                if (drop_vars) {
                    var props = [], sym = assign_as_unused(node, props);
                    if (sym instanceof AST_SymbolRef) {
                        var def = sym.definition();
                        var in_use = def.id in in_use_ids;
                        var value = null;
                        if (node instanceof AST_Assign) {
                            if (!in_use || node.left === sym && def.id in fixed_ids && fixed_ids[def.id] !== node) {
                                value = node.right;
                            }
                        } else if (!in_use) {
                            value = make_node(AST_Number, node, {
                                value: 0
                            });
                        }
                        if (value) {
                            props.push(value);
                            return maintain_this_binding(parent, node, make_sequence(node, props.map(function(prop) {
                                return prop.transform(tt);
                            })));
                        }
                    }
                }
                if (scope !== self) return;
                if (node instanceof AST_Function && node.name && !compressor.option("keep_fnames")) {
                    var def = node.name.definition();
                    if (!(def.id in in_use_ids) || def.orig.length > 1) node.name = null;
                }
                if (node instanceof AST_Lambda && !(node instanceof AST_Accessor)) {
                    var trim = !compressor.option("keep_fargs");
                    for (var a = node.argnames, i = a.length; --i >= 0; ) {
                        var sym = a[i];
                        if (!(sym.definition().id in in_use_ids)) {
                            sym.__unused = true;
                            if (trim) {
                                a.pop();
                                compressor[sym.unreferenced() ? "warn" : "info"]("Dropping unused function argument {name} [{file}:{line},{col}]", template(sym));
                            }
                        } else {
                            trim = false;
                        }
                    }
                }
                if (drop_funcs && node instanceof AST_Defun && node !== self) {
                    var def = node.name.definition();
                    if (!(def.id in in_use_ids)) {
                        compressor[node.name.unreferenced() ? "warn" : "info"]("Dropping unused function {name} [{file}:{line},{col}]", template(node.name));
                        def.eliminated++;
                        return make_node(AST_EmptyStatement, node);
                    }
                }
                if (node instanceof AST_Definitions && !(parent instanceof AST_ForIn && parent.init === node)) {
                    var body = [], head = [], tail = [];
                    var side_effects = [];
                    node.definitions.forEach(function(def) {
                        if (def.value) def.value = def.value.transform(tt);
                        var sym = def.name.definition();
                        if (!drop_vars || sym.id in in_use_ids) {
                            if (def.value && sym.id in fixed_ids && fixed_ids[sym.id] !== def) {
                                def.value = def.value.drop_side_effect_free(compressor);
                            }
                            if (def.name instanceof AST_SymbolVar) {
                                var var_defs = var_defs_by_id.get(sym.id);
                                if (var_defs.length > 1 && (!def.value || sym.orig.indexOf(def.name) > sym.eliminated)) {
                                    compressor.warn("Dropping duplicated definition of variable {name} [{file}:{line},{col}]", template(def.name));
                                    if (def.value) {
                                        var ref = make_node(AST_SymbolRef, def.name, def.name);
                                        sym.references.push(ref);
                                        var assign = make_node(AST_Assign, def, {
                                            operator: "=",
                                            left: ref,
                                            right: def.value
                                        });
                                        if (fixed_ids[sym.id] === def) {
                                            fixed_ids[sym.id] = assign;
                                        }
                                        side_effects.push(assign.transform(tt));
                                    }
                                    remove(var_defs, def);
                                    sym.eliminated++;
                                    return;
                                }
                            }
                            if (def.value) {
                                if (side_effects.length > 0) {
                                    if (tail.length > 0) {
                                        side_effects.push(def.value);
                                        def.value = make_sequence(def.value, side_effects);
                                    } else {
                                        body.push(make_node(AST_SimpleStatement, node, {
                                            body: make_sequence(node, side_effects)
                                        }));
                                    }
                                    side_effects = [];
                                }
                                tail.push(def);
                            } else {
                                head.push(def);
                            }
                        } else if (sym.orig[0] instanceof AST_SymbolCatch) {
                            var value = def.value && def.value.drop_side_effect_free(compressor);
                            if (value) side_effects.push(value);
                            def.value = null;
                            head.push(def);
                        } else {
                            var value = def.value && def.value.drop_side_effect_free(compressor);
                            if (value) {
                                compressor.warn("Side effects in initialization of unused variable {name} [{file}:{line},{col}]", template(def.name));
                                side_effects.push(value);
                            } else {
                                compressor[def.name.unreferenced() ? "warn" : "info"]("Dropping unused variable {name} [{file}:{line},{col}]", template(def.name));
                            }
                            sym.eliminated++;
                        }
                    });
                    if (head.length > 0 || tail.length > 0) {
                        node.definitions = head.concat(tail);
                        body.push(node);
                    }
                    if (side_effects.length > 0) {
                        body.push(make_node(AST_SimpleStatement, node, {
                            body: make_sequence(node, side_effects)
                        }));
                    }
                    switch (body.length) {
                      case 0:
                        return in_list ? MAP.skip : make_node(AST_EmptyStatement, node);

                      case 1:
                        return body[0];

                      default:
                        return in_list ? MAP.splice(body) : make_node(AST_BlockStatement, node, {
                            body: body
                        });
                    }
                }
                if (node instanceof AST_For) {
                    descend(node, this);
                    var block;
                    if (node.init instanceof AST_BlockStatement) {
                        block = node.init;
                        node.init = block.body.pop();
                        block.body.push(node);
                    }
                    if (node.init instanceof AST_SimpleStatement) {
                        node.init = node.init.body;
                    } else if (is_empty(node.init)) {
                        node.init = null;
                    }
                    return !block ? node : in_list ? MAP.splice(block.body) : block;
                }
                if (node instanceof AST_LabeledStatement && node.body instanceof AST_For) {
                    descend(node, this);
                    if (node.body instanceof AST_BlockStatement) {
                        var block = node.body;
                        node.body = block.body.pop();
                        block.body.push(node);
                        return in_list ? MAP.splice(block.body) : block;
                    }
                    return node;
                }
                if (node instanceof AST_Scope) {
                    var save_scope = scope;
                    scope = node;
                    descend(node, this);
                    scope = save_scope;
                    return node;
                }
                function template(sym) {
                    return {
                        name: sym.name,
                        file: sym.start.file,
                        line: sym.start.line,
                        col: sym.start.col
                    };
                }
            });
            self.transform(tt);
            function verify_safe_usage(def, read, modified) {
                if (def.id in in_use_ids) return;
                if (read && modified) {
                    in_use_ids[def.id] = true;
                    in_use.push(def);
                } else {
                    value_read[def.id] = read;
                    value_modified[def.id] = modified;
                }
            }
            function scan_ref_scoped(node, descend) {
                var node_def, props = [], sym = assign_as_unused(node, props);
                if (sym instanceof AST_SymbolRef && self.variables.get(sym.name) === (node_def = sym.definition())) {
                    props.forEach(function(prop) {
                        prop.walk(tw);
                    });
                    if (node instanceof AST_Assign) {
                        node.right.walk(tw);
                        if (node.left === sym) {
                            if (!node_def.chained && sym.fixed_value() === node.right) {
                                fixed_ids[node_def.id] = node;
                            }
                            if (!node.write_only) {
                                verify_safe_usage(node_def, true, value_modified[node_def.id]);
                            }
                        } else {
                            var fixed = sym.fixed_value();
                            if (!fixed || !fixed.is_constant()) {
                                verify_safe_usage(node_def, value_read[node_def.id], true);
                            }
                        }
                    }
                    return true;
                }
                if (node instanceof AST_SymbolRef) {
                    node_def = node.definition();
                    if (!(node_def.id in in_use_ids)) {
                        in_use_ids[node_def.id] = true;
                        in_use.push(node_def);
                    }
                    return true;
                }
                if (node instanceof AST_Scope) {
                    var save_scope = scope;
                    scope = node;
                    descend();
                    scope = save_scope;
                    return true;
                }
            }
        });
        AST_Scope.DEFMETHOD("hoist_declarations", function(compressor) {
            var self = this;
            if (compressor.has_directive("use asm")) return self;
            var hoist_funs = compressor.option("hoist_funs");
            var hoist_vars = compressor.option("hoist_vars");
            if (hoist_funs || hoist_vars) {
                var dirs = [];
                var hoisted = [];
                var vars = new Dictionary(), vars_found = 0, var_decl = 0;
                self.walk(new TreeWalker(function(node) {
                    if (node instanceof AST_Scope && node !== self) return true;
                    if (node instanceof AST_Var) {
                        ++var_decl;
                        return true;
                    }
                }));
                hoist_vars = hoist_vars && var_decl > 1;
                var tt = new TreeTransformer(function before(node) {
                    if (node !== self) {
                        if (node instanceof AST_Directive) {
                            dirs.push(node);
                            return make_node(AST_EmptyStatement, node);
                        }
                        if (hoist_funs && node instanceof AST_Defun && (tt.parent() === self || !compressor.has_directive("use strict"))) {
                            hoisted.push(node);
                            return make_node(AST_EmptyStatement, node);
                        }
                        if (hoist_vars && node instanceof AST_Var) {
                            node.definitions.forEach(function(def) {
                                vars.set(def.name.name, def);
                                ++vars_found;
                            });
                            var seq = node.to_assignments(compressor);
                            var p = tt.parent();
                            if (p instanceof AST_ForIn && p.init === node) {
                                if (seq == null) {
                                    var def = node.definitions[0].name;
                                    return make_node(AST_SymbolRef, def, def);
                                }
                                return seq;
                            }
                            if (p instanceof AST_For && p.init === node) {
                                return seq;
                            }
                            if (!seq) return make_node(AST_EmptyStatement, node);
                            return make_node(AST_SimpleStatement, node, {
                                body: seq
                            });
                        }
                        if (node instanceof AST_Scope) return node;
                    }
                });
                self = self.transform(tt);
                if (vars_found > 0) {
                    var defs = [];
                    vars.each(function(def, name) {
                        if (self instanceof AST_Lambda && !all(self.argnames, function(argname) {
                            return argname.name != name;
                        })) {
                            vars.del(name);
                        } else {
                            def = def.clone();
                            def.value = null;
                            defs.push(def);
                            vars.set(name, def);
                        }
                    });
                    if (defs.length > 0) {
                        for (var i = 0; i < self.body.length; ) {
                            if (self.body[i] instanceof AST_SimpleStatement) {
                                var expr = self.body[i].body, sym, assign;
                                if (expr instanceof AST_Assign && expr.operator == "=" && (sym = expr.left) instanceof AST_Symbol && vars.has(sym.name)) {
                                    var def = vars.get(sym.name);
                                    if (def.value) break;
                                    def.value = expr.right;
                                    remove(defs, def);
                                    defs.push(def);
                                    self.body.splice(i, 1);
                                    continue;
                                }
                                if (expr instanceof AST_Sequence && (assign = expr.expressions[0]) instanceof AST_Assign && assign.operator == "=" && (sym = assign.left) instanceof AST_Symbol && vars.has(sym.name)) {
                                    var def = vars.get(sym.name);
                                    if (def.value) break;
                                    def.value = assign.right;
                                    remove(defs, def);
                                    defs.push(def);
                                    self.body[i].body = make_sequence(expr, expr.expressions.slice(1));
                                    continue;
                                }
                            }
                            if (self.body[i] instanceof AST_EmptyStatement) {
                                self.body.splice(i, 1);
                                continue;
                            }
                            if (self.body[i] instanceof AST_BlockStatement) {
                                var tmp = [ i, 1 ].concat(self.body[i].body);
                                self.body.splice.apply(self.body, tmp);
                                continue;
                            }
                            break;
                        }
                        defs = make_node(AST_Var, self, {
                            definitions: defs
                        });
                        hoisted.push(defs);
                    }
                }
                self.body = dirs.concat(hoisted, self.body);
            }
            return self;
        });
        AST_Scope.DEFMETHOD("var_names", function() {
            var var_names = this._var_names;
            if (!var_names) {
                this._var_names = var_names = Object.create(null);
                this.enclosed.forEach(function(def) {
                    var_names[def.name] = true;
                });
                this.variables.each(function(def, name) {
                    var_names[name] = true;
                });
            }
            return var_names;
        });
        AST_Scope.DEFMETHOD("make_var_name", function(prefix) {
            var var_names = this.var_names();
            prefix = prefix.replace(/(?:^[^a-z_$]|[^a-z0-9_$])/gi, "_");
            var name = prefix;
            for (var i = 0; var_names[name]; i++) name = prefix + "$" + i;
            var_names[name] = true;
            return name;
        });
        AST_Scope.DEFMETHOD("hoist_properties", function(compressor) {
            var self = this;
            if (!compressor.option("hoist_props") || compressor.has_directive("use asm")) return self;
            var top_retain = self instanceof AST_Toplevel && compressor.top_retain || return_false;
            var defs_by_id = Object.create(null);
            return self.transform(new TreeTransformer(function(node, descend) {
                if (node instanceof AST_VarDef) {
                    var sym = node.name, def, value;
                    if (sym.scope === self && (def = sym.definition()).escaped != 1 && !def.assignments && !def.direct_access && !def.single_use && !top_retain(def) && (value = sym.fixed_value()) === node.value && value instanceof AST_Object) {
                        descend(node, this);
                        var defs = new Dictionary();
                        var assignments = [];
                        value.properties.forEach(function(prop) {
                            assignments.push(make_node(AST_VarDef, node, {
                                name: make_sym(prop.key),
                                value: prop.value
                            }));
                        });
                        defs_by_id[def.id] = defs;
                        return MAP.splice(assignments);
                    }
                }
                if (node instanceof AST_PropAccess && node.expression instanceof AST_SymbolRef) {
                    var defs = defs_by_id[node.expression.definition().id];
                    if (defs) {
                        var def = defs.get(get_value(node.property));
                        var sym = make_node(AST_SymbolRef, node, {
                            name: def.name,
                            scope: node.expression.scope,
                            thedef: def
                        });
                        sym.reference({});
                        return sym;
                    }
                }
                function make_sym(key) {
                    var new_var = make_node(sym.CTOR, sym, {
                        name: self.make_var_name(sym.name + "_" + key),
                        scope: self
                    });
                    var def = self.def_variable(new_var);
                    defs.set(key, def);
                    self.enclosed.push(def);
                    return new_var;
                }
            }));
        });
        (function(def) {
            function trim(nodes, compressor, first_in_statement) {
                var len = nodes.length;
                if (!len) return null;
                var ret = [], changed = false;
                for (var i = 0; i < len; i++) {
                    var node = nodes[i].drop_side_effect_free(compressor, first_in_statement);
                    changed |= node !== nodes[i];
                    if (node) {
                        ret.push(node);
                        first_in_statement = false;
                    }
                }
                return changed ? ret.length ? ret : null : nodes;
            }
            def(AST_Node, return_this);
            def(AST_Constant, return_null);
            def(AST_This, return_null);
            def(AST_Call, function(compressor, first_in_statement) {
                if (!this.is_expr_pure(compressor)) {
                    if (this.expression.is_call_pure(compressor)) {
                        var exprs = this.args.slice();
                        exprs.unshift(this.expression.expression);
                        exprs = trim(exprs, compressor, first_in_statement);
                        return exprs && make_sequence(this, exprs);
                    }
                    if (this.expression instanceof AST_Function && (!this.expression.name || !this.expression.name.definition().references.length)) {
                        var node = this.clone();
                        var exp = node.expression;
                        exp.process_expression(false, compressor);
                        exp.walk(new TreeWalker(function(node) {
                            if (node instanceof AST_Return && node.value) {
                                node.value = node.value.drop_side_effect_free(compressor);
                                return true;
                            }
                            if (node instanceof AST_Scope && node !== exp) return true;
                        }));
                        return node;
                    }
                    return this;
                }
                if (this.pure) {
                    compressor.warn("Dropping __PURE__ call [{file}:{line},{col}]", this.start);
                }
                var args = trim(this.args, compressor, first_in_statement);
                return args && make_sequence(this, args);
            });
            def(AST_Accessor, return_null);
            def(AST_Function, return_null);
            def(AST_Binary, function(compressor, first_in_statement) {
                var right = this.right.drop_side_effect_free(compressor);
                if (!right) return this.left.drop_side_effect_free(compressor, first_in_statement);
                if (lazy_op(this.operator)) {
                    if (right === this.right) return this;
                    var node = this.clone();
                    node.right = right;
                    return node;
                } else {
                    var left = this.left.drop_side_effect_free(compressor, first_in_statement);
                    if (!left) return this.right.drop_side_effect_free(compressor, first_in_statement);
                    return make_sequence(this, [ left, right ]);
                }
            });
            def(AST_Assign, function(compressor) {
                var left = this.left;
                if (left.has_side_effects(compressor) || compressor.has_directive("use strict") && left instanceof AST_PropAccess && left.expression.is_constant()) {
                    return this;
                }
                this.write_only = true;
                if (root_expr(left).is_constant_expression(compressor.find_parent(AST_Scope))) {
                    return this.right.drop_side_effect_free(compressor);
                }
                return this;
            });
            def(AST_Conditional, function(compressor) {
                var consequent = this.consequent.drop_side_effect_free(compressor);
                var alternative = this.alternative.drop_side_effect_free(compressor);
                if (consequent === this.consequent && alternative === this.alternative) return this;
                if (!consequent) return alternative ? make_node(AST_Binary, this, {
                    operator: "||",
                    left: this.condition,
                    right: alternative
                }) : this.condition.drop_side_effect_free(compressor);
                if (!alternative) return make_node(AST_Binary, this, {
                    operator: "&&",
                    left: this.condition,
                    right: consequent
                });
                var node = this.clone();
                node.consequent = consequent;
                node.alternative = alternative;
                return node;
            });
            def(AST_Unary, function(compressor, first_in_statement) {
                if (unary_side_effects(this.operator)) {
                    this.write_only = !this.expression.has_side_effects(compressor);
                    return this;
                }
                if (this.operator == "typeof" && this.expression instanceof AST_SymbolRef) return null;
                var expression = this.expression.drop_side_effect_free(compressor, first_in_statement);
                if (first_in_statement && expression && is_iife_call(expression)) {
                    if (expression === this.expression && this.operator == "!") return this;
                    return expression.negate(compressor, first_in_statement);
                }
                return expression;
            });
            def(AST_SymbolRef, function(compressor) {
                return this.is_declared(compressor) ? null : this;
            });
            def(AST_Object, function(compressor, first_in_statement) {
                var values = trim(this.properties, compressor, first_in_statement);
                return values && make_sequence(this, values);
            });
            def(AST_ObjectProperty, function(compressor, first_in_statement) {
                return this.value.drop_side_effect_free(compressor, first_in_statement);
            });
            def(AST_Array, function(compressor, first_in_statement) {
                var values = trim(this.elements, compressor, first_in_statement);
                return values && make_sequence(this, values);
            });
            def(AST_Dot, function(compressor, first_in_statement) {
                if (this.expression.may_throw_on_access(compressor)) return this;
                return this.expression.drop_side_effect_free(compressor, first_in_statement);
            });
            def(AST_Sub, function(compressor, first_in_statement) {
                if (this.expression.may_throw_on_access(compressor)) return this;
                var expression = this.expression.drop_side_effect_free(compressor, first_in_statement);
                if (!expression) return this.property.drop_side_effect_free(compressor, first_in_statement);
                var property = this.property.drop_side_effect_free(compressor);
                if (!property) return expression;
                return make_sequence(this, [ expression, property ]);
            });
            def(AST_Sequence, function(compressor) {
                var last = this.tail_node();
                var expr = last.drop_side_effect_free(compressor);
                if (expr === last) return this;
                var expressions = this.expressions.slice(0, -1);
                if (expr) expressions.push(expr);
                return make_sequence(this, expressions);
            });
        })(function(node, func) {
            node.DEFMETHOD("drop_side_effect_free", func);
        });
        OPT(AST_SimpleStatement, function(self, compressor) {
            if (compressor.option("side_effects")) {
                var body = self.body;
                var node = body.drop_side_effect_free(compressor, true);
                if (!node) {
                    compressor.warn("Dropping side-effect-free statement [{file}:{line},{col}]", self.start);
                    return make_node(AST_EmptyStatement, self);
                }
                if (node !== body) {
                    return make_node(AST_SimpleStatement, self, {
                        body: node
                    });
                }
            }
            return self;
        });
        OPT(AST_While, function(self, compressor) {
            return compressor.option("loops") ? make_node(AST_For, self, self).optimize(compressor) : self;
        });
        OPT(AST_Do, function(self, compressor) {
            if (!compressor.option("loops")) return self;
            var cond = self.condition.is_truthy() || self.condition.tail_node().evaluate(compressor);
            if (!(cond instanceof AST_Node)) {
                if (cond) return make_node(AST_For, self, {
                    body: make_node(AST_BlockStatement, self.body, {
                        body: [ self.body, make_node(AST_SimpleStatement, self.condition, {
                            body: self.condition
                        }) ]
                    })
                }).optimize(compressor);
                var has_loop_control = false;
                var tw = new TreeWalker(function(node) {
                    if (node instanceof AST_Scope || has_loop_control) return true;
                    if (node instanceof AST_LoopControl && tw.loopcontrol_target(node) === self) return has_loop_control = true;
                });
                var parent = compressor.parent();
                (parent instanceof AST_LabeledStatement ? parent : self).walk(tw);
                if (!has_loop_control) return make_node(AST_BlockStatement, self.body, {
                    body: [ self.body, make_node(AST_SimpleStatement, self.condition, {
                        body: self.condition
                    }) ]
                }).optimize(compressor);
            }
            if (self.body instanceof AST_SimpleStatement) return make_node(AST_For, self, {
                condition: make_sequence(self.condition, [ self.body.body, self.condition ]),
                body: make_node(AST_EmptyStatement, self)
            }).optimize(compressor);
            return self;
        });
        function if_break_in_loop(self, compressor) {
            var first = self.body instanceof AST_BlockStatement ? self.body.body[0] : self.body;
            if (compressor.option("dead_code") && is_break(first)) {
                var body = [];
                if (self.init instanceof AST_Statement) {
                    body.push(self.init);
                } else if (self.init) {
                    body.push(make_node(AST_SimpleStatement, self.init, {
                        body: self.init
                    }));
                }
                if (self.condition) {
                    body.push(make_node(AST_SimpleStatement, self.condition, {
                        body: self.condition
                    }));
                }
                extract_declarations_from_unreachable_code(compressor, self.body, body);
                return make_node(AST_BlockStatement, self, {
                    body: body
                });
            }
            if (first instanceof AST_If) {
                if (is_break(first.body)) {
                    if (self.condition) {
                        self.condition = make_node(AST_Binary, self.condition, {
                            left: self.condition,
                            operator: "&&",
                            right: first.condition.negate(compressor)
                        });
                    } else {
                        self.condition = first.condition.negate(compressor);
                    }
                    drop_it(first.alternative);
                } else if (is_break(first.alternative)) {
                    if (self.condition) {
                        self.condition = make_node(AST_Binary, self.condition, {
                            left: self.condition,
                            operator: "&&",
                            right: first.condition
                        });
                    } else {
                        self.condition = first.condition;
                    }
                    drop_it(first.body);
                }
            }
            return self;
            function is_break(node) {
                return node instanceof AST_Break && compressor.loopcontrol_target(node) === compressor.self();
            }
            function drop_it(rest) {
                rest = as_statement_array(rest);
                if (self.body instanceof AST_BlockStatement) {
                    self.body = self.body.clone();
                    self.body.body = rest.concat(self.body.body.slice(1));
                    self.body = self.body.transform(compressor);
                } else {
                    self.body = make_node(AST_BlockStatement, self.body, {
                        body: rest
                    }).transform(compressor);
                }
                self = if_break_in_loop(self, compressor);
            }
        }
        OPT(AST_For, function(self, compressor) {
            if (!compressor.option("loops")) return self;
            if (compressor.option("side_effects") && self.init) {
                self.init = self.init.drop_side_effect_free(compressor);
            }
            if (self.condition) {
                var cond = self.condition.evaluate(compressor);
                if (!(cond instanceof AST_Node)) {
                    if (cond) self.condition = null; else if (!compressor.option("dead_code")) {
                        var orig = self.condition;
                        self.condition = make_node_from_constant(cond, self.condition);
                        self.condition = best_of_expression(self.condition.transform(compressor), orig);
                    }
                }
                if (cond instanceof AST_Node) {
                    cond = self.condition.is_truthy() || self.condition.tail_node().evaluate(compressor);
                }
                if (!cond) {
                    if (compressor.option("dead_code")) {
                        var body = [];
                        extract_declarations_from_unreachable_code(compressor, self.body, body);
                        if (self.init instanceof AST_Statement) {
                            body.push(self.init);
                        } else if (self.init) {
                            body.push(make_node(AST_SimpleStatement, self.init, {
                                body: self.init
                            }));
                        }
                        body.push(make_node(AST_SimpleStatement, self.condition, {
                            body: self.condition
                        }));
                        return make_node(AST_BlockStatement, self, {
                            body: body
                        }).optimize(compressor);
                    }
                } else if (self.condition && !(cond instanceof AST_Node)) {
                    self.body = make_node(AST_BlockStatement, self.body, {
                        body: [ make_node(AST_SimpleStatement, self.condition, {
                            body: self.condition
                        }), self.body ]
                    });
                    self.condition = null;
                }
            }
            return if_break_in_loop(self, compressor);
        });
        OPT(AST_If, function(self, compressor) {
            if (is_empty(self.alternative)) self.alternative = null;
            if (!compressor.option("conditionals")) return self;
            var cond = self.condition.evaluate(compressor);
            if (!compressor.option("dead_code") && !(cond instanceof AST_Node)) {
                var orig = self.condition;
                self.condition = make_node_from_constant(cond, orig);
                self.condition = best_of_expression(self.condition.transform(compressor), orig);
            }
            if (compressor.option("dead_code")) {
                if (cond instanceof AST_Node) {
                    cond = self.condition.is_truthy() || self.condition.tail_node().evaluate(compressor);
                }
                if (!cond) {
                    compressor.warn("Condition always false [{file}:{line},{col}]", self.condition.start);
                    var body = [];
                    extract_declarations_from_unreachable_code(compressor, self.body, body);
                    body.push(make_node(AST_SimpleStatement, self.condition, {
                        body: self.condition
                    }));
                    if (self.alternative) body.push(self.alternative);
                    return make_node(AST_BlockStatement, self, {
                        body: body
                    }).optimize(compressor);
                } else if (!(cond instanceof AST_Node)) {
                    compressor.warn("Condition always true [{file}:{line},{col}]", self.condition.start);
                    var body = [];
                    if (self.alternative) {
                        extract_declarations_from_unreachable_code(compressor, self.alternative, body);
                    }
                    body.push(make_node(AST_SimpleStatement, self.condition, {
                        body: self.condition
                    }));
                    body.push(self.body);
                    return make_node(AST_BlockStatement, self, {
                        body: body
                    }).optimize(compressor);
                }
            }
            var negated = self.condition.negate(compressor);
            var self_condition_length = self.condition.print_to_string().length;
            var negated_length = negated.print_to_string().length;
            var negated_is_best = negated_length < self_condition_length;
            if (self.alternative && negated_is_best) {
                negated_is_best = false;
                self.condition = negated;
                var tmp = self.body;
                self.body = self.alternative || make_node(AST_EmptyStatement, self);
                self.alternative = tmp;
            }
            if (is_empty(self.body) && is_empty(self.alternative)) {
                return make_node(AST_SimpleStatement, self.condition, {
                    body: self.condition.clone()
                }).optimize(compressor);
            }
            if (self.body instanceof AST_SimpleStatement && self.alternative instanceof AST_SimpleStatement) {
                return make_node(AST_SimpleStatement, self, {
                    body: make_node(AST_Conditional, self, {
                        condition: self.condition,
                        consequent: self.body.body,
                        alternative: self.alternative.body
                    })
                }).optimize(compressor);
            }
            if (is_empty(self.alternative) && self.body instanceof AST_SimpleStatement) {
                if (self_condition_length === negated_length && !negated_is_best && self.condition instanceof AST_Binary && self.condition.operator == "||") {
                    negated_is_best = true;
                }
                if (negated_is_best) return make_node(AST_SimpleStatement, self, {
                    body: make_node(AST_Binary, self, {
                        operator: "||",
                        left: negated,
                        right: self.body.body
                    })
                }).optimize(compressor);
                return make_node(AST_SimpleStatement, self, {
                    body: make_node(AST_Binary, self, {
                        operator: "&&",
                        left: self.condition,
                        right: self.body.body
                    })
                }).optimize(compressor);
            }
            if (self.body instanceof AST_EmptyStatement && self.alternative instanceof AST_SimpleStatement) {
                return make_node(AST_SimpleStatement, self, {
                    body: make_node(AST_Binary, self, {
                        operator: "||",
                        left: self.condition,
                        right: self.alternative.body
                    })
                }).optimize(compressor);
            }
            if (self.body instanceof AST_Exit && self.alternative instanceof AST_Exit && self.body.TYPE == self.alternative.TYPE) {
                return make_node(self.body.CTOR, self, {
                    value: make_node(AST_Conditional, self, {
                        condition: self.condition,
                        consequent: self.body.value || make_node(AST_Undefined, self.body),
                        alternative: self.alternative.value || make_node(AST_Undefined, self.alternative)
                    }).transform(compressor)
                }).optimize(compressor);
            }
            if (self.body instanceof AST_If && !self.body.alternative && !self.alternative) {
                self = make_node(AST_If, self, {
                    condition: make_node(AST_Binary, self.condition, {
                        operator: "&&",
                        left: self.condition,
                        right: self.body.condition
                    }),
                    body: self.body.body,
                    alternative: null
                });
            }
            if (aborts(self.body)) {
                if (self.alternative) {
                    var alt = self.alternative;
                    self.alternative = null;
                    return make_node(AST_BlockStatement, self, {
                        body: [ self, alt ]
                    }).optimize(compressor);
                }
            }
            if (aborts(self.alternative)) {
                var body = self.body;
                self.body = self.alternative;
                self.condition = negated_is_best ? negated : self.condition.negate(compressor);
                self.alternative = null;
                return make_node(AST_BlockStatement, self, {
                    body: [ self, body ]
                }).optimize(compressor);
            }
            return self;
        });
        OPT(AST_Switch, function(self, compressor) {
            if (!compressor.option("switches")) return self;
            var branch;
            var value = self.expression.evaluate(compressor);
            if (!(value instanceof AST_Node)) {
                var orig = self.expression;
                self.expression = make_node_from_constant(value, orig);
                self.expression = best_of_expression(self.expression.transform(compressor), orig);
            }
            if (!compressor.option("dead_code")) return self;
            if (value instanceof AST_Node) {
                value = self.expression.tail_node().evaluate(compressor);
            }
            var decl = [];
            var body = [];
            var default_branch;
            var exact_match;
            for (var i = 0, len = self.body.length; i < len && !exact_match; i++) {
                branch = self.body[i];
                if (branch instanceof AST_Default) {
                    if (!default_branch) {
                        default_branch = branch;
                    } else {
                        eliminate_branch(branch, body[body.length - 1]);
                    }
                } else if (!(value instanceof AST_Node)) {
                    var exp = branch.expression.evaluate(compressor);
                    if (!(exp instanceof AST_Node) && exp !== value) {
                        eliminate_branch(branch, body[body.length - 1]);
                        continue;
                    }
                    if (exp instanceof AST_Node) exp = branch.expression.tail_node().evaluate(compressor);
                    if (exp === value) {
                        exact_match = branch;
                        if (default_branch) {
                            var default_index = body.indexOf(default_branch);
                            body.splice(default_index, 1);
                            eliminate_branch(default_branch, body[default_index - 1]);
                            default_branch = null;
                        }
                    }
                }
                if (aborts(branch)) {
                    var prev = body[body.length - 1];
                    if (aborts(prev) && prev.body.length == branch.body.length && make_node(AST_BlockStatement, prev, prev).equivalent_to(make_node(AST_BlockStatement, branch, branch))) {
                        prev.body = [];
                    }
                }
                body.push(branch);
            }
            while (i < len) eliminate_branch(self.body[i++], body[body.length - 1]);
            if (body.length > 0) {
                body[0].body = decl.concat(body[0].body);
            }
            self.body = body;
            while (branch = body[body.length - 1]) {
                var stat = branch.body[branch.body.length - 1];
                if (stat instanceof AST_Break && compressor.loopcontrol_target(stat) === self) branch.body.pop();
                if (branch.body.length || branch instanceof AST_Case && (default_branch || branch.expression.has_side_effects(compressor))) break;
                if (body.pop() === default_branch) default_branch = null;
            }
            if (body.length == 0) {
                return make_node(AST_BlockStatement, self, {
                    body: decl.concat(make_node(AST_SimpleStatement, self.expression, {
                        body: self.expression
                    }))
                }).optimize(compressor);
            }
            if (body.length == 1 && (body[0] === exact_match || body[0] === default_branch)) {
                var has_break = false;
                var tw = new TreeWalker(function(node) {
                    if (has_break || node instanceof AST_Lambda || node instanceof AST_SimpleStatement) return true;
                    if (node instanceof AST_Break && tw.loopcontrol_target(node) === self) has_break = true;
                });
                self.walk(tw);
                if (!has_break) {
                    var statements = body[0].body.slice();
                    var exp = body[0].expression;
                    if (exp) statements.unshift(make_node(AST_SimpleStatement, exp, {
                        body: exp
                    }));
                    statements.unshift(make_node(AST_SimpleStatement, self.expression, {
                        body: self.expression
                    }));
                    return make_node(AST_BlockStatement, self, {
                        body: statements
                    }).optimize(compressor);
                }
            }
            return self;
            function eliminate_branch(branch, prev) {
                if (prev && !aborts(prev)) {
                    prev.body = prev.body.concat(branch.body);
                } else {
                    extract_declarations_from_unreachable_code(compressor, branch, decl);
                }
            }
        });
        OPT(AST_Try, function(self, compressor) {
            tighten_body(self.body, compressor);
            if (self.bcatch && self.bfinally && all(self.bfinally.body, is_empty)) self.bfinally = null;
            if (compressor.option("dead_code") && all(self.body, is_empty)) {
                var body = [];
                if (self.bcatch) {
                    extract_declarations_from_unreachable_code(compressor, self.bcatch, body);
                    body.forEach(function(stat) {
                        if (!(stat instanceof AST_Definitions)) return;
                        stat.definitions.forEach(function(var_def) {
                            var def = var_def.name.definition().redefined();
                            if (!def) return;
                            var_def.name = var_def.name.clone();
                            var_def.name.thedef = def;
                        });
                    });
                }
                if (self.bfinally) body = body.concat(self.bfinally.body);
                return make_node(AST_BlockStatement, self, {
                    body: body
                }).optimize(compressor);
            }
            return self;
        });
        AST_Definitions.DEFMETHOD("remove_initializers", function() {
            this.definitions.forEach(function(def) {
                def.value = null;
            });
        });
        AST_Definitions.DEFMETHOD("to_assignments", function(compressor) {
            var reduce_vars = compressor.option("reduce_vars");
            var assignments = this.definitions.reduce(function(a, def) {
                if (def.value) {
                    var name = make_node(AST_SymbolRef, def.name, def.name);
                    a.push(make_node(AST_Assign, def, {
                        operator: "=",
                        left: name,
                        right: def.value
                    }));
                    if (reduce_vars) name.definition().fixed = false;
                }
                def = def.name.definition();
                def.eliminated++;
                def.replaced--;
                return a;
            }, []);
            if (assignments.length == 0) return null;
            return make_sequence(this, assignments);
        });
        OPT(AST_Definitions, function(self, compressor) {
            if (self.definitions.length == 0) return make_node(AST_EmptyStatement, self);
            return self;
        });
        OPT(AST_Call, function(self, compressor) {
            var exp = self.expression;
            var fn = exp;
            if (compressor.option("reduce_vars") && fn instanceof AST_SymbolRef) {
                fn = fn.fixed_value();
            }
            var is_func = fn instanceof AST_Lambda;
            if (compressor.option("unused") && is_func && !fn.uses_arguments && !fn.uses_eval) {
                var pos = 0, last = 0;
                for (var i = 0, len = self.args.length; i < len; i++) {
                    var trim = i >= fn.argnames.length;
                    if (trim || fn.argnames[i].__unused) {
                        var node = self.args[i].drop_side_effect_free(compressor);
                        if (node) {
                            self.args[pos++] = node;
                        } else if (!trim) {
                            self.args[pos++] = make_node(AST_Number, self.args[i], {
                                value: 0
                            });
                            continue;
                        }
                    } else {
                        self.args[pos++] = self.args[i];
                    }
                    last = pos;
                }
                self.args.length = last;
            }
            if (compressor.option("unsafe")) {
                if (is_undeclared_ref(exp)) switch (exp.name) {
                  case "Array":
                    if (self.args.length != 1) {
                        return make_node(AST_Array, self, {
                            elements: self.args
                        }).optimize(compressor);
                    }
                    break;

                  case "Object":
                    if (self.args.length == 0) {
                        return make_node(AST_Object, self, {
                            properties: []
                        });
                    }
                    break;

                  case "String":
                    if (self.args.length == 0) return make_node(AST_String, self, {
                        value: ""
                    });
                    if (self.args.length <= 1) return make_node(AST_Binary, self, {
                        left: self.args[0],
                        operator: "+",
                        right: make_node(AST_String, self, {
                            value: ""
                        })
                    }).optimize(compressor);
                    break;

                  case "Number":
                    if (self.args.length == 0) return make_node(AST_Number, self, {
                        value: 0
                    });
                    if (self.args.length == 1) return make_node(AST_UnaryPrefix, self, {
                        expression: self.args[0],
                        operator: "+"
                    }).optimize(compressor);

                  case "Boolean":
                    if (self.args.length == 0) return make_node(AST_False, self);
                    if (self.args.length == 1) return make_node(AST_UnaryPrefix, self, {
                        expression: make_node(AST_UnaryPrefix, self, {
                            expression: self.args[0],
                            operator: "!"
                        }),
                        operator: "!"
                    }).optimize(compressor);
                    break;

                  case "RegExp":
                    var params = [];
                    if (all(self.args, function(arg) {
                        var value = arg.evaluate(compressor);
                        params.unshift(value);
                        return arg !== value;
                    })) {
                        try {
                            return best_of(compressor, self, make_node(AST_RegExp, self, {
                                value: RegExp.apply(RegExp, params)
                            }));
                        } catch (ex) {
                            compressor.warn("Error converting {expr} [{file}:{line},{col}]", {
                                expr: self.print_to_string(),
                                file: self.start.file,
                                line: self.start.line,
                                col: self.start.col
                            });
                        }
                    }
                    break;
                } else if (exp instanceof AST_Dot) switch (exp.property) {
                  case "toString":
                    if (self.args.length == 0 && !exp.expression.may_throw_on_access(compressor)) {
                        return make_node(AST_Binary, self, {
                            left: make_node(AST_String, self, {
                                value: ""
                            }),
                            operator: "+",
                            right: exp.expression
                        }).optimize(compressor);
                    }
                    break;

                  case "join":
                    if (exp.expression instanceof AST_Array) EXIT: {
                        var separator;
                        if (self.args.length > 0) {
                            separator = self.args[0].evaluate(compressor);
                            if (separator === self.args[0]) break EXIT;
                        }
                        var elements = [];
                        var consts = [];
                        exp.expression.elements.forEach(function(el) {
                            var value = el.evaluate(compressor);
                            if (value !== el) {
                                consts.push(value);
                            } else {
                                if (consts.length > 0) {
                                    elements.push(make_node(AST_String, self, {
                                        value: consts.join(separator)
                                    }));
                                    consts.length = 0;
                                }
                                elements.push(el);
                            }
                        });
                        if (consts.length > 0) {
                            elements.push(make_node(AST_String, self, {
                                value: consts.join(separator)
                            }));
                        }
                        if (elements.length == 0) return make_node(AST_String, self, {
                            value: ""
                        });
                        if (elements.length == 1) {
                            if (elements[0].is_string(compressor)) {
                                return elements[0];
                            }
                            return make_node(AST_Binary, elements[0], {
                                operator: "+",
                                left: make_node(AST_String, self, {
                                    value: ""
                                }),
                                right: elements[0]
                            });
                        }
                        if (separator == "") {
                            var first;
                            if (elements[0].is_string(compressor) || elements[1].is_string(compressor)) {
                                first = elements.shift();
                            } else {
                                first = make_node(AST_String, self, {
                                    value: ""
                                });
                            }
                            return elements.reduce(function(prev, el) {
                                return make_node(AST_Binary, el, {
                                    operator: "+",
                                    left: prev,
                                    right: el
                                });
                            }, first).optimize(compressor);
                        }
                        var node = self.clone();
                        node.expression = node.expression.clone();
                        node.expression.expression = node.expression.expression.clone();
                        node.expression.expression.elements = elements;
                        return best_of(compressor, self, node);
                    }
                    break;

                  case "charAt":
                    if (exp.expression.is_string(compressor)) {
                        var arg = self.args[0];
                        var index = arg ? arg.evaluate(compressor) : 0;
                        if (index !== arg) {
                            return make_node(AST_Sub, exp, {
                                expression: exp.expression,
                                property: make_node_from_constant(index | 0, arg || exp)
                            }).optimize(compressor);
                        }
                    }
                    break;

                  case "apply":
                    if (self.args.length == 2 && self.args[1] instanceof AST_Array) {
                        var args = self.args[1].elements.slice();
                        args.unshift(self.args[0]);
                        return make_node(AST_Call, self, {
                            expression: make_node(AST_Dot, exp, {
                                expression: exp.expression,
                                property: "call"
                            }),
                            args: args
                        }).optimize(compressor);
                    }
                    break;

                  case "call":
                    var func = exp.expression;
                    if (func instanceof AST_SymbolRef) {
                        func = func.fixed_value();
                    }
                    if (func instanceof AST_Lambda && !func.contains_this()) {
                        return make_sequence(this, [ self.args[0], make_node(AST_Call, self, {
                            expression: exp.expression,
                            args: self.args.slice(1)
                        }) ]).optimize(compressor);
                    }
                    break;
                }
            }
            if (compressor.option("unsafe_Function") && is_undeclared_ref(exp) && exp.name == "Function") {
                if (self.args.length == 0) return make_node(AST_Function, self, {
                    argnames: [],
                    body: []
                });
                if (all(self.args, function(x) {
                    return x instanceof AST_String;
                })) {
                    try {
                        var code = "n(function(" + self.args.slice(0, -1).map(function(arg) {
                            return arg.value;
                        }).join(",") + "){" + self.args[self.args.length - 1].value + "})";
                        var ast = parse(code);
                        var mangle = {
                            ie8: compressor.option("ie8")
                        };
                        ast.figure_out_scope(mangle);
                        var comp = new Compressor(compressor.options);
                        ast = ast.transform(comp);
                        ast.figure_out_scope(mangle);
                        ast.compute_char_frequency(mangle);
                        ast.mangle_names(mangle);
                        var fun;
                        ast.walk(new TreeWalker(function(node) {
                            if (fun) return true;
                            if (node instanceof AST_Lambda) {
                                fun = node;
                                return true;
                            }
                        }));
                        var code = OutputStream();
                        AST_BlockStatement.prototype._codegen.call(fun, fun, code);
                        self.args = [ make_node(AST_String, self, {
                            value: fun.argnames.map(function(arg) {
                                return arg.print_to_string();
                            }).join(",")
                        }), make_node(AST_String, self.args[self.args.length - 1], {
                            value: code.get().replace(/^\{|\}$/g, "")
                        }) ];
                        return self;
                    } catch (ex) {
                        if (ex instanceof JS_Parse_Error) {
                            compressor.warn("Error parsing code passed to new Function [{file}:{line},{col}]", self.args[self.args.length - 1].start);
                            compressor.warn(ex.toString());
                        } else {
                            throw ex;
                        }
                    }
                }
            }
            var stat = is_func && fn.body[0];
            if (compressor.option("inline") && stat instanceof AST_Return) {
                var value = stat.value;
                if (!value || value.is_constant_expression()) {
                    var args = self.args.concat(value || make_node(AST_Undefined, self));
                    return make_sequence(self, args).optimize(compressor);
                }
            }
            if (is_func) {
                var def, value, scope, in_loop, level = -1;
                if (compressor.option("inline") && !fn.uses_arguments && !fn.uses_eval && !(fn.name && fn instanceof AST_Function) && (value = can_flatten_body(stat)) && (exp === fn || compressor.option("unused") && (def = exp.definition()).references.length == 1 && !recursive_ref(compressor, def) && fn.is_constant_expression(exp.scope)) && !self.pure && !fn.contains_this() && can_inject_symbols()) {
                    fn._squeezed = true;
                    return make_sequence(self, flatten_fn()).optimize(compressor);
                }
                if (compressor.option("side_effects") && all(fn.body, is_empty)) {
                    var args = self.args.concat(make_node(AST_Undefined, self));
                    return make_sequence(self, args).optimize(compressor);
                }
            }
            if (compressor.option("drop_console")) {
                if (exp instanceof AST_PropAccess) {
                    var name = exp.expression;
                    while (name.expression) {
                        name = name.expression;
                    }
                    if (is_undeclared_ref(name) && name.name == "console") {
                        return make_node(AST_Undefined, self).optimize(compressor);
                    }
                }
            }
            if (compressor.option("negate_iife") && compressor.parent() instanceof AST_SimpleStatement && is_iife_call(self)) {
                return self.negate(compressor, true);
            }
            var ev = self.evaluate(compressor);
            if (ev !== self) {
                ev = make_node_from_constant(ev, self).optimize(compressor);
                return best_of(compressor, ev, self);
            }
            return self;
            function return_value(stat) {
                if (!stat) return make_node(AST_Undefined, self);
                if (stat instanceof AST_Return) {
                    if (!stat.value) return make_node(AST_Undefined, self);
                    return stat.value.clone(true);
                }
                if (stat instanceof AST_SimpleStatement) {
                    return make_node(AST_UnaryPrefix, stat, {
                        operator: "void",
                        expression: stat.body.clone(true)
                    });
                }
            }
            function can_flatten_body(stat) {
                var len = fn.body.length;
                if (compressor.option("inline") < 3) {
                    return len == 1 && return_value(stat);
                }
                stat = null;
                for (var i = 0; i < len; i++) {
                    var line = fn.body[i];
                    if (line instanceof AST_Var) {
                        if (stat && !all(line.definitions, function(var_def) {
                            return !var_def.value;
                        })) {
                            return false;
                        }
                    } else if (line instanceof AST_EmptyStatement) {
                        continue;
                    } else if (stat) {
                        return false;
                    } else {
                        stat = line;
                    }
                }
                return return_value(stat);
            }
            function can_inject_args(catches, safe_to_inject) {
                for (var i = 0, len = fn.argnames.length; i < len; i++) {
                    var arg = fn.argnames[i];
                    if (arg.__unused) continue;
                    if (!safe_to_inject || catches[arg.name] || identifier_atom(arg.name) || scope.var_names()[arg.name]) {
                        return false;
                    }
                    if (in_loop) in_loop.push(arg.definition());
                }
                return true;
            }
            function can_inject_vars(catches, safe_to_inject) {
                var len = fn.body.length;
                for (var i = 0; i < len; i++) {
                    var stat = fn.body[i];
                    if (!(stat instanceof AST_Var)) continue;
                    if (!safe_to_inject) return false;
                    for (var j = stat.definitions.length; --j >= 0; ) {
                        var name = stat.definitions[j].name;
                        if (catches[name.name] || identifier_atom(name.name) || scope.var_names()[name.name]) {
                            return false;
                        }
                        if (in_loop) in_loop.push(name.definition());
                    }
                }
                return true;
            }
            function can_inject_symbols() {
                var catches = Object.create(null);
                do {
                    scope = compressor.parent(++level);
                    if (scope instanceof AST_Catch) {
                        catches[scope.argname.name] = true;
                    } else if (scope instanceof AST_IterationStatement) {
                        in_loop = [];
                    } else if (scope instanceof AST_SymbolRef) {
                        if (scope.fixed_value() instanceof AST_Scope) return false;
                    }
                } while (!(scope instanceof AST_Scope));
                var safe_to_inject = !(scope instanceof AST_Toplevel) || compressor.toplevel.vars;
                var inline = compressor.option("inline");
                if (!can_inject_vars(catches, inline >= 3 && safe_to_inject)) return false;
                if (!can_inject_args(catches, inline >= 2 && safe_to_inject)) return false;
                return !in_loop || in_loop.length == 0 || !is_reachable(fn, in_loop);
            }
            function append_var(decls, expressions, name, value) {
                var def = name.definition();
                scope.variables.set(name.name, def);
                scope.enclosed.push(def);
                if (!scope.var_names()[name.name]) {
                    scope.var_names()[name.name] = true;
                    decls.push(make_node(AST_VarDef, name, {
                        name: name,
                        value: null
                    }));
                }
                var sym = make_node(AST_SymbolRef, name, name);
                def.references.push(sym);
                if (value) expressions.push(make_node(AST_Assign, self, {
                    operator: "=",
                    left: sym,
                    right: value
                }));
            }
            function flatten_args(decls, expressions) {
                var len = fn.argnames.length;
                for (var i = self.args.length; --i >= len; ) {
                    expressions.push(self.args[i]);
                }
                for (i = len; --i >= 0; ) {
                    var name = fn.argnames[i];
                    var value = self.args[i];
                    if (name.__unused || scope.var_names()[name.name]) {
                        if (value) expressions.push(value);
                    } else {
                        var symbol = make_node(AST_SymbolVar, name, name);
                        name.definition().orig.push(symbol);
                        if (!value && in_loop) value = make_node(AST_Undefined, self);
                        append_var(decls, expressions, symbol, value);
                    }
                }
                decls.reverse();
                expressions.reverse();
            }
            function flatten_vars(decls, expressions) {
                var pos = expressions.length;
                for (var i = 0, lines = fn.body.length; i < lines; i++) {
                    var stat = fn.body[i];
                    if (!(stat instanceof AST_Var)) continue;
                    for (var j = 0, defs = stat.definitions.length; j < defs; j++) {
                        var var_def = stat.definitions[j];
                        var name = var_def.name;
                        append_var(decls, expressions, name, var_def.value);
                        if (in_loop && all(fn.argnames, function(argname) {
                            return argname.name != name.name;
                        })) {
                            var def = fn.variables.get(name.name);
                            var sym = make_node(AST_SymbolRef, name, name);
                            def.references.push(sym);
                            expressions.splice(pos++, 0, make_node(AST_Assign, var_def, {
                                operator: "=",
                                left: sym,
                                right: make_node(AST_Undefined, name)
                            }));
                        }
                    }
                }
            }
            function flatten_fn() {
                var decls = [];
                var expressions = [];
                flatten_args(decls, expressions);
                flatten_vars(decls, expressions);
                expressions.push(value);
                if (decls.length) {
                    i = scope.body.indexOf(compressor.parent(level - 1)) + 1;
                    scope.body.splice(i, 0, make_node(AST_Var, fn, {
                        definitions: decls
                    }));
                }
                return expressions;
            }
        });
        OPT(AST_New, function(self, compressor) {
            if (compressor.option("unsafe")) {
                var exp = self.expression;
                if (is_undeclared_ref(exp)) {
                    switch (exp.name) {
                      case "Object":
                      case "RegExp":
                      case "Function":
                      case "Error":
                      case "Array":
                        return make_node(AST_Call, self, self).transform(compressor);
                    }
                }
            }
            return self;
        });
        OPT(AST_Sequence, function(self, compressor) {
            if (!compressor.option("side_effects")) return self;
            var expressions = [];
            filter_for_side_effects();
            var end = expressions.length - 1;
            trim_right_for_undefined();
            if (end == 0) {
                self = maintain_this_binding(compressor.parent(), compressor.self(), expressions[0]);
                if (!(self instanceof AST_Sequence)) self = self.optimize(compressor);
                return self;
            }
            self.expressions = expressions;
            return self;
            function filter_for_side_effects() {
                var first = first_in_statement(compressor);
                var last = self.expressions.length - 1;
                self.expressions.forEach(function(expr, index) {
                    if (index < last) expr = expr.drop_side_effect_free(compressor, first);
                    if (expr) {
                        merge_sequence(expressions, expr);
                        first = false;
                    }
                });
            }
            function trim_right_for_undefined() {
                while (end > 0 && is_undefined(expressions[end], compressor)) end--;
                if (end < expressions.length - 1) {
                    expressions[end] = make_node(AST_UnaryPrefix, self, {
                        operator: "void",
                        expression: expressions[end]
                    });
                    expressions.length = end + 1;
                }
            }
        });
        AST_Unary.DEFMETHOD("lift_sequences", function(compressor) {
            if (compressor.option("sequences")) {
                if (this.expression instanceof AST_Sequence) {
                    var x = this.expression.expressions.slice();
                    var e = this.clone();
                    e.expression = x.pop();
                    x.push(e);
                    return make_sequence(this, x).optimize(compressor);
                }
            }
            return this;
        });
        OPT(AST_UnaryPostfix, function(self, compressor) {
            return self.lift_sequences(compressor);
        });
        OPT(AST_UnaryPrefix, function(self, compressor) {
            var e = self.expression;
            if (self.operator == "delete" && !(e instanceof AST_SymbolRef || e instanceof AST_PropAccess || is_identifier_atom(e))) {
                if (e instanceof AST_Sequence) {
                    e = e.expressions.slice();
                    e.push(make_node(AST_True, self));
                    return make_sequence(self, e).optimize(compressor);
                }
                return make_sequence(self, [ e, make_node(AST_True, self) ]).optimize(compressor);
            }
            var seq = self.lift_sequences(compressor);
            if (seq !== self) {
                return seq;
            }
            if (compressor.option("side_effects") && self.operator == "void") {
                e = e.drop_side_effect_free(compressor);
                if (e) {
                    self.expression = e;
                    return self;
                } else {
                    return make_node(AST_Undefined, self).optimize(compressor);
                }
            }
            if (compressor.option("booleans")) {
                if (self.operator == "!" && e.is_truthy()) {
                    return make_sequence(self, [ e, make_node(AST_False, self) ]).optimize(compressor);
                } else if (compressor.in_boolean_context()) switch (self.operator) {
                  case "!":
                    if (e instanceof AST_UnaryPrefix && e.operator == "!") {
                        return e.expression;
                    }
                    if (e instanceof AST_Binary) {
                        self = best_of(compressor, self, e.negate(compressor, first_in_statement(compressor)));
                    }
                    break;

                  case "typeof":
                    compressor.warn("Boolean expression always true [{file}:{line},{col}]", self.start);
                    return (e instanceof AST_SymbolRef ? make_node(AST_True, self) : make_sequence(self, [ e, make_node(AST_True, self) ])).optimize(compressor);
                }
            }
            if (self.operator == "-" && e instanceof AST_Infinity) {
                e = e.transform(compressor);
            }
            if (e instanceof AST_Binary && (self.operator == "+" || self.operator == "-") && (e.operator == "*" || e.operator == "/" || e.operator == "%")) {
                return make_node(AST_Binary, self, {
                    operator: e.operator,
                    left: make_node(AST_UnaryPrefix, e.left, {
                        operator: self.operator,
                        expression: e.left
                    }),
                    right: e.right
                });
            }
            if (self.operator != "-" || !(e instanceof AST_Number || e instanceof AST_Infinity)) {
                var ev = self.evaluate(compressor);
                if (ev !== self) {
                    ev = make_node_from_constant(ev, self).optimize(compressor);
                    return best_of(compressor, ev, self);
                }
            }
            return self;
        });
        AST_Binary.DEFMETHOD("lift_sequences", function(compressor) {
            if (compressor.option("sequences")) {
                if (this.left instanceof AST_Sequence) {
                    var x = this.left.expressions.slice();
                    var e = this.clone();
                    e.left = x.pop();
                    x.push(e);
                    return make_sequence(this, x).optimize(compressor);
                }
                if (this.right instanceof AST_Sequence && !this.left.has_side_effects(compressor)) {
                    var assign = this.operator == "=" && this.left instanceof AST_SymbolRef;
                    var x = this.right.expressions;
                    var last = x.length - 1;
                    for (var i = 0; i < last; i++) {
                        if (!assign && x[i].has_side_effects(compressor)) break;
                    }
                    if (i == last) {
                        x = x.slice();
                        var e = this.clone();
                        e.right = x.pop();
                        x.push(e);
                        return make_sequence(this, x).optimize(compressor);
                    } else if (i > 0) {
                        var e = this.clone();
                        e.right = make_sequence(this.right, x.slice(i));
                        x = x.slice(0, i);
                        x.push(e);
                        return make_sequence(this, x).optimize(compressor);
                    }
                }
            }
            return this;
        });
        var commutativeOperators = makePredicate("== === != !== * & | ^");
        function is_object(node) {
            return node instanceof AST_Array || node instanceof AST_Lambda || node instanceof AST_Object;
        }
        OPT(AST_Binary, function(self, compressor) {
            function reversible() {
                return self.left.is_constant() || self.right.is_constant() || !self.left.has_side_effects(compressor) && !self.right.has_side_effects(compressor);
            }
            function reverse(op) {
                if (reversible()) {
                    if (op) self.operator = op;
                    var tmp = self.left;
                    self.left = self.right;
                    self.right = tmp;
                }
            }
            if (commutativeOperators(self.operator)) {
                if (self.right.is_constant() && !self.left.is_constant()) {
                    if (!(self.left instanceof AST_Binary && PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator])) {
                        reverse();
                    }
                }
            }
            self = self.lift_sequences(compressor);
            if (compressor.option("comparisons")) switch (self.operator) {
              case "===":
              case "!==":
                var is_strict_comparison = true;
                if (self.left.is_string(compressor) && self.right.is_string(compressor) || self.left.is_number(compressor) && self.right.is_number(compressor) || self.left.is_boolean() && self.right.is_boolean() || self.left.equivalent_to(self.right)) {
                    self.operator = self.operator.substr(0, 2);
                }

              case "==":
              case "!=":
                if (!is_strict_comparison && is_undefined(self.left, compressor)) {
                    self.left = make_node(AST_Null, self.left);
                } else if (compressor.option("typeofs") && self.left instanceof AST_String && self.left.value == "undefined" && self.right instanceof AST_UnaryPrefix && self.right.operator == "typeof") {
                    var expr = self.right.expression;
                    if (expr instanceof AST_SymbolRef ? expr.is_declared(compressor) : !(expr instanceof AST_PropAccess && compressor.option("ie8"))) {
                        self.right = expr;
                        self.left = make_node(AST_Undefined, self.left).optimize(compressor);
                        if (self.operator.length == 2) self.operator += "=";
                    }
                } else if (self.left instanceof AST_SymbolRef && self.right instanceof AST_SymbolRef && self.left.definition() === self.right.definition() && is_object(self.left.fixed_value())) {
                    return make_node(self.operator[0] == "=" ? AST_True : AST_False, self);
                }
                break;

              case "&&":
              case "||":
                var lhs = self.left;
                if (lhs.operator == self.operator) {
                    lhs = lhs.right;
                }
                if (lhs instanceof AST_Binary && lhs.operator == (self.operator == "&&" ? "!==" : "===") && self.right instanceof AST_Binary && lhs.operator == self.right.operator && (is_undefined(lhs.left, compressor) && self.right.left instanceof AST_Null || lhs.left instanceof AST_Null && is_undefined(self.right.left, compressor)) && !lhs.right.has_side_effects(compressor) && lhs.right.equivalent_to(self.right.right)) {
                    var combined = make_node(AST_Binary, self, {
                        operator: lhs.operator.slice(0, -1),
                        left: make_node(AST_Null, self),
                        right: lhs.right
                    });
                    if (lhs !== self.left) {
                        combined = make_node(AST_Binary, self, {
                            operator: self.operator,
                            left: self.left.left,
                            right: combined
                        });
                    }
                    return combined;
                }
                break;
            }
            if (compressor.option("booleans") && self.operator == "+" && compressor.in_boolean_context()) {
                var ll = self.left.evaluate(compressor);
                var rr = self.right.evaluate(compressor);
                if (ll && typeof ll == "string") {
                    compressor.warn("+ in boolean context always true [{file}:{line},{col}]", self.start);
                    return make_sequence(self, [ self.right, make_node(AST_True, self) ]).optimize(compressor);
                }
                if (rr && typeof rr == "string") {
                    compressor.warn("+ in boolean context always true [{file}:{line},{col}]", self.start);
                    return make_sequence(self, [ self.left, make_node(AST_True, self) ]).optimize(compressor);
                }
            }
            if (compressor.option("comparisons") && self.is_boolean()) {
                if (!(compressor.parent() instanceof AST_Binary) || compressor.parent() instanceof AST_Assign) {
                    var negated = make_node(AST_UnaryPrefix, self, {
                        operator: "!",
                        expression: self.negate(compressor, first_in_statement(compressor))
                    });
                    self = best_of(compressor, self, negated);
                }
                switch (self.operator) {
                  case ">":
                    reverse("<");
                    break;

                  case ">=":
                    reverse("<=");
                    break;
                }
            }
            if (self.operator == "+") {
                if (self.right instanceof AST_String && self.right.getValue() == "" && self.left.is_string(compressor)) {
                    return self.left;
                }
                if (self.left instanceof AST_String && self.left.getValue() == "" && self.right.is_string(compressor)) {
                    return self.right;
                }
                if (self.left instanceof AST_Binary && self.left.operator == "+" && self.left.left instanceof AST_String && self.left.left.getValue() == "" && self.right.is_string(compressor)) {
                    self.left = self.left.right;
                    return self.transform(compressor);
                }
            }
            if (compressor.option("evaluate")) {
                switch (self.operator) {
                  case "&&":
                    var ll = fuzzy_eval(self.left);
                    if (!ll) {
                        compressor.warn("Condition left of && always false [{file}:{line},{col}]", self.start);
                        return maintain_this_binding(compressor.parent(), compressor.self(), self.left).optimize(compressor);
                    } else if (!(ll instanceof AST_Node)) {
                        compressor.warn("Condition left of && always true [{file}:{line},{col}]", self.start);
                        return make_sequence(self, [ self.left, self.right ]).optimize(compressor);
                    }
                    var rr = self.right.evaluate(compressor);
                    if (!rr) {
                        if (compressor.option("booleans") && compressor.in_boolean_context()) {
                            compressor.warn("Boolean && always false [{file}:{line},{col}]", self.start);
                            return make_sequence(self, [ self.left, make_node(AST_False, self) ]).optimize(compressor);
                        } else self.falsy = true;
                    } else if (!(rr instanceof AST_Node)) {
                        var parent = compressor.parent();
                        if (parent.operator == "&&" && parent.left === compressor.self() || compressor.option("booleans") && compressor.in_boolean_context()) {
                            compressor.warn("Dropping side-effect-free && [{file}:{line},{col}]", self.start);
                            return self.left.optimize(compressor);
                        }
                    }
                    if (self.left.operator == "||") {
                        var lr = self.left.right.evaluate(compressor);
                        if (!lr) return make_node(AST_Conditional, self, {
                            condition: self.left.left,
                            consequent: self.right,
                            alternative: self.left.right
                        }).optimize(compressor);
                    }
                    break;

                  case "||":
                    var ll = fuzzy_eval(self.left);
                    if (!ll) {
                        compressor.warn("Condition left of || always false [{file}:{line},{col}]", self.start);
                        return make_sequence(self, [ self.left, self.right ]).optimize(compressor);
                    } else if (!(ll instanceof AST_Node)) {
                        compressor.warn("Condition left of || always true [{file}:{line},{col}]", self.start);
                        return maintain_this_binding(compressor.parent(), compressor.self(), self.left).optimize(compressor);
                    }
                    var rr = self.right.evaluate(compressor);
                    if (!rr) {
                        var parent = compressor.parent();
                        if (parent.operator == "||" && parent.left === compressor.self() || compressor.option("booleans") && compressor.in_boolean_context()) {
                            compressor.warn("Dropping side-effect-free || [{file}:{line},{col}]", self.start);
                            return self.left.optimize(compressor);
                        }
                    } else if (!(rr instanceof AST_Node)) {
                        if (compressor.option("booleans") && compressor.in_boolean_context()) {
                            compressor.warn("Boolean || always true [{file}:{line},{col}]", self.start);
                            return make_sequence(self, [ self.left, make_node(AST_True, self) ]).optimize(compressor);
                        } else self.truthy = true;
                    }
                    if (self.left.operator == "&&") {
                        var lr = self.left.right.evaluate(compressor);
                        if (lr && !(lr instanceof AST_Node)) return make_node(AST_Conditional, self, {
                            condition: self.left.left,
                            consequent: self.left.right,
                            alternative: self.right
                        }).optimize(compressor);
                    }
                    break;
                }
                var associative = true;
                switch (self.operator) {
                  case "+":
                    if (self.left instanceof AST_Constant && self.right instanceof AST_Binary && self.right.operator == "+" && self.right.left instanceof AST_Constant && self.right.is_string(compressor)) {
                        self = make_node(AST_Binary, self, {
                            operator: "+",
                            left: make_node(AST_String, self.left, {
                                value: "" + self.left.getValue() + self.right.left.getValue(),
                                start: self.left.start,
                                end: self.right.left.end
                            }),
                            right: self.right.right
                        });
                    }
                    if (self.right instanceof AST_Constant && self.left instanceof AST_Binary && self.left.operator == "+" && self.left.right instanceof AST_Constant && self.left.is_string(compressor)) {
                        self = make_node(AST_Binary, self, {
                            operator: "+",
                            left: self.left.left,
                            right: make_node(AST_String, self.right, {
                                value: "" + self.left.right.getValue() + self.right.getValue(),
                                start: self.left.right.start,
                                end: self.right.end
                            })
                        });
                    }
                    if (self.left instanceof AST_Binary && self.left.operator == "+" && self.left.is_string(compressor) && self.left.right instanceof AST_Constant && self.right instanceof AST_Binary && self.right.operator == "+" && self.right.left instanceof AST_Constant && self.right.is_string(compressor)) {
                        self = make_node(AST_Binary, self, {
                            operator: "+",
                            left: make_node(AST_Binary, self.left, {
                                operator: "+",
                                left: self.left.left,
                                right: make_node(AST_String, self.left.right, {
                                    value: "" + self.left.right.getValue() + self.right.left.getValue(),
                                    start: self.left.right.start,
                                    end: self.right.left.end
                                })
                            }),
                            right: self.right.right
                        });
                    }
                    if (self.right instanceof AST_UnaryPrefix && self.right.operator == "-" && self.left.is_number(compressor)) {
                        self = make_node(AST_Binary, self, {
                            operator: "-",
                            left: self.left,
                            right: self.right.expression
                        });
                        break;
                    }
                    if (self.left instanceof AST_UnaryPrefix && self.left.operator == "-" && reversible() && self.right.is_number(compressor)) {
                        self = make_node(AST_Binary, self, {
                            operator: "-",
                            left: self.right,
                            right: self.left.expression
                        });
                        break;
                    }

                  case "*":
                    associative = compressor.option("unsafe_math");

                  case "&":
                  case "|":
                  case "^":
                    if (self.left.is_number(compressor) && self.right.is_number(compressor) && reversible() && !(self.left instanceof AST_Binary && self.left.operator != self.operator && PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator])) {
                        var reversed = make_node(AST_Binary, self, {
                            operator: self.operator,
                            left: self.right,
                            right: self.left
                        });
                        if (self.right instanceof AST_Constant && !(self.left instanceof AST_Constant)) {
                            self = best_of(compressor, reversed, self);
                        } else {
                            self = best_of(compressor, self, reversed);
                        }
                    }
                    if (associative && self.is_number(compressor)) {
                        if (self.right instanceof AST_Binary && self.right.operator == self.operator) {
                            self = make_node(AST_Binary, self, {
                                operator: self.operator,
                                left: make_node(AST_Binary, self.left, {
                                    operator: self.operator,
                                    left: self.left,
                                    right: self.right.left,
                                    start: self.left.start,
                                    end: self.right.left.end
                                }),
                                right: self.right.right
                            });
                        }
                        if (self.right instanceof AST_Constant && self.left instanceof AST_Binary && self.left.operator == self.operator) {
                            if (self.left.left instanceof AST_Constant) {
                                self = make_node(AST_Binary, self, {
                                    operator: self.operator,
                                    left: make_node(AST_Binary, self.left, {
                                        operator: self.operator,
                                        left: self.left.left,
                                        right: self.right,
                                        start: self.left.left.start,
                                        end: self.right.end
                                    }),
                                    right: self.left.right
                                });
                            } else if (self.left.right instanceof AST_Constant) {
                                self = make_node(AST_Binary, self, {
                                    operator: self.operator,
                                    left: make_node(AST_Binary, self.left, {
                                        operator: self.operator,
                                        left: self.left.right,
                                        right: self.right,
                                        start: self.left.right.start,
                                        end: self.right.end
                                    }),
                                    right: self.left.left
                                });
                            }
                        }
                        if (self.left instanceof AST_Binary && self.left.operator == self.operator && self.left.right instanceof AST_Constant && self.right instanceof AST_Binary && self.right.operator == self.operator && self.right.left instanceof AST_Constant) {
                            self = make_node(AST_Binary, self, {
                                operator: self.operator,
                                left: make_node(AST_Binary, self.left, {
                                    operator: self.operator,
                                    left: make_node(AST_Binary, self.left.left, {
                                        operator: self.operator,
                                        left: self.left.right,
                                        right: self.right.left,
                                        start: self.left.right.start,
                                        end: self.right.left.end
                                    }),
                                    right: self.left.left
                                }),
                                right: self.right.right
                            });
                        }
                    }
                }
            }
            if (self.right instanceof AST_Binary && self.right.operator == self.operator && (lazy_op(self.operator) || self.operator == "+" && (self.right.left.is_string(compressor) || self.left.is_string(compressor) && self.right.right.is_string(compressor)))) {
                self.left = make_node(AST_Binary, self.left, {
                    operator: self.operator,
                    left: self.left,
                    right: self.right.left
                });
                self.right = self.right.right;
                return self.transform(compressor);
            }
            var ev = self.evaluate(compressor);
            if (ev !== self) {
                ev = make_node_from_constant(ev, self).optimize(compressor);
                return best_of(compressor, ev, self);
            }
            return self;
            function fuzzy_eval(node) {
                if (node.truthy) return true;
                if (node.falsy) return false;
                if (node.is_truthy()) return true;
                return node.evaluate(compressor);
            }
        });
        function recursive_ref(compressor, def) {
            var node;
            for (var i = 0; node = compressor.parent(i); i++) {
                if (node instanceof AST_Lambda) {
                    var name = node.name;
                    if (name && name.definition() === def) break;
                }
            }
            return node;
        }
        OPT(AST_SymbolRef, function(self, compressor) {
            var def = self.resolve_defines(compressor);
            if (def) {
                return def.optimize(compressor);
            }
            if (!compressor.option("ie8") && is_undeclared_ref(self) && (!self.scope.uses_with || !compressor.find_parent(AST_With))) {
                switch (self.name) {
                  case "undefined":
                    return make_node(AST_Undefined, self).optimize(compressor);

                  case "NaN":
                    return make_node(AST_NaN, self).optimize(compressor);

                  case "Infinity":
                    return make_node(AST_Infinity, self).optimize(compressor);
                }
            }
            if (compressor.option("reduce_vars") && is_lhs(self, compressor.parent()) !== self) {
                var d = self.definition();
                var fixed = self.fixed_value();
                var single_use = d.single_use;
                if (single_use && fixed instanceof AST_Lambda) {
                    if (d.scope !== self.scope && (!compressor.option("reduce_funcs") || d.escaped == 1 || fixed.inlined)) {
                        single_use = false;
                    } else if (recursive_ref(compressor, d)) {
                        single_use = false;
                    } else if (d.scope !== self.scope || d.orig[0] instanceof AST_SymbolFunarg) {
                        single_use = fixed.is_constant_expression(self.scope);
                        if (single_use == "f") {
                            var scope = self.scope;
                            do {
                                if (scope instanceof AST_Defun || scope instanceof AST_Function) {
                                    scope.inlined = true;
                                }
                            } while (scope = scope.parent_scope);
                        }
                    }
                }
                if (single_use && fixed) {
                    if (fixed instanceof AST_Defun) {
                        fixed._squeezed = true;
                        fixed = make_node(AST_Function, fixed, fixed);
                    }
                    var value;
                    if (d.recursive_refs > 0 && fixed.name instanceof AST_SymbolDefun) {
                        value = fixed.clone(true);
                        var defun_def = value.name.definition();
                        var lambda_def = value.variables.get(value.name.name);
                        var name = lambda_def && lambda_def.orig[0];
                        if (!(name instanceof AST_SymbolLambda)) {
                            name = make_node(AST_SymbolLambda, value.name, value.name);
                            name.scope = value;
                            value.name = name;
                            lambda_def = value.def_function(name);
                        }
                        value.walk(new TreeWalker(function(node) {
                            if (node instanceof AST_SymbolRef && node.definition() === defun_def) {
                                node.thedef = lambda_def;
                                lambda_def.references.push(node);
                            }
                        }));
                    } else {
                        value = fixed.optimize(compressor);
                        if (value === fixed) value = fixed.clone(true);
                    }
                    return value;
                }
                if (fixed && d.should_replace === undefined) {
                    var init;
                    if (fixed instanceof AST_This) {
                        if (!(d.orig[0] instanceof AST_SymbolFunarg) && all(d.references, function(ref) {
                            return d.scope === ref.scope;
                        })) {
                            init = fixed;
                        }
                    } else {
                        var ev = fixed.evaluate(compressor);
                        if (ev !== fixed && (compressor.option("unsafe_regexp") || !(ev instanceof RegExp))) {
                            init = make_node_from_constant(ev, fixed);
                        }
                    }
                    if (init) {
                        var value_length = init.optimize(compressor).print_to_string().length;
                        var fn;
                        if (has_symbol_ref(fixed)) {
                            fn = function() {
                                var result = init.optimize(compressor);
                                return result === init ? result.clone(true) : result;
                            };
                        } else {
                            value_length = Math.min(value_length, fixed.print_to_string().length);
                            fn = function() {
                                var result = best_of_expression(init.optimize(compressor), fixed);
                                return result === init || result === fixed ? result.clone(true) : result;
                            };
                        }
                        var name_length = d.name.length;
                        var overhead = 0;
                        if (compressor.option("unused") && !compressor.exposed(d)) {
                            overhead = (name_length + 2 + value_length) / (d.references.length - d.assignments);
                        }
                        d.should_replace = value_length <= name_length + overhead ? fn : false;
                    } else {
                        d.should_replace = false;
                    }
                }
                if (d.should_replace) {
                    return d.should_replace();
                }
            }
            return self;
            function has_symbol_ref(value) {
                var found;
                value.walk(new TreeWalker(function(node) {
                    if (node instanceof AST_SymbolRef) found = true;
                    if (found) return true;
                }));
                return found;
            }
        });
        function is_atomic(lhs, self) {
            return lhs instanceof AST_SymbolRef || lhs.TYPE === self.TYPE;
        }
        OPT(AST_Undefined, function(self, compressor) {
            if (compressor.option("unsafe_undefined")) {
                var undef = find_variable(compressor, "undefined");
                if (undef) {
                    var ref = make_node(AST_SymbolRef, self, {
                        name: "undefined",
                        scope: undef.scope,
                        thedef: undef
                    });
                    ref.is_undefined = true;
                    return ref;
                }
            }
            var lhs = is_lhs(compressor.self(), compressor.parent());
            if (lhs && is_atomic(lhs, self)) return self;
            return make_node(AST_UnaryPrefix, self, {
                operator: "void",
                expression: make_node(AST_Number, self, {
                    value: 0
                })
            });
        });
        OPT(AST_Infinity, function(self, compressor) {
            var lhs = is_lhs(compressor.self(), compressor.parent());
            if (lhs && is_atomic(lhs, self)) return self;
            if (compressor.option("keep_infinity") && !(lhs && !is_atomic(lhs, self)) && !find_variable(compressor, "Infinity")) return self;
            return make_node(AST_Binary, self, {
                operator: "/",
                left: make_node(AST_Number, self, {
                    value: 1
                }),
                right: make_node(AST_Number, self, {
                    value: 0
                })
            });
        });
        OPT(AST_NaN, function(self, compressor) {
            var lhs = is_lhs(compressor.self(), compressor.parent());
            if (lhs && !is_atomic(lhs, self) || find_variable(compressor, "NaN")) {
                return make_node(AST_Binary, self, {
                    operator: "/",
                    left: make_node(AST_Number, self, {
                        value: 0
                    }),
                    right: make_node(AST_Number, self, {
                        value: 0
                    })
                });
            }
            return self;
        });
        function is_reachable(self, defs) {
            var reachable = false;
            var find_ref = new TreeWalker(function(node) {
                if (reachable) return true;
                if (node instanceof AST_SymbolRef && member(node.definition(), defs)) {
                    return reachable = true;
                }
            });
            var scan_scope = new TreeWalker(function(node) {
                if (reachable) return true;
                if (node instanceof AST_Scope && node !== self) {
                    var parent = scan_scope.parent();
                    if (parent instanceof AST_Call && parent.expression === node) return;
                    node.walk(find_ref);
                    return true;
                }
            });
            self.walk(scan_scope);
            return reachable;
        }
        var ASSIGN_OPS = [ "+", "-", "/", "*", "%", ">>", "<<", ">>>", "|", "^", "&" ];
        var ASSIGN_OPS_COMMUTATIVE = [ "*", "|", "^", "&" ];
        OPT(AST_Assign, function(self, compressor) {
            var def;
            if (compressor.option("dead_code") && self.left instanceof AST_SymbolRef && (def = self.left.definition()).scope === compressor.find_parent(AST_Lambda)) {
                var level = 0, node, parent = self;
                do {
                    node = parent;
                    parent = compressor.parent(level++);
                    if (parent instanceof AST_Exit) {
                        if (in_try(level, parent)) break;
                        if (is_reachable(def.scope, [ def ])) break;
                        if (self.operator == "=") return self.right;
                        def.fixed = false;
                        return make_node(AST_Binary, self, {
                            operator: self.operator.slice(0, -1),
                            left: self.left,
                            right: self.right
                        }).optimize(compressor);
                    }
                } while (parent instanceof AST_Binary && parent.right === node || parent instanceof AST_Sequence && parent.tail_node() === node);
            }
            self = self.lift_sequences(compressor);
            if (self.operator == "=" && self.left instanceof AST_SymbolRef && self.right instanceof AST_Binary) {
                if (self.right.left instanceof AST_SymbolRef && self.right.left.name == self.left.name && member(self.right.operator, ASSIGN_OPS)) {
                    self.operator = self.right.operator + "=";
                    self.right = self.right.right;
                } else if (self.right.right instanceof AST_SymbolRef && self.right.right.name == self.left.name && member(self.right.operator, ASSIGN_OPS_COMMUTATIVE) && !self.right.left.has_side_effects(compressor)) {
                    self.operator = self.right.operator + "=";
                    self.right = self.right.left;
                }
            }
            return self;
            function in_try(level, node) {
                var right = self.right;
                self.right = make_node(AST_Null, right);
                var may_throw = node.may_throw(compressor);
                self.right = right;
                var scope = self.left.definition().scope;
                var parent;
                while ((parent = compressor.parent(level++)) !== scope) {
                    if (parent instanceof AST_Try) {
                        if (parent.bfinally) return true;
                        if (may_throw && parent.bcatch) return true;
                    }
                }
            }
        });
        OPT(AST_Conditional, function(self, compressor) {
            if (!compressor.option("conditionals")) return self;
            if (self.condition instanceof AST_Sequence) {
                var expressions = self.condition.expressions.slice();
                self.condition = expressions.pop();
                expressions.push(self);
                return make_sequence(self, expressions);
            }
            var cond = self.condition.is_truthy() || self.condition.tail_node().evaluate(compressor);
            if (!cond) {
                compressor.warn("Condition always false [{file}:{line},{col}]", self.start);
                return make_sequence(self, [ self.condition, self.alternative ]).optimize(compressor);
            } else if (!(cond instanceof AST_Node)) {
                compressor.warn("Condition always true [{file}:{line},{col}]", self.start);
                return make_sequence(self, [ self.condition, self.consequent ]).optimize(compressor);
            }
            var negated = cond.negate(compressor, first_in_statement(compressor));
            if (best_of(compressor, cond, negated) === negated) {
                self = make_node(AST_Conditional, self, {
                    condition: negated,
                    consequent: self.alternative,
                    alternative: self.consequent
                });
            }
            var condition = self.condition;
            var consequent = self.consequent;
            var alternative = self.alternative;
            if (condition instanceof AST_SymbolRef && consequent instanceof AST_SymbolRef && condition.definition() === consequent.definition()) {
                return make_node(AST_Binary, self, {
                    operator: "||",
                    left: condition,
                    right: alternative
                });
            }
            if (consequent instanceof AST_Assign && alternative instanceof AST_Assign && consequent.operator == alternative.operator && consequent.left.equivalent_to(alternative.left) && (!self.condition.has_side_effects(compressor) || consequent.operator == "=" && !consequent.left.has_side_effects(compressor))) {
                return make_node(AST_Assign, self, {
                    operator: consequent.operator,
                    left: consequent.left,
                    right: make_node(AST_Conditional, self, {
                        condition: self.condition,
                        consequent: consequent.right,
                        alternative: alternative.right
                    })
                });
            }
            var arg_index;
            if (consequent instanceof AST_Call && alternative.TYPE === consequent.TYPE && consequent.args.length > 0 && consequent.args.length == alternative.args.length && consequent.expression.equivalent_to(alternative.expression) && !self.condition.has_side_effects(compressor) && !consequent.expression.has_side_effects(compressor) && typeof (arg_index = single_arg_diff()) == "number") {
                var node = consequent.clone();
                node.args[arg_index] = make_node(AST_Conditional, self, {
                    condition: self.condition,
                    consequent: consequent.args[arg_index],
                    alternative: alternative.args[arg_index]
                });
                return node;
            }
            if (consequent instanceof AST_Conditional && consequent.alternative.equivalent_to(alternative)) {
                return make_node(AST_Conditional, self, {
                    condition: make_node(AST_Binary, self, {
                        left: self.condition,
                        operator: "&&",
                        right: consequent.condition
                    }),
                    consequent: consequent.consequent,
                    alternative: alternative
                });
            }
            if (consequent.equivalent_to(alternative)) {
                return make_sequence(self, [ self.condition, consequent ]).optimize(compressor);
            }
            if ((consequent instanceof AST_Sequence || alternative instanceof AST_Sequence) && consequent.tail_node().equivalent_to(alternative.tail_node())) {
                return make_sequence(self, [ make_node(AST_Conditional, self, {
                    condition: self.condition,
                    consequent: pop_seq(consequent),
                    alternative: pop_seq(alternative)
                }), consequent.tail_node() ]).optimize(compressor);
            }
            if (consequent instanceof AST_Binary && consequent.operator == "||" && consequent.right.equivalent_to(alternative)) {
                return make_node(AST_Binary, self, {
                    operator: "||",
                    left: make_node(AST_Binary, self, {
                        operator: "&&",
                        left: self.condition,
                        right: consequent.left
                    }),
                    right: alternative
                }).optimize(compressor);
            }
            var in_bool = compressor.option("booleans") && compressor.in_boolean_context();
            if (is_true(self.consequent)) {
                if (is_false(self.alternative)) {
                    return booleanize(self.condition);
                }
                return make_node(AST_Binary, self, {
                    operator: "||",
                    left: booleanize(self.condition),
                    right: self.alternative
                });
            }
            if (is_false(self.consequent)) {
                if (is_true(self.alternative)) {
                    return booleanize(self.condition.negate(compressor));
                }
                return make_node(AST_Binary, self, {
                    operator: "&&",
                    left: booleanize(self.condition.negate(compressor)),
                    right: self.alternative
                });
            }
            if (is_true(self.alternative)) {
                return make_node(AST_Binary, self, {
                    operator: "||",
                    left: booleanize(self.condition.negate(compressor)),
                    right: self.consequent
                });
            }
            if (is_false(self.alternative)) {
                return make_node(AST_Binary, self, {
                    operator: "&&",
                    left: booleanize(self.condition),
                    right: self.consequent
                });
            }
            return self;
            function booleanize(node) {
                if (node.is_boolean()) return node;
                return make_node(AST_UnaryPrefix, node, {
                    operator: "!",
                    expression: node.negate(compressor)
                });
            }
            function is_true(node) {
                return node instanceof AST_True || in_bool && node instanceof AST_Constant && node.getValue() || node instanceof AST_UnaryPrefix && node.operator == "!" && node.expression instanceof AST_Constant && !node.expression.getValue();
            }
            function is_false(node) {
                return node instanceof AST_False || in_bool && node instanceof AST_Constant && !node.getValue() || node instanceof AST_UnaryPrefix && node.operator == "!" && node.expression instanceof AST_Constant && node.expression.getValue();
            }
            function single_arg_diff() {
                var a = consequent.args;
                var b = alternative.args;
                for (var i = 0, len = a.length; i < len; i++) {
                    if (!a[i].equivalent_to(b[i])) {
                        for (var j = i + 1; j < len; j++) {
                            if (!a[j].equivalent_to(b[j])) return;
                        }
                        return i;
                    }
                }
            }
            function pop_seq(node) {
                if (!(node instanceof AST_Sequence)) return make_node(AST_Number, node, {
                    value: 0
                });
                return make_sequence(node, node.expressions.slice(0, -1));
            }
        });
        OPT(AST_Boolean, function(self, compressor) {
            if (!compressor.option("booleans")) return self;
            if (compressor.in_boolean_context()) return make_node(AST_Number, self, {
                value: +self.value
            });
            var p = compressor.parent();
            if (p instanceof AST_Binary && (p.operator == "==" || p.operator == "!=")) {
                compressor.warn("Non-strict equality against boolean: {operator} {value} [{file}:{line},{col}]", {
                    operator: p.operator,
                    value: self.value,
                    file: p.start.file,
                    line: p.start.line,
                    col: p.start.col
                });
                return make_node(AST_Number, self, {
                    value: +self.value
                });
            }
            return make_node(AST_UnaryPrefix, self, {
                operator: "!",
                expression: make_node(AST_Number, self, {
                    value: 1 - self.value
                })
            });
        });
        OPT(AST_Sub, function(self, compressor) {
            var expr = self.expression;
            var prop = self.property;
            if (compressor.option("properties")) {
                var key = prop.evaluate(compressor);
                if (key !== prop) {
                    if (typeof key == "string") {
                        if (key == "undefined") {
                            key = undefined;
                        } else {
                            var value = parseFloat(key);
                            if (value.toString() == key) {
                                key = value;
                            }
                        }
                    }
                    prop = self.property = best_of_expression(prop, make_node_from_constant(key, prop).transform(compressor));
                    var property = "" + key;
                    if (is_identifier_string(property) && property.length <= prop.print_to_string().length + 1) {
                        return make_node(AST_Dot, self, {
                            expression: expr,
                            property: property
                        }).optimize(compressor);
                    }
                }
            }
            if (is_lhs(self, compressor.parent())) return self;
            if (key !== prop) {
                var sub = self.flatten_object(property, compressor);
                if (sub) {
                    expr = self.expression = sub.expression;
                    prop = self.property = sub.property;
                }
            }
            if (compressor.option("properties") && compressor.option("side_effects") && prop instanceof AST_Number && expr instanceof AST_Array) {
                var index = prop.getValue();
                var elements = expr.elements;
                if (index in elements) {
                    var flatten = true;
                    var values = [];
                    for (var i = elements.length; --i > index; ) {
                        var value = elements[i].drop_side_effect_free(compressor);
                        if (value) {
                            values.unshift(value);
                            if (flatten && value.has_side_effects(compressor)) flatten = false;
                        }
                    }
                    var retValue = elements[index];
                    retValue = retValue instanceof AST_Hole ? make_node(AST_Undefined, retValue) : retValue;
                    if (!flatten) values.unshift(retValue);
                    while (--i >= 0) {
                        var value = elements[i].drop_side_effect_free(compressor);
                        if (value) values.unshift(value); else index--;
                    }
                    if (flatten) {
                        values.push(retValue);
                        return make_sequence(self, values).optimize(compressor);
                    } else return make_node(AST_Sub, self, {
                        expression: make_node(AST_Array, expr, {
                            elements: values
                        }),
                        property: make_node(AST_Number, prop, {
                            value: index
                        })
                    });
                }
            }
            var fn;
            if (compressor.option("arguments") && expr instanceof AST_SymbolRef && expr.name == "arguments" && expr.definition().orig.length == 1 && (fn = expr.scope) instanceof AST_Lambda && prop instanceof AST_Number) {
                var index = prop.getValue();
                var argname = fn.argnames[index];
                if (!argname && !compressor.option("keep_fargs")) {
                    while (index >= fn.argnames.length) {
                        argname = make_node(AST_SymbolFunarg, fn, {
                            name: fn.make_var_name("argument_" + fn.argnames.length),
                            scope: fn
                        });
                        fn.argnames.push(argname);
                        fn.enclosed.push(fn.def_variable(argname));
                    }
                }
                if (argname) {
                    var sym = make_node(AST_SymbolRef, self, argname);
                    sym.reference({});
                    return sym;
                }
            }
            var ev = self.evaluate(compressor);
            if (ev !== self) {
                ev = make_node_from_constant(ev, self).optimize(compressor);
                return best_of(compressor, ev, self);
            }
            return self;
        });
        AST_Lambda.DEFMETHOD("contains_this", function() {
            var result;
            var self = this;
            self.walk(new TreeWalker(function(node) {
                if (result) return true;
                if (node instanceof AST_This) return result = true;
                if (node !== self && node instanceof AST_Scope) return true;
            }));
            return result;
        });
        AST_PropAccess.DEFMETHOD("flatten_object", function(key, compressor) {
            if (!compressor.option("properties")) return;
            var expr = this.expression;
            if (expr instanceof AST_Object) {
                var props = expr.properties;
                for (var i = props.length; --i >= 0; ) {
                    var prop = props[i];
                    if ("" + prop.key == key) {
                        if (!all(props, function(prop) {
                            return prop instanceof AST_ObjectKeyVal;
                        })) break;
                        var value = prop.value;
                        if (value instanceof AST_Function && !(compressor.parent() instanceof AST_New) && value.contains_this()) break;
                        return make_node(AST_Sub, this, {
                            expression: make_node(AST_Array, expr, {
                                elements: props.map(function(prop) {
                                    return prop.value;
                                })
                            }),
                            property: make_node(AST_Number, this, {
                                value: i
                            })
                        });
                    }
                }
            }
        });
        OPT(AST_Dot, function(self, compressor) {
            if (self.property == "arguments" || self.property == "caller") {
                compressor.warn("Function.protoype.{prop} not supported [{file}:{line},{col}]", {
                    prop: self.property,
                    file: self.start.file,
                    line: self.start.line,
                    col: self.start.col
                });
            }
            var def = self.resolve_defines(compressor);
            if (def) {
                return def.optimize(compressor);
            }
            if (is_lhs(self, compressor.parent())) return self;
            if (compressor.option("unsafe_proto") && self.expression instanceof AST_Dot && self.expression.property == "prototype") {
                var exp = self.expression.expression;
                if (is_undeclared_ref(exp)) switch (exp.name) {
                  case "Array":
                    self.expression = make_node(AST_Array, self.expression, {
                        elements: []
                    });
                    break;

                  case "Function":
                    self.expression = make_node(AST_Function, self.expression, {
                        argnames: [],
                        body: []
                    });
                    break;

                  case "Number":
                    self.expression = make_node(AST_Number, self.expression, {
                        value: 0
                    });
                    break;

                  case "Object":
                    self.expression = make_node(AST_Object, self.expression, {
                        properties: []
                    });
                    break;

                  case "RegExp":
                    self.expression = make_node(AST_RegExp, self.expression, {
                        value: /t/
                    });
                    break;

                  case "String":
                    self.expression = make_node(AST_String, self.expression, {
                        value: ""
                    });
                    break;
                }
            }
            var sub = self.flatten_object(self.property, compressor);
            if (sub) return sub.optimize(compressor);
            var ev = self.evaluate(compressor);
            if (ev !== self) {
                ev = make_node_from_constant(ev, self).optimize(compressor);
                return best_of(compressor, ev, self);
            }
            return self;
        });
        OPT(AST_Return, function(self, compressor) {
            if (self.value && is_undefined(self.value, compressor)) {
                self.value = null;
            }
            return self;
        });
        OPT(AST_VarDef, function(self, compressor) {
            var defines = compressor.option("global_defs");
            if (defines && HOP(defines, self.name.name)) {
                compressor.warn("global_defs " + self.name.name + " redefined [{file}:{line},{col}]", self.start);
            }
            return self;
        });
    })();
    "use strict";
    function SourceMap(options) {
        options = defaults(options, {
            file: null,
            root: null,
            orig: null,
            orig_line_diff: 0,
            dest_line_diff: 0
        });
        var generator = new MOZ_SourceMap.SourceMapGenerator({
            file: options.file,
            sourceRoot: options.root
        });
        var orig_map = options.orig && new MOZ_SourceMap.SourceMapConsumer(options.orig);
        if (orig_map && Array.isArray(options.orig.sources)) {
            orig_map._sources.toArray().forEach(function(source) {
                var sourceContent = orig_map.sourceContentFor(source, true);
                if (sourceContent) {
                    generator.setSourceContent(source, sourceContent);
                }
            });
        }
        function add(source, gen_line, gen_col, orig_line, orig_col, name) {
            if (orig_map) {
                var info = orig_map.originalPositionFor({
                    line: orig_line,
                    column: orig_col
                });
                if (info.source === null) {
                    return;
                }
                source = info.source;
                orig_line = info.line;
                orig_col = info.column;
                name = info.name || name;
            }
            generator.addMapping({
                generated: {
                    line: gen_line + options.dest_line_diff,
                    column: gen_col
                },
                original: {
                    line: orig_line + options.orig_line_diff,
                    column: orig_col
                },
                source: source,
                name: name
            });
        }
        return {
            add: add,
            get: function() {
                return generator;
            },
            toString: function() {
                return JSON.stringify(generator.toJSON());
            }
        };
    }
    "use strict";
    (function() {
        var normalize_directives = function(body) {
            var in_directive = true;
            for (var i = 0; i < body.length; i++) {
                if (in_directive && body[i] instanceof AST_Statement && body[i].body instanceof AST_String) {
                    body[i] = new AST_Directive({
                        start: body[i].start,
                        end: body[i].end,
                        value: body[i].body.value
                    });
                } else if (in_directive && !(body[i] instanceof AST_Statement && body[i].body instanceof AST_String)) {
                    in_directive = false;
                }
            }
            return body;
        };
        var MOZ_TO_ME = {
            Program: function(M) {
                return new AST_Toplevel({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    body: normalize_directives(M.body.map(from_moz))
                });
            },
            FunctionDeclaration: function(M) {
                return new AST_Defun({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    name: from_moz(M.id),
                    argnames: M.params.map(from_moz),
                    body: normalize_directives(from_moz(M.body).body)
                });
            },
            FunctionExpression: function(M) {
                return new AST_Function({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    name: from_moz(M.id),
                    argnames: M.params.map(from_moz),
                    body: normalize_directives(from_moz(M.body).body)
                });
            },
            ExpressionStatement: function(M) {
                return new AST_SimpleStatement({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    body: from_moz(M.expression)
                });
            },
            TryStatement: function(M) {
                var handlers = M.handlers || [ M.handler ];
                if (handlers.length > 1 || M.guardedHandlers && M.guardedHandlers.length) {
                    throw new Error("Multiple catch clauses are not supported.");
                }
                return new AST_Try({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    body: from_moz(M.block).body,
                    bcatch: from_moz(handlers[0]),
                    bfinally: M.finalizer ? new AST_Finally(from_moz(M.finalizer)) : null
                });
            },
            Property: function(M) {
                var key = M.key;
                var args = {
                    start: my_start_token(key),
                    end: my_end_token(M.value),
                    key: key.type == "Identifier" ? key.name : key.value,
                    value: from_moz(M.value)
                };
                if (M.kind == "init") return new AST_ObjectKeyVal(args);
                args.key = new AST_SymbolAccessor({
                    name: args.key
                });
                args.value = new AST_Accessor(args.value);
                if (M.kind == "get") return new AST_ObjectGetter(args);
                if (M.kind == "set") return new AST_ObjectSetter(args);
            },
            ArrayExpression: function(M) {
                return new AST_Array({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    elements: M.elements.map(function(elem) {
                        return elem === null ? new AST_Hole() : from_moz(elem);
                    })
                });
            },
            ObjectExpression: function(M) {
                return new AST_Object({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    properties: M.properties.map(function(prop) {
                        prop.type = "Property";
                        return from_moz(prop);
                    })
                });
            },
            SequenceExpression: function(M) {
                return new AST_Sequence({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    expressions: M.expressions.map(from_moz)
                });
            },
            MemberExpression: function(M) {
                return new (M.computed ? AST_Sub : AST_Dot)({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    property: M.computed ? from_moz(M.property) : M.property.name,
                    expression: from_moz(M.object)
                });
            },
            SwitchCase: function(M) {
                return new (M.test ? AST_Case : AST_Default)({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    expression: from_moz(M.test),
                    body: M.consequent.map(from_moz)
                });
            },
            VariableDeclaration: function(M) {
                return new AST_Var({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    definitions: M.declarations.map(from_moz)
                });
            },
            Literal: function(M) {
                var val = M.value, args = {
                    start: my_start_token(M),
                    end: my_end_token(M)
                };
                if (val === null) return new AST_Null(args);
                var rx = M.regex;
                if (rx && rx.pattern) {
                    args.value = new RegExp(rx.pattern, rx.flags);
                    args.value.raw_source = rx.pattern;
                    return new AST_RegExp(args);
                } else if (rx) {
                    args.value = M.regex && M.raw ? M.raw : val;
                    return new AST_RegExp(args);
                }
                switch (typeof val) {
                  case "string":
                    args.value = val;
                    return new AST_String(args);

                  case "number":
                    args.value = val;
                    return new AST_Number(args);

                  case "boolean":
                    return new (val ? AST_True : AST_False)(args);
                }
            },
            Identifier: function(M) {
                var p = FROM_MOZ_STACK[FROM_MOZ_STACK.length - 2];
                return new (p.type == "LabeledStatement" ? AST_Label : p.type == "VariableDeclarator" && p.id === M ? AST_SymbolVar : p.type == "FunctionExpression" ? p.id === M ? AST_SymbolLambda : AST_SymbolFunarg : p.type == "FunctionDeclaration" ? p.id === M ? AST_SymbolDefun : AST_SymbolFunarg : p.type == "CatchClause" ? AST_SymbolCatch : p.type == "BreakStatement" || p.type == "ContinueStatement" ? AST_LabelRef : AST_SymbolRef)({
                    start: my_start_token(M),
                    end: my_end_token(M),
                    name: M.name
                });
            }
        };
        MOZ_TO_ME.UpdateExpression = MOZ_TO_ME.UnaryExpression = function To_Moz_Unary(M) {
            var prefix = "prefix" in M ? M.prefix : M.type == "UnaryExpression" ? true : false;
            return new (prefix ? AST_UnaryPrefix : AST_UnaryPostfix)({
                start: my_start_token(M),
                end: my_end_token(M),
                operator: M.operator,
                expression: from_moz(M.argument)
            });
        };
        map("EmptyStatement", AST_EmptyStatement);
        map("BlockStatement", AST_BlockStatement, "body@body");
        map("IfStatement", AST_If, "test>condition, consequent>body, alternate>alternative");
        map("LabeledStatement", AST_LabeledStatement, "label>label, body>body");
        map("BreakStatement", AST_Break, "label>label");
        map("ContinueStatement", AST_Continue, "label>label");
        map("WithStatement", AST_With, "object>expression, body>body");
        map("SwitchStatement", AST_Switch, "discriminant>expression, cases@body");
        map("ReturnStatement", AST_Return, "argument>value");
        map("ThrowStatement", AST_Throw, "argument>value");
        map("WhileStatement", AST_While, "test>condition, body>body");
        map("DoWhileStatement", AST_Do, "test>condition, body>body");
        map("ForStatement", AST_For, "init>init, test>condition, update>step, body>body");
        map("ForInStatement", AST_ForIn, "left>init, right>object, body>body");
        map("DebuggerStatement", AST_Debugger);
        map("VariableDeclarator", AST_VarDef, "id>name, init>value");
        map("CatchClause", AST_Catch, "param>argname, body%body");
        map("ThisExpression", AST_This);
        map("BinaryExpression", AST_Binary, "operator=operator, left>left, right>right");
        map("LogicalExpression", AST_Binary, "operator=operator, left>left, right>right");
        map("AssignmentExpression", AST_Assign, "operator=operator, left>left, right>right");
        map("ConditionalExpression", AST_Conditional, "test>condition, consequent>consequent, alternate>alternative");
        map("NewExpression", AST_New, "callee>expression, arguments@args");
        map("CallExpression", AST_Call, "callee>expression, arguments@args");
        def_to_moz(AST_Toplevel, function To_Moz_Program(M) {
            return to_moz_scope("Program", M);
        });
        def_to_moz(AST_Defun, function To_Moz_FunctionDeclaration(M) {
            return {
                type: "FunctionDeclaration",
                id: to_moz(M.name),
                params: M.argnames.map(to_moz),
                body: to_moz_scope("BlockStatement", M)
            };
        });
        def_to_moz(AST_Function, function To_Moz_FunctionExpression(M) {
            return {
                type: "FunctionExpression",
                id: to_moz(M.name),
                params: M.argnames.map(to_moz),
                body: to_moz_scope("BlockStatement", M)
            };
        });
        def_to_moz(AST_Directive, function To_Moz_Directive(M) {
            return {
                type: "ExpressionStatement",
                expression: {
                    type: "Literal",
                    value: M.value
                }
            };
        });
        def_to_moz(AST_SimpleStatement, function To_Moz_ExpressionStatement(M) {
            return {
                type: "ExpressionStatement",
                expression: to_moz(M.body)
            };
        });
        def_to_moz(AST_SwitchBranch, function To_Moz_SwitchCase(M) {
            return {
                type: "SwitchCase",
                test: to_moz(M.expression),
                consequent: M.body.map(to_moz)
            };
        });
        def_to_moz(AST_Try, function To_Moz_TryStatement(M) {
            return {
                type: "TryStatement",
                block: to_moz_block(M),
                handler: to_moz(M.bcatch),
                guardedHandlers: [],
                finalizer: to_moz(M.bfinally)
            };
        });
        def_to_moz(AST_Catch, function To_Moz_CatchClause(M) {
            return {
                type: "CatchClause",
                param: to_moz(M.argname),
                guard: null,
                body: to_moz_block(M)
            };
        });
        def_to_moz(AST_Definitions, function To_Moz_VariableDeclaration(M) {
            return {
                type: "VariableDeclaration",
                kind: "var",
                declarations: M.definitions.map(to_moz)
            };
        });
        def_to_moz(AST_Sequence, function To_Moz_SequenceExpression(M) {
            return {
                type: "SequenceExpression",
                expressions: M.expressions.map(to_moz)
            };
        });
        def_to_moz(AST_PropAccess, function To_Moz_MemberExpression(M) {
            var isComputed = M instanceof AST_Sub;
            return {
                type: "MemberExpression",
                object: to_moz(M.expression),
                computed: isComputed,
                property: isComputed ? to_moz(M.property) : {
                    type: "Identifier",
                    name: M.property
                }
            };
        });
        def_to_moz(AST_Unary, function To_Moz_Unary(M) {
            return {
                type: M.operator == "++" || M.operator == "--" ? "UpdateExpression" : "UnaryExpression",
                operator: M.operator,
                prefix: M instanceof AST_UnaryPrefix,
                argument: to_moz(M.expression)
            };
        });
        def_to_moz(AST_Binary, function To_Moz_BinaryExpression(M) {
            return {
                type: M.operator == "&&" || M.operator == "||" ? "LogicalExpression" : "BinaryExpression",
                left: to_moz(M.left),
                operator: M.operator,
                right: to_moz(M.right)
            };
        });
        def_to_moz(AST_Array, function To_Moz_ArrayExpression(M) {
            return {
                type: "ArrayExpression",
                elements: M.elements.map(to_moz)
            };
        });
        def_to_moz(AST_Object, function To_Moz_ObjectExpression(M) {
            return {
                type: "ObjectExpression",
                properties: M.properties.map(to_moz)
            };
        });
        def_to_moz(AST_ObjectProperty, function To_Moz_Property(M) {
            var key = {
                type: "Literal",
                value: M.key instanceof AST_SymbolAccessor ? M.key.name : M.key
            };
            var kind;
            if (M instanceof AST_ObjectKeyVal) {
                kind = "init";
            } else if (M instanceof AST_ObjectGetter) {
                kind = "get";
            } else if (M instanceof AST_ObjectSetter) {
                kind = "set";
            }
            return {
                type: "Property",
                kind: kind,
                key: key,
                value: to_moz(M.value)
            };
        });
        def_to_moz(AST_Symbol, function To_Moz_Identifier(M) {
            var def = M.definition();
            return {
                type: "Identifier",
                name: def ? def.mangled_name || def.name : M.name
            };
        });
        def_to_moz(AST_RegExp, function To_Moz_RegExpLiteral(M) {
            var flags = M.value.toString().match(/[gimuy]*$/)[0];
            var value = "/" + M.value.raw_source + "/" + flags;
            return {
                type: "Literal",
                value: value,
                raw: value,
                regex: {
                    pattern: M.value.raw_source,
                    flags: flags
                }
            };
        });
        def_to_moz(AST_Constant, function To_Moz_Literal(M) {
            var value = M.value;
            if (typeof value === "number" && (value < 0 || value === 0 && 1 / value < 0)) {
                return {
                    type: "UnaryExpression",
                    operator: "-",
                    prefix: true,
                    argument: {
                        type: "Literal",
                        value: -value,
                        raw: M.start.raw
                    }
                };
            }
            return {
                type: "Literal",
                value: value,
                raw: M.start.raw
            };
        });
        def_to_moz(AST_Atom, function To_Moz_Atom(M) {
            return {
                type: "Identifier",
                name: String(M.value)
            };
        });
        AST_Boolean.DEFMETHOD("to_mozilla_ast", AST_Constant.prototype.to_mozilla_ast);
        AST_Null.DEFMETHOD("to_mozilla_ast", AST_Constant.prototype.to_mozilla_ast);
        AST_Hole.DEFMETHOD("to_mozilla_ast", function To_Moz_ArrayHole() {
            return null;
        });
        AST_Block.DEFMETHOD("to_mozilla_ast", AST_BlockStatement.prototype.to_mozilla_ast);
        AST_Lambda.DEFMETHOD("to_mozilla_ast", AST_Function.prototype.to_mozilla_ast);
        function raw_token(moznode) {
            if (moznode.type == "Literal") {
                return moznode.raw != null ? moznode.raw : moznode.value + "";
            }
        }
        function my_start_token(moznode) {
            var loc = moznode.loc, start = loc && loc.start;
            var range = moznode.range;
            return new AST_Token({
                file: loc && loc.source,
                line: start && start.line,
                col: start && start.column,
                pos: range ? range[0] : moznode.start,
                endline: start && start.line,
                endcol: start && start.column,
                endpos: range ? range[0] : moznode.start,
                raw: raw_token(moznode)
            });
        }
        function my_end_token(moznode) {
            var loc = moznode.loc, end = loc && loc.end;
            var range = moznode.range;
            return new AST_Token({
                file: loc && loc.source,
                line: end && end.line,
                col: end && end.column,
                pos: range ? range[1] : moznode.end,
                endline: end && end.line,
                endcol: end && end.column,
                endpos: range ? range[1] : moznode.end,
                raw: raw_token(moznode)
            });
        }
        function map(moztype, mytype, propmap) {
            var moz_to_me = "function From_Moz_" + moztype + "(M){\n";
            moz_to_me += "return new U2." + mytype.name + "({\n" + "start: my_start_token(M),\n" + "end: my_end_token(M)";
            var me_to_moz = "function To_Moz_" + moztype + "(M){\n";
            me_to_moz += "return {\n" + "type: " + JSON.stringify(moztype);
            if (propmap) propmap.split(/\s*,\s*/).forEach(function(prop) {
                var m = /([a-z0-9$_]+)(=|@|>|%)([a-z0-9$_]+)/i.exec(prop);
                if (!m) throw new Error("Can't understand property map: " + prop);
                var moz = m[1], how = m[2], my = m[3];
                moz_to_me += ",\n" + my + ": ";
                me_to_moz += ",\n" + moz + ": ";
                switch (how) {
                  case "@":
                    moz_to_me += "M." + moz + ".map(from_moz)";
                    me_to_moz += "M." + my + ".map(to_moz)";
                    break;

                  case ">":
                    moz_to_me += "from_moz(M." + moz + ")";
                    me_to_moz += "to_moz(M." + my + ")";
                    break;

                  case "=":
                    moz_to_me += "M." + moz;
                    me_to_moz += "M." + my;
                    break;

                  case "%":
                    moz_to_me += "from_moz(M." + moz + ").body";
                    me_to_moz += "to_moz_block(M)";
                    break;

                  default:
                    throw new Error("Can't understand operator in propmap: " + prop);
                }
            });
            moz_to_me += "\n})\n}";
            me_to_moz += "\n}\n}";
            moz_to_me = new Function("U2", "my_start_token", "my_end_token", "from_moz", "return(" + moz_to_me + ")")(exports, my_start_token, my_end_token, from_moz);
            me_to_moz = new Function("to_moz", "to_moz_block", "to_moz_scope", "return(" + me_to_moz + ")")(to_moz, to_moz_block, to_moz_scope);
            MOZ_TO_ME[moztype] = moz_to_me;
            def_to_moz(mytype, me_to_moz);
        }
        var FROM_MOZ_STACK = null;
        function from_moz(node) {
            FROM_MOZ_STACK.push(node);
            var ret = node != null ? MOZ_TO_ME[node.type](node) : null;
            FROM_MOZ_STACK.pop();
            return ret;
        }
        AST_Node.from_mozilla_ast = function(node) {
            var save_stack = FROM_MOZ_STACK;
            FROM_MOZ_STACK = [];
            var ast = from_moz(node);
            FROM_MOZ_STACK = save_stack;
            ast.walk(new TreeWalker(function(node) {
                if (node instanceof AST_LabelRef) {
                    for (var level = 0, parent; parent = this.parent(level); level++) {
                        if (parent instanceof AST_Scope) break;
                        if (parent instanceof AST_LabeledStatement && parent.label.name == node.name) {
                            node.thedef = parent.label;
                            break;
                        }
                    }
                    if (!node.thedef) {
                        var s = node.start;
                        js_error("Undefined label " + node.name, s.file, s.line, s.col, s.pos);
                    }
                }
            }));
            return ast;
        };
        function set_moz_loc(mynode, moznode, myparent) {
            var start = mynode.start;
            var end = mynode.end;
            if (start.pos != null && end.endpos != null) {
                moznode.range = [ start.pos, end.endpos ];
            }
            if (start.line) {
                moznode.loc = {
                    start: {
                        line: start.line,
                        column: start.col
                    },
                    end: end.endline ? {
                        line: end.endline,
                        column: end.endcol
                    } : null
                };
                if (start.file) {
                    moznode.loc.source = start.file;
                }
            }
            return moznode;
        }
        function def_to_moz(mytype, handler) {
            mytype.DEFMETHOD("to_mozilla_ast", function() {
                return set_moz_loc(this, handler(this));
            });
        }
        function to_moz(node) {
            return node != null ? node.to_mozilla_ast() : null;
        }
        function to_moz_block(node) {
            return {
                type: "BlockStatement",
                body: node.body.map(to_moz)
            };
        }
        function to_moz_scope(type, node) {
            var body = node.body.map(to_moz);
            if (node.body[0] instanceof AST_SimpleStatement && node.body[0].body instanceof AST_String) {
                body.unshift(to_moz(new AST_EmptyStatement(node.body[0])));
            }
            return {
                type: type,
                body: body
            };
        }
    })();
    "use strict";
    function find_builtins(reserved) {
        [ "null", "true", "false", "Infinity", "-Infinity", "undefined" ].forEach(add);
        [ Object, Array, Function, Number, String, Boolean, Error, Math, Date, RegExp ].forEach(function(ctor) {
            Object.getOwnPropertyNames(ctor).map(add);
            if (ctor.prototype) {
                Object.getOwnPropertyNames(ctor.prototype).map(add);
            }
        });
        function add(name) {
            push_uniq(reserved, name);
        }
    }
    function reserve_quoted_keys(ast, reserved) {
        function add(name) {
            push_uniq(reserved, name);
        }
        ast.walk(new TreeWalker(function(node) {
            if (node instanceof AST_ObjectKeyVal && node.quote) {
                add(node.key);
            } else if (node instanceof AST_Sub) {
                addStrings(node.property, add);
            }
        }));
    }
    function addStrings(node, add) {
        node.walk(new TreeWalker(function(node) {
            if (node instanceof AST_Sequence) {
                addStrings(node.tail_node(), add);
            } else if (node instanceof AST_String) {
                add(node.value);
            } else if (node instanceof AST_Conditional) {
                addStrings(node.consequent, add);
                addStrings(node.alternative, add);
            }
            return true;
        }));
    }
    function mangle_properties(ast, options) {
        options = defaults(options, {
            builtins: false,
            cache: null,
            debug: false,
            keep_quoted: false,
            only_cache: false,
            regex: null,
            reserved: null
        }, true);
        var reserved = options.reserved;
        if (!Array.isArray(reserved)) reserved = [];
        if (!options.builtins) find_builtins(reserved);
        var cname = -1;
        var cache;
        if (options.cache) {
            cache = options.cache.props;
            cache.each(function(mangled_name) {
                push_uniq(reserved, mangled_name);
            });
        } else {
            cache = new Dictionary();
        }
        var regex = options.regex;
        var debug = options.debug !== false;
        var debug_name_suffix;
        if (debug) {
            debug_name_suffix = options.debug === true ? "" : options.debug;
        }
        var names_to_mangle = [];
        var unmangleable = [];
        ast.walk(new TreeWalker(function(node) {
            if (node instanceof AST_ObjectKeyVal) {
                add(node.key);
            } else if (node instanceof AST_ObjectProperty) {
                add(node.key.name);
            } else if (node instanceof AST_Dot) {
                add(node.property);
            } else if (node instanceof AST_Sub) {
                addStrings(node.property, add);
            }
        }));
        return ast.transform(new TreeTransformer(function(node) {
            if (node instanceof AST_ObjectKeyVal) {
                node.key = mangle(node.key);
            } else if (node instanceof AST_ObjectProperty) {
                node.key.name = mangle(node.key.name);
            } else if (node instanceof AST_Dot) {
                node.property = mangle(node.property);
            } else if (!options.keep_quoted && node instanceof AST_Sub) {
                node.property = mangleStrings(node.property);
            }
        }));
        function can_mangle(name) {
            if (unmangleable.indexOf(name) >= 0) return false;
            if (reserved.indexOf(name) >= 0) return false;
            if (options.only_cache) {
                return cache.has(name);
            }
            if (/^-?[0-9]+(\.[0-9]+)?(e[+-][0-9]+)?$/.test(name)) return false;
            return true;
        }
        function should_mangle(name) {
            if (regex && !regex.test(name)) return false;
            if (reserved.indexOf(name) >= 0) return false;
            return cache.has(name) || names_to_mangle.indexOf(name) >= 0;
        }
        function add(name) {
            if (can_mangle(name)) push_uniq(names_to_mangle, name);
            if (!should_mangle(name)) {
                push_uniq(unmangleable, name);
            }
        }
        function mangle(name) {
            if (!should_mangle(name)) {
                return name;
            }
            var mangled = cache.get(name);
            if (!mangled) {
                if (debug) {
                    var debug_mangled = "_$" + name + "$" + debug_name_suffix + "_";
                    if (can_mangle(debug_mangled)) {
                        mangled = debug_mangled;
                    }
                }
                if (!mangled) {
                    do {
                        mangled = base54(++cname);
                    } while (!can_mangle(mangled));
                }
                cache.set(name, mangled);
            }
            return mangled;
        }
        function mangleStrings(node) {
            return node.transform(new TreeTransformer(function(node) {
                if (node instanceof AST_Sequence) {
                    var last = node.expressions.length - 1;
                    node.expressions[last] = mangleStrings(node.expressions[last]);
                } else if (node instanceof AST_String) {
                    node.value = mangle(node.value);
                } else if (node instanceof AST_Conditional) {
                    node.consequent = mangleStrings(node.consequent);
                    node.alternative = mangleStrings(node.alternative);
                }
                return node;
            }));
        }
    }
    "use strict";
    var to_ascii = typeof atob == "undefined" ? function(b64) {
        return new Buffer(b64, "base64").toString();
    } : atob;
    var to_base64 = typeof btoa == "undefined" ? function(str) {
        return new Buffer(str).toString("base64");
    } : btoa;
    function read_source_map(code) {
        var match = /\n\/\/# sourceMappingURL=data:application\/json(;.*?)?;base64,(.*)/.exec(code);
        if (!match) {
            AST_Node.warn("inline source map not found");
            return null;
        }
        return to_ascii(match[2]);
    }
    function set_shorthand(name, options, keys) {
        if (options[name]) {
            keys.forEach(function(key) {
                if (options[key]) {
                    if (typeof options[key] != "object") options[key] = {};
                    if (!(name in options[key])) options[key][name] = options[name];
                }
            });
        }
    }
    function init_cache(cache) {
        if (!cache) return;
        if (!("props" in cache)) {
            cache.props = new Dictionary();
        } else if (!(cache.props instanceof Dictionary)) {
            cache.props = Dictionary.fromObject(cache.props);
        }
    }
    function to_json(cache) {
        return {
            props: cache.props.toObject()
        };
    }
    function minify(files, options) {
        var warn_function = AST_Node.warn_function;
        try {
            options = defaults(options, {
                compress: {},
                ie8: false,
                keep_fnames: false,
                mangle: {},
                nameCache: null,
                output: {},
                parse: {},
                rename: undefined,
                sourceMap: false,
                timings: false,
                toplevel: false,
                warnings: false,
                wrap: false
            }, true);
            var timings = options.timings && {
                start: Date.now()
            };
            if (options.rename === undefined) {
                options.rename = options.compress && options.mangle;
            }
            set_shorthand("ie8", options, [ "compress", "mangle", "output" ]);
            set_shorthand("keep_fnames", options, [ "compress", "mangle" ]);
            set_shorthand("toplevel", options, [ "compress", "mangle" ]);
            set_shorthand("warnings", options, [ "compress" ]);
            var quoted_props;
            if (options.mangle) {
                options.mangle = defaults(options.mangle, {
                    cache: options.nameCache && (options.nameCache.vars || {}),
                    eval: false,
                    ie8: false,
                    keep_fnames: false,
                    properties: false,
                    reserved: [],
                    toplevel: false
                }, true);
                if (options.mangle.properties) {
                    if (typeof options.mangle.properties != "object") {
                        options.mangle.properties = {};
                    }
                    if (options.mangle.properties.keep_quoted) {
                        quoted_props = options.mangle.properties.reserved;
                        if (!Array.isArray(quoted_props)) quoted_props = [];
                        options.mangle.properties.reserved = quoted_props;
                    }
                    if (options.nameCache && !("cache" in options.mangle.properties)) {
                        options.mangle.properties.cache = options.nameCache.props || {};
                    }
                }
                init_cache(options.mangle.cache);
                init_cache(options.mangle.properties.cache);
            }
            if (options.sourceMap) {
                options.sourceMap = defaults(options.sourceMap, {
                    content: null,
                    filename: null,
                    includeSources: false,
                    root: null,
                    url: null
                }, true);
            }
            var warnings = [];
            if (options.warnings && !AST_Node.warn_function) {
                AST_Node.warn_function = function(warning) {
                    warnings.push(warning);
                };
            }
            if (timings) timings.parse = Date.now();
            var toplevel;
            if (files instanceof AST_Toplevel) {
                toplevel = files;
            } else {
                if (typeof files == "string") {
                    files = [ files ];
                }
                options.parse = options.parse || {};
                options.parse.toplevel = null;
                for (var name in files) if (HOP(files, name)) {
                    options.parse.filename = name;
                    options.parse.toplevel = parse(files[name], options.parse);
                    if (options.sourceMap && options.sourceMap.content == "inline") {
                        if (Object.keys(files).length > 1) throw new Error("inline source map only works with singular input");
                        options.sourceMap.content = read_source_map(files[name]);
                    }
                }
                toplevel = options.parse.toplevel;
            }
            if (quoted_props) {
                reserve_quoted_keys(toplevel, quoted_props);
            }
            if (options.wrap) {
                toplevel = toplevel.wrap_commonjs(options.wrap);
            }
            if (timings) timings.rename = Date.now();
            if (options.rename) {
                toplevel.figure_out_scope(options.mangle);
                toplevel.expand_names(options.mangle);
            }
            if (timings) timings.compress = Date.now();
            if (options.compress) toplevel = new Compressor(options.compress).compress(toplevel);
            if (timings) timings.scope = Date.now();
            if (options.mangle) toplevel.figure_out_scope(options.mangle);
            if (timings) timings.mangle = Date.now();
            if (options.mangle) {
                toplevel.compute_char_frequency(options.mangle);
                toplevel.mangle_names(options.mangle);
            }
            if (timings) timings.properties = Date.now();
            if (options.mangle && options.mangle.properties) {
                toplevel = mangle_properties(toplevel, options.mangle.properties);
            }
            if (timings) timings.output = Date.now();
            var result = {};
            if (options.output.ast) {
                result.ast = toplevel;
            }
            if (!HOP(options.output, "code") || options.output.code) {
                if (options.sourceMap) {
                    if (typeof options.sourceMap.content == "string") {
                        try {
                            options.sourceMap.content = JSON.parse(options.sourceMap.content);
                        } catch (ex) {
                            throw new Error("invalid input source map: " + options.sourceMap.content);
                        }
                    }
                    options.output.source_map = SourceMap({
                        file: options.sourceMap.filename,
                        orig: options.sourceMap.content,
                        root: options.sourceMap.root
                    });
                    if (options.sourceMap.includeSources) {
                        if (files instanceof AST_Toplevel) {
                            throw new Error("original source content unavailable");
                        } else for (var name in files) if (HOP(files, name)) {
                            options.output.source_map.get().setSourceContent(name, files[name]);
                        }
                    }
                }
                delete options.output.ast;
                delete options.output.code;
                var stream = OutputStream(options.output);
                toplevel.print(stream);
                result.code = stream.get();
                if (options.sourceMap) {
                    result.map = options.output.source_map.toString();
                    if (options.sourceMap.url == "inline") {
                        result.code += "\n//# sourceMappingURL=data:application/json;charset=utf-8;base64," + to_base64(result.map);
                    } else if (options.sourceMap.url) {
                        result.code += "\n//# sourceMappingURL=" + options.sourceMap.url;
                    }
                }
            }
            if (options.nameCache && options.mangle) {
                if (options.mangle.cache) options.nameCache.vars = to_json(options.mangle.cache);
                if (options.mangle.properties && options.mangle.properties.cache) {
                    options.nameCache.props = to_json(options.mangle.properties.cache);
                }
            }
            if (timings) {
                timings.end = Date.now();
                result.timings = {
                    parse: .001 * (timings.rename - timings.parse),
                    rename: .001 * (timings.compress - timings.rename),
                    compress: .001 * (timings.scope - timings.compress),
                    scope: .001 * (timings.mangle - timings.scope),
                    mangle: .001 * (timings.properties - timings.mangle),
                    properties: .001 * (timings.output - timings.properties),
                    output: .001 * (timings.end - timings.output),
                    total: .001 * (timings.end - timings.start)
                };
            }
            if (warnings.length) {
                result.warnings = warnings;
            }
            return result;
        } catch (ex) {
            return {
                error: ex
            };
        } finally {
            AST_Node.warn_function = warn_function;
        }
    }
    exports["Dictionary"] = Dictionary;
    exports["TreeWalker"] = TreeWalker;
    exports["TreeTransformer"] = TreeTransformer;
    exports["minify"] = minify;
    exports["parse"] = parse;
    exports["_push_uniq"] = push_uniq;
})(typeof exports == "undefined" ? exports = {} : exports);