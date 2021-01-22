import * as ts from "typescript"


let l_source = ts.createSourceFile("tmp", `
    let l_variable = 10;
    l_variable += 1;
    let l_another_variable = l_variable + 10;
    let l_variable_2 = 3;
    let l_variable_3 = l_variable + l_variable_2;
    l_variable = 10 + l_variable;
`, ts.ScriptTarget.Latest);

class CodeOutput
{
    public code: string = "";
};

interface VariableTypes
{
    [p_name: string]: string;
};

let variable_types: VariableTypes = {};

class BinaryExpression
{
    public left_identifier: string;
    public operator: string;
    public right_identifier: string;

    public result_type: string;

    public static build_numerical_value(p_left_identifier: string, p_operator: string, p_right_numerical: string): BinaryExpression
    {
        let l_expression: BinaryExpression = new BinaryExpression();
        l_expression.left_identifier = p_left_identifier;
        l_expression.operator = p_operator;
        l_expression.right_identifier = p_right_numerical;
        l_expression.result_type = "uimax";
        return l_expression;
    };

    public static build(p_left_identifier: string, p_operator: string, p_right_identifier: string): BinaryExpression
    {
        let l_expression: BinaryExpression = new BinaryExpression();
        l_expression.left_identifier = p_left_identifier;
        l_expression.operator = p_operator;
        l_expression.right_identifier = p_right_identifier;

        if (variable_types[p_left_identifier] !== variable_types[p_right_identifier])
        {
            console.error("Type diff");
        }

        l_expression.result_type = variable_types[p_left_identifier];
        return l_expression;
    };

    public static build_binaryright(p_left_identifier: string, p_operator: string, p_right_binary: BinaryExpression): BinaryExpression
    {
        let l_expression: BinaryExpression = new BinaryExpression();
        l_expression.left_identifier = p_left_identifier;
        l_expression.operator = p_operator;
        l_expression.right_identifier = p_right_binary.to_local_expression();

        l_expression.result_type = p_right_binary.result_type;
        return l_expression;
    };

    public static build_binaryleft(p_left_binary: BinaryExpression, p_operator: string, p_right_identifier: string): BinaryExpression
    {
        let l_expression: BinaryExpression = new BinaryExpression();
        l_expression.left_identifier = p_left_binary.to_local_expression();
        l_expression.operator = p_operator;
        l_expression.right_identifier = p_right_identifier;

        l_expression.result_type = p_left_binary.result_type;
        return l_expression;
    };

    public static build_binaryleftright(p_left_binary: BinaryExpression, p_operator: string, p_right_binary: BinaryExpression): BinaryExpression
    {
        let l_expression: BinaryExpression = new BinaryExpression();
        l_expression.left_identifier = p_left_binary.to_local_expression();
        l_expression.operator = p_operator;
        l_expression.right_identifier = p_right_binary.to_local_expression();

        if (p_left_binary.result_type !== p_right_binary.result_type)
        {
            console.error("Type diff");
        }

        l_expression.result_type = p_left_binary.result_type;
        return l_expression;
    };

    public to_cpp_statement(): string
    {
        return `${this.to_local_expression()};\n`;
    };

    public to_local_expression(): string
    {
        return `${this.left_identifier} ${this.operator} ${this.right_identifier}`;
    };
};

class VariableDeclaration
{
    public identifier: string;
    public identifier_type: string;
    public value: string;

    public static build(p_identifier: string, p_identifier_type: string, p_value: string): VariableDeclaration
    {
        let l_declaration: VariableDeclaration = new VariableDeclaration();
        l_declaration.identifier = p_identifier;
        l_declaration.identifier_type = p_identifier_type;
        l_declaration.value = p_value;
        variable_types[p_identifier] = p_identifier_type;
        return l_declaration;
    };

    public static build_from_binaryexpression(p_identifier: string, p_binary_expression: BinaryExpression): VariableDeclaration
    {
        let l_declaration: VariableDeclaration = new VariableDeclaration();
        l_declaration.identifier = p_identifier;
        l_declaration.identifier_type = p_binary_expression.result_type;
        l_declaration.value = p_binary_expression.to_local_expression();

        variable_types[p_identifier] = l_declaration.identifier_type;
        return l_declaration;
    };

    public to_cpp_statement(): string
    {
        return `${this.identifier_type} ${this.identifier} = ${this.value};\n`;
    };
};

let get_variable_evaluation_token = function (p_token: ts.SyntaxKind): string
{
    switch (p_token)
    {
        case ts.SyntaxKind.EqualsToken:
            return "=";
        case ts.SyntaxKind.PlusEqualsToken:
            return "+=";
        case ts.SyntaxKind.PlusToken:
            return "+";
    }

    return "unknown_token";
};

let build_variable_declaration = function (p_node: ts.Node): VariableDeclaration
{
    if (p_node.getChildAt(0, l_source).kind == ts.SyntaxKind.Identifier)
    {
        let l_identifier = p_node.getChildAt(0, l_source).getText(l_source);
        let l_assign_token = get_variable_evaluation_token(p_node.getChildAt(1, l_source).kind);

        if (p_node.getChildAt(2, l_source).kind == ts.SyntaxKind.NumericLiteral)
        {
            let l_numerical_value = p_node.getChildAt(2, l_source).getText(l_source);
            return VariableDeclaration.build(l_identifier, "uimax", l_numerical_value);
            // return `uimax ${l_identifier} ${l_assign_token} ${l_numerical_value}`;
        }
        if (p_node.getChildAt(2, l_source).kind == ts.SyntaxKind.BinaryExpression)
        {
            // let l_expression_cpp = ;
            return VariableDeclaration.build_from_binaryexpression(l_identifier, build_binary_expression(p_node.getChildAt(2, l_source)));
            // return `${l_expression_cpp.identifier_type} ${l_identifier} ${l_assign_token} ${l_expression_cpp.to_local_expression()}`;
        }
    }
};

let build_binary_expression = function (p_node: ts.Node): BinaryExpression
{
    let l_left: ts.Node = p_node.getChildAt(0, l_source);
    let l_right: ts.Node = p_node.getChildAt(2, l_source);



    let l_left_binaryop: boolean = l_left.kind == ts.SyntaxKind.BinaryExpression;
    let l_right_binaryop: boolean = l_right.kind == ts.SyntaxKind.BinaryExpression;



    if (l_left_binaryop)
    {
        if (l_right_binaryop)
        {
            return BinaryExpression.build_binaryleftright(
                build_binary_expression(l_left),
                p_node.getChildAt(1, l_source).getText(l_source),
                build_binary_expression(l_right)
            );
        }
        else
        {
            return BinaryExpression.build_binaryleft(
                build_binary_expression(l_left),
                p_node.getChildAt(1, l_source).getText(l_source),
                l_right.getText(l_source)
            );
        }
    }
    else
    {
        if (l_right_binaryop)
        {
            return BinaryExpression.build_binaryright(
                l_left.getText(l_source),
                p_node.getChildAt(1, l_source).getText(l_source),
                build_binary_expression(l_right)
            );
        }
        else
        {
            let l_left_numerical: boolean = l_left.kind == ts.SyntaxKind.NumericLiteral;
            let l_right_numerical: boolean = l_right.kind == ts.SyntaxKind.NumericLiteral;

            if (l_left_numerical || l_right_numerical)
            {
                return BinaryExpression.build_numerical_value(
                    l_left.getText(l_source),
                    p_node.getChildAt(1, l_source).getText(l_source),
                    l_right.getText(l_source)
                );
            }
            else
            {
                return BinaryExpression.build(
                    l_left.getText(l_source),
                    p_node.getChildAt(1, l_source).getText(l_source),
                    l_right.getText(l_source)
                );
            }

        }
    }
};

let build_variable_declaration_list = function (p_node: ts.Node, output: CodeOutput)
{
    p_node.forEachChild((l_node) =>
    {
        console.log(l_node.kind + " " + l_node.getText(l_source));
        switch (l_node.kind)
        {
            case ts.SyntaxKind.VariableDeclaration:
                {
                    output.code += build_variable_declaration(l_node).to_cpp_statement();
                    // console.log(`cpp : ${l_variable_declaration};`);
                }
                break;
        }
    });
};

let build_variable_statement = function (p_node: ts.Node, output: CodeOutput)
{
    p_node.forEachChild((l_node) =>
    {
        console.log(l_node.kind + " " + l_node.getText(l_source));
        switch (l_node.kind)
        {
            case ts.SyntaxKind.VariableDeclaration:
                {
                    output.code += build_variable_declaration(l_node).to_cpp_statement();
                    // console.log(`cpp : ${l_variable_declaration};`);
                }
                break;
        }
    });
};

let build_block = function (p_node: ts.Node, output: CodeOutput)
{
    p_node.forEachChild((l_node) =>
    {
        console.log(l_node.kind + " " + l_node.getText(l_source));
        switch (l_node.kind)
        {
            case ts.SyntaxKind.VariableDeclarationList:
                {
                    build_variable_declaration_list(l_node, output);
                }
                break;
            case ts.SyntaxKind.VariableStatement:
                {
                    build_variable_statement(l_node, output);
                }
                break;
            case ts.SyntaxKind.BinaryExpression:
                {
                    let l_binary_expression = build_binary_expression(l_node);
                    output.code += l_binary_expression.to_cpp_statement();
                    // console.log(`cpp : ${l_binary_expression};`);
                }
                break;
        }
    });
}

let build_method = function (p_node: ts.Node, output: CodeOutput)
{
    p_node.forEachChild((l_node) =>
    {
        console.log(l_node.kind + " " + l_node.getText(l_source));
        switch (l_node.kind)
        {
            case ts.SyntaxKind.Block:
                {
                    build_block(l_node, output);
                }
                break;
        };
    });
}

let build_class = function (p_node: ts.Node, output: CodeOutput)
{
    p_node.forEachChild((l_node) =>
    {
        console.log(l_node.kind + " " + l_node.getText(l_source));
        switch (l_node.kind)
        {
            case ts.SyntaxKind.MethodDeclaration:
                {
                    build_method(l_node, output);
                }
                break;
        }
    });
};

let traverserse_ast_node = function (p_node: ts.Node, output: CodeOutput) 
{
    console.log(p_node.kind + " " + p_node.getText(l_source));
    switch (p_node.kind)
    {
        case ts.SyntaxKind.ClassDeclaration:
            {
                build_class(p_node, output);
            }
            break;
        case ts.SyntaxKind.Block:
            {
                build_block(p_node, output);
            }
            break;
    }
};

let l_output: CodeOutput = new CodeOutput();
ts.forEachChild(l_source, (p_node: ts.Node) =>
{
    build_block(p_node, l_output);

    // traverserse_ast_node(p_node);
});

console.log(l_output.code);