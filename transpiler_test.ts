/// <reference path="./transpiler.ts"/>

const l_code = `
var l_variable = 10;
l_variable = l_variable + 1;
var l_another_variable = l_variable + 10;
var l_variable_2 = 3;
var l_variable_3 = l_variable + l_variable_2;
l_variable = 10 + l_variable;
`

let l_ast = ast.to_ast(tk.tokenize(format(l_code)));

import * as assert from "assert";


// assert.strictEqual();