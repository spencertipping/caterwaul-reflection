// Reflection | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// This module adds deep reflective capabilities to Javascript. In particular, if you transform your code with it you can:

// | 1. Inspect and modify closure state.
//   2. Inspect object prototype membership (this lets you identify superclasses).

// To do this, it instruments your source code with refs that it controls. You can then ask it questions about the state of a running program. For example:

// | f = caterwaul('js_all reflection')(function (x, y) {
//     return function (z) {
//       return "x + y + z".qf}});
//   g = f(10, 15)(20);
//   caterwaul.reflection.state(g)                         // -> {x: 10, y: 15, z: 20}
//   caterwaul.reflection.scope(g)                         // -> {z: 20, '<id>': 'gensym_1', '<parent>': {x: 10, y: 15, '<id>': 'gensym_2'}}

// Gensyms are used so that you can reconstruct a scope tree. For example:

// | partial_f_1 = f(10, 15);
//   s1 = caterwaul.reflection.scope(partial_f_1(20))      // -> {z: 20, '<id>': 'gensym_2', '<parent>': {x: 10, y: 15, '<id>': 'gensym_1'}}
//   s2 = caterwaul.reflection.scope(partial_f_1(20))      // -> {z: 20, '<id>': 'gensym_3', '<parent>': {x: 10, y: 15, '<id>': 'gensym_1'}}
//   partial_f_2 = f(10, 15);
//   s3 = caterwaul.reflection.scope(partial_f_2(20))      // -> {z: 20, '<id>': 'gensym_5', '<parent>': {x: 10, y: 15, '<id>': 'gensym_4'}}

// Note that this alone isn't enough information to reliably construct the original tree of functions. To do that in the general case, you'll also need the original argument lists that were
// passed into the constructors. Here's why:

// | f = caterwaul('js_all reflection')(function (x, y) {
//     return y & 1 ? "x".qf : "x + 1".qf});
//   g1 = f(10, 0);
//   g2 = f(10, 1);
//   caterwaul.reflection.scope(g1)                        // -> {x: 10, '<id>': 'gensym_1'}
//   caterwaul.reflection.scope(g2)                        // -> {x: 10, '<id>': 'gensym_2'}

// This happens because Caterwaul doesn't modify the GC overhead of closures by introducing fictitious references. Because the only reason to keep 'y' around is to remember the decision for ?:,
// Caterwaul doesn't store it. This means that you'll need to know which decision was made if you want to reconstruct g1 or g2.

// Clearly this sucks. So the reflection module gives you a nice alternative: You can recompile a function into one that operates directly on first-class closure scopes. This means that you can
// emulate the behavior of a function even after serialization. For example:

// | serialize(f)   = {f: f.toString(), scope: caterwaul.reflection.scope(f)};
//   deserialize(o) = caterwaul.reflection.lift(caterwaul.parse(o.f), o.scope);

// Now deserialize(serialize(f)) will have behavior identical to f for functions whose toString() returns that function's source accurately.

caterwaul('js_all')(function ($) {
  ($.reflection(c) = reflection /~after/ c) /-$.merge/ methods
  -where [

// Function hooks.
// In order to do all this cool stuff, the reflection module needs to do a couple of things. First, it needs to walk through the syntax tree and construct a static scope map. This will be used to
// figure out where each closure obtains its variables. Then it needs to add hook code to each closure; this hook code detects certain invocation cases and returns an object describing the
// function's current closure state. Here's what that code looks like:

// | if (this === caterwaul_opaque_object) return closure_object;

// This code is prepended to every function body. If the opaque object is passed in, the rest of the function's execution will be bypassed and it will instantly return the closure object. The
// closure object, by the way, is relatively uninteresting. It looks like this:

// | {'<id>': closure_id, '<parent>': parent_closure_object, var1: val1, ...}

// These closure objects are added to closure construction sites. For example:

// | function (x) {                        function (x) {
//     return function (y) {                 return (function (closure_object) {
//       return x + y;             ->          return function (y) {
//     };                                        if (this === caterwaul_opaque_object) return closure_object;
//   }                                           return x + y;
//                                             };
//                                           })({x: x, '<id>': gensym(), '<parent>': undefined});
//                                         }

// Conveniently, 'this' and 'arguments' don't cross function boundaries; so there are no implicit scoping that needs to be considered. Also, not all functions are converted; only those which
// close over variables need their own first-class scopes.

    function_template                = 'function (_xs) {_body}'.qs,
    var_template                     = 'var _xs'.qs,

    index(tree)                      = {} -se- tree /~reach/ "(it[_.data] || (it[_.data] = [])) /~push/ _".qf,

    locals_in(tree, parent)          = {'<parent>': parent, id: $.gensym()} /-$.merge/ 

    scope_annotations(tree, context) = tree /~traverse/ visit -re- context -where [visit(s)    = s.entering ? s.entering /!enter : s.exiting /!exit,
                                                                                   enter(node) = function_template /~match/ node -re [it ? context[node.id()] = scope_annotations(it._body

// Generated by SDoc 
